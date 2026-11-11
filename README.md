# open-opam

Self-service opam repository. Open OCaml publishing for humans and agents.

**Catalogue**: [open-opam.github.io/opam-repository](https://open-opam.github.io/opam-repository/)

## Install

```sh
opam repo add open-opam https://github.com/open-opam/opam-repository.git
opam install <package>
```

## Publish

[open-opam](https://github.com/open-opam/open-opam-cli) is the CLI to publish and manage your packages on open-opam.

```sh
opam install open-opam
open-opam init
open-opam release 1.2.3
open-opam publish 1.2.3
```

The registry checks each release and merges it if it passes. No person reviews a package. [How publishing works](https://open-opam.github.io/opam-repository/publish/)
