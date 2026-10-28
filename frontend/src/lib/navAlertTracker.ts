import type { NavAlertItem } from '@/store/appStore'

const SEEN_UPDATES_STORAGE_KEY = 'portfolio_seen_nav_updates'

/**
 * Returns only the NAV alert items that have NOT been shown to the user yet
 * (i.e. whose combination of isin + price_date + price is not in the seen map).
 */
export function filterUnseenNavUpdates(items: NavAlertItem[]): NavAlertItem[] {
  if (!items || items.length === 0) return []
  try {
    const raw = localStorage.getItem(SEEN_UPDATES_STORAGE_KEY)
    const seenMap: Record<string, string> = raw ? JSON.parse(raw) : {}

    return items.filter((item) => {
      // Exclude live-traded assets (e.g. Gold ETC IE00B4ND3602, stocks, ETFs) from daily NAV publication modals
      if ((item as any).is_live || item.isin === 'IE00B4ND3602') return false
      // Only include items actually marked as updated
      if (item.is_updated === false) return false

      const key = `${item.price_date || ''}_${item.price || ''}`
      return seenMap[item.isin] !== key
    })
  } catch {
    return items.filter((item) => item.is_updated !== false && item.isin !== 'IE00B4ND3602')
  }
}

/**
 * Marks given NAV items as seen so they are never alerted to the user again
 * unless a strictly new price or date arrives from the fund manager.
 */
export function markNavUpdatesAsSeen(items: NavAlertItem[]): void {
  if (!items || items.length === 0) return
  try {
    const raw = localStorage.getItem(SEEN_UPDATES_STORAGE_KEY)
    const seenMap: Record<string, string> = raw ? JSON.parse(raw) : {}

    for (const item of items) {
      if (item.isin) {
        seenMap[item.isin] = `${item.price_date || ''}_${item.price || ''}`
      }
    }
    localStorage.setItem(SEEN_UPDATES_STORAGE_KEY, JSON.stringify(seenMap))
  } catch {}
}

/**
 * Initializes baseline seen items from existing positions on first load
 * to avoid popping up past NAVs when the user opens the application.
 */
export function initializeBaselineSeenNavs(positions: Array<{ isin: string; price_date?: string | null; current_price?: number | null }>): void {
  try {
    const raw = localStorage.getItem(SEEN_UPDATES_STORAGE_KEY)
    if (!raw && positions && positions.length > 0) {
      const seenMap: Record<string, string> = {}
      for (const p of positions) {
        if (p.isin && p.price_date && p.current_price) {
          seenMap[p.isin] = `${p.price_date}_${p.current_price}`
        }
      }
      localStorage.setItem(SEEN_UPDATES_STORAGE_KEY, JSON.stringify(seenMap))
    }
  } catch {}
}
