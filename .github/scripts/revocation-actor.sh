#!/bin/sh
# Names whom a maintainer's revocation is held to: whoever opened the pull
# request, or, when the registry's App opened it for the form, whoever its
# records name. The App acts only through main's workflows, and only someone
# who can write to this repository can start the form.
set -eu

base=$1
head=$2
author=$3
app=$4

if [ "$author" != "$app" ]; then
  echo "$author"
  exit 0
fi
record=$(git diff --name-only --diff-filter=A "$base...$head" -- '.open-opam/revocations/*.json' | head -n 1)
actor=$(git show "$head:$record" | jq -r '.actor | strings')
case "$actor" in
  *[!A-Za-z0-9-]* | '')
    echo "The record names nobody." >&2
    exit 1
    ;;
esac
echo "$actor"
