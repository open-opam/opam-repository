// The registry as the catalogue shows it, read when the site is built: every
// version under packages/, the records under .open-opam/, from GitHub each
// release's date and each archive's downloads so far and each package's
// README, and the download snapshots on the stats branch for each day's.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { dependencies, field, parse, section, text, texts, type Dependency } from "./opam";
import { renderReadme } from "./readme";
import { assetsOf, type Asset } from "./releases";
import { releaseAsset, snapshot, type Snapshot } from "./snapshot";

export const repository = "open-opam/opam-repository";
// The build runs in docs/ (make docs), and bundles this module elsewhere, so
// the registry is found from where the build runs, not from this file.
const root = resolve(process.cwd(), "..");
// The branch stats.yml writes, as the checkout knows it: fetched from GitHub,
// or taken here with `make stats` onto a local branch of the same name.
const statsRefs = process.env.STATS_REF ? [process.env.STATS_REF] : ["origin/stats", "stats"];
// How far back a package's chart reaches, counted from the newest snapshot.
const chartDays = 30;

export type Owner = { repository: string; status: "active" | "disputed"; claimed_at: string };
export type Revocation = { reason: string; actor: string; evidence: string; revoked_at: string };

export type State = { kind: "published" } | { kind: "revoked"; revocation: Revocation };

export type Day = { date: string; downloads: number };
export type Downloads = { total: number; days: Day[] };

export type Archive = {
  url: string;
  file: string;
  repository: string; // owner/name on GitHub
  tag: string;
  downloads?: Downloads; // absent when GitHub no longer has the release
};

export type Version = {
  name: string;
  version: string;
  path: string;
  published?: string; // the day its GitHub release was published, YYYY-MM-DD
  synopsis?: string;
  description?: string;
  authors: string[];
  maintainers: string[];
  license: string[];
  homepage: string[];
  bugReports: string[];
  devRepo?: string;
  depends: Dependency[];
  depopts: Dependency[];
  archive?: Archive;
  sha256?: string;
  commit?: string;
  state: State;
};

export type Readme = { html: string; url: string };

export type Package = {
  name: string;
  owner?: Owner;
  versions: Version[]; // newest first
  latest: Version;
  readme?: Readme;
  requiredBy: { name: string; constraint?: string }[];
};

// opam's order: digits compare as numbers, and `~` sorts before everything,
// even the end of the version.
export function compareVersions(a: string, b: string): number {
  let i = 0;
  let j = 0;
  const order = (c: string | undefined) => (c === undefined ? 0 : c === "~" ? -1 : /[A-Za-z]/.test(c) ? c.charCodeAt(0) : c.charCodeAt(0) + 256);
  while (i < a.length || j < b.length) {
    while ((i < a.length && !/\d/.test(a[i])) || (j < b.length && !/\d/.test(b[j]))) {
      const ca = i < a.length && !/\d/.test(a[i]) ? a[i] : undefined;
      const cb = j < b.length && !/\d/.test(b[j]) ? b[j] : undefined;
      const d = order(ca) - order(cb);
      if (d !== 0) return d;
      if (ca !== undefined) i++;
      if (cb !== undefined) j++;
    }
    let da = "";
    let db = "";
    while (i < a.length && /\d/.test(a[i])) da += a[i++];
    while (j < b.length && /\d/.test(b[j])) db += b[j++];
    const d = Number(da || 0) - Number(db || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function json<T>(path: string): T | undefined {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
}

function git(args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// Every snapshot on the stats branch, oldest first; none before the branch exists.
function snapshots(): { date: string; snapshot: Snapshot }[] {
  const statsRef = statsRefs.find((ref) => {
    try {
      git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  });
  if (!statsRef) return [];
  return git(["ls-tree", "--name-only", `${statsRef}:stats`])
    .split("\n")
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .map((f) => ({ date: f.slice(0, 10), snapshot: snapshot.parse(JSON.parse(git(["show", `${statsRef}:stats/${f}`]))) }));
}

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Each archive's downloads by day, as the difference of a day's snapshot from
// the day before's, for the days where both were counted. GitHub keeps only
// the total so far, so a day is known only from snapshots.
function daysByArchive(): Map<string, Day[]> {
  const taken = snapshots();
  const newest = taken.at(-1);
  if (!newest) return new Map();
  const byDate = new Map(taken.map((t) => [t.date, new Map(t.snapshot.assets.map((a) => [a.url, a.downloads]))]));
  const window: string[] = [];
  for (let d = newest.date; window.length < chartDays; d = previousDay(d)) window.unshift(d);
  const result = new Map<string, Day[]>();
  for (const { url } of newest.snapshot.assets) {
    const days: Day[] = [];
    for (const date of window) {
      const today = byDate.get(date)?.get(url);
      const before = byDate.get(previousDay(date))?.get(url);
      if (today !== undefined && before !== undefined) days.push({ date, downloads: Math.max(0, today - before) });
    }
    result.set(url, days);
  }
  return result;
}

async function assetsByUrl(repositories: Set<string>): Promise<Map<string, Asset>> {
  const found = new Map<string, Asset>();
  for (const repository of [...repositories].sort())
    for (const [url, asset] of await assetsOf(repository)) found.set(url, asset);
  return found;
}

function readVersion(name: string, directory: string): Version {
  const path = `packages/${name}/${directory}/opam`;
  const items = parse(readFileSync(join(root, path), "utf8"), path);
  const version = directory.slice(name.length + 1);
  const url = section(items, "url") ?? [];
  const source = text(field(url, "src"));
  const asset = source ? releaseAsset(source) : undefined;
  const record = json<Revocation>(join(root, ".open-opam/revocations", `${name}.${version}.json`));
  const available = field(items, "available");
  const unavailable = available?.kind === "ident" && available.value === "false";
  // The opam file is what opam reads, so it says whether a version is revoked,
  // and its record says why. A record apply has not reached yet leaves its
  // version as it was for a few minutes; a version unavailable with no record
  // is a registry that broke its own rule.
  if (unavailable && !record) throw new Error(`${path}: unavailable with no revocation record`);
  const revocation = unavailable ? record : undefined;
  return {
    name,
    version,
    path,
    synopsis: text(field(items, "synopsis")),
    description: text(field(items, "description")),
    authors: texts(field(items, "authors")),
    maintainers: texts(field(items, "maintainer")),
    license: texts(field(items, "license")),
    homepage: texts(field(items, "homepage")),
    bugReports: texts(field(items, "bug-reports")),
    devRepo: text(field(items, "dev-repo")),
    depends: dependencies(field(items, "depends")),
    depopts: dependencies(field(items, "depopts")),
    archive: source && asset ? { url: source, ...asset } : undefined,
    sha256: texts(field(url, "checksum"))
      .find((c) => c.startsWith("sha256="))
      ?.slice("sha256=".length),
    commit: text(field(items, "x-commit-hash")),
    state: revocation ? { kind: "revoked", revocation } : { kind: "published" },
  };
}

// A README at a commit, by GitHub's API: none when the repository has none,
// and the build fails on any other answer rather than ship a page without it.
async function fetchReadme(repo: string, commit: string): Promise<Readme | undefined> {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${repo}/readme?ref=${commit}`, {
    headers: { Accept: "application/vnd.github.raw+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`README of ${repo} at ${commit}: GitHub answered ${response.status}`);
  const html = await renderReadme(await response.text(), {
    links: `https://github.com/${repo}/blob/${commit}/`,
    images: `https://raw.githubusercontent.com/${repo}/${commit}/`,
  });
  return { html, url: `https://github.com/${repo}/blob/${commit}/README.md` };
}

async function read(): Promise<Package[]> {
  const packages = readdirSync(join(root, "packages"))
    .sort()
    .map((name) => {
      const versions = readdirSync(join(root, "packages", name))
        .filter((d) => d.startsWith(`${name}.`))
        .map((d) => readVersion(name, d))
        .sort((a, b) => compareVersions(b.version, a.version));
      const owner = json<Owner>(join(root, ".open-opam/owners", `${name}.json`));
      return { name, owner, versions, latest: versions[0], requiredBy: [] as Package["requiredBy"] } as Package;
    })
    .filter((p) => p.latest !== undefined);

  // A version's date is its release's, and its archive's total is GitHub's as
  // the site is built; the days come from the snapshots.
  const versions = packages.flatMap((p) => p.versions);
  const assets = await assetsByUrl(new Set(versions.flatMap((v) => (v.archive ? [v.archive.repository] : []))));
  const days = daysByArchive();
  for (const v of versions) {
    const asset = v.archive && assets.get(v.archive.url);
    if (!v.archive || !asset) continue;
    v.published = asset.published;
    v.archive.downloads = { total: asset.downloads, days: days.get(v.archive.url) ?? [] };
  }

  const byName = new Map(packages.map((p) => [p.name, p]));
  for (const p of packages)
    for (const d of p.latest.depends) {
      const required = byName.get(d.name);
      if (required && !required.requiredBy.some((r) => r.name === p.name)) required.requiredBy.push({ name: p.name, constraint: d.constraint });
    }

  // Every package of one release shares its README: one request each.
  const readmes = new Map<string, Promise<Readme | undefined>>();
  for (const p of packages) {
    const { archive, commit } = p.latest;
    if (!archive || !commit) continue;
    const key = `${archive.repository}@${commit}`;
    if (!readmes.has(key)) readmes.set(key, fetchReadme(archive.repository, commit));
    p.readme = await readmes.get(key);
  }
  return packages;
}

export const packages: Package[] = await read();

export function find(name: string): Package | undefined {
  return packages.find((p) => p.name === name);
}

export type Totals = { packages: number; versions: number; downloads?: number };

export function totals(): Totals {
  const counted = new Map<string, number>();
  for (const p of packages) for (const v of p.versions) if (v.archive?.downloads) counted.set(v.archive.url, v.archive.downloads.total);
  return {
    packages: packages.length,
    versions: packages.reduce((n, p) => n + p.versions.length, 0),
    downloads: counted.size > 0 ? [...counted.values()].reduce((a, b) => a + b, 0) : undefined,
  };
}

// Only a web address is a link: a package's metadata is its author's text.
export function safeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const stripped = url.replace(/^git\+/, "").replace(/\.git$/, "");
  return /^https?:\/\//.test(stripped) ? stripped : undefined;
}
