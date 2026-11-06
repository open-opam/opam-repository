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
```

opam reads `repo` and `packages/`, and ignores everything else. It is served
from git, so nothing is generated: `opam update` reads the tree at `main`.

## Rules that must hold

- **A published version never changes.** Its opam file stays as published; a
  correction is a new version. Why: a change under the same version cannot be
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
