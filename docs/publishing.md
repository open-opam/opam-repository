# Publishing a release

A release is published with no account, no token and no reviewer, if it passes
the registry's checks. Each check is explained by the message it gives.

## Set up your repository, once

1. Turn on immutable releases: Settings, then General, then Releases.
2. Run CI on pushes to the branch you tag, not only on pull requests. The
   registry reads the results on the tagged commit.
3. Say that you offer your releases here, by adding this line to each opam file.
   With dune, put it in `<package>.opam.template` beside the opam file:

   ```
   x-open-opam: true
   ```

4. Add this workflow as `.github/workflows/release.yml`. An immutable release
   locks its files when it is published, so the archive is attached while the
   release is a draft.

   ```yaml
   name: release

   on:
     push:
       tags: ["*"]

   permissions:
     contents: write

   jobs:
     release:
       runs-on: ubuntu-24.04
       env:
         GH_TOKEN: ${{ github.token }}
         TAG: ${{ github.ref_name }}
       steps:
         - uses: actions/checkout@v5
         - run: |
             repo="${GITHUB_REPOSITORY#*/}"
             version="${TAG#v}"
             archive="$repo-$version.tar.gz"
             git archive --format=tar --prefix="$repo-$version/" "$TAG" | gzip -n -9 > "$archive"
             gh release create "$TAG" --draft --title "$TAG" --notes "" --verify-tag
             gh release upload "$TAG" "$archive"
             gh release edit "$TAG" --draft=false
   ```

## Publish

Tag only a commit whose CI is already green. A release cannot be fixed once it is
published, so a refused release means a new version.

```sh
git tag 1.2.3 && git push origin 1.2.3
open-opam check --tag 1.2.3
open-opam publish --tag 1.2.3
```

`publish` opens one pull request, and it merges by itself once the checks pass.

## What a release must have

- A published, immutable GitHub release, with the archive `<repo>-<version>.tar.gz`
  holding exactly the files of the tag.
- `x-open-opam: true` in every opam file at the tag, with the repository as its
  `dev-repo`, and no `url` block or `x-commit-hash`, which the registry writes.
- A `dune-project`, a non-empty `README`, at least one `.mli` and at least one
  test, and `synopsis`, `maintainer`, `license` and `dev-repo` in the opam file.
- CI on the tagged commit that has finished, with at least one success and nothing
  failed. An unrelated red job blocks a release until it is fixed or rerun.
- A package that installs on a clean Ubuntu machine. The registry does not run
  your tests; your CI does.

## Who owns a name

The first time a name is published here, the repository's permanent number is
saved in `.open-opam/owners/<name>.json`, and every later publication must carry
it. A rename keeps the number, and an address someone registers again gets another.

- **A name official opam holds** can only be published from the repository official
  opam names for it. A package can be kept in both, published in either order.
- **Any other name** is first come. If official opam later holds it from another
  repository, official opam wins, and the versions here are revoked.
- **A fork** publishes under its own name. A drop-in replacement is a consumer's
  choice, with `opam pin`.

One gap is known: an abandoned repository that someone took over before its name
was first published here would be trusted. [DISPUTES.md](../DISPUTES.md) is the
answer to that.
