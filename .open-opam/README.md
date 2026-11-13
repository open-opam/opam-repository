# Registry records

The formats are below; [open-opam/open-opam-cli](https://github.com/open-opam/open-opam-cli)
reads and checks them.

## Owners

`owners/<name>.json` names the repository that owns a package name:

```json
{
  "github_repository_id": 123,
  "repository": "owner/name",
  "status": "active",
  "claimed_at": "2026-11-06T00:00:00Z"
}
```

`github_repository_id` is the identity, and `repository` is a display name.
`status` is `active`, or
`disputed`, which blocks new publications.

## Revocations

`revocations/<name>.<version>.json` records why a version is refused:

```json
{
  "reason": "author-request",
  "actor": "owner/name",
  "evidence": "https://github.com/owner/name/releases/tag/1.2.3",
  "revoked_at": "2026-11-09T00:00:00Z"
}
```

`reason` is `author-request` when the version's author revoked it, and then the
actor is its repository and the evidence its release; the maintainer's are
`security`, `legal` and `upstream-gone`.

## Restorations

`restorations/<name>.<version>.json` records that the author took their revocation
back, with `actor`, `evidence` and `restored_at`. The version's opam file then
holds the bytes it was published with.
