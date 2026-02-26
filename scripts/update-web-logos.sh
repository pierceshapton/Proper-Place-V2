#!/bin/bash
# Update web logos from master transparent logo
# Run this script after changing proper_place/assets/images/logo_transparent_500.png

MASTER="/Users/pierceshaptonproperplace/Proper-Place-V2/proper_place/assets/images/logo_transparent_500.png"
WEB_APP="/Users/pierceshaptonproperplace/Proper-Place-V2/web/app"
WEB_PUBLIC="/Users/pierceshaptonproperplace/Proper-Place-V2/web/public"

if [ ! -f "$MASTER" ]; then
    echo "Error: Master logo not found at $MASTER"
    exit 1
fi

echo "Generating web logos from master..."

# Favicon (64x64)
magick "$MASTER" -resize 64x64 "$WEB_APP/icon.png"
echo "✓ Created icon.png (64x64)"

# Web manifest logos
magick "$MASTER" -resize 192x192 "$WEB_PUBLIC/logo-192.png"
echo "✓ Created logo-192.png"

magick "$MASTER" -resize 512x512 "$WEB_PUBLIC/logo-512.png"
echo "✓ Created logo-512.png"

echo "Done! Remember to commit and push changes."
