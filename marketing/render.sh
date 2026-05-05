#!/bin/bash
# Render app-store-hero.html to a PNG using headless Chrome.
# Usage: ./render.sh
# Output: app-store-hero.png in this folder.

set -e
cd "$(dirname "$0")"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -x "$CHROME" ]; then
  echo "Google Chrome not found at $CHROME"
  exit 1
fi

if [ ! -f "phone-screenshot.png" ]; then
  echo "WARNING: phone-screenshot.png is missing in $(pwd)"
  echo "Drop the inner phone screenshot here as 'phone-screenshot.png' and re-run."
fi

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --window-size=1284,2778 \
  --screenshot="$(pwd)/app-store-hero.png" \
  --default-background-color=00000000 \
  "file://$(pwd)/app-store-hero.html"

echo "Rendered: $(pwd)/app-store-hero.png"
