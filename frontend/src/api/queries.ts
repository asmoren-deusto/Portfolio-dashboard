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
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Summary ────────────────────────────────────────────────────────────────────
export function usePortfolioSummary() {
  const { useMock, period } = useAppStore()
  return useQuery<PortfolioSummary>({
    queryKey: ['summary', period],
    queryFn: () => (useMock ? Promise.resolve(MOCK_SUMMARY) : get<PortfolioSummary>('/portfolio/summary')),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 15,
  })
}

// ── Positions ─────────────────────────────────────────────────────────────────
export function usePositions() {
  const { useMock } = useAppStore()
  return useQuery<Position[]>({
    queryKey: ['positions'],
    queryFn: () => (useMock ? Promise.resolve(MOCK_POSITIONS) : get<Position[]>('/portfolio/positions')),
    staleTime: 1000 * 60 * 5,
  })
}

// ── Performance ────────────────────────────────────────────────────────────────
export function usePerformance() {
  const { useMock, period } = useAppStore()
  return useQuery<PricePoint[]>({
    queryKey: ['performance', period],
    queryFn: (): Promise<PricePoint[]> =>
      useMock
        ? Promise.resolve(MOCK_PERFORMANCE[period] ?? [])
        : get<PricePoint[]>(`/portfolio/performance?period=${period}`),
    staleTime: 1000 * 60 * 5,
  })
}

// ── Analytics ──────────────────────────────────────────────────────────────────
export function useAnalytics() {
  const { useMock, period } = useAppStore()
  return useQuery<Analytics>({
    queryKey: ['analytics', period],
    queryFn: () => (useMock ? Promise.resolve(MOCK_ANALYTICS) : get<Analytics>(`/portfolio/analytics?period=${period}`)),
    staleTime: 1000 * 60 * 5,
  })
}

// ── Transactions ───────────────────────────────────────────────────────────────
export function useTransactions() {
  const { useMock } = useAppStore()
  return useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => (useMock ? Promise.resolve(MOCK_TRANSACTIONS) : get<Transaction[]>('/transactions')),
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


