#!/bin/sh
# Makes every opam file match its records: a version with a revocation and no
# restoration is unavailable, and a restored one holds the bytes it was
# published with. Making a file match twice changes nothing.
set -eu

for record in .open-opam/revocations/*.json .open-opam/restorations/*.json; do
  [ -f "$record" ] || continue
  case "$record" in
    .open-opam/revocations/*)
      if [ -f ".open-opam/restorations/$(basename "$record")" ]; then continue; fi ;;
  esac
  "$(dirname "$0")/apply-record.sh" "$record"
done
