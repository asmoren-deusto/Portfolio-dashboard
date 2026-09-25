import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export const PALETTE = [
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

export const ASSET_TYPE_LABELS: Record<string, string> = {
  fund: 'Fondo de Inversión',
  etf: 'ETF',
  stock: 'Acción',
  bond: 'Bono / Renta Fija',
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

  price(val: number | null | undefined, currency = 'USD'): string {
    if (val === null || val === undefined || isNaN(val)) return '—'
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency
    return `${val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
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
      const d = new Date(dateStr)
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
      const d = new Date(dateStr)
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

