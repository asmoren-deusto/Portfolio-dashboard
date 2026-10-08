import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2,
  Flame,
  ChevronDown,
  Layers,
  ArrowUpDown,
  Filter,
  Sparkles,
  Columns2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMarketIndices, useMarketQuotes, type MarketStock } from '@/api/queries'
import { MarketTicker } from '@/components/market/MarketTicker'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import { StockCard } from '@/components/market/StockCard'
import { StockTableRow } from '@/components/market/StockTableRow'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { LoadingDot } from '@/components/ui/LoadingDot'
import { fmt } from '@/lib/utils'

const INDEX_TABS = [
  { id: 'TICKER', label: 'Ticker superior' },
  { id: 'Todos', label: 'Todos los Mercados' },
  { id: 'SP500', label: 'S&P 500' },
  { id: 'NASDAQ100', label: 'NASDAQ 100' },
  { id: 'IBEX35', label: 'IBEX 35' },
  { id: 'DAX', label: 'DAX 40' },
]

export const TICKER_ORDER = [
  '^GSPC',      // S&P 500
  '^IXIC',      // NASDAQ
  'URTH',       // MSCI World
  'EEM',        // Emergentes
  '^IBEX',      // IBEX 35
  '^STOXX50E',  // Euro 50
  '^N225',      // Nikkei 225
  'GC=F',       // Oro
  'BZ=F',       // Petróleo
  'BTC-EUR',    // BTC/EUR
  'EURUSD=X',   // EUR/USD
  'EURJPY=X',   // EUR/JPY
]

function getTickerOrder(stock: { ticker: string; name?: string }): number {
  const idx = TICKER_ORDER.indexOf(stock.ticker)
  if (idx !== -1) return idx
  const name = stock.name || ''
  if (stock.ticker === '^GSPC' || name.includes('S&P')) return 0
  if (stock.ticker === '^IXIC' || name.includes('NASDAQ')) return 1
  if (stock.ticker === 'URTH' || name.includes('MSCI World')) return 2
  if (stock.ticker === 'EEM' || name.includes('Emergentes')) return 3
  if (stock.ticker === '^IBEX' || name.includes('IBEX')) return 4
  if (stock.ticker === '^STOXX50E' || name.includes('Euro 50') || name.includes('Stoxx')) return 5
  if (stock.ticker === '^N225' || name.includes('Nikkei')) return 6
  if (stock.ticker === 'GC=F' || name.includes('Oro')) return 7
  if (stock.ticker === 'BZ=F' || name.includes('Petróleo') || name.includes('Brent')) return 8
  if (stock.ticker === 'BTC-EUR' || stock.ticker?.includes('BTC') || name.includes('BTC')) return 9
  if (stock.ticker === 'EURUSD=X' || name.includes('EUR/USD')) return 10
  if (stock.ticker === 'EURJPY=X' || name.includes('EUR/JPY')) return 11
  return 999
}

type SortOption = 'ticker' | 'market_cap_desc' | 'change_pct_desc' | 'change_pct_asc' | 'volume_desc' | 'price_desc'
type ViewMode = 'split' | 'heatmap' | 'grid' | 'table'

export const MarketPage: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState<string>('TICKER')
  const [selectedSector, setSelectedSector] = useState<string>('Todos')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('ticker')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)

  // Height synchronization between Heatmap and Stock List in split view
  const heatmapContainerRef = useRef<HTMLDivElement>(null)
  const [heatmapHeight, setHeatmapHeight] = useState<number>(760)

  useEffect(() => {
    if (viewMode !== 'split') return
    const el = heatmapContainerRef.current
    if (!el) return

    const updateHeight = () => {
      if (heatmapContainerRef.current) {
        const h = heatmapContainerRef.current.offsetHeight
        if (h > 200) {
          setHeatmapHeight(h)
        }
      }
    }

    updateHeight()
    const ro = new ResizeObserver(() => {
      updateHeight()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [viewMode])

  const { data: quoteData, isLoading: quotesLoading, isFetching: quotesFetching } = useMarketQuotes(
    selectedIndex,
    selectedIndex !== 'TICKER'
  )
  const { data: tickerData, isLoading: tickerLoading, isFetching: tickerFetching } = useMarketIndices()
  const isTickerUniverse = selectedIndex === 'TICKER'
  const tickerStocks = useMemo(() => (tickerData?.indices ?? []).map((stock) => {
    const rawName = stock.name || ''
    const cleanName =
      rawName === 'MSCI Emergentes' || rawName === 'Emegentes'
        ? 'Emergentes'
        : rawName === 'Euro Stoxx 50'
        ? 'Euro 50'
        : rawName === 'Petróleo Brent' || rawName.startsWith('Petróleo')
        ? 'Petróleo'
        : rawName

    return {
      ...stock,
      name: cleanName,
      sector: stock.sector?.startsWith('Índice')
        ? 'Índices'
        : stock.sector?.startsWith('Materia Prima')
        ? 'Materias primas'
        : stock.sector || 'Índices',
    }
  }), [tickerData?.indices])
  const data = isTickerUniverse
    ? { stocks: tickerStocks }
    : quoteData
  const isLoading = isTickerUniverse ? tickerLoading : quotesLoading
  const isFetching = isTickerUniverse ? tickerFetching : quotesFetching

  // Extract unique sectors
  const sectors = useMemo(() => {
    if (!data?.stocks) return ['Todos']
    const set = new Set<string>()
    data.stocks.forEach((s) => {
      if (s.sector) set.add(s.sector)
    })
    return ['Todos', ...Array.from(set).sort()]
  }, [data?.stocks])

  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    if (!data?.stocks) return []

    return data.stocks
      .filter((s) => {
        // Sector filter
        if (selectedSector !== 'Todos' && s.sector !== selectedSector) return false
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          return (
            s.name.toLowerCase().includes(q) ||
            s.ticker.toLowerCase().includes(q) ||
            s.sector.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'ticker':
            if (isTickerUniverse) {
              return getTickerOrder(a) - getTickerOrder(b)
            }
            return (b.market_cap ?? 0) - (a.market_cap ?? 0)
          case 'market_cap_desc':
            return (b.market_cap ?? 0) - (a.market_cap ?? 0)
          case 'change_pct_desc':
            return (b.change_pct ?? -999) - (a.change_pct ?? -999)
          case 'change_pct_asc':
            return (a.change_pct ?? 999) - (b.change_pct ?? 999)
          case 'volume_desc':
            return (b.volume ?? 0) - (a.volume ?? 0)
          case 'price_desc':
            return (b.price ?? 0) - (a.price ?? 0)
          default:
            return 0
        }
      })
  }, [data?.stocks, selectedSector, searchQuery, sortBy, isTickerUniverse])

  // Quick stats
  const stats = useMemo<{
    bestStock: MarketStock | null
    worstStock: MarketStock | null
    totalCap: number
    advancing: number
    declining: number
  } | null>(() => {
    if (!data?.stocks || data.stocks.length === 0) return null

    let bestStock: MarketStock | null = null
    let worstStock: MarketStock | null = null
    let totalCap = 0
    let advancing = 0
    let declining = 0

    data.stocks.forEach((s) => {
      if (s.market_cap) totalCap += s.market_cap
      if ((s.change_pct ?? 0) >= 0) advancing++
      else declining++

      if (!bestStock || (s.change_pct ?? -999) > (bestStock.change_pct ?? -999)) {
        bestStock = s
      }
      if (!worstStock || (s.change_pct ?? 999) < (worstStock.change_pct ?? 999)) {
        worstStock = s
      }
    })

    return { bestStock, worstStock, totalCap, advancing, declining }
  }, [data?.stocks])

  const bestStock = stats?.bestStock
  const worstStock = stats?.worstStock

  return (
    <div className="space-y-4 pb-8">
      {/* Real-time Ticker Bar */}

      {/* Real-time Ticker Bar */}
      <MarketTicker onSelectStock={setSelectedStock} />

      {/* Summary KPI Highlights */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Total Companies */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20 cursor-card">
            {isFetching && (
              <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 animate-pulse z-10" />
            )}
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <span>Total Seguimiento</span>
                {isFetching && <LoadingDot />}
              </div>
              <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white mt-1">
              {data?.stocks.length ?? 0} <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">valores</span>
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.advancing} ↑</span> al alza /{' '}
              <span className="text-rose-600 dark:text-rose-400 font-bold">{stats.declining} ↓</span> a la baja
            </div>
          </div>

          {/* Top Gainer */}
          {bestStock && (
            <div
              onClick={() => setSelectedStock(bestStock)}
              className="relative overflow-hidden p-4 rounded-2xl bg-white/95 hover:bg-slate-50/80 dark:bg-[#1e1e1e]/96 dark:hover:bg-[#2a2d2e] border border-emerald-500/25 hover:border-emerald-500/40 backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-emerald-500/5 cursor-pointer transition-all group"
            >
              {isFetching && (
                <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 animate-pulse z-10" />
              )}
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span>Mayor Ganancia Hoy</span>
                  {isFetching && <LoadingDot />}
                </div>
                <Flame className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-slate-950 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate max-w-[120px]">
                  {bestStock.name}
                </span>
                <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                  +{bestStock.change_pct?.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs font-mono text-slate-700 dark:text-slate-300 font-medium mt-1.5">
                {bestStock.ticker} • {fmt.price(bestStock.price, bestStock.currency)}
              </div>
            </div>
          )}

          {/* Top Loser */}
          {worstStock && (
            <div
              onClick={() => setSelectedStock(worstStock)}
              className="relative overflow-hidden p-4 rounded-2xl bg-white/95 hover:bg-slate-50/80 dark:bg-[#1e1e1e]/96 dark:hover:bg-[#2a2d2e] border border-rose-500/25 hover:border-rose-500/40 backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-rose-500/5 cursor-pointer transition-all group"
            >
              {isFetching && (
                <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 animate-pulse z-10" />
              )}
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span>Mayor Caída Hoy</span>
                  {isFetching && <LoadingDot />}
                </div>
                <TrendingDown className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold text-slate-950 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate max-w-[120px]">
                  {worstStock.name}
                </span>
                <span className="text-sm font-bold font-mono text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
                  {worstStock.change_pct?.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs font-mono text-slate-700 dark:text-slate-300 font-medium mt-1.5">
                {worstStock.ticker} • {fmt.price(worstStock.price, worstStock.currency)}
              </div>
            </div>
          )}

          {/* Combined Capitalization */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20 cursor-card">
            {isFetching && (
              <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 animate-pulse z-10" />
            )}
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <span>Cap. Agregada</span>
                {isFetching && <LoadingDot />}
              </div>
              <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white mt-1">
              {fmt.marketCap(stats.totalCap, 'USD')}
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
              Megacaps USA & Europa
            </div>
          </div>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-md shadow-sm dark:shadow-xl dark:shadow-black/20 space-y-4">
        {/* Row 1: Index Tabs with fluid sliding indicator */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 relative">
          {INDEX_TABS.map((tab) => {
            const active = selectedIndex === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedIndex(tab.id)
                  setSelectedSector('Todos')
                  if (tab.id === 'TICKER') {
                    setSortBy('ticker')
                  } else if (sortBy === 'ticker') {
                    setSortBy('market_cap_desc')
                  }
                }}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors z-10 ${
                  active ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.03]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeMarketTabPill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/30 -z-10"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Row 2: Search, Sector dropdown, Sort options, View mode */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.05]">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por empresa, ticker (ej. Apple, AAPL, Inditex)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Quick preset filters and sorting */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Sector selector */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="appearance-none pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
              >
                {sectors.map((sec) => (
                  <option key={sec} value={sec} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-white">
                    Sector: {sec}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Sort selector */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
              >
                {isTickerUniverse && (
                  <option value="ticker" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-white">
                    Orden del Ticker (S&P 500 primero)
                  </option>
                )}
                <option value="market_cap_desc" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-white">
                  Más Capitalización ↓
                </option>
                <option value="change_pct_desc" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-white">
                  Mejor Rendimiento Hoy (Gainers)
                </option>
                <option value="change_pct_asc" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-white">
                  Peor Rendimiento Hoy (Losers)
                </option>
                <option value="volume_desc" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-white">
                  Más Volumen ↓
                </option>
                <option value="price_desc" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-white">
                  Mayor Precio ↓
                </option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* View Mode Switcher (Dual / Heatmap / Grid / Table) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'split'
                    ? 'bg-white text-slate-900 dark:bg-[#333333] dark:border dark:border-white/10 dark:text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Vista dual: listado y heatmap paralelos"
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Dual</span>
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'heatmap'
                    ? 'bg-white text-slate-900 dark:bg-[#333333] dark:border dark:border-white/10 dark:text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Mapa de calor interactivo completo"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Heatmap</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 dark:bg-[#333333] dark:border dark:border-white/10 dark:text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Vista de cuadrícula con logos"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 dark:bg-[#333333] dark:border dark:border-white/10 dark:text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Vista de tabla densa"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stock List Display with Fluid Animations */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-slate-100 dark:bg-[#1e1e1e]/60 border border-slate-200 dark:border-white/[0.05] animate-pulse p-5 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05]" />
                <div className="space-y-2 flex-1">
                  <div className="w-24 h-4 rounded bg-white/[0.05]" />
                  <div className="w-16 h-3 rounded bg-white/[0.03]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-28 h-6 rounded bg-white/[0.05]" />
                <div className="w-full h-1.5 rounded-full bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredStocks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-100 dark:bg-[#1e1e1e]/60 border border-slate-200 dark:border-white/[0.05]">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">
            No se encontraron acciones
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Prueba a modificar los filtros de búsqueda, cambiar de índice o restablecer el sector.
          </p>
        </div>
      ) : viewMode === 'split' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left Column: Interactive Stock List — Explicit Height Synchronized with Heatmap */}
          <div
            style={{ height: `${heatmapHeight}px` }}
            className="xl:col-span-7 rounded-2xl bg-white/95 dark:bg-[#1e1e1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-2xl overflow-hidden flex flex-col relative"
          >
            {isFetching && (
              <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 animate-pulse z-10" />
            )}
            <div className="px-4 py-3 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between bg-slate-50/70 dark:bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <List className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Listado de Cotizadas
                </h3>
                {isFetching && <LoadingDot />}
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-white/[0.06]">
                {filteredStocks.length} valores
              </span>
            </div>
            {/* Table */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[35%]" />
                  <col className="w-[14%]" />
                  <col className="w-[11%]" />
                  <col className="hidden lg:table-column w-[11%]" />
                  <col className="hidden lg:table-column w-[13%]" />
                  <col className="hidden xl:table-column w-[12%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#1e1e1e]/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-white/[0.06]">
                  <tr>
                    <th className="px-3 py-1.5 text-center text-[9.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 font-normal">#</th>
                    <th className="px-3 py-1.5 text-left text-[9.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 font-normal">Empresa</th>
                    <th className="px-2 py-1.5 text-right text-[9.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 font-normal">Precio</th>
                    <th className="px-2 pr-3 lg:pr-2 py-1.5 text-right text-[9.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 font-normal">Var. %</th>
                    <th className="hidden lg:table-cell px-2 py-1.5 text-right text-[9.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 font-normal">Cierre</th>
                    <th className="hidden lg:table-cell px-2 pr-3 xl:pr-2 py-1.5 text-right text-[9.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 font-normal">Vol / Cap</th>
                    <th className="hidden xl:table-cell px-2 pr-3 py-1.5 text-right text-[9.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 font-normal">Rango día</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 dark:divide-white/[0.03]">
                  {filteredStocks.map((stock, i) => {
                    const isPositive = (stock.change_pct ?? 0) >= 0
                    const isSelected = selectedStock?.ticker === stock.ticker
                    const rangePct =
                      stock.day_high != null && stock.day_low != null && stock.day_high !== stock.day_low && stock.price != null
                        ? Math.max(0, Math.min(1, (stock.price - stock.day_low) / (stock.day_high - stock.day_low)))
                        : null

                    return (
                      <tr
                        key={stock.ticker}
                        onClick={() => setSelectedStock(stock)}
                        className={`transition-all cursor-pointer group ${
                          isSelected
                            ? 'bg-blue-50/90 dark:bg-[#2a2d2e]'
                            : 'hover:bg-slate-50/80 dark:hover:bg-[#2a2d2e]/60'
                        }`}
                      >
                        {/* # */}
                        <td className="px-3 py-2.5 text-center">
                          <span className="font-mono font-bold text-xs text-slate-400 dark:text-slate-500">
                            {i + 1}
                          </span>
                        </td>

                        {/* Empresa */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CompanyLogo
                              ticker={stock.ticker}
                              name={stock.name}
                              domain={stock.domain}
                              logoUrl={stock.logo_url}
                              size="md"
                            />
                            <div className="min-w-0 overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-white transition-colors truncate">
                                  {stock.name}
                                </span>
                                <span className="hidden sm:inline text-[10.5px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/[0.05] px-1 py-px rounded truncate max-w-[60px]">
                                  {stock.sector}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate leading-tight font-mono font-medium">
                                  {stock.ticker}
                                </p>
                                {stock.market_state === 'PRE' && (
                                  <span className="inline-flex items-center text-[8.5px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded-full border leading-none bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                                    Pre
                                  </span>
                                )}
                                {(stock.market_state === 'POST' || stock.market_state === 'POSTPOST') && (
                                  <span className="inline-flex items-center text-[8.5px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded-full border leading-none bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
                                    Post
                                  </span>
                                )}
                                {(stock.market_state === 'FUTURES' || stock.market_state === 'OVERNIGHT') && (
                                  <span className="inline-flex items-center text-[8.5px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded-full border leading-none bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20">
                                    FUTURES
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Precio */}
                        <td className="px-2 py-2.5 text-right">
                          <div className="font-bold font-mono text-[13px] text-slate-950 dark:text-white whitespace-nowrap">
                            {fmt.price(stock.price, stock.currency)}
                          </div>
                          {stock.change != null && (
                            <div className={`text-[11px] font-mono font-semibold leading-tight mt-0.5 ${
                              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {isPositive ? '+' : ''}{stock.change.toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Var % */}
                        <td className="px-2 pr-3 lg:pr-2 py-2.5 text-right">
                          <span className={`inline-block font-mono text-xs font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                            stock.change_pct === null || stock.change_pct === undefined
                              ? 'text-slate-500 bg-slate-100 dark:bg-white/[0.05]'
                              : isPositive
                              ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/15'
                              : 'text-rose-700 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/15'
                          }`}>
                            {stock.change_pct != null
                              ? `${isPositive ? '+' : ''}${stock.change_pct.toFixed(2)}%`
                              : '—'}
                          </span>
                        </td>

                        {/* Cierre */}
                        <td className="hidden lg:table-cell px-2 py-2.5 text-right">
                          <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {stock.market_state && stock.market_state !== 'REGULAR' && stock.market_state !== 'CLOSED' && stock.regular_price != null
                              ? fmt.price(stock.regular_price, stock.currency)
                              : fmt.price(stock.prev_close, stock.currency)}
                          </span>
                        </td>

                        {/* Vol / Cap */}
                        <td className="hidden lg:table-cell px-2 pr-3 xl:pr-2 py-2.5 text-right">
                          <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap block">
                            {fmt.volume(stock.volume)}
                          </span>
                          {stock.market_cap != null ? (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500 whitespace-nowrap block mt-0.5">
                              {fmt.marketCap(stock.market_cap, stock.currency)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 block">—</span>
                          )}
                        </td>

                        {/* Rango día */}
                        <td className="hidden xl:table-cell px-2 pr-3 py-2.5">
                          {rangePct !== null ? (
                            <div className="flex flex-col gap-1">
                              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                  style={{ width: `${rangePct * 100}%` }}
                                />
                              </div>
                              <div className="flex justify-between w-full">
                                <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-600">
                                  {stock.day_low?.toFixed(1)}
                                </span>
                                <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-600">
                                  {stock.day_high?.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Heatmap */}
          <div ref={heatmapContainerRef} className="xl:col-span-5 w-full min-w-0">
            <MarketHeatmap
              stocks={filteredStocks}
              onSelectStock={(stock) => setSelectedStock(stock)}
              selectedSector={selectedSector}
              onSectorChange={setSelectedSector}
              isIndices={isTickerUniverse || selectedSector === 'Índices'}
            />
          </div>
        </div>
      ) : viewMode === 'heatmap' ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <MarketHeatmap
            stocks={filteredStocks}
            onSelectStock={(stock) => setSelectedStock(stock)}
            selectedSector={selectedSector}
            onSectorChange={setSelectedSector}
            isIndices={isTickerUniverse || selectedSector === 'Índices'}
          />
        </motion.div>
      ) : viewMode === 'grid' ? (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredStocks.map((stock) => (
              <motion.div
                key={stock.ticker}
                layout
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <StockCard
                  stock={stock}
                  onClick={() => setSelectedStock(stock)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="overflow-x-auto rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-xl"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/75 dark:bg-white/[0.01] text-xs font-semibold tracking-wider uppercase text-slate-700 dark:text-slate-400">
                <th className="py-3.5 pl-4 pr-1 text-center w-8">#</th>
                <th className="py-3.5 px-4">Empresa / Ticker</th>
                <th className="py-3.5 px-4 text-right">Precio Actual</th>
                <th className="py-3.5 px-4 text-right">Variación Hoy</th>
                <th className="py-3.5 px-4 text-right">Cap. Bursátil</th>
                <th className="py-3.5 px-4 text-right">Volumen</th>
                <th className="py-3.5 px-4">Rango 24h</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((stock, i) => (
                <StockTableRow
                  key={stock.ticker}
                  stock={stock}
                  rank={i + 1}
                  onClick={() => setSelectedStock(stock)}
                />
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Stock Detail Modal */}
      <StockDetailModal
        stock={selectedStock}
        onClose={() => setSelectedStock(null)}
      />
    </div>
  )
}
