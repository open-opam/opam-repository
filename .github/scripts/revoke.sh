#!/bin/sh
# Writes a maintainer's revocation record for one version of a package, or for
# every version that has none when the version is empty. A malicious one also
# blocks the account that owns the package's repository.
set -eu

name=$1
version=$2
reason=$3
evidence=$4
actor=$5

case "$name" in *[!A-Za-z0-9_+-]* | '') echo "$name is not a package name."; exit 1 ;; esac
case "$version" in *[!A-Za-z0-9_.+~-]*) echo "$version is not a version."; exit 1 ;; esac
case "$evidence" in '') echo "A revocation says what shows why."; exit 1 ;; esac
if [ ! -d "packages/$name" ]; then
  echo "The registry holds no package named $name."
  exit 1
fi

now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
mkdir -p .open-opam/revocations
added=0
for dir in "packages/$name/$name".${version:-*}; do
  if [ ! -f "$dir/opam" ]; then
    echo "The registry holds no $name $version."
    exit 1
  fi
  record=".open-opam/revocations/$(basename "$dir").json"
  if [ -f "$record" ]; then continue; fi
  jq -cn --arg reason "$reason" --arg actor "$actor" --arg evidence "$evidence" --arg at "$now" \
    '{reason: $reason, actor: $actor, evidence: $evidence, revoked_at: $at}' > "$record"
  added=$((added + 1))
done

# A version revoked before, for another reason, still blocks its author.
if [ "$reason" = malicious ]; then
  set -- $("$(dirname "$0")/owner-account.sh" "$name")
  block=".open-opam/blocked/$1.json"
  if [ ! -f "$block" ]; then
    mkdir -p .open-opam/blocked
    jq -cn --arg account "$2" --arg actor "$actor" --arg evidence "$evidence" --arg at "$now" \
      '{account: $account, actor: $actor, evidence: $evidence, blocked_at: $at}' > "$block"
    added=$((added + 1))
  fi
fi

if [ "$added" -eq 0 ]; then
  echo "$name ${version:-in every version} is already revoked."
  exit 1
fi
