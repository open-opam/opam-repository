#!/bin/sh
# Names what a pull request changes, which alone decides how it is judged:
#   publication  it adds a release's opam files
#   record       it adds an author's records
#   revocation   it adds a maintainer's revocation records, or blocks
#   apply        it changes published opam files
#   other        it touches no package and no record
# A pull request that mixes packages or records with anything else is refused.
set -eu

base=$1
head=$2

changes() { git diff --name-status --no-renames "$base...$head" | tr '\t' ' '; }
added() { git diff --name-only --diff-filter=A "$base...$head" -- "$1"; }

# Git quotes a path with unusual bytes, so the quote is allowed for. The records'
# README is a document, which a maintainer merges like any.
data=$(changes | grep -cE '^[A-Z] "?(packages|\.open-opam/(owners|revocations|restorations|blocked))/' || true)
if [ "$data" -eq 0 ]; then
  echo other
  exit 0
fi
if [ "$data" -ne "$(changes | wc -l)" ]; then
  echo "A pull request changes the registry's packages and records, or everything else, not both." >&2
  exit 1
fi
if [ -n "$(changes | grep -E '^M packages/[^/]+/[^/]+/opam$')" ]; then
  echo apply
  exit 0
fi
if [ -n "$(added 'packages/*/*/opam')" ]; then
  echo publication
  exit 0
fi
if [ -n "$(added '.open-opam/blocked/*.json')" ]; then
  echo revocation
  exit 0
fi
for record in $(added '.open-opam/revocations/*.json'); do
  if git show "$head:$record" | jq -e '.reason | IN("security", "legal", "gone", "malicious")' > /dev/null 2>&1; then
    echo revocation
    exit 0
  fi
done
echo record
