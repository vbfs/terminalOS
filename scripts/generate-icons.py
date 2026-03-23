#!/usr/bin/env python3
"""
Generate macOS (.icns), Windows (.ico), and Linux PNG icons
for the AI Terminal app from scripts/icon.png.
"""

import io
import os
import shutil
import struct
import subprocess
import tempfile

from PIL import Image

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_PNG = os.path.join(ROOT, "scripts", "icon.png")
BUILD      = os.path.join(ROOT, "resources")   # safe from vite clean
ICONS_DIR  = os.path.join(BUILD, "icons")
ICONSET    = os.path.join(ICONS_DIR, "icon.iconset")


def resize(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def save_png(img: Image.Image, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")
    print(f"  {path}")


# ── Load source ──────────────────────────────────────────────────────────────
print(f"Source: {SOURCE_PNG}")
master = Image.open(SOURCE_PNG).convert("RGBA")
# Make square (crop to center if needed)
w, h = master.size
if w != h:
    side = min(w, h)
    master = master.crop(((w - side) // 2, (h - side) // 2,
                           (w + side) // 2, (h + side) // 2))
# Upsample to 1024 if smaller
if master.size[0] < 1024:
    master = master.resize((1024, 1024), Image.LANCZOS)

# ── 1. Master 1024×1024 ──────────────────────────────────────────────────────
print("\n1. Master PNG")
save_png(master, os.path.join(BUILD, "icon.png"))
save_png(master, os.path.join(ICONS_DIR, "icon-1024.png"))

# ── 2. Linux PNGs ────────────────────────────────────────────────────────────
print("\n2. Linux PNGs")
for sz in (16, 32, 48, 64, 128, 256, 512):
    save_png(resize(master, sz), os.path.join(ICONS_DIR, f"{sz}x{sz}.png"))

# ── 3. macOS .icns ───────────────────────────────────────────────────────────
print("\n3. macOS iconset")
os.makedirs(ICONSET, exist_ok=True)
for fname, sz in [
    ("icon_16x16.png",      16),
    ("icon_16x16@2x.png",   32),
    ("icon_32x32.png",      32),
    ("icon_32x32@2x.png",   64),
    ("icon_128x128.png",   128),
    ("icon_128x128@2x.png",256),
    ("icon_256x256.png",   256),
    ("icon_256x256@2x.png",512),
    ("icon_512x512.png",   512),
    ("icon_512x512@2x.png",1024),
]:
    save_png(resize(master, sz), os.path.join(ICONSET, fname))

icns_path = os.path.join(BUILD, "icon.icns")
print(f"\n  iconutil → {icns_path}")
r = subprocess.run(["iconutil", "-c", "icns", ICONSET, "-o", icns_path],
                   capture_output=True, text=True)
if r.returncode != 0:
    raise SystemExit(f"iconutil failed: {r.stderr}")
print(f"  OK ({os.path.getsize(icns_path) // 1024} KB)")

# ── 4. Windows .ico ──────────────────────────────────────────────────────────
print("\n4. Windows .ico")
ico_sizes = [16, 24, 32, 48, 64, 128, 256]
ico_path  = os.path.join(BUILD, "icon.ico")

tmp_dir = tempfile.mkdtemp()
try:
    png_paths = []
    for sz in ico_sizes:
        p = os.path.join(tmp_dir, f"icon_{sz}.png")
        resize(master, sz).save(p, "PNG")
        png_paths.append(p)

    magick = shutil.which("magick") or shutil.which("convert")
    if magick:
        r2 = subprocess.run([magick] + png_paths + [ico_path],
                            capture_output=True, text=True)
        if r2.returncode != 0:
            raise SystemExit(f"ImageMagick failed: {r2.stderr}")
        print(f"  {ico_path}  (ImageMagick, {len(ico_sizes)} sizes)")
    else:
        # Pure-Python multi-size ICO (PNG frames)
        def _ico_entry(img):
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            data = buf.getvalue()
            ww, hh = img.size
            entry = struct.pack("<BBBBHHII",
                ww if ww < 256 else 0, hh if hh < 256 else 0,
                0, 0, 1, 32, len(data), 0)
            return entry, data

        pairs   = [_ico_entry(resize(master, sz).convert("RGBA")) for sz in ico_sizes]
        entries = [p[0] for p in pairs]
        datas   = [p[1] for p in pairs]
        n       = len(entries)
        offset  = 6 + n * 16
        with open(ico_path, "wb") as f:
            f.write(struct.pack("<HHH", 0, 1, n))
            for entry, data in zip(entries, datas):
                f.write(entry[:12] + struct.pack("<I", offset))
                offset += len(data)
            for data in datas:
                f.write(data)
        print(f"  {ico_path}  ({len(ico_sizes)} sizes)")
finally:
    shutil.rmtree(tmp_dir, ignore_errors=True)

print(f"\n✓ Done.")
print(f"  macOS  → resources/icon.icns")
print(f"  Win    → resources/icon.ico")
print(f"  Linux  → resources/icons/")
print(f"  Master → resources/icon.png")
