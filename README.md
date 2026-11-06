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

```sh
opam repo add open-opam https://github.com/open-opam/opam-repository.git --rank=-1
opam install open-opam

open-opam init            # once
open-opam publish 1.2.3   # each release
```

`publish` checks the commit first, so a mistake does not cost a version number,
then tags it, makes an immutable release and opens one pull request, which merges
by itself once the checks pass. Its checklist says what to fix for anything that
fails.

Only you can provide two things: CI that runs on pushes to the branch you tag, and
a `README`, an `.mli` and a test. The registry reads your CI's result and does not
run your tests.

**Names.** The first time a name is published here, the repository's permanent
number is saved in `.open-opam/owners/<name>.json`, and every later publication
must carry it. A name official opam holds can only be published from the repository
official opam names for it, and a package can be in both, in either order. Any
other name is first-come; if official opam later holds it from another repository,
official opam wins and the versions here are revoked. A fork publishes under its
own name, and a drop-in replacement is a consumer's choice, with `opam pin`.

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

[CC0-1.0](LICENSE), as official opam's repository is. An author's opam file stays
the author's.
