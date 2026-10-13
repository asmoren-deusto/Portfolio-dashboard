#!/usr/bin/env python3
"""
generate_icons.py
Generates high-end, premium app icons for iOS and PWA with full-bleed opaque backgrounds
(preventing Apple iOS from turning transparent corners black) and a modern glassmorphic
financial chart design with glowing cyan-to-emerald gradient trendline and beacon dot.
"""

import zlib
import struct
import math
from pathlib import Path

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public"
IOS_ICON_DIR = Path(__file__).resolve().parent.parent / "frontend" / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset"

def create_png(width: int, height: int, pixels_rgb: list[tuple[int, int, int]]) -> bytes:
    """Pack RGB pixels (24-bit, 100% full bleed opaque) into a valid PNG file."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        row_offset = y * width
        for x in range(width):
            r, g, b = pixels_rgb[row_offset + x]
            raw_data.extend((
                max(0, min(255, int(r))),
                max(0, min(255, int(g))),
                max(0, min(255, int(b)))
            ))

    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # color type 2 = Truecolor RGB
    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png.extend(chunk(b"IHDR", ihdr_data))
    png.extend(chunk(b"IDAT", zlib.compress(bytes(raw_data), level=9)))
    png.extend(chunk(b"IEND", b""))
    return bytes(png)

def render_logo(size: int) -> bytes:
    """
    Renders a stunning, premium full-bleed financial icon with a crisp white background:
    - 100% full-bleed canvas: pristine, luminous white background extending edge-to-edge.
    - Electric royal blue trending up arrow, exactly matching the web AppLogo geometry.
    - Subtle elegant depth shadow beneath the arrow to lift it off the white canvas.
    - Crisp rounded stroke caps and high-precision anti-aliasing.
    """
    pixels = []

    # Normalized coordinates exactly matching AppLogo.tsx:
    # viewBox 64x64 with <g transform="translate(14, 14) scale(1.5)">:
    # points: (2, 17) -> (8.5, 10.5) -> (13.5, 15.5) -> (22, 7)
    # arrow:  (16, 7) -> (22, 7) -> (22, 13)
    pts = [
        (17.0 / 64.0, 39.5 / 64.0),    # ~0.2656, 0.6172
        (26.75 / 64.0, 29.75 / 64.0),  # ~0.4180, 0.4648
        (34.25 / 64.0, 37.25 / 64.0),  # ~0.5352, 0.5820
        (47.0 / 64.0, 24.5 / 64.0),    # ~0.7344, 0.3828
    ]
    arrow_h = ((38.0 / 64.0, 24.5 / 64.0), (47.0 / 64.0, 24.5 / 64.0))  # (16,7) -> (22,7)
    arrow_v = ((47.0 / 64.0, 24.5 / 64.0), (47.0 / 64.0, 33.5 / 64.0))  # (22,7) -> (22,13)

    chart_segments = [
        (pts[0], pts[1]),
        (pts[1], pts[2]),
        (pts[2], pts[3]),
        arrow_h,
        arrow_v,
    ]

    # Stroke radius: 2.8 * 1.5 / 64 / 2 = ~0.0328 (full thickness ~0.0656)
    stroke_radius = size * (4.2 / 64.0 / 2.0)

    # Ambient drop shadow under the arrow
    shadow_off_x = size * 0.004
    shadow_off_y = size * 0.015
    shadow_radius = stroke_radius * 1.9

    def dist_to_segment(px, py, p1, p2):
        x1, y1 = p1[0] * size, p1[1] * size
        x2, y2 = p2[0] * size, p2[1] * size
        dx, dy = x2 - x1, y2 - y1
        if dx == 0 and dy == 0:
            return math.hypot(px - x1, py - y1)
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
        return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))

    for y in range(size):
        ny = y / size

        for x in range(size):
            nx = x / size

            # 1. Full-bleed pristine white background with ultra-faint cool pearl nuance
            diag_t = (nx * 0.4 + ny * 0.6)
            bg_r = 255.0 - 5.0 * diag_t
            bg_g = 255.0 - 4.0 * diag_t
            bg_b = 255.0 - 2.0 * diag_t

            cur_r = bg_r
            cur_g = bg_g
            cur_b = bg_b

            # 2. Soft depth shadow under the blue arrow
            shadow_d = min(dist_to_segment(x - shadow_off_x, y - shadow_off_y, s[0], s[1]) for s in chart_segments)
            if shadow_d <= shadow_radius:
                shadow_factor = ((1.0 - (shadow_d / shadow_radius)) ** 2) * 0.18
                cur_r = cur_r * (1.0 - shadow_factor) + 25.0 * shadow_factor
                cur_g = cur_g * (1.0 - shadow_factor) + 60.0 * shadow_factor
                cur_b = cur_b * (1.0 - shadow_factor) + 140.0 * shadow_factor

            # 3. Electric Royal Blue Trending Up Arrow
            min_d = min(dist_to_segment(x, y, s[0], s[1]) for s in chart_segments)

            # Gradient along the arrow: Vibrant Electric Blue (37, 99, 235) -> Deep Royal Blue (29, 78, 216)
            trend_t = max(0.0, min(1.0, (nx - 0.26) / (0.74 - 0.26)))
            line_r = 37.0 + (29.0 - 37.0) * trend_t
            line_g = 99.0 + (78.0 - 99.0) * trend_t
            line_b = 235.0 + (216.0 - 235.0) * trend_t

            # Crisp stroke with anti-aliasing
            if min_d <= stroke_radius:
                stroke_aa = 1.0 if min_d <= stroke_radius - 1.0 else max(0.0, (stroke_radius - min_d) / 1.0)
                cur_r = cur_r * (1.0 - stroke_aa) + line_r * stroke_aa
                cur_g = cur_g * (1.0 - stroke_aa) + line_g * stroke_aa
                cur_b = cur_b * (1.0 - stroke_aa) + line_b * stroke_aa

            pixels.append((
                int(max(0, min(255, cur_r))),
                int(max(0, min(255, cur_g))),
                int(max(0, min(255, cur_b)))
            ))

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

    if IOS_ICON_DIR.exists():
        print("[*] Rendering iOS native AppIcon-512@2x.png (1024x1024 full bleed)...")
        ios_png = render_logo(1024)
        (IOS_ICON_DIR / "AppIcon-512@2x.png").write_bytes(ios_png)
        print(f"[+] Saved iOS icon {IOS_ICON_DIR / 'AppIcon-512@2x.png'} ({len(ios_png)} bytes)")

if __name__ == "__main__":
    main()
