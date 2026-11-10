import React, { useState, useMemo } from 'react'
import {
  Search,
  Globe,
  Zap,
  PieChart,
  Cpu,
  Layers,
  LayoutGrid,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useMarketIndices, useMarketQuotes, type MarketStock } from '@/api/queries'
import { MarketSessionsBar } from '@/components/market/MarketSessionsBar'
import { WorldMarketsRegionalCard } from '@/components/market/WorldMarketsRegionalCard'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { SimulatedPortfolioCard } from '@/components/market/SimulatedPortfolioCard'
import { cn } from '@/lib/utils'

const INDEX_TABS = [
  {
    id: 'Todos',
    label: 'Todos los Mercados',
    icon: <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
  },
  {
    id: 'TICKER',
    label: 'Ticker superior',
    icon: <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
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

type MarketSectionView = 'all' | 'markets' | 'heatmap'

export const MarketPage: React.FC = () => {
  const [viewSection, setViewSection] = useState<MarketSectionView>('all')
  const [selectedIndex, setSelectedIndex] = useState<string>('Todos')
  const [selectedSector, setSelectedSector] = useState<string>('Todos')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)

  const { data: quoteData, isLoading: quotesLoading, isFetching: quotesFetching } = useMarketQuotes(
    selectedIndex,
    selectedIndex !== 'TICKER'
  )
  const { data: tickerData, isLoading: tickerLoading, isFetching: tickerFetching } = useMarketIndices()
  const isTickerUniverse = selectedIndex === 'TICKER'
  const tickerStocks = useMemo(() => {
    const raw = tickerData?.indices ?? []
    const filtered = isTickerUniverse
      ? raw.filter((stock) => TICKER_ORDER.includes(stock.ticker))
      : raw
    return filtered.map((stock) => {
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
    })
  }, [tickerData?.indices, isTickerUniverse])
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
        if (isTickerUniverse) {
          return getTickerOrder(a) - getTickerOrder(b)
        }
        return (b.market_cap ?? 0) - (a.market_cap ?? 0)
      })
  }, [data?.stocks, selectedSector, searchQuery, isTickerUniverse])

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

      {/* Selector de Modo de Visualización */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-1.5 sm:p-2 rounded-2xl bg-white/90 dark:bg-[#1e1e1e]/90 border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewSection('all')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              viewSection === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Vista Completa</span>
          </button>
          <button
            type="button"
            onClick={() => setViewSection('markets')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              viewSection === 'markets'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Bolsas del Mundo</span>
          </button>
          <button
            type="button"
            onClick={() => setViewSection('heatmap')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              viewSection === 'heatmap'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Mapa de Calor</span>
          </button>
        </div>

        <span className="hidden md:inline text-[11px] font-mono text-slate-400 dark:text-slate-500 pr-2">
          {viewSection === 'all'
            ? 'Bolsas globales + Mapa de calor sectorial'
            : viewSection === 'markets'
            ? '17 índices globales por regiones'
            : `${filteredStocks.length} valores en mapa de calor`}
        </span>
      </div>

      {/* 1. Bolsas del Mundo & Cotizaciones Regionales (Ancho Completo) */}
      {(viewSection === 'all' || viewSection === 'markets') && (
        <WorldMarketsRegionalCard
          indices={tickerData?.indices ?? []}
          isLoading={tickerLoading}
          onSelectIndex={(index) => {
            setSelectedStock(index)
          }}
          onFilterUniverse={(tabId) => {
            setSelectedIndex(tabId)
          }}
        />
      )}

      {/* 2. Mapa de Calor del Mercado con Barra de Filtros (Ancho Completo) */}
      {(viewSection === 'all' || viewSection === 'heatmap') && (
        <div className="space-y-3.5">
          {/* Controls & Filter Bar (Pestañas de Índices + Buscador) */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-xl dark:shadow-black/20">
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

              {/* Right: Search Bar */}
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
            </div>
          </div>

          {/* Mapa de Calor a Ancho Completo */}
          <div className="w-full min-w-0">
            <MarketHeatmap
              stocks={filteredStocks}
              onSelectStock={(stock) => setSelectedStock(stock)}
              selectedSector={selectedSector}
              onSectorChange={setSelectedSector}
              isIndices={isTickerUniverse || selectedSector === 'Índices'}
              defaultExpanded={false}
            />
          </div>
        </div>
      )}

      {/* Stock Detail Modal */}
      <StockDetailModal
        stock={selectedStock}
        onClose={() => setSelectedStock(null)}
      />
    </div>
  )
}

export default MarketPage
