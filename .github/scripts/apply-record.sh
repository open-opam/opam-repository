#!/bin/sh
# Makes one version's opam file match a record a merge added. A revocation
# replaces the version's condition with "available: false", which opam refuses
# while still listing the version; a restoration returns the file to the bytes
# it was first published with, which git's history keeps.
set -eu

record=$1
version_dir=$(basename "$record" .json)
name=${version_dir%%.*}
opam="packages/$name/$version_dir/opam"
test -f "$opam"

case "$record" in
  .open-opam/revocations/*.json)
    # A field starts at the line's start with its name; anything else continues
    # the one before it, so the old condition ends where the next field starts.
    awk '
      /^available[ \t]*:/ { skipping = 1; next }
      skipping && /^[A-Za-z_][A-Za-z0-9_-]*[ \t]*(:|\{)/ { skipping = 0 }
      !skipping { print }
      END { print "available: false" }
    ' "$opam" > "$opam.new"
    mv "$opam.new" "$opam"
    ;;
  .open-opam/restorations/*.json)
    first=$(git log --reverse --diff-filter=A --format=%H -- "$opam" | head -n 1)
    git show "$first:$opam" > "$opam"
    ;;
  *)
    echo "$record is not a record." >&2
    exit 1
    ;;
esac
