#!/usr/bin/env bash
# Dsp32 one-shot flasher — picks the right image and offset for you.
#
#   ./flash.sh                       # asks which board, finds the port
#   ./flash.sh esp32 /dev/ttyUSB0    # non-interactive
#   ./flash.sh --erase esp32         # wipe the chip first (clears saved Wi-Fi)
#
# Needs esptool:  pip install esptool

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ERASE=0

for a in "$@"; do
  [ "$a" = "--erase" ] && ERASE=1
done
set -- "${@/--erase/}"
set -- $(echo "$@")

VARIANT="${1:-}"
PORT="${2:-}"

BOARDS=(esp32 esp32cam esp32s2 esp32s3 xiao_s3_sense esp32c3 esp32c6)
chip_of() {
  case "$1" in
    esp32|esp32cam)        echo esp32   ;;
    esp32s2)               echo esp32s2 ;;
    esp32s3|xiao_s3_sense) echo esp32s3 ;;
    esp32c3)               echo esp32c3 ;;
    esp32c6)               echo esp32c6 ;;
    *) return 1 ;;
  esac
}

command -v esptool.py >/dev/null 2>&1 || {
  echo "esptool not found.  Install it with:  pip install esptool"; exit 1; }

# ---- board -----------------------------------------------------------------
if [ -z "$VARIANT" ]; then
  echo "Which board do you have?"
  echo "   1) Generic ESP32 (DevKit, WROOM, WROVER)"
  echo "   2) AI-Thinker ESP32-CAM          (camera + SD)"
  echo "   3) ESP32-S2"
  echo "   4) Generic ESP32-S3"
  echo "   5) Seeed XIAO ESP32S3 Sense      (camera + SD)"
  echo "   6) ESP32-C3"
  echo "   7) ESP32-C6"
  read -rp "> " n
  VARIANT="${BOARDS[$((n - 1))]:-}"
fi

CHIP=$(chip_of "$VARIANT") || { echo "unknown board: $VARIANT"; exit 1; }
IMG="$ROOT/firmware/$VARIANT/dsp32-$VARIANT-merged.bin"
[ -f "$IMG" ] || { echo "missing image: $IMG"; exit 1; }

# ---- port ------------------------------------------------------------------
if [ -z "$PORT" ]; then
  mapfile -t ports < <(ls /dev/ttyUSB* /dev/ttyACM* /dev/cu.usbserial* /dev/cu.SLAB* 2>/dev/null)
  case ${#ports[@]} in
    0) echo "No serial port found. Plug the board in, or pass one: ./flash.sh $VARIANT /dev/ttyUSB0"; exit 1 ;;
    1) PORT="${ports[0]}" ;;
    *) echo "Several ports found:"; printf '   %s\n' "${ports[@]}"
       read -rp "which one? > " PORT ;;
  esac
fi

echo ""
echo "  board   $VARIANT  ($CHIP)"
echo "  image   $(basename "$IMG")  ($(( $(stat -c%s "$IMG" 2>/dev/null || stat -f%z "$IMG") / 1024 )) KB)"
echo "  port    $PORT"
echo ""

if [ "$ERASE" = 1 ]; then
  echo "▸ erasing flash (this also clears saved Wi-Fi settings)"
  esptool.py --chip "$CHIP" -p "$PORT" erase_flash
fi

echo "▸ writing at 0x0"
esptool.py --chip "$CHIP" -p "$PORT" -b 460800 write_flash \
  --flash_mode dio --flash_freq 40m --flash_size 4MB 0x0 "$IMG"

cat <<'EOF'

  ✓ Done. Press the board's RESET button, then:

     1. Join the Wi-Fi network   Dibachain
        password                 dsp32pass
     2. The desktop should open by itself.
        If not, browse to  http://10.3.2.1

EOF
