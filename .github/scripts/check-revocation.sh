#!/bin/sh
# Judges a maintainer's revocation. open-opam is what an author does with their
# own packages, so the registry's own revocation is judged here: whoever can
# write to this repository may make one, and the record names them. A version
# revoked as malicious needs its author blocked beside it.
set -eu

base=$1
head=$2
author=$3
permission=$4

case "$permission" in
  admin | write) ;;
  *)
    echo "Only a maintainer revokes for security, a legal reason, a gone release or a malicious package."
    exit 1
    ;;
esac

time='^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$'

git diff --name-status --no-renames "$base...$head" | tr '\t' ' ' | while read -r status path; do
  stem=$(basename "$path" .json)
  if [ "$status" != A ]; then
    echo "$path: a maintainer's revocation only adds records."
    exit 1
  fi
  case "$path" in
    ".open-opam/revocations/$stem.json")
      name=${stem%%.*}
      if ! git cat-file -e "$base:packages/$name/$stem/opam" 2> /dev/null; then
        echo "$path: the registry holds no such version."
        exit 1
      fi
      if ! git show "$head:$path" | jq -e --arg actor "$author" --arg time "$time" '
        (keys == ["actor", "evidence", "reason", "revoked_at"])
        and (.reason | IN("security", "legal", "gone", "malicious"))
        and .actor == $actor
        and (.evidence | type == "string" and length > 0)
        and (.revoked_at | type == "string" and test($time))
      ' > /dev/null; then
        echo "$path: the record holds a reason, $author as its actor, its evidence, and a time."
        exit 1
      fi
      if git show "$head:$path" | jq -e '.reason == "malicious"' > /dev/null; then
        account=$("$(dirname "$0")/owner-account.sh" "$name" | cut -d' ' -f1)
        if ! git cat-file -e "$head:.open-opam/blocked/$account.json" 2> /dev/null; then
          echo "$path: a malicious package's author is blocked beside it, in .open-opam/blocked/$account.json."
          exit 1
        fi
      fi
      ;;
    ".open-opam/blocked/$stem.json")
      case "$stem" in
        '' | *[!0-9]* | 0?*)
          echo "$path: a block is named for the account's numeric GitHub ID."
          exit 1
          ;;
      esac
      if ! git show "$head:$path" | jq -e --arg actor "$author" --arg time "$time" '
        (keys == ["account", "actor", "blocked_at", "evidence"])
        and (.account | type == "string" and length > 0)
        and .actor == $actor
        and (.evidence | type == "string" and length > 0)
        and (.blocked_at | type == "string" and test($time))
      ' > /dev/null; then
        echo "$path: the block holds the account, $author as its actor, its evidence, and a time."
        exit 1
      fi
      ;;
    *)
      echo "$path: a maintainer's revocation only adds revocation records and blocks."
      exit 1
      ;;
  esac
done
