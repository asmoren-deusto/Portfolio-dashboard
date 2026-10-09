import { useQuery } from '@tanstack/react-query'
import {
  MOCK_SUMMARY,
  MOCK_POSITIONS,
  MOCK_ANALYTICS,
  MOCK_PERFORMANCE,
  MOCK_TRANSACTIONS,
  type PricePoint,
  type PortfolioSummary,
  type Position,
  type Analytics,
  type Transaction,
} from '@/lib/mockData'
export type { Position, PortfolioSummary, Analytics, Transaction, PricePoint }
import { useAppStore, type Period } from '@/store/appStore'

const API = '/api'

// Demo data has no per-broker series: derive them from the broker's share of the positions.
function brokerShare(positions: Position[], broker: string): number {
  if (broker === 'all') return 1
  const total = positions.reduce((a, p) => a + (p.current_value || 0), 0)
  const part = positions
    .filter((p) => p.broker === broker)
    .reduce((a, p) => a + (p.current_value || 0), 0)
  return total > 0 ? part / total : 0
}

function demoSummary(base: PortfolioSummary, positions: Position[], broker: string): PortfolioSummary {
  if (broker === 'all') return base
  const sel = positions.filter((p) => p.broker === broker)
  const total_value = sel.reduce((a, p) => a + (p.current_value || 0), 0)
  const total_invested = sel.reduce((a, p) => a + (p.invested_amount || 0), 0)
  const total_pnl = total_value - total_invested
  return {
    ...base,
    total_value: Math.round(total_value * 100) / 100,
    total_invested: Math.round(total_invested * 100) / 100,
    total_pnl: Math.round(total_pnl * 100) / 100,
    total_pnl_pct: total_invested > 0 ? Math.round((total_pnl / total_invested) * 10000) / 100 : 0,
    num_positions: sel.length,
  }
}

function demoScale(points: PricePoint[], positions: Position[], broker: string): PricePoint[] {
  const k = brokerShare(positions, broker)
  if (k === 1) return points
  return points.map((p) => ({
    ...p,
    value: Math.round(p.value * k * 100) / 100,
    price: p.price !== undefined ? Math.round(p.price * k * 100) / 100 : p.price,
    invested: p.invested !== undefined ? Math.round(p.invested * k * 100) / 100 : p.invested,
  }))
}

// Keep previous data only within the same user (queryKey[1]); never leak another profile's data.
const keepSameUser =
  (userId?: string) =>
  <T,>(prev: T | undefined, prevQuery?: { queryKey: readonly unknown[] }) =>
    prevQuery?.queryKey[1] === userId ? prev : undefined

async function get<T>(path: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('portfolio_auth_token') : null
  const headers: Record<string, string> = { 'Cache-Control': 'no-cache, no-store' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API}${path}`, {
    headers,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function refreshPortfolioPrices(userId = 'asier') {
  const token = typeof window !== 'undefined' ? localStorage.getItem('portfolio_auth_token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API}/portfolio/refresh-prices?user_id=${userId}`, {
    method: 'POST',
    headers,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Summary ────────────────────────────────────────────────────────────────────
export function usePortfolioSummary() {
  const { useMock, period, selectedBroker, currentUser } = useAppStore()
  const isDemo = Boolean(useMock || currentUser?.isDemo)
  const userSummary = demoSummary(currentUser?.summary ?? MOCK_SUMMARY, currentUser?.positions ?? MOCK_POSITIONS, selectedBroker)
  const brokerQuery = selectedBroker !== 'all' ? `?broker=${selectedBroker}` : ''

  return useQuery<PortfolioSummary>({
    queryKey: ['summary', currentUser?.id, period, selectedBroker],
    queryFn: () =>
      isDemo
        ? Promise.resolve(userSummary)
        : get<PortfolioSummary>(`/portfolio/summary${brokerQuery}`),
    initialData: isDemo ? userSummary : undefined,
    placeholderData: keepSameUser(currentUser?.id),
    staleTime: isDemo ? 1000 * 60 * 5 : 0,
    refetchOnMount: true,
    refetchInterval: 1000 * 60 * 15,
  })
}

// ── Positions ─────────────────────────────────────────────────────────────────
export function usePositions() {
  const { useMock, selectedBroker, currentUser } = useAppStore()
  const isDemo = Boolean(useMock || currentUser?.isDemo)
  const userPositions = (currentUser?.positions ?? MOCK_POSITIONS).filter(
    (p) => selectedBroker === 'all' || p.broker === selectedBroker
  )
  const brokerQuery = selectedBroker !== 'all' ? `?broker=${selectedBroker}` : ''

  return useQuery<Position[]>({
    queryKey: ['positions', currentUser?.id, selectedBroker],
    queryFn: () =>
      isDemo
        ? Promise.resolve(userPositions)
        : get<Position[]>(`/portfolio/positions${brokerQuery}`),
    initialData: isDemo ? userPositions : undefined,
    placeholderData: keepSameUser(currentUser?.id),
    staleTime: isDemo ? 1000 * 60 * 5 : 0,
    refetchOnMount: true,
  })
}

// ── Performance ────────────────────────────────────────────────────────────────
export function usePerformance(
  overridePeriod?: Period | 'all' | '5y' | 'max',
  startDate?: string
) {
  const { useMock, period: storePeriod, selectedBroker, currentUser } = useAppStore()
  const period = overridePeriod || storePeriod
  const isDemo = Boolean(useMock || currentUser?.isDemo)
  const userPerf = currentUser?.performance ?? MOCK_PERFORMANCE
  let userPoints = demoScale(
    userPerf[period] ?? (period === '5y' || period === 'all' || period === 'max' ? (userPerf['5y'] ?? userPerf['max']) : (userPerf['1y'] ?? [])),
    currentUser?.positions ?? MOCK_POSITIONS,
    selectedBroker
  )
  if (startDate) {
    userPoints = userPoints.filter((p) => p.date >= startDate)
  }
  const brokerQuery = selectedBroker !== 'all' ? `&broker=${selectedBroker}` : ''
  const startQuery = startDate ? `&start_date=${startDate}` : ''

  return useQuery<PricePoint[]>({
    queryKey: ['performance', currentUser?.id, period, selectedBroker, startDate],
    queryFn: (): Promise<PricePoint[]> =>
      isDemo
        ? Promise.resolve(userPoints)
        : get<PricePoint[]>(`/portfolio/performance?period=${period}${startQuery}${brokerQuery}`),
    initialData: isDemo ? userPoints : undefined,
    placeholderData: keepSameUser(currentUser?.id),
    staleTime: isDemo ? 1000 * 60 * 5 : 1000 * 60 * 2,
    refetchOnMount: true,
  })
}

// ── Analytics ──────────────────────────────────────────────────────────────────
export function useAnalytics() {
  const { useMock, selectedBroker, currentUser } = useAppStore()
  const isDemo = Boolean(useMock || currentUser?.isDemo)
  const userAnalytics = currentUser?.analytics ?? MOCK_ANALYTICS
  const brokerQuery = selectedBroker !== 'all' ? `&broker=${selectedBroker}` : ''

  return useQuery<Analytics>({
    queryKey: ['analytics', currentUser?.id, selectedBroker],
    queryFn: () =>
      isDemo
        ? Promise.resolve(userAnalytics)
        : get<Analytics>(`/portfolio/analytics?period=2y${brokerQuery}`),
    initialData: isDemo ? userAnalytics : undefined,
    placeholderData: keepSameUser(currentUser?.id),
    staleTime: isDemo ? 1000 * 60 * 5 : 1000 * 60 * 2,
    refetchOnMount: true,
  })
}

// ── Benchmark Comparison ────────────────────────────────────────────────────────
export interface BenchmarkComparisonPoint {
  date: string
  value: number
  invested: number
  portfolio_twr: number
  sp500: number
  msci_world: number
  bce_rate?: number
  nasdaq100?: number
  eurostoxx50?: number
  nikkei225?: number
}

export interface BenchmarkComparisonData {
  period: string
  points: BenchmarkComparisonPoint[]
  summary: {
    portfolio_twr: number
    sp500: number
    msci_world: number
    bce_rate?: number
    nasdaq100?: number
    eurostoxx50?: number
    nikkei225?: number
    alpha_sp500: number
    alpha_msci: number
    alpha_bce?: number
  } | null
}

export function useBenchmarkComparison() {
  const { useMock, period, selectedBroker, currentUser } = useAppStore()
  const isDemo = Boolean(useMock || currentUser?.isDemo)
  const brokerQuery = selectedBroker !== 'all' ? `&broker=${selectedBroker}` : ''

  return useQuery<BenchmarkComparisonData>({
    queryKey: ['benchmark-comparison', currentUser?.id, period, selectedBroker],
    queryFn: async (): Promise<BenchmarkComparisonData> => {
      if (isDemo) {
        const userPerf = currentUser?.performance ?? MOCK_PERFORMANCE
        const pts = demoScale(
          userPerf[period] ?? userPerf['1y'] ?? [],
          currentUser?.positions ?? MOCK_POSITIONS,
          selectedBroker
        )
        let nav = 100.0
        // Real, public index series (no auth); rebased to the demo's first date
        const bench = await get<{ points: Array<Record<string, number | string>> }>(
          `/market/benchmarks?period=${period}`
        )
        const bpts = bench.points
        const benchAt = (date: string) => {
          let found = bpts[0]
          for (const b of bpts) {
            if ((b.date as string) <= date) found = b
            else break
          }
          return found
        }
        const keys = ['sp500', 'msci_world', 'nasdaq100', 'eurostoxx50', 'nikkei225', 'bce_rate'] as const
        // Base = first trading day on/after the start, same as the backend does for real users
        const b0 = pts.length ? bpts.find((b) => (b.date as string) >= pts[0].date) ?? bpts[bpts.length - 1] : undefined
        const rebased = (date: string, key: (typeof keys)[number]) => {
          if (!b0) return 0
          const cur = date < (b0.date as string) ? b0 : benchAt(date)
          return Number((((1 + (cur[key] as number) / 100) / (1 + (b0[key] as number) / 100) - 1) * 100).toFixed(2))
        }
        const points: BenchmarkComparisonPoint[] = []
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) {
            points.push({
              date: pts[0].date,
              value: pts[0].value,
              invested: pts[0].invested ?? pts[0].value,
              portfolio_twr: 0,
              sp500: 0,
              msci_world: 0,
              bce_rate: 0,
              nasdaq100: 0,
              eurostoxx50: 0,
              nikkei225: 0,
            })
            continue
          }
          const v0 = pts[i - 1].value, v1 = pts[i].value
          const i0 = pts[i - 1].invested ?? v0, i1 = pts[i].invested ?? v1
          const deltaInv = i1 - i0
          const netMkt = v1 - v0 - deltaInv
          const r = v0 > 0 ? netMkt / v0 : 0
          nav = nav * (1 + r)
          const pTwr = Number(((nav / 100 - 1) * 100).toFixed(2))
          points.push({
            date: pts[i].date,
            value: v1,
            invested: i1,
            portfolio_twr: pTwr,
            sp500: rebased(pts[i].date, 'sp500'),
            msci_world: rebased(pts[i].date, 'msci_world'),
            bce_rate: rebased(pts[i].date, 'bce_rate'),
            nasdaq100: rebased(pts[i].date, 'nasdaq100'),
            eurostoxx50: rebased(pts[i].date, 'eurostoxx50'),
            nikkei225: rebased(pts[i].date, 'nikkei225'),
          })
        }
        const last = points[points.length - 1]
        return {
          period,
          points,
          summary: last
            ? {
                portfolio_twr: last.portfolio_twr,
                sp500: last.sp500,
                msci_world: last.msci_world,
                bce_rate: last.bce_rate,
                nasdaq100: last.nasdaq100,
                eurostoxx50: last.eurostoxx50,
                nikkei225: last.nikkei225,
                alpha_sp500: Number((last.portfolio_twr - last.sp500).toFixed(2)),
                alpha_msci: Number((last.portfolio_twr - last.msci_world).toFixed(2)),
                alpha_bce: Number((last.portfolio_twr - (last.bce_rate ?? 0)).toFixed(2)),
              }
            : null,
        }
      }
      return get<BenchmarkComparisonData>(`/portfolio/benchmark-comparison?period=${period}${brokerQuery}`)
    },
    staleTime: 1000 * 60 * 3,
    refetchOnMount: true,
  })
}

// ── Transactions ───────────────────────────────────────────────────────────────
export function useTransactions() {
  const { useMock, selectedBroker, currentUser } = useAppStore()
  const isDemo = Boolean(useMock || currentUser?.isDemo)
  const userTx = (currentUser?.transactions ?? MOCK_TRANSACTIONS).filter(
    (t) => selectedBroker === 'all' || t.broker === selectedBroker
  )
  const brokerQuery = selectedBroker !== 'all' ? `?broker=${selectedBroker}` : ''

  return useQuery<Transaction[]>({
    queryKey: ['transactions', currentUser?.id, selectedBroker],
    queryFn: () =>
      isDemo
        ? Promise.resolve(userTx)
        : get<Transaction[]>(`/transactions${brokerQuery}`),
    initialData: isDemo ? userTx : undefined,
    placeholderData: keepSameUser(currentUser?.id),
    staleTime: isDemo ? 1000 * 60 : 0,
    refetchOnMount: true,
  })
}

// ── Market Quotes (Real-time) ─────────────────────────────────────────────────
export interface MarketStock {
  ticker: string
  name: string
  domain: string
  sector: string
  index: string[]
  price: number | null
  regular_price: number | null
  pre_market_price: number | null
  post_market_price: number | null
  market_state: 'PRE' | 'REGULAR' | 'POST' | 'POSTPOST' | 'FUTURES' | 'CLOSED' | string
  pre_market_change_pct: number | null
  post_market_change_pct: number | null
  change: number | null
  change_pct: number | null
  prev_close: number | null
  market_cap: number | null
  volume: number | null
  currency: string
  day_high: number | null
  day_low: number | null
  logo_url: string
  last_updated: string | null
}

export type MarketIndex = MarketStock

export function useMarketQuotes(index?: string, enabled = true) {
  const queryParam = index && index !== 'Todos' ? `?index=${encodeURIComponent(index)}` : ''
  return useQuery({
    queryKey: ['market-quotes', index],
    queryFn: () => get<{ stocks: MarketStock[]; count: number; cached: boolean; cache_timestamp: string }>(`/market/quotes${queryParam}`),
    enabled,
    staleTime: 1000 * 55,        // 55 s — just under cache TTL
    refetchInterval: 1000 * 60,  // poll every 60 s
  })
}

export function useMarketIndices() {
  return useQuery({
    queryKey: ['market-indices'],
    queryFn: () => get<{ indices: MarketIndex[]; cache_timestamp: string }>('/market/indices'),
    staleTime: 1000 * 55,
    refetchInterval: 1000 * 60,
  })
}

export interface MarketHistoryPoint {
  date: string
  time: string
  price: number
}

export interface MarketHistoryResponse {
  ticker: string
  period: string
  count: number
  period_change: number
  period_change_pct: number
  min_price: number
  max_price: number
  points: MarketHistoryPoint[]
}

export function useMarketHistory(ticker?: string, period: string = '1mo') {
  return useQuery<MarketHistoryResponse>({
    queryKey: ['market-history', ticker, period],
    queryFn: () => get<MarketHistoryResponse>(`/market/history?ticker=${encodeURIComponent(ticker!)}&period=${period}`),
    enabled: Boolean(ticker),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}


