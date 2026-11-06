# Registry records

Each record's JSON Schema is printed by `open-opam schema`, from
[open-opam/open-opam-cli](https://github.com/open-opam/open-opam-cli).

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

`revocations/<name>.<version>.json` records why a version is refused, with its
reason, the actor, the evidence and the time.
