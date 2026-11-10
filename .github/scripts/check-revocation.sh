#!/bin/sh
# Judges a maintainer's revocation. open-opam is what an author does with their
# own packages, so the registry's own revocation is judged here: whoever can
# write to this repository may make one, and the record names them.
set -eu

base=$1
head=$2
author=$3
permission=$4

case "$permission" in
  admin | write) ;;
  *)
    echo "Only a maintainer revokes for security, a legal reason or a gone release."
    exit 1
    ;;
esac

git diff --name-status --no-renames "$base...$head" | tr '\t' ' ' | while read -r status path; do
  stem=$(basename "$path" .json)
  if [ "$status" != A ] || [ "$path" != ".open-opam/revocations/$stem.json" ]; then
    echo "$path: a maintainer's revocation only adds revocation records."
    exit 1
  fi
  if ! git cat-file -e "$base:packages/${stem%%.*}/$stem/opam" 2> /dev/null; then
    echo "$path: the registry holds no such version."
    exit 1
  fi
  if ! git show "$head:$path" | jq -e --arg actor "$author" '
    (keys == ["actor", "evidence", "reason", "revoked_at"])
    and (.reason | IN("security", "legal", "upstream-gone"))
    and .actor == $actor
    and (.evidence | type == "string" and length > 0)
    and (.revoked_at | type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$"))
  ' > /dev/null; then
    echo "$path: the record holds a reason, $author as its actor, its evidence, and a time."
    exit 1
  fi
done
