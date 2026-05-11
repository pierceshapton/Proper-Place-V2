#!/usr/bin/env python3
"""
Compose "Proper Place" text + logo onto a background image and save output.
Usage: run from repo root: python3 scripts/compose_van_branding.py
"""

from PIL import Image, ImageDraw, ImageFont
import os
import sys

BASE_IMG = 'proper_place/assets/images/login_background.png'
LOGO_CANDIDATES = [
    'proper_place/assets/images/logo_transparent_500.png',
    'web/public/logo-512.png',
    'web/public/images/logo.png',
    'web/public/logo-192.png',
]
OUTPUT = 'proper_place/assets/van_branding.png'

FONT_CANDIDATES = [
    '/Library/Fonts/Arial Bold.ttf',
    '/Library/Fonts/Arial.ttf',
    '/Library/Fonts/Arialbd.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]


def find_logo():
    for p in LOGO_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def load_font_for_size(size):
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            try:
                return ImageFont.truetype(f, size)
            except Exception:
                continue
    # try generic name
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size)
    except Exception:
        return ImageFont.load_default()


def measure_text(draw, text, font):
    # textbbox is available on newer Pillow; fallback to textsize
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
    except Exception:
        w, h = draw.textsize(text, font=font)
    return w, h


def main():
    if not os.path.exists(BASE_IMG):
        print('Base image not found:', BASE_IMG)
        sys.exit(1)

    logo_path = find_logo()
    if not logo_path:
        print('Logo not found. Searched:', LOGO_CANDIDATES)
        sys.exit(1)

    base = Image.open(BASE_IMG).convert('RGBA')
    logo = Image.open(logo_path).convert('RGBA')
    w, h = base.size

    draw = ImageDraw.Draw(base)

    text = 'Proper Place'

    # Font size relative to image height
    font_size = max(20, int(h * 0.12))
    font = load_font_for_size(font_size)

    text_w, text_h = measure_text(draw, text, font)

    # Scale logo to match text height
    logo_h = int(text_h * 0.95)
    logo_w = int(logo.width * (logo_h / float(logo.height)))
    if logo_h <= 0 or logo_w <= 0:
        logo_h = max(20, int(h * 0.08))
        logo_w = int(logo.width * (logo_h / float(logo.height)))
    logo_resized = logo.resize((logo_w, logo_h), Image.LANCZOS)

    # Placement: left side of image with margin
    margin_x = int(w * 0.06)
    y_center = int(h * 0.45)
    y_text_top = y_center - text_h // 2
    spacing = int(w * 0.02)
    x_text = margin_x
    x_logo = x_text + text_w + spacing

    # Draw subtle shadow for text
    shadow_color = (0, 0, 0, 160)
    shadow_offset = max(1, int(font_size * 0.04))
    try:
        # shadow
        draw.text((x_text + shadow_offset, y_text_top + shadow_offset), text, font=font, fill=shadow_color)
        # main text with stroke if supported
        try:
            draw.text((x_text, y_text_top), text, font=font, fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 200))
        except TypeError:
            # older Pillow without stroke support: emulate outline
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                draw.text((x_text + dx, y_text_top + dy), text, font=font, fill=(0, 0, 0, 200))
            draw.text((x_text, y_text_top), text, font=font, fill=(255, 255, 255, 255))
    except Exception as e:
        print('Text drawing failed:', e)
        draw.text((x_text, y_text_top), text, font=font, fill=(255, 255, 255, 255))

    # Paste logo
    y_logo_top = y_center - logo_resized.size[1] // 2
    base.paste(logo_resized, (x_logo, y_logo_top), logo_resized)

    # Save output
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    base.save(OUTPUT)
    print('Saved:', OUTPUT)


if __name__ == '__main__':
    main()
