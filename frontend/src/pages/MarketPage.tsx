import React, { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMarketQuotes, type MarketStock } from '@/api/queries'
import { Header } from '@/components/layout/Header'
import { MarketTicker } from '@/components/market/MarketTicker'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import { StockCard } from '@/components/market/StockCard'
import { StockTableRow } from '@/components/market/StockTableRow'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { fmt } from '@/lib/utils'

const INDEX_TABS = [
  { id: 'Todos', label: 'Todos los Mercados' },
  { id: 'SP500', label: 'S&P 500' },
  { id: 'NASDAQ100', label: 'NASDAQ 100' },
  { id: 'IBEX35', label: 'IBEX 35' },
  { id: 'DAX', label: 'DAX 40' },
]

type SortOption = 'market_cap_desc' | 'change_pct_desc' | 'change_pct_asc' | 'volume_desc' | 'price_desc'
type ViewMode = 'heatmap' | 'grid' | 'table'

export const MarketPage: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState<string>('Todos')
  const [selectedSector, setSelectedSector] = useState<string>('Todos')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('market_cap_desc')
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap')
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)

  const { data, isLoading, isFetching, refetch } = useMarketQuotes(selectedIndex)

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
  }, [data?.stocks, selectedSector, searchQuery, sortBy])

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
      {/* Unified Header */}
      <Header
        title="Mercado Global"
        subtitle="Cotizaciones en directo de megacaps, índices globales y valores del S&P 500 e IBEX 35."
        badge="Tiempo Real"
        badgeColor="blue"
      />

      {/* Real-time Ticker Bar */}
      <MarketTicker onSelectStock={setSelectedStock} />

      {/* Summary KPI Highlights */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Total Companies */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#111625]/80 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <span>Total Seguimiento</span>
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
              className="relative overflow-hidden p-4 rounded-2xl bg-white/95 hover:bg-slate-50/80 dark:bg-[#111625]/80 dark:hover:bg-[#151c2e] border border-emerald-500/25 hover:border-emerald-500/40 backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-emerald-500/5 cursor-pointer transition-all group"
            >
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span>Mayor Ganancia Hoy</span>
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
              className="relative overflow-hidden p-4 rounded-2xl bg-white/95 hover:bg-slate-50/80 dark:bg-[#111625]/80 dark:hover:bg-[#151c2e] border border-rose-500/25 hover:border-rose-500/40 backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-rose-500/5 cursor-pointer transition-all group"
            >
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span>Mayor Caída Hoy</span>
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
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#111625]/80 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <span>Cap. Agregada</span>
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
      <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#111625]/90 border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-md shadow-sm dark:shadow-xl dark:shadow-black/20 space-y-4">
        {/* Row 1: Index Tabs with fluid sliding indicator */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 relative">
          {INDEX_TABS.map((tab) => {
            const active = selectedIndex === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedIndex(tab.id)}
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

            {/* View Mode Switcher (Heatmap / Grid / Table) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
              <button
                onClick={() => setViewMode('heatmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'heatmap'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Mapa de calor interactivo (Heatmap)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Heatmap</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
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
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
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
              className="h-56 rounded-2xl bg-[#111625]/60 border border-white/[0.05] animate-pulse p-5 flex flex-col justify-between"
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-12 text-center rounded-2xl bg-[#111625]/60 border border-white/[0.05]"
        >
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">
            No se encontraron acciones
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Prueba a modificar los filtros de búsqueda, cambiar de índice o restablecer el sector.
          </p>
        </motion.div>
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
          className="overflow-x-auto rounded-2xl bg-white/95 dark:bg-[#111625]/90 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-xl"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/75 dark:bg-white/[0.01] text-xs font-semibold tracking-wider uppercase text-slate-700 dark:text-slate-400">
                <th className="py-3.5 px-4">Empresa / Ticker</th>
                <th className="py-3.5 px-4 text-right">Precio Actual</th>
                <th className="py-3.5 px-4 text-right">Variación Hoy</th>
                <th className="py-3.5 px-4 text-right">Cap. Bursátil</th>
                <th className="py-3.5 px-4 text-right">Volumen</th>
                <th className="py-3.5 px-4">Rango 24h</th>
                <th className="py-3.5 px-4 text-right">Índices</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((stock) => (
                <StockTableRow
                  key={stock.ticker}
                  stock={stock}
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
