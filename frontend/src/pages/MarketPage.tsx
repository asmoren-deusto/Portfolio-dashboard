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
  Globe,
  Zap,
  PieChart,
  Cpu,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMarketIndices, useMarketQuotes, type MarketStock } from '@/api/queries'
import { MarketTicker } from '@/components/market/MarketTicker'
import { MarketSessionsBar } from '@/components/market/MarketSessionsBar'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import { StockCard } from '@/components/market/StockCard'
import { StockTableRow } from '@/components/market/StockTableRow'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { LoadingDot } from '@/components/ui/LoadingDot'
import { TableSkeletonRows } from '@/components/ui/TableSkeleton'
import { SimulatedPortfolioCard } from '@/components/market/SimulatedPortfolioCard'
import { fmt } from '@/lib/utils'

const INDEX_TABS = [
  {
    id: 'TICKER',
    label: 'Ticker superior',
    icon: <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
  },
  {
    id: 'Todos',
    label: 'Todos los Mercados',
    icon: <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
  },
  {
    id: 'ETFs',
    label: 'ETFs Cartera',
    icon: <PieChart className="w-3.5 h-3.5 text-violet-500 shrink-0" />,
  },
  {
    id: 'SP500',
    label: 'S&P 500',
    icon: (
      <img
        src="https://flagcdn.com/w40/us.png"
        alt="EE.UU."
        className="w-4 h-2.5 rounded-2xs object-cover shrink-0 shadow-2xs"
      />
    ),
  },
  {
    id: 'NASDAQ100',
    label: 'NASDAQ 100',
    icon: <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
  },
  {
    id: 'IBEX35',
    label: 'IBEX 35',
    icon: (
      <img
        src="https://flagcdn.com/w40/es.png"
        alt="España"
        className="w-4 h-2.5 rounded-2xs object-cover shrink-0 shadow-2xs"
      />
    ),
  },
  {
    id: 'DAX',
    label: 'DAX 40',
    icon: (
      <img
        src="https://flagcdn.com/w40/de.png"
        alt="Alemania"
        className="w-4 h-2.5 rounded-2xs object-cover shrink-0 shadow-2xs"
      />
    ),
  },
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
      <MarketTicker onSelectStock={setSelectedStock} />

      {/* Global Market Trading Sessions Bar (Tokyo, Europe, New York) */}
      <MarketSessionsBar
        onSelectSession={(sessionId) => {
          if (sessionId === 'europe') {
            setSelectedIndex('IBEX35')
          } else if (sessionId === 'ny') {
            setSelectedIndex('SP500')
          } else if (sessionId === 'tokyo') {
            setSelectedIndex('Todos')
          }
        }}
      />

      {/* Simulated Live Portfolio Performance via Proxy ETFs */}
      <SimulatedPortfolioCard
        marketStats={stats}
        bestStock={bestStock}
        worstStock={worstStock}
        totalStocks={data?.stocks.length}
        onSelectStock={setSelectedStock}
      />

      {/* Controls & Filter Bar (Single Unified Row) */}
      <div className="p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-md shadow-sm dark:shadow-xl dark:shadow-black/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Index Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 relative">
            {INDEX_TABS.map((tab) => {
              const active = selectedIndex === tab.id
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setSelectedIndex(tab.id)
                    setSelectedSector('Todos')
                    if (tab.id === 'TICKER') {
                      setSortBy('ticker')
                    } else if (sortBy === 'ticker') {
                      setSortBy('market_cap_desc')
                    }
                  }}
                  className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors z-10 flex items-center gap-1.5 ${
                    active ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeMarketTabPill"
                      className="absolute inset-0 rounded-xl bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-sm -z-10"
                      transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                    />
                  )}
                  <span className="flex items-center shrink-0">{tab.icon}</span>
                  <span>{tab.label}</span>
                </motion.button>
              )
            })}
          </div>

          {/* Right: Search Bar + View Mode Switcher (Moved up as requested, Sector/Sort eliminated) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search bar */}
            <div className="relative w-60 sm:w-72 lg:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por empresa, ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* View Mode Switcher (Dual / Heatmap / Grid / Table) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('split')}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'split'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Vista dual: listado y heatmap paralelos"
              >
                {viewMode === 'split' && (
                  <motion.div
                    layoutId="marketViewModePill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                  />
                )}
                <Columns2 className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Dual</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('heatmap')}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'heatmap'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Mapa de calor interactivo completo"
              >
                {viewMode === 'heatmap' && (
                  <motion.div
                    layoutId="marketViewModePill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                  />
                )}
                <Layers className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Heatmap</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={`relative p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Vista de cuadrícula con logos"
              >
                {viewMode === 'grid' && (
                  <motion.div
                    layoutId="marketViewModePill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                  />
                )}
                <LayoutGrid className="w-4 h-4 relative z-10" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('table')}
                className={`relative p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Vista de tabla densa"
              >
                {viewMode === 'table' && (
                  <motion.div
                    layoutId="marketViewModePill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                  />
                )}
                <List className="w-4 h-4 relative z-10" />
              </motion.button>
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
                  <AnimatePresence initial={false}>
                    {isFetching && filteredStocks.length === 0 ? (
                      <TableSkeletonRows rows={10} cols={7} />
                    ) : (
                      filteredStocks.map((stock, i) => {
                        const isPositive = (stock.change_pct ?? 0) >= 0
                        const isSelected = selectedStock?.ticker === stock.ticker
                        const rangePct =
                          stock.day_high != null && stock.day_low != null && stock.day_high !== stock.day_low && stock.price != null
                            ? Math.max(0, Math.min(1, (stock.price - stock.day_low) / (stock.day_high - stock.day_low)))
                            : null

                        return (
                          <motion.tr
                            key={stock.ticker}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -3 }}
                            transition={{ duration: 0.18, delay: Math.min(i * 0.012, 0.15) }}
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
                      </motion.tr>
                    )
                  }))}
                </AnimatePresence>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
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
