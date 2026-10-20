---
name: Executive Wealth & Portfolio
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#4d556b'
  on-tertiary: '#ffffff'
  tertiary-container: '#656d84'
  on-tertiary-container: '#eef0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  canvas-bg: '#F6F8FB'
  surface-card: '#FFFFFF'
  border-subtle: '#E2E8F0'
  border-focused: '#93C5FD'
  demo-badge-bg: '#EFF6FF'
  demo-badge-text: '#1D4ED8'
  primary-badge-bg: '#F1F5F9'
  primary-badge-text: '#475569'
  yield-emerald-bg: '#ECFDF5'
  yield-emerald-text: '#059669'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 1.75rem
  space-2xl: 2.5rem
---

## Brand & Style

This design system targets modern retail investors, wealth managers, and discerning private capital allocators who demand precision, security, and institutional clarity. The aesthetic sits at the intersection of **Corporate Modernism** and **Tactile Glassmorphism**, projecting unshakeable trustworthiness with sleek, tactile responsiveness.

Key visual attributes:
- **Clarity over ornamentation:** Crisp surfaces with subtle boundary outlines ensure high legibility of dense financial metadata, portfolio holdings, and multi-broker allocations.
- **Controlled micro-depth:** Soft layered elevations, precise interior borders, and featherweight backdrops mimic high-end physical cards and security tokens.
- **Confident telemetry:** Clean numeric rhythms, dedicated status pills, and deliberate accent colors (Trust Blue and Yield Emerald) guide seamless portfolio switching and identity verification.

## Colors

The palette balances clean institutional slate tones with vivid functional cues:

- **Primary (`#2563EB`)**: Anchor for core interactive triggers, selected states, and navigational highlights. Evokes enterprise-grade reliability and security.
- **Secondary (`#10B981`)**: Dedicated exclusively to positive yields, active verified states, and primary avatar anchors.
- **Tertiary (`#0F172A`)**: High-contrast ink tone for dominant typographic headers, card titles, and high-emphasis telemetry.
- **Neutral (`#64748B`)**: Mid-tone slate calibrated for subtitles, helper labels, inactive tabs, and unselected profile meta.
- **Surface & Badges**:
  - `canvas-bg` (`#F6F8FB`): A soft, glare-free tinted neutral providing clear contrast against pure white cards.
  - `demo-badge-bg` (`#EFF6FF`) & `demo-badge-text` (`#1D4ED8`): Clear designation for sandbox or demo environments.
  - `primary-badge-bg` (`#F1F5F9`) & `primary-badge-text` (`#475569`): Subtle structural attribution for the primary master account.

## Typography

The type scale combines **Plus Jakarta Sans** for structural headers and product logos with **Inter** for dense transactional UI, labels, and financial copy:

- **Display & Headlines (`Plus Jakarta Sans`)**: Applied to portfolio totals, modal headers, and workspace titles. Tight tracking (`-0.02em` to `-0.03em`) creates a refined, magazine-grade financial finish.
- **Body & Meta (`Inter`)**: Engineered for maximum legibility of broker tags, asset allocations, and security notices.
- **Uppercase Section Labels (`label-sm`)**: Set with extended tracking (`0.05em`) in medium gray tones to structure sections without competing with data entries.

## Layout & Spacing

The layout is built on a responsive centered container model that anchors key flows and scales into multi-pane dashboard grids:

- **Modal & Central Hub Layout**: Maximum content width of `580px` on desktop, elevated over the neutral tinted canvas (`#F6F8FB`).
- **Dashboard Grid**: A standard 12-column system with a maximum canvas width of `1280px`, `1.25rem` gutters, and `1.5rem` outside margins.
- **Rhythm & Stacking**: Internal profile cards adopt `space-md` (`0.875rem`) internal padding to keep rows compact while maintaining generous click-targets on touch devices. Section dividers utilize `space-xl` (`1.75rem`) vertical separation.

## Elevation & Depth

Visual hierarchy leverages crisp surface-container contrast complemented by diffused ambient shadows:

- **Level 0 (Canvas)**: Non-reflective matte surface (`#F6F8FB`).
- **Level 1 (Card Container)**: Pure white surface (`#FFFFFF`) with a 1px perimeter border (`#E2E8F0`) and a multi-stage ambient drop shadow:
  - `0 1px 3px rgba(15, 23, 42, 0.04), 0 20px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Interactive Profile Tile)**: Sits nested within Level 1. In standard state, it features a 1px border (`#E2E8F0`) on white or light slate tint. In active/selected state, the border shifts to `1.5px solid #2563EB` with an ambient glow (`0 0 0 3px rgba(37, 99, 235, 0.08)`).
- **Surface Blur**: Navigation top-bars and utility headers make use of subtle `backdrop-filter: blur(8px)` with `rgba(255, 255, 255, 0.85)` fill.

## Shapes

The design adopts a refined, balanced curvature profile (`roundedness: 2`):

- **Master Portals & Cards**: `1.25rem` to `1.5rem` (`rounded-xl` / `rounded-2xl`) outer corners create an approachable, modern executive feel.
- **Profile Row Containers**: `0.75rem` to `1rem` outer bounds, maintaining nested proportionality inside parent cards.
- **Action Buttons & Avatar Pills**: Outer actions adopt `0.5rem` (`rounded-md`), while avatar initials (`AM`, `DM`) sit inside perfectly circular badges (`rounded-full`) to serve as immediate ocular anchors.
- **Status Tags & Badges**: `0.375rem` to `0.5rem` micro-radii to preserve text compactness and structural order.

## Components

### Profile Selection Cards
- **Structure**: Horizontal layout with three distinct zones: Avatar Anchor (left), Investor Metadata (center), and Direct Action CTA (right).
- **Avatar Badges**: 44px circular containers. Demo profiles utilize solid `#2563EB` fill with white text; primary production profiles utilize `#10B981` fill with white text.
- **Metadata Layout**: Investor name in semibold `#0F172A` paired inline with status badges (`MODO DEMO`, `CUENTA PRINCIPAL`). Subtext in `#64748B` detailing portfolio strategy followed by middle-dot separated broker tags (`Kutxabank · Scalable · Trade Republic · MyInvestor`).
- **Interactive State**: Hover elevates border contrast from `#E2E8F0` to `#CBD5E1`. Focus or active profile applies a vibrant blue halo (`#2563EB` border + `rgba(37, 99, 235, 0.08)` ring).

### Status Badges & Broker Chips
- **Demo Badge**: Pill container with `background: #EFF6FF`, `color: #1D4ED8`, `font-size: 11px`, `font-weight: 700`, uppercase, `padding: 2px 8px`.
- **Primary Badge**: Pill container with `background: #F1F5F9`, `color: #475569`, `font-size: 11px`, `font-weight: 700`, uppercase, `padding: 2px 8px`.
- **Broker Attribution**: Set in `Inter 13px` regular with `#0F172A` emphasis on individual broker names and `#94A3B8` dividers.

### Action Buttons
- **Secondary Access Button (e.g. "Acceso Libre")**: `background: #EFF6FF`, `color: #2563EB`, `font-weight: 600`, with trailing arrow icon; hover transitions to `#DBEAFE`.
- **Secured Key Action Button (e.g. "Desbloquear")**: Clean white surface with a 1px border (`#E2E8F0`), leading padlock icon, and trailing arrow. Text in `#0F172A`. Hover provides subtle tonal fill (`#F8FAFC`).
- **Primary Global Actions**: Solid `#2563EB` fill, white typography, subtle bottom border shade, active depth shift (`translate-y-[1px]`).

### Tab Navigation Strip
- Contained segmented control seated atop cards. Active segment features white fill, soft drop shadow, `#2563EB` or `#0F172A` text, and icon accent. Inactive segments maintain `#64748B` text with transparent background.
- Disabled or coming-soon tabs (e.g., "Nuevo Perfil") display reduced opacity (40%) with cursor lock.

### Footer & Telemetry Notice
- Helper callouts feature an inline micro-icon (e.g., yellow tip bulb or padlock) paired with muted slate text (`#64748B`, 13px).
- Bottom metadata uses centered single-line tracking with middle dots separating system release version (`PortfolioPro v3.0.160`) and legal descriptor.