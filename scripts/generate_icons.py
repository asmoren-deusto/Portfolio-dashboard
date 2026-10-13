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
    Renders a stunning, luxury full-bleed financial icon:
    - 100% full-bleed canvas: the background extends edge-to-edge (no inner cards or rounded borders).
    - Deep royal navy & sapphire gradient backdrop with subtle central ambient lighting.
    - Pure brilliant white trending up arrow, exactly matching the web AppLogo geometry.
    - Crisp rounded stroke caps and subtle ambient luminous bloom.
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
    glow_radius = stroke_radius * 2.8

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

            # 1. Full-bleed backdrop: Luxury Royal Sapphire to Deep Obsidian Navy
            # Diagonal gradient from top-left (0,0) to bottom-right (1,1)
            diag_t = (nx * 0.4 + ny * 0.6)
            # Top-left: vibrant royal sapphire (22, 60, 142) -> Bottom-right: deep midnight obsidian (7, 14, 32)
            bg_r = 22.0 + (7.0 - 22.0) * diag_t
            bg_g = 60.0 + (14.0 - 60.0) * diag_t
            bg_b = 142.0 + (32.0 - 142.0) * diag_t

            # Central ambient radial spotlight behind the arrow to create rich depth
            spot_dx = (nx - 0.50)
            spot_dy = (ny - 0.48)
            spot_dist = math.hypot(spot_dx, spot_dy) / 0.65
            if spot_dist < 1.0:
                spot_factor = (1.0 - spot_dist * spot_dist) ** 1.8
                bg_r += 32.0 * spot_factor
                bg_g += 78.0 * spot_factor
                bg_b += 140.0 * spot_factor

            cur_r = bg_r
            cur_g = bg_g
            cur_b = bg_b

            # 2. Pure White Trending Up Arrow (matching web icon)
            min_d = min(dist_to_segment(x, y, s[0], s[1]) for s in chart_segments)

            # Soft bloom around white stroke
            if min_d <= glow_radius:
                bloom = ((1.0 - (min_d / glow_radius)) ** 2) * 0.38
                cur_r += 255.0 * bloom
                cur_g += 255.0 * bloom
                cur_b += 255.0 * bloom

            # Crisp stroke with anti-aliasing
            if min_d <= stroke_radius:
                stroke_aa = 1.0 if min_d <= stroke_radius - 1.0 else max(0.0, (stroke_radius - min_d) / 1.0)
                cur_r = cur_r * (1.0 - stroke_aa) + 255.0 * stroke_aa
                cur_g = cur_g * (1.0 - stroke_aa) + 255.0 * stroke_aa
                cur_b = cur_b * (1.0 - stroke_aa) + 255.0 * stroke_aa

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
