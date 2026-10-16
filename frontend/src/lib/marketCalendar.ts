/**
 * Market Calendar & NAV Target Date Resolution (European TARGET2 & BME Calendar).
 * Hybrid approach:
 * 1. Base expected NAV date is derived from the system calendar (T-1 business day, skipping weekends & holidays).
 * 2. If > 50% of the active portfolio gestoras have already published today's NAV (late night), it advances to today.
 */

/**
 * Computes Easter Sunday for a given year using the Meeus/Jones/Butcher Gregorian algorithm.
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

/**
 * Official European financial market holidays (TARGET2 system calendar).
 * Used by all European and Spanish mutual funds:
 *  1. New Year's Day (Jan 1)
 *  2. Good Friday (Viernes Santo)
 *  3. Easter Monday (Lunes de Pascua)
 *  4. Labour Day (May 1)
 *  5. Christmas Day (Dec 25)
 *  6. Boxing Day / St. Stephen's Day (Dec 26)
 */
export function getTarget2Holidays(year: number): Set<string> {
  const easter = getEasterSunday(year)
  const goodFriday = new Date(easter.getTime() - 2 * 86400000).toISOString().slice(0, 10)
  const easterMonday = new Date(easter.getTime() + 1 * 86400000).toISOString().slice(0, 10)

  return new Set([
    `${year}-01-01`,
    goodFriday,
    easterMonday,
    `${year}-05-01`,
    `${year}-12-25`,
    `${year}-12-26`,
  ])
}

/**
 * Checks whether a given Date is an active European market business day.
 */
export function isMarketBusinessDay(d: Date): boolean {
  const dayOfWeek = d.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return false // Weekend

  const year = d.getFullYear()
  const ymd = d.toISOString().slice(0, 10)
  const holidays = getTarget2Holidays(year)
  return !holidays.has(ymd)
}

/**
 * Calculates the expected official NAV session based on the system calendar.
 * Mutual funds report with a 1-day lag (T+1); hence on trading day T,
 * the latest closed session corresponds to the prior business day (T - 1).
 */
export function getExpectedNavDate(asOfDate?: Date): string {
  const now = asOfDate || new Date()
  // Move candidate to midday to prevent timezone UTC boundary issues
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
  candidate.setDate(candidate.getDate() - 1)

  for (let i = 0; i < 15; i++) {
    if (isMarketBusinessDay(candidate)) {
      const y = candidate.getFullYear()
      const m = String(candidate.getMonth() + 1).padStart(2, '0')
      const d = String(candidate.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    candidate.setDate(candidate.getDate() - 1)
  }

  const y = candidate.getFullYear()
  const m = String(candidate.getMonth() + 1).padStart(2, '0')
  const d = String(candidate.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Hybrid NAV Target Date Resolution:
 * 1. Base expected date is determined from the system calendar (minimum expected business day).
 * 2. If analyticsDate is available from backend, trust the backend resolution.
 * 3. If > 50% of active positions have already reported an official NAV for today, advance to today.
 */
export function getEffectivePortfolioNavDate(
  positions: Array<{ price_date?: string | null; last_updated?: string | null }>,
  analyticsDate?: string | null,
  asOfDate?: Date
): string {
  if (analyticsDate) return analyticsDate

  const now = asOfDate || new Date()
  const baseExpected = getExpectedNavDate(now)

  if (!positions || positions.length === 0) return baseExpected

  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Check if today is a business day and if more than half of the funds already have today's NAV
  if (isMarketBusinessDay(now)) {
    let todayCount = 0
    for (const p of positions) {
      const d = (p.price_date || p.last_updated)?.slice(0, 10)
      if (d && d >= todayYmd) {
        todayCount++
      }
    }
    if (todayCount > positions.length / 2) {
      return todayYmd
    }
  }

  return baseExpected
}
