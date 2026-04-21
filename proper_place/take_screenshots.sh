#!/bin/bash
#
# App Store Screenshot Script for Proper Place
# ==============================================
# 
# REQUIRED SIZES (Apple App Store):
#   6.7" iPhone (required): 1290 x 2796  — iPhone 15 Pro Max / 16 Pro Max
#   6.5" iPhone (required): 1242 x 2688  — iPhone 11 Pro Max / XS Max  
#   6.9" iPhone (optional): 1320 x 2868  — iPhone 16 Pro Max / 17 Pro Max
#   12.9" iPad (optional):  2048 x 2732  — iPad Pro 12.9"
#
# You need 3-10 screenshots per size. Recommended screens to capture:
#   1. Home/Browse screen (shows main value proposition)
#   2. Map view (location-based discovery)
#   3. Place detail page (shows listing info, photos, reviews)
#   4. Booking flow (shows ease of booking)
#   5. Profile/Account screen
#
# HOW TO USE:
#   1. Run the app first:  flutter run -d 5EDB0CA7
#   2. Navigate to the screen you want to capture
#   3. Run:  ./take_screenshots.sh <name>
#      Example:  ./take_screenshots.sh home
#                ./take_screenshots.sh map
#                ./take_screenshots.sh place_detail
#                ./take_screenshots.sh booking
#                ./take_screenshots.sh profile
#
# The script captures from the booted simulator and resizes to all required dimensions.
#

set -e

SCREEN_NAME="${1:-screenshot}"
OUTPUT_DIR="$HOME/Desktop/AppStoreScreenshots"
SIMULATOR_ID="5EDB0CA7-06F4-4729-829A-9BE58E677B30"

mkdir -p "$OUTPUT_DIR/6.7-inch" "$OUTPUT_DIR/6.5-inch" "$OUTPUT_DIR/raw"

# Capture from booted simulator
RAW="$OUTPUT_DIR/raw/${SCREEN_NAME}_raw.png"
xcrun simctl io "$SIMULATOR_ID" screenshot "$RAW"
echo "Captured raw screenshot: $RAW"

# Get raw dimensions
RAW_W=$(sips -g pixelWidth "$RAW" | tail -1 | awk '{print $2}')
RAW_H=$(sips -g pixelHeight "$RAW" | tail -1 | awk '{print $2}')
echo "Raw size: ${RAW_W}x${RAW_H}"

# 6.7" iPhone (1290 x 2796) — REQUIRED
sips -z 2796 1290 "$RAW" --out "$OUTPUT_DIR/6.7-inch/${SCREEN_NAME}.png" >/dev/null
echo "Created 6.7\" (1290x2796): $OUTPUT_DIR/6.7-inch/${SCREEN_NAME}.png"

# 6.5" iPhone (1242 x 2688) — REQUIRED  
sips -z 2688 1242 "$RAW" --out "$OUTPUT_DIR/6.5-inch/${SCREEN_NAME}.png" >/dev/null
echo "Created 6.5\" (1242x2688): $OUTPUT_DIR/6.5-inch/${SCREEN_NAME}.png"

echo ""
echo "Done! Screenshot '${SCREEN_NAME}' saved to: $OUTPUT_DIR"
echo ""
echo "Suggested screens to capture:"
echo "  ./take_screenshots.sh 01_home"
echo "  ./take_screenshots.sh 02_map"
echo "  ./take_screenshots.sh 03_place_detail"
echo "  ./take_screenshots.sh 04_booking"
echo "  ./take_screenshots.sh 05_profile"
