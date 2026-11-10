#!/bin/sh
# Judges a change to published opam files. The records decide the whole edit, so
# it is the same from anyone: the base with the pull request merged must be the
# base with its records applied, to the byte. It runs in a checkout of the
# base, and the pull request's files never reach the disk.
set -eu

base=$1
head=$2

"$(dirname "$0")/apply-records.sh"
git add -u
expected=$(git write-tree)
git reset --quiet --hard

if ! merged=$(git merge-tree --write-tree "$base" "$head"); then
  echo "The pull request does not merge into $base."
  exit 1
fi
if [ "$merged" != "$expected" ]; then
  echo "A published opam file changes only to match its records."
  exit 1
fi
