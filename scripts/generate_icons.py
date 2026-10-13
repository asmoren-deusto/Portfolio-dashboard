#!/usr/bin/env python3
"""
generate_icons.py
Generates crisp PNG app icons (180x180, 192x192, 512x512) for iOS and PWA
using pure Python standard library (zlib + struct) without external dependencies.
"""

import zlib
import struct
import math
from pathlib import Path

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public"

def create_png(width: int, height: int, pixels_rgba: list[tuple[int, int, int, int]]) -> bytes:
    """Pack RGBA pixels into a valid PNG file byte string."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        row_offset = y * width
        for x in range(width):
            r, g, b, a = pixels_rgba[row_offset + x]
            raw_data.extend((r, g, b, a))

    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png.extend(chunk(b"IHDR", ihdr_data))
    png.extend(chunk(b"IDAT", zlib.compress(bytes(raw_data), level=9)))
    png.extend(chunk(b"IEND", b""))
    return bytes(png)

def render_logo(size: int) -> bytes:
    """Render the official PortfolioPro squircle with gradient & white arrow."""
    pixels = []
    radius = size * 0.25  # smooth squircle corner
    margin = size * 0.03
    inner_w = size - 2 * margin
    inner_h = size - 2 * margin

    # Precalculate arrow line segments (normalized coordinates 0 to 1)
    # Arrow polyline: (0.20, 0.70) -> (0.42, 0.48) -> (0.58, 0.64) -> (0.80, 0.32)
    # Arrow tip: (0.64, 0.32) -> (0.80, 0.32) -> (0.80, 0.48)
    line1 = ((0.22, 0.68), (0.44, 0.46))
    line2 = ((0.44, 0.46), (0.58, 0.60))
    line3 = ((0.58, 0.60), (0.78, 0.34))
    tip_h = ((0.62, 0.34), (0.78, 0.34))
    tip_v = ((0.78, 0.34), (0.78, 0.50))
    segments = [line1, line2, line3, tip_h, tip_v]
    stroke_width = size * 0.052

    def dist_to_segment(px, py, p1, p2):
        x1, y1 = p1[0] * size, p1[1] * size
        x2, y2 = p2[0] * size, p2[1] * size
        dx = x2 - x1
        dy = y2 - y1
        if dx == 0 and dy == 0:
            return math.hypot(px - x1, py - y1)
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
        proj_x = x1 + t * dx
        proj_y = y1 + t * dy
        return math.hypot(px - proj_x, py - proj_y)

    for y in range(size):
        # Linear gradient: #3b82f6 (59, 130, 246) -> #2563eb (37, 99, 235) -> #1d4ed8
        t_y = y / size
        bg_r = int(59 + (29 - 59) * t_y)
        bg_g = int(130 + (78 - 130) * t_y)
        bg_b = int(246 + (216 - 246) * t_y)

        for x in range(size):
            # Check rounded rectangle
            dx = max(0.0, max(margin + radius - x, x - (size - margin - radius)))
            dy = max(0.0, max(margin + radius - y, y - (size - margin - radius)))
            dist_sq = dx * dx + dy * dy

            if dist_sq > radius * radius:
                # Outside squircle
                pixels.append((0, 0, 0, 0))
                continue

            # Anti-aliasing edge
            alpha = 255
            corner_dist = math.sqrt(dist_sq)
            if corner_dist > radius - 1.0:
                alpha = int(max(0, min(255, (radius - corner_dist) * 255)))

            # Check distance to arrow segments
            min_d = min(dist_to_segment(x, y, s[0], s[1]) for s in segments)

            if min_d <= stroke_width:
                # White arrow with anti-aliasing
                arrow_alpha = 1.0 if min_d <= stroke_width - 1.0 else (stroke_width - min_d)
                r = int(bg_r * (1 - arrow_alpha) + 255 * arrow_alpha)
                g = int(bg_g * (1 - arrow_alpha) + 255 * arrow_alpha)
                b = int(bg_b * (1 - arrow_alpha) + 255 * arrow_alpha)
                pixels.append((r, g, b, alpha))
            else:
                pixels.append((bg_r, bg_g, bg_b, alpha))

    return create_png(size, size, pixels)

def main():
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    targets = {
        "apple-touch-icon.png": 180,
        "icon-180.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }

    for filename, dim in targets.items():
        out_path = PUBLIC_DIR / filename
        print(f"[*] Rendering {filename} ({dim}x{dim})...")
        png_bytes = render_logo(dim)
        out_path.write_bytes(png_bytes)
        print(f"[+] Saved {out_path} ({len(png_bytes)} bytes)")

    # Generate iOS Native Xcode AppIcon (1024x1024)
    ios_icon_dir = Path(__file__).resolve().parent.parent / "frontend" / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset"
    if ios_icon_dir.exists():
        print("[*] Rendering iOS native AppIcon-512@2x.png (1024x1024)...")
        ios_png = render_logo(1024)
        (ios_icon_dir / "AppIcon-512@2x.png").write_bytes(ios_png)
        print(f"[+] Saved iOS icon {ios_icon_dir / 'AppIcon-512@2x.png'} ({len(ios_png)} bytes)")

if __name__ == "__main__":
    main()
