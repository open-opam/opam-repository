#!/bin/sh
# Each case is an opam file before a revocation and after it.
set -eu

script="$PWD/.github/scripts/apply-record.sh"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
git init -q -b main
failed=0

revokes() {
  mkdir -p packages/foo/foo.1.0.0 .open-opam/revocations
  printf '%b' "$2" > packages/foo/foo.1.0.0/opam
  "$script" .open-opam/revocations/foo.1.0.0.json
  if [ "$(cat packages/foo/foo.1.0.0/opam)" = "$(printf '%b' "$3")" ]; then
    echo "ok: $1"
  else
    echo "FAILED: $1"; cat packages/foo/foo.1.0.0/opam; failed=1
  fi
}

revokes "no condition before" \
  'opam-version: "2.0"\n' \
  'opam-version: "2.0"\navailable: false'
revokes "a condition is replaced" \
  'opam-version: "2.0"\navailable: arch != "arm32"\nlicense: "MIT"\n' \
  'opam-version: "2.0"\nlicense: "MIT"\navailable: false'
revokes "a condition over several lines is replaced" \
  'opam-version: "2.0"\navailable: [\n  arch != "arm32"\n]\nlicense: "MIT"\n' \
  'opam-version: "2.0"\nlicense: "MIT"\navailable: false'
revokes "a condition before a section is replaced" \
  'opam-version: "2.0"\navailable: os != "win32"\nurl {\n  src: "x"\n}\n' \
  'opam-version: "2.0"\nurl {\n  src: "x"\n}\navailable: false'
revokes "revoking twice changes nothing" \
  'opam-version: "2.0"\navailable: false\n' \
  'opam-version: "2.0"\navailable: false'

# A restoration returns the bytes first published.
printf 'opam-version: "2.0"\navailable: arch != "arm32"\n' > packages/foo/foo.1.0.0/opam
git add . && git -c user.name=t -c user.email=t@t commit -qm publish
"$script" .open-opam/revocations/foo.1.0.0.json
"$script" .open-opam/restorations/foo.1.0.0.json
if [ "$(cat packages/foo/foo.1.0.0/opam)" = "$(printf 'opam-version: "2.0"\navailable: arch != "arm32"')" ]; then
  echo "ok: a restoration returns the published bytes"
else
  echo "FAILED: a restoration returns the published bytes"; failed=1
fi

exit "$failed"
