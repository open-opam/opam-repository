<img src="docs/public/logo.svg" alt="" width="72" height="72" align="right" />

# open-opam

An opam repository where a release is published on proof, not on review.

It works alongside [official opam](https://github.com/ocaml/opam-repository)
and is not affiliated with it. Publishing through open-opam needs no account,
no token and no reviewer: a GitHub release that passes the registry's checks
is merged automatically.

## Install from it

```sh
opam repo add open-opam https://github.com/open-opam/opam-repository.git
opam install <package>
```

## What is here

Each package's opam file is under `packages/`, and its owning repository is in
`.open-opam/owners/`. Today that is one set of libraries, imported byte for
byte from the repository that published them. Their archives stay on GitHub,
pinned by the checksums in their opam files; this repository hosts no archives.

## Publish to it

```sh
opam repo add open-opam https://github.com/open-opam/opam-repository.git
opam install open-opam

open-opam init            # once: immutable releases, and offering your packages
open-opam check 1.2.3     # before you tag: would this commit, released as 1.2.3, pass?
open-opam publish 1.2.3   # after you release: open its pull request
open-opam status          # what is here of your packages, and what is waiting
open-opam revoke 1.2.3    # take a release back: opam stops installing it, it stays listed
```

Releasing is yours: your workflow, your notes, your tool. A release is published
here once it exists, and nothing here makes one. It must be immutable, with one
archive attached before it is published, named `<name>-1.2.3.tar.gz` or
`<name>-1.2.3.tbz`, holding the tag's files or, for a dune project, the tag's
files after `dune subst`, as dune-release makes it. With dune-release, publish as
a draft (`dune-release publish --draft`), then publish the draft.

`publish` checks the release against the registry's gates and opens one pull
request, which merges by itself once the checks pass. Its checklist says what to
fix for anything that fails.

`revoke` adds `Revoked on open-opam.` to the release's notes on GitHub and opens a
pull request adding a record for each of its packages. Only someone who can write
to your repository can change those notes, so that is how the registry knows the
request is yours. Once it merges, the registry makes the version unavailable within
minutes. `revoke --undo 1.2.3` takes the line out and asks for it back. A version
the registry revoked itself is its maintainer's to restore.

Only you can provide two things: CI that runs on pushes to the branch you tag, and
a `README`, an `.mli` and a test. The registry reads your CI's result and does not
run your tests.

**Names.** The first time a name is published here, the repository's permanent
number is saved in `.open-opam/owners/<name>.json`, and every later publication
must carry it. A name official opam holds can only be published from the repository
official opam names for it, and a package can be in both, in either order. Any
other name is first-come; if official opam later holds it from another repository,
its author can open [a dispute](DISPUTES.md). A fork publishes under its
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
[DISPUTES.md](DISPUTES.md).
The record formats are in [.open-opam/README.md](.open-opam/README.md).

## Licence

[CC0-1.0](LICENSE), as official opam's repository is. An author's opam file stays
the author's.
