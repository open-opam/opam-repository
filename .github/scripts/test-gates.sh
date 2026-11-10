#!/bin/sh
# Each case is a pull request, the kind it is named, and whether its gate passes.
set -eu

scripts="$PWD/.github/scripts"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
git init -q -b main
git config user.name test
git config user.email test@localhost
failed=0

mkdir -p packages/foo/foo.1.0.0 packages/foo/foo.2.0.0 docs
printf 'opam-version: "2.0"\navailable: arch != "arm32"\n' > packages/foo/foo.1.0.0/opam
printf 'opam-version: "2.0"\n' > packages/foo/foo.2.0.0/opam
echo page > docs/page
git add -A
git commit -qm base

by_author='{"reason":"author-request","actor":"o/r","evidence":"https://e","revoked_at":"2026-01-01T00:00:00Z"}'
by_alice='{"reason":"security","actor":"alice","evidence":"https://e","revoked_at":"2026-01-01T00:00:00Z"}'

change() { git checkout -q -B change main; }
record() { mkdir -p .open-opam/revocations; echo "$2" > ".open-opam/revocations/$1.json"; }
publish() { mkdir -p "packages/$1/$1.1.0.0"; echo 'opam-version: "2.0"' > "packages/$1/$1.1.0.0/opam"; }

# is <case> <kind, or refused> [<pass or fail> [<permission>]]
is() {
  git add -A
  git commit -qm change
  git checkout -q main
  kind=$("$scripts/kind.sh" main change 2> /dev/null) || kind=refused
  gate=
  case "$kind" in
    revocation)
      if "$scripts/check-revocation.sh" main change alice "${4:-read}" > /dev/null; then gate=pass; else gate=fail; fi ;;
    apply)
      if "$scripts/check-apply.sh" main change > /dev/null; then gate=pass; else gate=fail; fi ;;
  esac
  if [ "$kind" = "$2" ] && [ "$gate" = "${3:-}" ] && [ -z "$(git status --porcelain)" ]; then
    echo "ok: $1"
  else
    echo "FAILED: $1: $kind $gate"; failed=1
  fi
}

change; publish bar; is "a release's opam file is a publication" publication
change; echo new > docs/page; is "a page is neither a package nor a record" other
change; publish bar; echo new > docs/page; is "a package and a page together are refused" refused
change; record foo.1.0.0 "$by_author"; is "an author's record is a record" record
change; git rm -q packages/foo/foo.2.0.0/opam; is "a deletion is left to open-opam check to refuse" record

change; record foo.1.0.0 "$by_alice"; is "a maintainer revokes" revocation pass admin
change; record foo.1.0.0 "$by_alice"; is "nobody else revokes for the registry" revocation fail read
change; record foo.1.0.0 "$(echo "$by_alice" | sed s/alice/bob/)"; is "the record names whoever made it" revocation fail admin
change; record foo.9.0.0 "$by_alice"; is "a revocation needs its version" revocation fail admin
change; record foo.1.0.0 "$by_alice"; record foo.2.0.0 "$by_author"; is "a maintainer's revocation holds no author's record" revocation fail admin

change; echo 'available: false' >> packages/foo/foo.2.0.0/opam; is "an edit no record asks for is refused" apply fail

# held <case> <author> <whom it is held to, or refused>
held() {
  git add -A
  git commit -qm change
  git checkout -q main
  actor=$("$scripts/revocation-actor.sh" main change "$2" 'app[bot]' 2> /dev/null) || actor=refused
  if [ "$actor" = "$3" ]; then echo "ok: $1"; else echo "FAILED: $1: $actor"; failed=1; fi
}

change; record foo.1.0.0 "$by_alice"; held "a revocation is held to whoever opened it" bob bob
change; record foo.1.0.0 "$by_alice"; held "the form's is held to whoever its record names" 'app[bot]' alice
change; record foo.1.0.0 '{"reason":"security"}'; held "the form's record names somebody" 'app[bot]' refused

change
if "$scripts/revoke.sh" foo "" security https://e alice > /dev/null \
  && [ "$(ls .open-opam/revocations)" = "foo.1.0.0.json
foo.2.0.0.json" ]; then
  echo "ok: the form writes a record for every version"
else
  echo "FAILED: the form writes a record for every version"; failed=1
fi
is "the form's records pass as a maintainer's" revocation pass admin
change
"$scripts/revoke.sh" foo 1.0.0 legal "A letter received on 10 November." alice
is "evidence is whatever shows why, a link or not" revocation pass admin

record foo.1.0.0 "$by_alice"
git add -A
git commit -qm "a revocation merged"

change; "$scripts/apply-records.sh"; is "the edit the records make passes" apply pass
change; "$scripts/apply-records.sh"; echo 'available: false' >> packages/foo/foo.2.0.0/opam; is "another edit beside it is refused" apply fail
change; "$scripts/apply-records.sh"; publish evil; is "a package beside it is refused" apply fail
change; "$scripts/apply-records.sh"; record foo.2.0.0 "$by_alice"; is "a record beside it is refused" apply fail

exit "$failed"
