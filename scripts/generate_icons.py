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
    Renders a stunning, luxury dark-tech financial icon:
    - 100% full-bleed canvas (no transparent pixels, avoiding iOS black borders).
    - Deep metallic midnight blue backdrop with cyan ambient glow.
    - Floating frosted glassmorphic card with specular top rim highlight.
    - Electric cyan-to-emerald surging bull-market trajectory.
    - Glowing pinnacle beacon dot and sharp arrowhead.
    """
    pixels = []

    # Inner glass card parameters
    card_margin = size * 0.08
    card_radius = size * 0.22
    card_min_x = card_margin
    card_max_x = size - card_margin
    card_min_y = card_margin
    card_max_y = size - card_margin

    # Chart polyline segments (normalized 0..1)
    pts = [
        (0.24, 0.69),
        (0.42, 0.51),
        (0.55, 0.61),
        (0.76, 0.32)
    ]
    arrow_h = ((0.63, 0.32), (0.76, 0.32))
    arrow_v = ((0.76, 0.32), (0.76, 0.45))
    chart_segments = [
        (pts[0], pts[1]),
        (pts[1], pts[2]),
        (pts[2], pts[3]),
        arrow_h,
        arrow_v
    ]

    stroke_width = size * 0.048
    glow_radius = stroke_width * 2.8

    peak_x = 0.76 * size
    peak_y = 0.32 * size
    beacon_radius = size * 0.042

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

    for y in range(size):
        ny = y / size
        # Diagonal dark luxury gradient
        t_diag = (ny + 0.5) / 2.0
        # Deep obsidian backdrop: (13, 19, 34) -> (6, 9, 16)
        bg_r = 13 + (6 - 13) * t_diag
        bg_g = 19 + (9 - 19) * t_diag
        bg_b = 34 + (16 - 34) * t_diag

        # Ambient radial spotlight in upper center
        spot_dx = (0.50 * size - 0.5 * size) # centered
        spot_dy = (y - 0.38 * size)

        for x in range(size):
            nx = x / size
            dx_spot = (x - 0.48 * size)
            spot_dist = math.hypot(dx_spot, spot_dy) / (size * 0.70)
            spot_factor = max(0.0, 1.0 - spot_dist * spot_dist)

            # Base pixel with ambient cyan/blue backlight
            cur_r = bg_r + 20 * spot_factor
            cur_g = bg_g + 55 * spot_factor
            cur_b = bg_b + 130 * spot_factor

            # Check inside frosted glass card
            dx_c = max(0.0, max(card_min_x + card_radius - x, x - (card_max_x - card_radius)))
            dy_c = max(0.0, max(card_min_y + card_radius - y, y - (card_max_y - card_radius)))
            dist_sq_c = dx_c * dx_c + dy_c * dy_c

            if dist_sq_c <= card_radius * card_radius:
                card_dist = math.sqrt(dist_sq_c)
                edge_factor = max(0.0, min(1.0, (card_radius - card_dist)))

                # Card interior gradient: deep sapphire glass
                card_t = ny
                card_r = 20 + (10 - 20) * card_t
                card_g = 32 + (16 - 32) * card_t
                card_b = 60 + (32 - 60) * card_t

                # Top specular highlight (glass sheen on top border)
                if y < card_min_y + card_radius * 0.8:
                    sheen_t = 1.0 - (y - card_min_y) / (card_radius * 0.8)
                    card_r += 60 * sheen_t * edge_factor
                    card_g += 120 * sheen_t * edge_factor
                    card_b += 200 * sheen_t * edge_factor

                # Subtle glass border ring
                if card_radius - 2.0 <= card_dist <= card_radius:
                    border_glow = 1.0 - abs(card_dist - (card_radius - 1.0))
                    card_r += 40 * border_glow
                    card_g += 90 * border_glow
                    card_b += 160 * border_glow

                # Alpha blend card over background
                card_opacity = 0.94 * edge_factor
                cur_r = cur_r * (1.0 - card_opacity) + card_r * card_opacity
                cur_g = cur_g * (1.0 - card_opacity) + card_g * card_opacity
                cur_b = cur_b * (1.0 - card_opacity) + card_b * card_opacity

                # Area gradient fill under chart curve
                if pts[0][0] <= nx <= pts[3][0]:
                    curve_y = get_chart_y_at(nx) * size
                    baseline_y = 0.74 * size
                    if curve_y <= y <= baseline_y:
                        area_t = 1.0 - (y - curve_y) / (baseline_y - curve_y)
                        cur_r += 12 * area_t
                        cur_g += 48 * area_t
                        cur_b += 85 * area_t

            # Chart line & arrowhead distance
            min_d = min(dist_to_segment(x, y, s[0], s[1]) for s in chart_segments)

            # Trend line color gradient: Electric Cyan (56, 189, 248) -> Emerald (52, 211, 153)
            trend_t = max(0.0, min(1.0, (nx - 0.24) / (0.76 - 0.24)))
            line_r = int(56 + (52 - 56) * trend_t)
            line_g = int(189 + (211 - 189) * trend_t)
            line_b = int(248 + (153 - 248) * trend_t)

            # Soft bloom glow around stroke
            if min_d <= glow_radius:
                bloom_factor = max(0.0, 1.0 - (min_d / glow_radius)) ** 2 * 0.42
                cur_r += line_r * bloom_factor
                cur_g += line_g * bloom_factor
                cur_b += line_b * bloom_factor

            # Crisp stroke with anti-aliasing
            if min_d <= stroke_width:
                stroke_aa = 1.0 if min_d <= stroke_width - 1.2 else max(0.0, (stroke_width - min_d) / 1.2)
                cur_r = cur_r * (1.0 - stroke_aa) + line_r * stroke_aa
                cur_g = cur_g * (1.0 - stroke_aa) + line_g * stroke_aa
                cur_b = cur_b * (1.0 - stroke_aa) + line_b * stroke_aa

            # Glowing Pinnacle Beacon Dot at (peak_x, peak_y)
            dot_dist = math.hypot(x - peak_x, y - peak_y)
            if dot_dist <= beacon_radius * 2.2:
                # Outer beacon aura
                aura_factor = max(0.0, 1.0 - (dot_dist / (beacon_radius * 2.2))) ** 2 * 0.55
                cur_r += 52 * aura_factor
                cur_g += 211 * aura_factor
                cur_b += 153 * aura_factor

            if dot_dist <= beacon_radius:
                # Crisp bright dot
                dot_aa = 1.0 if dot_dist <= beacon_radius - 1.0 else max(0.0, beacon_radius - dot_dist)
                # Pure white core fading to neon emerald
                core_t = max(0.0, 1.0 - (dot_dist / beacon_radius))
                target_r = 255 * core_t + 52 * (1.0 - core_t)
                target_g = 255 * core_t + 211 * (1.0 - core_t)
                target_b = 255 * core_t + 153 * (1.0 - core_t)

                cur_r = cur_r * (1.0 - dot_aa) + target_r * dot_aa
                cur_g = cur_g * (1.0 - dot_aa) + target_g * dot_aa
                cur_b = cur_b * (1.0 - dot_aa) + target_b * dot_aa

            pixels.append((int(cur_r), int(cur_g), int(cur_b)))

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
