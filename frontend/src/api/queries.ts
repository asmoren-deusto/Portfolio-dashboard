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
import { useAppStore } from '@/store/appStore'

const API = '/api'

async function get<T>(path: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('portfolio_auth_token') : null
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API}${path}`, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Summary ────────────────────────────────────────────────────────────────────
export function usePortfolioSummary() {
  const { useMock, period, currentUser } = useAppStore()
  const userSummary = currentUser?.summary ?? MOCK_SUMMARY

  return useQuery<PortfolioSummary>({
    queryKey: ['summary', currentUser?.id, period],
    queryFn: () =>
      useMock || currentUser?.isDemo
        ? Promise.resolve(userSummary)
        : get<PortfolioSummary>('/portfolio/summary').catch(() => userSummary),
    initialData: userSummary,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 15,
  })
}

// ── Positions ─────────────────────────────────────────────────────────────────
export function usePositions() {
  const { useMock, currentUser } = useAppStore()
  const userPositions = currentUser?.positions ?? MOCK_POSITIONS

  return useQuery<Position[]>({
    queryKey: ['positions', currentUser?.id],
    queryFn: () =>
      useMock || currentUser?.isDemo
        ? Promise.resolve(userPositions)
        : get<Position[]>('/portfolio/positions').catch(() => userPositions),
    initialData: userPositions,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
  })
}

// ── Performance ────────────────────────────────────────────────────────────────
export function usePerformance() {
  const { useMock, period, currentUser } = useAppStore()
  const userPerf = currentUser?.performance ?? MOCK_PERFORMANCE
  const userPoints = userPerf[period] ?? userPerf['1y'] ?? []

  return useQuery<PricePoint[]>({
    queryKey: ['performance', currentUser?.id, period],
    queryFn: (): Promise<PricePoint[]> =>
      useMock || currentUser?.isDemo
        ? Promise.resolve(userPoints)
        : get<PricePoint[]>(`/portfolio/performance?period=${period}`).catch(() => userPoints),
    initialData: userPoints,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
  })
}

// ── Analytics ──────────────────────────────────────────────────────────────────
export function useAnalytics() {
  const { useMock, period, currentUser } = useAppStore()
  const userAnalytics = currentUser?.analytics ?? MOCK_ANALYTICS

  return useQuery<Analytics>({
    queryKey: ['analytics', currentUser?.id, period],
    queryFn: () =>
      useMock || currentUser?.isDemo
        ? Promise.resolve(userAnalytics)
        : get<Analytics>(`/portfolio/analytics?period=${period}`).catch(() => userAnalytics),
    initialData: userAnalytics,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
  })
}

// ── Transactions ───────────────────────────────────────────────────────────────
export function useTransactions() {
  const { useMock, currentUser } = useAppStore()
  const userTx = currentUser?.transactions ?? MOCK_TRANSACTIONS

  return useQuery<Transaction[]>({
    queryKey: ['transactions', currentUser?.id],
    queryFn: () =>
      useMock || currentUser?.isDemo
        ? Promise.resolve(userTx)
        : get<Transaction[]>('/transactions').catch(() => userTx),
    initialData: userTx,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60,
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
  market_state: 'PRE' | 'REGULAR' | 'POST' | 'POSTPOST' | 'CLOSED' | string
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

export function useMarketQuotes(index?: string) {
  const queryParam = index && index !== 'Todos' ? `?index=${encodeURIComponent(index)}` : ''
  return useQuery({
    queryKey: ['market-quotes', index],
    queryFn: () => get<{ stocks: MarketStock[]; count: number; cached: boolean; cache_timestamp: string }>(`/market/quotes${queryParam}`),
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


