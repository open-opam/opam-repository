# open-opam

An opam repository where a release is published on proof, not on review.

It works alongside [official opam](https://github.com/ocaml/opam-repository)
and is not affiliated with it. Publishing through open-opam needs no account,
no token and no reviewer: a GitHub release that passes the registry's checks
is merged automatically.

**Status: being built.** Consumers can install what is here. Publishing is not
open yet, so a pull request adding a package will not be merged.

## Install from it

```sh
opam repo add open-opam https://github.com/open-opam/opam-repository.git --rank=-1
opam install <package>
```

`--rank=-1` puts this repository below official opam, so official opam's
definition wins wherever both hold the same name and version. A higher rank
gives up that protection. Rank decides nothing else: opam's solver sees the
versions of both repositories together, and generally prefers the newest.

## What is here

Each package's opam file is under `packages/`, and its owning repository is in
`.open-opam/owners/`. Today that is one set of libraries, imported byte for
byte from the repository that published them. Their archives stay on GitHub,
pinned by the checksums in their opam files; this repository hosts no archives.

## Publish to it

See [docs/publishing.md](docs/publishing.md).

## Limits

- GitHub and dune only.
- Names are first-come, unless official opam holds the name. An abandoned
  repository someone took over before its name was first published here would be
  trusted, and the answer is [a dispute](DISPUTES.md).
- Tests are run by the author's CI, not by the registry, and a package is installed
  on one platform.
- Official packages' version bounds are not tested against releases here, so a
  release here can change what your official packages resolve to.
- No guarantee against malicious code. A package that installs has not been
  reviewed by a person.
- Consumers who already installed a version that is later revoked keep it.

## Documents

[GOVERNANCE.md](GOVERNANCE.md), [SECURITY.md](SECURITY.md),
[DISPUTES.md](DISPUTES.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
The record formats are in [.open-opam/README.md](.open-opam/README.md).

## Licence

MIT for the code and workflows ([LICENSE](LICENSE)), and CC0-1.0 for this
repository's compilation of package metadata and records
([LICENSE-metadata](LICENSE-metadata)). An author's opam file stays the
author's.
