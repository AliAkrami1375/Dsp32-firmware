#!/usr/bin/env bash
# Bundle the firmware/ tree into release-ready assets under dist/.
#
#   ./tools/pack_release.sh
#
# Produces, for each board variant:
#   dsp32-<variant>-merged.bin      single image, flashes at 0x0
#   dsp32-<variant>-separate.zip    bootloader + partition table + app
# plus SHA256SUMS.txt covering the firmware tree.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST"

cd "$ROOT/firmware"
for dir in */; do
  v="${dir%/}"
  merged="$v/dsp32-$v-merged.bin"
  [ -f "$merged" ] || { echo "skip $v — no merged image"; continue; }

  cp "$merged" "$DIST/"
  (cd "$v" && zip -q "$DIST/dsp32-$v-separate.zip" \
      bootloader.bin partition-table.bin "dsp32-$v.bin")

  printf '  ✓ %-16s merged %5s KB   zip %5s KB\n' "$v" \
    "$(( $(stat -c%s "$merged") / 1024 ))" \
    "$(( $(stat -c%s "$DIST/dsp32-$v-separate.zip") / 1024 ))"
done

cp "$ROOT/SHA256SUMS.txt" "$DIST/"

echo ""
echo "dist/ ready — $(ls "$DIST" | wc -l) assets, $(du -sh "$DIST" | cut -f1)"
