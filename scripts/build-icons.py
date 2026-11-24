#!/usr/bin/env python3
"""Build the install icons and favicons from the camera sticker.

The camera sticker (art-src/camera.png) sits on the grape tile from DESIGN.md
with the design system's hard offset shadow. Outputs in public/:

  icon-192.png, icon-512.png       manifest "any" icons
  icon-maskable-512.png            manifest "maskable" icon: subject kept inside the 80% safe zone
  apple-touch-icon.png             180 px and fully opaque, because iOS paints transparency black
  favicon-32.png, favicon-16.png   browser tabs; Safari does not use SVG favicons

Needs Pillow (python3 -m pip install Pillow). pngquant is optional; it takes
the large icons to 256 colours at about a third of the size with no visible
change.

  python3 scripts/build-icons.py
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
STICKER = ROOT / 'art-src' / 'camera.png'
PUBLIC = ROOT / 'public'
GRAPE, INK = (122, 108, 240), (46, 36, 89)
ANY_FILL = 0.72                     # visible sticker as a share of the tile
MASKABLE_SAFE_RADIUS = 0.40         # half of the 80% circle launchers may crop to
LENS_AND_BODY = (54, 45, 458, 318)  # the camera without its printing photo, readable at 16 px


def subject(fill, size, focus=None):
    """The sticker and its hard offset shadow on a transparent tile-sized layer.

    `fill` is the share of `size` spanned by `focus` (default: the sticker's
    visible bounds), and the layer is centred on it. Returns the layer and the
    subject's farthest reach from the tile centre, as a share of the tile.
    """
    sticker = Image.open(STICKER).convert('RGBA')
    left, top, right, bottom = focus or sticker.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()
    scale = fill * size / max(right - left, bottom - top)
    sticker = sticker.resize((round(sticker.width * scale), round(sticker.height * scale)), Image.LANCZOS)
    x = round(size / 2 - (left + right) / 2 * scale)
    y = round(size / 2 - (top + bottom) / 2 * scale)
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    shadow = Image.new('RGBA', sticker.size, INK + (0,))
    shadow.putalpha(sticker.getchannel('A').point(lambda v: round(v * 0.28)))
    layer.alpha_composite(shadow, (x + round(size * 0.018), y + round(size * 0.028)))
    layer.alpha_composite(sticker, (x, y))
    alpha = layer.getchannel('A').tobytes()
    reach = max(((i % size - size / 2) ** 2 + (i // size - size / 2) ** 2) ** 0.5 for i, v in enumerate(alpha) if v > 96) / size
    return layer, reach


def tile(size, fill, radius=0, focus=None):
    """Compose at 2x and reduce once, so the tile edge and the sticker stay clean."""
    layer, _ = subject(fill, 2 * size, focus)
    icon = Image.new('RGBA', (2 * size, 2 * size), GRAPE + (255,))
    icon.alpha_composite(layer)
    if radius:
        mask = Image.new('L', icon.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0) + icon.size, radius=round(radius * 2 * size), fill=255)
        icon.putalpha(mask)
    return icon.resize((size, size), Image.LANCZOS)


def quantize(png):
    with tempfile.TemporaryDirectory(dir=png.parent) as directory:
        out = Path(directory) / png.name
        subprocess.run(['pngquant', '--force', '--speed', '1', '--output', str(out), str(png)], check=True, capture_output=True)
        os.replace(out, png)


def main():
    if not STICKER.exists():
        sys.exit(f'Missing {STICKER}')
    probe = 0.70
    _, reach = subject(probe, 512)
    maskable_fill = MASKABLE_SAFE_RADIUS * probe / reach
    icons = [
        ('icon-192.png', 192, ANY_FILL, 0, None),
        ('icon-512.png', 512, ANY_FILL, 0, None),
        ('icon-maskable-512.png', 512, maskable_fill, 0, None),
        ('apple-touch-icon.png', 180, ANY_FILL, 0, None),
        ('favicon-32.png', 32, 0.96, 0.22, LENS_AND_BODY),
        ('favicon-16.png', 16, 0.96, 0.22, LENS_AND_BODY),
    ]
    for name, size, fill, radius, focus in icons:
        png = PUBLIC / name
        tile(size, fill, radius, focus).save(png, optimize=True)
        if size >= 128 and shutil.which('pngquant'):
            quantize(png)
        print(f'{name:24} {size:3} px  {png.stat().st_size / 1024:6.1f} KB')
    print(f'The maskable sticker spans {maskable_fill:.0%} of the tile, so nothing reaches past the 80% safe zone.')


if __name__ == '__main__':
    main()
