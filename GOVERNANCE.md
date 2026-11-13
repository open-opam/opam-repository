# Governance

open-opam is an opam repository where checks decide, not people. It is
complementary to official opam, and not affiliated with
`ocaml/opam-repository`.

## What the checks decide

- **Publication.** A release that passes the registry's checks is merged by
  itself. No one reviews it or approves it.
- **Names.** A name belongs to the repository that first published it here,
  by that repository's numeric GitHub ID, or to the repository official opam
  names for it.
- **An author's revocation.** An author revokes their own release with
  `open-opam revoke`, and the registry applies it within minutes.

The checks are the exact release of `open-opam/open-opam-cli` the registry
runs, so anyone can read what a release must pass and run it before
publishing.

## What a person decides

Only what no check can: revoking a version for a security or legal reason,
because its release is gone, or because it is malicious, which also blocks its
author. And settling a [dispute](DISPUTES.md). Each revocation adds a public
record of who made it, why, and the evidence.

## Changes to the registry

Changes to the registry's own workflows and documents are commits in this
repository, public in its history.
