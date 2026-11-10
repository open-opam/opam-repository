# AGENTS.md

This repository is the open-opam registry. The
gates and the author's command are in `open-opam/open-opam-cli`. This file is for anyone changing it, human or
agent. Users start at [README.md](README.md).

## Layout

```
repo                                   the repository's opam configuration
packages/<name>/<name>.<version>/opam  one published version of a package
.open-opam/owners/<name>.json          the repository that owns a name
.open-opam/revocations/                a record for each revoked version
.open-opam/restorations/               a record for each version its author restored
.github/workflows/validate             every gate, on one exact commit, chosen by what it changes; then the merge, by the registry's App
.github/workflows/apply                opens the pull request that makes each opam file match its records
.github/scripts/kind.sh                what a pull request changes, which decides its gate
.github/scripts/check-revocation.sh    a maintainer's revocation, judged
.github/scripts/check-apply.sh         a change to published opam files, judged against the records
.github/scripts/apply-records.sh       every record applied
.github/scripts/apply-record.sh        one record applied: available: false, or the published bytes back
.github/actions/install-cli            the exact CLI release the registry runs
.github/workflows/docs                 the catalogue on GitHub Pages: on a push to main and after a snapshot
.github/workflows/stats                each archive's downloads, once a day, onto the stats branch
docs/                                  the catalogue: Astro, reading packages/, .open-opam/, the registry's documents, GitHub releases and the stats branch
docs/islands/                          its interactive parts: OCaml with solidtype and HeroUI, compiled by Melange
docs/stats.ts                          one day's download snapshot, as stats.yml saves it
stats/<date>.json                      on the stats branch only: that day's totals, by archive address
Makefile                               make setup, then make docs builds the catalogue into _build/docs; make test tests the scripts; make stats prints a snapshot
```

opam reads `repo` and `packages/`, and ignores everything else. It is served
from git, so nothing is generated: `opam update` reads the tree at `main`. The
catalogue is built from that tree on each push and deployed to Pages; nothing it
builds is committed. A day's downloads are the difference of two snapshots, since
GitHub counts each release asset since it was uploaded.

## Rules that must hold

- **An author's pull request only adds files**: a release's opam files and owners
  records, or revocation and restoration records. `apply` makes the opam files
  match the records, in a pull request of the registry's own, after each merge.
  Why: an author's fork is usually behind, and GitHub refuses to bring it up to
  date without a permission an author should never need. Symptom: an author's
  branch that changes an existing file.
- **What a pull request changes decides its gate, never where it comes from.** A
  change to a published opam file passes only when it is exactly what the
  records make. Why: a branch of this repository could otherwise add a version
  with no release, or change a published one. Symptom: a gate that asks which
  repository a pull request's head is in.
- **The registry's App holds no exemption.** It merges and opens pull requests so
  that GitHub starts what follows, and `main` refuses it without the check like
  anyone. Its key is in the `registry` environment, which only `main` reaches.
  Why: a workflow's own token starts no workflow, and nothing may reach `main`
  unchecked. Symptom: the App in a bypass list, a push to `main` that is not a
  merge, or its key in a job that holds a pull request's files.
- **A maintainer revokes with a pull request that adds a record**, naming
  themselves as its actor. Why: nothing in the registry is started by hand, and
  the record says who it was. Symptom: a workflow with `workflow_dispatch`.

- **A published version never changes.** Its opam file stays as published; a
  correction is a new version. The one change is `apply`'s, making it match its
  records. Why: a change under the same version cannot be
  told from a supply-chain attack. Symptom: a diff to an existing
  `<name>.<version>/opam`.
- **Nothing is deleted.** A version that must not be installed is revoked with
  `available: false` and a record. Why: it keeps the history and what other
  packages resolve against. Symptom: a removed version directory.
- **A package's identity is its numeric GitHub repository ID.** The repository
  string in an owners record is a display name. Why: names and owners change,
  the ID does not, and a mirror cannot claim it. Symptom: an owners record
  whose ID is not the repository's `id` from GitHub's API.
- **No archive is hosted here.** Why: a distributor's obligations are a
  different product. Symptom: anything under `packages/` but an `opam` file.
- **The first packages came in once, byte for byte, from the repository that
  published them.** They predate immutable releases, so this is the only way
  they arrive; their checksums pin their archives. Why: anything else would mean
  a second way in. Symptom: another version added without its release.
- **The validator is the exact release `install-cli` names, never anything from a
  pull request, and no privileged job checks out or runs a pull request's code.**
  Why: a submission must not be able to weaken its own gate, and a write token must
  never share a job with untrusted code. Symptom: a job that holds a secret or a
  write token with a pull request's files on disk, or a validator built from the
  change.
- **No job relies on the install job.** Package code controls it, so it restores no
  cache, nothing reads an artifact from it, and `report` reads only job results.
  Why: a passing install says only that a willing package installed. Symptom: a
  cache, an artifact, or a log line used for a decision.
- **Download snapshots are written only to the `stats` branch.** Why: `main`'s
  history records publications, and no scheduled job writes to it. Symptom: a
  commit on `main` touching `stats/`, or `stats.yml` checking out anything but
  the `stats` branch to commit.
- **Author text in the catalogue is escaped, and only a README is rendered,
  sanitised as GitHub sanitises one.** Why: it is untrusted input shown on the
  registry's own address. Symptom: `set:html` on anything but
  `renderReadme`'s output, or a README rendered without `rehype-sanitize`.
- **A download count is the archive's, and says so.** Why: every package of a
  release shares its archive, and GitHub counts the asset. Symptom: a count
  shown without the archive's name, or added up across a release's packages.
- **The catalogue is built with solidtype as this registry publishes it, in a
  job that holds only a read token.** Its islands install solidtype from the
  registry, which runs a package's build; the token that publishes Pages is in
  a deploy job that runs nothing else, and no catalogue job restores a cache.
  Why: package code never shares a job with a token that can publish, and a
  cache is something a job running package code could have written. Symptom:
  `pages: write` or `id-token: write` on the job that runs `make setup`, or a
  cache action in `docs.yml` or `stats.yml`.
