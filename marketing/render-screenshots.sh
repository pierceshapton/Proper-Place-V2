#!/bin/bash
# Render all screenshots for App Store sizes:
# - iPhone 6.5-inch (1242x2688)
# - iPad 13-inch   (2064x2752)
#
# Output folders:
#   ./6.5-inch/screenshot-1.png ...
#   ./13-inch/screenshot-1.png ...
#
# Usage:
#   ./render-screenshots.sh        -> render all slides for both sizes
#   ./render-screenshots.sh 0      -> render only slide index 0 for both sizes

set -e
cd "$(dirname "$0")"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TEMPLATE="$(pwd)/screenshot-template.html"

if [ ! -x "$CHROME" ]; then
  echo "ERROR: Google Chrome not found at:"
  echo "  $CHROME"
  exit 1
fi

# Count slides by counting title entries inside the SCREENSHOTS block only
SLIDE_COUNT=$(awk '
  /const SCREENSHOTS = \[/ { in_block=1; next }
  in_block && /\];/ { in_block=0; exit }
  in_block && /^[[:space:]]*title:[[:space:]]/ { count++ }
  END { print count+0 }
' "$TEMPLATE")
if [ "$SLIDE_COUNT" -eq 0 ]; then
  echo "ERROR: Could not detect slides in screenshot-template.html"
  exit 1
fi

if [ -n "$1" ]; then
  START=$1
  END=$1
else
  START=0
  END=$((SLIDE_COUNT - 1))
fi

echo "Found $SLIDE_COUNT screenshot(s)."

render_set() {
  local profile="$1"
  local label="$2"
  local w="$3"
  local h="$4"
  local outdir="$(pwd)/$label"

  mkdir -p "$outdir"
  rm -f "$outdir"/screenshot-*.png
  echo ""
  echo "Rendering $label (${w}x${h})..."

  for i in $(seq "$START" "$END"); do
    local out="$outdir/screenshot-$((i+1)).png"
    local url="file://${TEMPLATE}?slide=${i}&profile=${profile}"

    echo "  Slide $((i+1)) -> $label/screenshot-$((i+1)).png"

    "$CHROME" \
      --headless=new \
      --disable-gpu \
      --hide-scrollbars \
      --window-size="${w},${h}" \
      --screenshot="$out" \
      --default-background-color=00000000 \
      "$url" >/dev/null 2>&1
  done
}

render_set "iphone65" "6.5-inch" 1242 2688
render_set "ipad13" "13-inch" 2064 2752

echo ""
echo "Done. Output files:"
ls -lh "$(pwd)/6.5-inch"/screenshot-*.png 2>/dev/null || true
ls -lh "$(pwd)/13-inch"/screenshot-*.png 2>/dev/null || true
