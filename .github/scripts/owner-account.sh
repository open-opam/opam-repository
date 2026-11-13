#!/bin/sh
# Prints the numeric GitHub ID and the login of the account that owns a
# package's repository, as its owners record names it. A malicious repository
# is often deleted soon after, so its owner is then found by the record's
# display name.
set -eu

name=$1
owners=".open-opam/owners/$name.json"

id=$(jq -r '.github_repository_id' "$owners")
if ! gh api "repositories/$id" --jq '"\(.owner.id) \(.owner.login)"' 2> /dev/null; then
  login=$(jq -r '.repository | split("/")[0]' "$owners")
  gh api "users/$login" --jq '"\(.id) \(.login)"'
fi
