// Today's download totals for every archive the registry names, printed as one
// snapshot (src/lib/snapshot.ts). stats.yml runs it once a day and commits what
// it prints to the stats branch. GitHub counts each release asset since it was
// uploaded, so the catalogue's daily figures are differences of snapshots.

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { field, parse, section, text } from "./src/lib/opam";
import { assetsOf } from "./src/lib/releases";
import { releaseAsset, snapshot, type Snapshot } from "./src/lib/snapshot";

const root = resolve(import.meta.dir, "..");

function archives(): Map<string, Set<string>> {
  const byRepository = new Map<string, Set<string>>();
  for (const name of readdirSync(join(root, "packages")))
    for (const directory of readdirSync(join(root, "packages", name))) {
      const path = join("packages", name, directory, "opam");
      const source = text(field(section(parse(readFileSync(join(root, path), "utf8"), path), "url") ?? [], "src"));
      const asset = source ? releaseAsset(source) : undefined;
      if (!source || !asset) continue;
      const urls = byRepository.get(asset.repository) ?? new Set<string>();
      urls.add(source);
      byRepository.set(asset.repository, urls);
    }
  return byRepository;
}

const assets: Snapshot["assets"] = [];
for (const [repository, urls] of [...archives()].sort(([a], [b]) => a.localeCompare(b))) {
  const found = await assetsOf(repository);
  // An archive whose release has gone is left out: installing it already fails.
  for (const url of [...urls].sort()) {
    const downloads = found.get(url)?.downloads;
    if (downloads !== undefined) assets.push({ url, downloads });
  }
}

console.log(JSON.stringify(snapshot.parse({ taken_at: new Date().toISOString(), assets }), null, 2));
