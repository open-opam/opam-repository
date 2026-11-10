<h1>
  <img src="docs/public/logo.svg" alt="" width="64" align="left">&nbsp;open-opam
</h1>

Self-service opam repository. Open OCaml publishing for humans and agents.

**Catalogue**: [open-opam.github.io/opam-repository](https://open-opam.github.io/opam-repository/)

## Install

```sh
opam repo add open-opam https://github.com/open-opam/opam-repository.git
opam install <package>
```

## Publish

```sh
opam install open-opam
open-opam init
open-opam release 1.2.3
open-opam publish 1.2.3
```

What a release needs: [publishing](https://open-opam.github.io/opam-repository/publish/).

## Licence

[CC0-1.0](LICENSE)
