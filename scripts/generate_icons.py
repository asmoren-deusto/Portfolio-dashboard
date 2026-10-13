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
      When iOS applies its squircle mask, the icon seamlessly fills the entire app icon shape.
    - Deep royal navy & sapphire gradient backdrop with subtle central ambient lighting.
    - Ethereal glowing gradient fill under the bullish market curve.
    - Electric cyan-to-emerald surging trendline with rounded caps and sharp arrowhead.
    - Luminous glowing pinnacle beacon dot.
    """
    pixels = []

    # Chart polyline segments (normalized 0..1)
    # Perfectly centered in iOS icon safe zone (spans 0.20 to 0.80)
    pts = [
        (0.20, 0.68),
        (0.40, 0.48),
        (0.53, 0.58),
        (0.80, 0.28),
    ]
    arrow_h = ((0.66, 0.28), (0.80, 0.28))
    arrow_v = ((0.80, 0.28), (0.80, 0.42))
    chart_segments = [
        (pts[0], pts[1]),
        (pts[1], pts[2]),
        (pts[2], pts[3]),
        arrow_h,
        arrow_v,
    ]

    stroke_width = size * 0.052
    glow_radius = stroke_width * 2.6

    peak_x = 0.80 * size
    peak_y = 0.28 * size
    beacon_radius = size * 0.044

    def dist_to_segment(px, py, p1, p2):
        x1, y1 = p1[0] * size, p1[1] * size
        x2, y2 = p2[0] * size, p2[1] * size
        dx, dy = x2 - x1, y2 - y1
        if dx == 0 and dy == 0:
            return math.hypot(px - x1, py - y1)
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
        return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))

    # Precalculate baseline for area under curve
    def get_chart_y_at(norm_x):
        if norm_x <= pts[0][0]:
            return pts[0][1]
        if norm_x <= pts[1][0]:
            t = (norm_x - pts[0][0]) / (pts[1][0] - pts[0][0])
            return pts[0][1] + t * (pts[1][1] - pts[0][1])
        if norm_x <= pts[2][0]:
            t = (norm_x - pts[1][0]) / (pts[2][0] - pts[1][0])
            return pts[1][1] + t * (pts[2][1] - pts[1][1])
        if norm_x <= pts[3][0]:
            t = (norm_x - pts[2][0]) / (pts[3][0] - pts[2][0])
            return pts[2][1] + t * (pts[3][1] - pts[2][1])
        return pts[3][1]

    # Precalculate segment distances for each line
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

            # Central ambient radial spotlight behind the chart to create depth
            spot_dx = (nx - 0.50)
            spot_dy = (ny - 0.46)
            spot_dist = math.hypot(spot_dx, spot_dy) / 0.65
            if spot_dist < 1.0:
                spot_factor = (1.0 - spot_dist * spot_dist) ** 1.8
                bg_r += 32.0 * spot_factor
                bg_g += 78.0 * spot_factor
                bg_b += 140.0 * spot_factor

            cur_r = bg_r
            cur_g = bg_g
            cur_b = bg_b

            # 2. Area gradient fill under chart curve (soft blue/cyan aurora blending smoothly)
            if pts[0][0] <= nx <= pts[3][0]:
                curve_y = get_chart_y_at(nx) * size
                baseline_y = 0.76 * size
                if curve_y <= y <= baseline_y:
                    area_t = max(0.0, 1.0 - (y - curve_y) / (baseline_y - curve_y))
                    # Luminous ambient fill
                    cur_r += 24.0 * (area_t ** 1.4)
                    cur_g += 80.0 * (area_t ** 1.4)
                    cur_b += 165.0 * (area_t ** 1.4)

            # 3. Chart line & arrowhead distance
            min_d = min(dist_to_segment(x, y, s[0], s[1]) for s in chart_segments)

            # Trend line color gradient: Electric Cyan (56, 189, 248) -> Neon Emerald (52, 211, 153)
            trend_t = max(0.0, min(1.0, (nx - 0.20) / (0.80 - 0.20)))
            line_r = 56.0 + (52.0 - 56.0) * trend_t
            line_g = 189.0 + (211.0 - 189.0) * trend_t
            line_b = 248.0 + (153.0 - 248.0) * trend_t

            # Soft bloom glow around stroke
            if min_d <= glow_radius:
                bloom_factor = ((1.0 - (min_d / glow_radius)) ** 2) * 0.48
                cur_r += line_r * bloom_factor
                cur_g += line_g * bloom_factor
                cur_b += line_b * bloom_factor

            # Crisp stroke with anti-aliasing
            if min_d <= stroke_width:
                stroke_aa = 1.0 if min_d <= stroke_width - 1.2 else max(0.0, (stroke_width - min_d) / 1.2)
                # Highlight core along line center
                if min_d <= stroke_width * 0.45:
                    core_factor = 1.0 - (min_d / (stroke_width * 0.45))
                    target_line_r = line_r + (255.0 - line_r) * core_factor * 0.55
                    target_line_g = line_g + (255.0 - line_g) * core_factor * 0.55
                    target_line_b = line_b + (255.0 - line_b) * core_factor * 0.55
                else:
                    target_line_r = line_r
                    target_line_g = line_g
                    target_line_b = line_b

                cur_r = cur_r * (1.0 - stroke_aa) + target_line_r * stroke_aa
                cur_g = cur_g * (1.0 - stroke_aa) + target_line_g * stroke_aa
                cur_b = cur_b * (1.0 - stroke_aa) + target_line_b * stroke_aa

            # 4. Glowing Pinnacle Beacon Dot at (peak_x, peak_y)
            dot_dist = math.hypot(x - peak_x, y - peak_y)
            if dot_dist <= beacon_radius * 2.4:
                aura_factor = ((1.0 - (dot_dist / (beacon_radius * 2.4))) ** 2) * 0.65
                cur_r += 52.0 * aura_factor
                cur_g += 211.0 * aura_factor
                cur_b += 153.0 * aura_factor

            if dot_dist <= beacon_radius:
                dot_aa = 1.0 if dot_dist <= beacon_radius - 1.0 else max(0.0, beacon_radius - dot_dist)
                core_t = max(0.0, 1.0 - (dot_dist / beacon_radius))
                target_r = 255.0 * core_t + 52.0 * (1.0 - core_t)
                target_g = 255.0 * core_t + 211.0 * (1.0 - core_t)
                target_b = 255.0 * core_t + 153.0 * (1.0 - core_t)

                cur_r = cur_r * (1.0 - dot_aa) + target_r * dot_aa
                cur_g = cur_g * (1.0 - dot_aa) + target_g * dot_aa
                cur_b = cur_b * (1.0 - dot_aa) + target_b * dot_aa

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
