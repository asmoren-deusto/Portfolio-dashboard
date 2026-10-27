import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export const PALETTE_LIGHT = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#84cc16', // lime
  '#e11d48', // rose
  '#64748b', // slate
]

export const PALETTE_DARK = [
  '#3b82f6', // vibrant royal blue
  '#10b981', // vibrant emerald
  '#f59e0b', // warm radiant amber
  '#8b5cf6', // luminous violet
  '#f43f5e', // vivid coral rose
  '#06b6d4', // crisp cyan
  '#f97316', // bright orange
  '#6366f1', // vivid indigo
  '#14b8a6', // clear teal
  '#84cc16', // fresh lime
  '#ec4899', // radiant pink
  '#64748b', // balanced slate
]

export const PALETTE = PALETTE_LIGHT

export const ASSET_TYPE_LABELS: Record<string, string> = {
  fund: 'Fondo de Inversión',
  epsv: 'Plan de Previsión (EPSV)',
  etf: 'ETF',
  stock: 'Acción',
  bond: 'Bono / Renta Fija',
  etc: 'ETC (Oro / Materias Primas)',
  crypto: 'Criptomoneda',
  cash: 'Liquidez',
}

export const fmt = {
  currency(val: number | null | undefined, currency = 'EUR'): string {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)
  },

  price(val: number | null | undefined, currency = 'USD', decimals?: number): string {
    if (val === null || val === undefined || isNaN(val)) return '—'
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency
    const d = decimals !== undefined ? decimals : (val > 0 && val < 5 ? 4 : 2)
    return `${val.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })} ${symbol}`
  },

  pct(val: number | null | undefined, showPlus = true, decimals = 2): string {
    if (val === null || val === undefined || isNaN(val)) return '—'
    const sign = showPlus && val > 0 ? '+' : ''
    return `${sign}${val.toFixed(decimals)}%`
  },

  ratio(val: number | null | undefined, decimals = 2): string {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return val.toFixed(decimals)
  },

  num(val: number | null | undefined, decimals = 2): string {
    if (val === null || val === undefined || isNaN(val)) return '—'
    return val.toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  },

  volume(vol: number | null | undefined): string {
    if (!vol || isNaN(vol) || vol <= 0) return '—'
    if (vol >= 1_000_000_000) {
      return `${(vol / 1_000_000_000).toFixed(2)} B`
    }
    if (vol >= 1_000_000) {
      return `${(vol / 1_000_000).toFixed(1)} M`
    }
    if (vol >= 1_000) {
      return `${(vol / 1_000).toFixed(1)} K`
    }
    return vol.toLocaleString('es-ES')
  },

  date(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`
      const d = new Date(cleanStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  },

  dateShort(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`
      const d = new Date(cleanStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
      })
    } catch {
      return dateStr
    }
  },

  marketCap(cap: number | null | undefined, currency = 'USD'): string {
    if (!cap || isNaN(cap) || cap <= 0) return '—'
    const symbol = currency === 'EUR' ? '€' : '$'
    if (cap >= 1_000_000_000_000) {
      return `${(cap / 1_000_000_000_000).toFixed(2)} B${symbol}`
    }
    if (cap >= 1_000_000_000) {
      return `${(cap / 1_000_000_000).toFixed(1)} M${symbol}`
    }
    return `${(cap / 1_000_000).toFixed(0)} M${symbol}`
  },
}

export {
  getEasterSunday,
  getTarget2Holidays,
  isMarketBusinessDay,
  getExpectedNavDate,
  getEffectivePortfolioNavDate,
  getEffectivePortfolioNavDate as getConsensusNavDate,
} from './marketCalendar'

/**
 * Formats an asset name for clean, uncluttered presentation:
 * 1. Abbreviates "BlackRock Global Funds" to "BGF" unconditionally.
 * 2. If hasIcon is true (i.e. displayed right next to the fund/brand logo), removes redundant leading
 *    brand prefixes for Fidelity and iShares (e.g. "Fidelity MSCI World..." -> "MSCI World...",
 *    "iShares Developed World..." -> "Developed World...", "iShares Physical Gold..." -> "Physical Gold...").
 */
export function formatAssetDisplayName(name: string | null | undefined, hasIcon: boolean = false): string {
  if (!name) return ''
  // Strip redundant leading "BGF -" or "BFG -" prefix
  let formatted = name.replace(/^(?:BGF|BFG)\s*[-–—:]?\s*/i, '')

  if (hasIcon) {
    // Remove leading "Fidelity" prefix (case insensitive, with optional hyphen/dash/colon/space)
    formatted = formatted.replace(/^Fidelity\s*[-–—:]?\s+/i, '')
    // Remove leading "iShares" prefix (case insensitive, with optional hyphen/dash/colon/space)
    formatted = formatted.replace(/^iShares\s*[-–—:]?\s+/i, '')
    // Remove leading "BlackRock" or "BlackRock Global Funds" prefix
    formatted = formatted.replace(/^BlackRock(?:\s+Global\s+Funds)?\s*[-–—:]?\s+/i, '')
  } else {
    formatted = formatted.replace(/^BlackRock(?:\s+Global\s+Funds)?\s*[-–—:]?\s*/i, '')
    formatted = formatted.replace(/\bBlackRock Global Funds\b/gi, 'BGF')
  }

  return formatted.trim()
}

