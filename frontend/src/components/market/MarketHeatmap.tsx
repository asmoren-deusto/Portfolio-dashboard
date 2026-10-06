import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Maximize2,
  Minimize2,
  Filter,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  Info,
  DollarSign,
  ArrowUpRight,
  ArrowRight,
  ChevronsUpDown,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react'
import type { MarketStock } from '@/api/queries'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import {
  layoutHierarchicalTreemap,
  type TreemapInputItem,
  type HierarchicalSectorNode,
} from '@/lib/treemapLayout'
import { fmt } from '@/lib/utils'

interface MarketHeatmapProps {
  stocks: MarketStock[]
  onSelectStock: (stock: MarketStock) => void
  selectedSector?: string
  onSectorChange?: (sector: string) => void
  showViewAllLink?: boolean
  isIndices?: boolean
}

const HEADER_HEIGHT = 24

function getHeatmapColor(
  changePct: number | null | undefined,
  isIndices: boolean = false
): {
  bg: string
  hoverBg: string
  text: string
  border: string
} {
  if (changePct === null || changePct === undefined) {
    return {
      bg: '#27272a',
      hoverBg: '#3f3f46',
      text: '#94a3b8',
      border: 'rgba(255,255,255,0.06)',
    }
  }

  // Indices have lower daily volatility, so we scale the thresholds to +/-1% instead of +/-3%
  const t3 = isIndices ? 1.0 : 3.0
  const t2 = isIndices ? 0.65 : 2.0
  const t1 = isIndices ? 0.35 : 1.0
  const t0 = isIndices ? 0.08 : 0.2

  // Positive gains (green scale)
  if (changePct >= t3) {
    return {
      bg: '#047857',
      hoverBg: '#059669',
      text: '#ecfdf5',
      border: '#10b981',
    }
  }
  if (changePct >= t2) {
    return {
      bg: '#059669',
      hoverBg: '#10b981',
      text: '#ecfdf5',
      border: '#34d399',
    }
  }
  if (changePct >= t1) {
    return {
      bg: '#0f766e',
      hoverBg: '#14b8a6',
      text: '#f0fdfa',
      border: '#2dd4bf',
    }
  }
  if (changePct >= t0) {
    return {
      bg: '#064e3b',
      hoverBg: '#065f46',
      text: '#d1fae5',
      border: '#059669',
    }
  }

  // Neutral (close to 0%)
  if (changePct > -t0) {
    return {
      bg: '#27272a',
      hoverBg: '#3f3f46',
      text: '#cbd5e1',
      border: '#52525b',
    }
  }

  // Negative drops (red scale)
  if (changePct > -t1) {
    return {
      bg: '#7f1d1d',
      hoverBg: '#991b1b',
      text: '#fee2e2',
      border: '#b91c1c',
    }
  }
  if (changePct > -t2) {
    return {
      bg: '#991b1b',
      hoverBg: '#b91c1c',
      text: '#fef2f2',
      border: '#dc2626',
    }
  }
  if (changePct > -t3) {
    return {
      bg: '#b91c1c',
      hoverBg: '#dc2626',
      text: '#ffffff',
      border: '#ef4444',
    }
  }

  return {
    bg: '#dc2626',
    hoverBg: '#ef4444',
    text: '#ffffff',
    border: '#f87171',
  }
}

function formatMarketCap(cap: number | null | undefined): string {
  if (!cap || cap <= 0) return '—'
  if (cap >= 1_000_000_000_000) {
    return `${(cap / 1_000_000_000_000).toFixed(2)} B$`
  }
  if (cap >= 1_000_000_000) {
    return `${(cap / 1_000_000_000).toFixed(1)} M$`
  }
  return `${(cap / 1_000_000).toFixed(0)} M$`
}

const INDEX_DESCRIPTIVE_NAMES: Record<string, string> = {
  '^IXIC': 'NASDAQ',
  'IXIC': 'NASDAQ',
  'IXIQ': 'NASDAQ',
  '^NDX': 'NASDAQ 100',
  'NDX': 'NASDAQ 100',
  'NQ=F': 'NASDAQ Fut.',
  '^GSPC': 'S&P 500',
  'GSPC': 'S&P 500',
  'ES=F': 'S&P 500 Fut.',
  'URTH': 'MSCI World',
  'EEM': 'Emergentes',
  '^IBEX': 'IBEX 35',
  'IBEX': 'IBEX 35',
  'IBEX35': 'IBEX 35',
  '^STOXX50E': 'Euro 50',
  'STOXX50E': 'Euro 50',
  '^SX5E': 'Euro 50',
  '^GDAXI': 'DAX 40',
  'GDAXI': 'DAX 40',
  'DAX': 'DAX 40',
  '^N225': 'Nikkei 225',
  'N225': 'Nikkei 225',
  'NIY=F': 'Nikkei Fut.',
  '^DJI': 'Dow Jones',
  'DJI': 'Dow Jones',
  'YM=F': 'Dow Fut.',
  '^RUT': 'Russell 2000',
  'RTY=F': 'Russell Fut.',
  'GC=F': 'Oro',
  'BZ=F': 'Petróleo',
  'CL=F': 'Crudo WTI',
  'SI=F': 'Plata',
  '^VIX': 'VIX',
  'VIX': 'VIX',
  'BTC-EUR': 'BTC/EUR',
  'BTC-USD': 'BTC/USD',
  'EURUSD=X': 'EUR/USD',
  'EURJPY=X': 'EUR/JPY',
  'GBPUSD=X': 'GBP/USD',
  'USDJPY=X': 'USD/JPY',
  'SPY': 'S&P 500',
  'QQQ': 'NASDAQ 100',
  'DIA': 'Dow Jones',
  'IWM': 'Russell 2000',
}

function cleanIndexName(name: string): string {
  if (!name) return ''
  if (name === 'Euro Stoxx 50') return 'Euro 50'
  if (name === 'MSCI Emergentes') return 'Emergentes'
  if (name.startsWith('Petróleo') || name === 'Petróleo Brent') return 'Petróleo'
  if (name === 'NASDAQ Composite') return 'NASDAQ'
  if (name === 'S&P 500 Index') return 'S&P 500'
  if (name === 'Nikkei 225 Stock Average') return 'Nikkei 225'
  return name
}

function getHeatmapDisplayName(stock: MarketStock, isIndex: boolean): string {
  if (INDEX_DESCRIPTIVE_NAMES[stock.ticker]) {
    return INDEX_DESCRIPTIVE_NAMES[stock.ticker]
  }
  if (isIndex && stock.name) {
    return cleanIndexName(stock.name)
  }
  if (isIndex && stock.ticker.startsWith('^')) {
    return stock.ticker.slice(1)
  }
  return stock.ticker.replace('.MC', '').replace('.DE', '').replace('.AS', '').replace('.PA', '')
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({
  stocks,
  onSelectStock,
  selectedSector: propSector,
  onSectorChange,
  showViewAllLink = false,
  isIndices: propIsIndices,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 680 })
  const [heightMode, setHeightMode] = useState<'standard' | 'expanded'>('standard')
  const [hoveredStock, setHoveredStock] = useState<{
    stock: MarketStock
    x: number
    y: number
  } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [localSector, setLocalSector] = useState<string>('Todos')

  const activeSector = propSector ?? localSector
  const setSector = onSectorChange ?? setLocalSector

  // Measure container size with perfect height synchronization
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const clientWidth = containerRef.current.clientWidth

        let computedHeight = 720
        if (isFullscreen) {
          computedHeight = Math.max(500, window.innerHeight - 130)
        } else if (heightMode === 'expanded') {
          // Expanded height: generous space so no bottom sector is clipped
          computedHeight = Math.max(760, Math.min(940, Math.round(clientWidth * 0.64)))
        } else {
          // Standard height
          computedHeight = Math.max(640, Math.min(780, Math.round(clientWidth * 0.52)))
        }

        setDimensions({
          width: clientWidth,
          height: computedHeight,
        })
      }
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [isFullscreen, heightMode])

  // Fullscreen escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // Unique sectors
  const sectors = useMemo(() => {
    const s = new Set<string>()
    stocks.forEach((st) => {
      if (st.sector) s.add(st.sector)
    })
    return ['Todos', ...Array.from(s).sort()]
  }, [stocks])

  // Filter stocks by sector if selected
  const eligibleStocks = useMemo(() => {
    if (activeSector === 'Todos') return stocks
    return stocks.filter((s) => s.sector === activeSector)
  }, [stocks, activeSector])

  // Determine if this heatmap represents market indices
  const isIndicesMode = useMemo(() => {
    if (propIsIndices !== undefined) return propIsIndices
    if (activeSector === 'Índices' || activeSector === 'Índice') return true
    if (!eligibleStocks || eligibleStocks.length === 0) return false

    const indexCount = eligibleStocks.filter((s) => {
      const isIndexSector = s.sector === 'Índices' || s.sector?.startsWith('Índice')
      const isIndexTicker = s.ticker.startsWith('^') || ['URTH', 'SPY', 'QQQ', 'DIA', 'IWM', 'EWG', 'EWU'].includes(s.ticker)
      const hasIndexTag = Array.isArray(s.index) && s.index.some((idx) => idx.toLowerCase().includes('índice') || idx.toLowerCase().includes('indice'))
      return isIndexSector || isIndexTicker || hasIndexTag
    }).length

    return indexCount >= eligibleStocks.length * 0.4
  }, [propIsIndices, activeSector, eligibleStocks])

  // Layout treemap with exact bounds
  const sectorNodes = useMemo<HierarchicalSectorNode<MarketStock>[]>(() => {
    if (!dimensions.width || !dimensions.height || eligibleStocks.length === 0) {
      return []
    }

    const items: TreemapInputItem<MarketStock>[] = eligibleStocks.map((s) => ({
      id: s.ticker,
      value: s.market_cap && s.market_cap > 0 ? s.market_cap : 100_000_000_000,
      data: s,
    }))

    return layoutHierarchicalTreemap<MarketStock>(
      items,
      { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
      HEADER_HEIGHT,
      0
    )
  }, [eligibleStocks, dimensions])

  const handleMouseMove = (e: React.MouseEvent, stock: MarketStock) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setHoveredStock({
      stock,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseLeave = () => {
    setHoveredStock(null)
  }

  return (
    <div
      className={`flex flex-col rounded-2xl bg-white/95 dark:bg-[#181922] border border-slate-200/90 dark:border-white/[0.08] shadow-none dark:shadow-2xl transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] rounded-none p-5 sm:p-6 bg-slate-100 dark:bg-[#1d1f26] overflow-hidden'
          : 'relative p-4 md:p-5'
      }`}
    >
      {/* Heatmap Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Mapa de Calor del Mercado
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              Tamaño por capitalización bursátil • Color por rentabilidad diaria
            </p>
          </div>
        </div>

        {/* Controls: Sector Filter, Height Toggle, Legend & Fullscreen */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Sector Selector */}
          <div className="relative">
            <select
              value={activeSector}
              onChange={(e) => setSector(e.target.value)}
              className="appearance-none max-w-[120px] sm:max-w-none pl-2.5 pr-6 py-1.5 rounded-xl bg-slate-50 dark:bg-[#191a21] border border-slate-200/90 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500/50 cursor-pointer truncate"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'Todos' ? 'Todos los Sectores' : sec}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Color Scale Legend */}
          <div
            className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-[#191a21] border border-slate-200/90 dark:border-white/[0.06] text-xs font-mono font-medium"
            title={isIndicesMode ? 'Escala de rendimiento para índices: -1% a +1%' : 'Escala de rendimiento para acciones: -3% a +3%'}
          >
            <span className="text-rose-600 dark:text-rose-400 font-bold">
              {isIndicesMode ? '-1%' : '-3%'}
            </span>
            <div className="flex items-center h-2 w-24 rounded-full overflow-hidden mx-1">
              <div className="flex-1 h-full bg-[#dc2626]" />
              <div className="flex-1 h-full bg-[#b91c1c]" />
              <div className="flex-1 h-full bg-[#7f1d1d]" />
              <div className="w-1.5 h-full bg-[#27272a]" />
              <div className="flex-1 h-full bg-[#064e3b]" />
              <div className="flex-1 h-full bg-[#059669]" />
              <div className="flex-1 h-full bg-[#047857]" />
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {isIndicesMode ? '+1%' : '+3%'}
            </span>
          </div>

          {/* Height Adjuster Button (Toggle between Standard and Expanded) */}
          {!isFullscreen && (
            <button
              onClick={() =>
                setHeightMode((prev) => (prev === 'expanded' ? 'standard' : 'expanded'))
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 ${
                heightMode === 'expanded'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-500/40'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/90 dark:bg-[#191a21] dark:text-slate-400 dark:hover:text-white dark:border-white/[0.08]'
              }`}
              title={
                heightMode === 'expanded'
                  ? 'Altura ampliada (clic para altura estándar)'
                  : 'Altura estándar (clic para ampliar hacia abajo)'
              }
            >
              {heightMode === 'expanded' ? (
                <>
                  <ChevronsUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="hidden lg:inline">Ajustar</span>
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Ampliar</span>
                </>
              )}
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/90 dark:bg-[#191a21] dark:hover:bg-[#20222d] dark:text-slate-400 dark:hover:text-white dark:border-white/[0.08] transition-colors shrink-0"
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Ver mercado Link button */}
          {showViewAllLink && !isFullscreen && (
            <Link
              to="/market"
              className="inline-flex items-center gap-1.5 p-1.5 lg:px-3 lg:py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 shrink-0"
              title="Ver mercado"
            >
              <span className="hidden lg:inline">Ver mercado</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Treemap Canvas Area: Perfectly Synchronized Height */}
      <div
        ref={containerRef}
        onMouseLeave={handleMouseLeave}
        style={{
          height: isFullscreen ? 'calc(100vh - 110px)' : `${dimensions.height}px`,
        }}
        className="relative w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-[#1d1f26] border border-slate-200/90 dark:border-black/50 select-none transition-[height] duration-200"
      >
        {sectorNodes.map((sectorNode) => {
          const { x, y, width, height } = sectorNode.rect

          return (
            <div
              key={sectorNode.sector}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
              className="overflow-hidden border border-slate-300/80 dark:border-black/90 bg-slate-100 dark:bg-[#191a21] pointer-events-none"
            >
              {/* Sector Header Bar */}
              <div
                style={{ height: `${HEADER_HEIGHT}px` }}
                className="px-2.5 flex items-center justify-between bg-slate-200/90 dark:bg-[#181922] border-b border-slate-300/90 dark:border-black/80 text-xs font-bold text-slate-900 dark:text-slate-300 tracking-wide uppercase select-none"
              >
                <span className="truncate">{sectorNode.sector}</span>
                {width > 140 && (
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-400 font-medium shrink-0 ml-1">
                    {formatMarketCap(sectorNode.totalValue)}
                  </span>
                )}
              </div>

              {/* Child Stocks in Sector (Relative local coordinates) */}
              <div
                style={{ height: `calc(100% - ${HEADER_HEIGHT}px)` }}
                className="relative w-full pointer-events-auto overflow-hidden"
              >
                {sectorNode.items.map((stockRect) => {
                  const stock = stockRect.data
                  const w = stockRect.width
                  const h = stockRect.height

                  if (w <= 2 || h <= 2) return null

                  const isIndexStock =
                    isIndicesMode ||
                    stock.sector === 'Índices' ||
                    stock.sector?.toLowerCase().includes('índice') ||
                    stock.sector?.toLowerCase().includes('indice') ||
                    stock.ticker.startsWith('^') ||
                    stock.ticker.endsWith('=F') ||
                    stock.ticker.endsWith('=X') ||
                    INDEX_DESCRIPTIVE_NAMES[stock.ticker] !== undefined

                  const displayName = getHeatmapDisplayName(stock, isIndexStock)
                  const colors = getHeatmapColor(stock.change_pct, isIndicesMode)
                  const isLarge = w > 75 && h > 55
                  const isMedium = w > 45 && h > 35
                  const changeFormatted =
                    stock.change_pct !== null && stock.change_pct !== undefined
                      ? `${stock.change_pct >= 0 ? '+' : ''}${stock.change_pct.toFixed(2)}%`
                      : '0.00%'

                  return (
                    <div
                      key={stock.ticker}
                      onClick={() => onSelectStock(stock)}
                      onMouseMove={(e) => handleMouseMove(e, stock)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        position: 'absolute',
                        left: `${stockRect.x}px`,
                        top: `${stockRect.y}px`,
                        width: `${w}px`,
                        height: `${h}px`,
                        backgroundColor: colors.bg,
                      }}
                      className="group border border-black/70 hover:brightness-125 transition-all cursor-pointer overflow-hidden p-1 flex flex-col items-center justify-center text-center shadow-inner"
                    >
                      {/* Ticker / Descriptive Name */}
                      <span
                        className={`font-black tracking-tight text-white leading-none truncate max-w-[96%] px-0.5 ${
                          isLarge
                            ? displayName.length > 9
                              ? 'text-xs sm:text-sm font-black'
                              : displayName.length > 6
                              ? 'text-sm sm:text-base font-black'
                              : 'text-base lg:text-lg font-black'
                            : isMedium
                            ? displayName.length > 8
                              ? 'text-[10px] font-bold'
                              : 'text-xs font-bold'
                            : displayName.length > 6
                            ? 'text-[9px] font-bold'
                            : 'text-[10px] font-bold'
                        }`}
                        title={stock.name || displayName}
                      >
                        {displayName}
                      </span>

                      {/* Return % */}
                      {isMedium && (
                        <span
                          className="font-mono font-bold leading-tight mt-0.5 text-xs"
                          style={{ color: colors.text }}
                        >
                          {changeFormatted}
                        </span>
                      )}

                      {/* Small company name or market cap / price if large */}
                      {isLarge && w > 110 && h > 80 && (
                        <span className="text-xs text-white/90 font-mono font-medium truncate max-w-[90%] mt-1">
                          {isIndexStock
                            ? stock.price != null
                              ? fmt.price(stock.price, stock.currency || (stock.ticker.includes('EUR') || stock.ticker === '^IBEX' ? 'EUR' : 'USD'))
                              : stock.ticker
                            : formatMarketCap(stock.market_cap)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Floating Tooltip */}
        {hoveredStock && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(hoveredStock.x + 14, (dimensions.width || 800) - 260)}px`,
              top: `${Math.min(hoveredStock.y + 14, (dimensions.height || 500) - 170)}px`,
            }}
            className="pointer-events-none z-50 w-64 rounded-2xl bg-white/95 dark:bg-[#20222a]/95 border border-slate-200/90 dark:border-white/15 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header with Logo */}
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-200/80 dark:border-white/[0.08]">
              <CompanyLogo
                ticker={hoveredStock.stock.ticker}
                name={hoveredStock.stock.name}
                domain={hoveredStock.stock.domain}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {hoveredStock.stock.name || getHeatmapDisplayName(hoveredStock.stock, true)}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700 dark:text-slate-400">
                  <span>{hoveredStock.stock.ticker}</span>
                  {hoveredStock.stock.market_state === 'PRE' && (
                    <span className="inline-flex items-center text-[8.5px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded-full border leading-none bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                      Pre
                    </span>
                  )}
                  {(hoveredStock.stock.market_state === 'POST' || hoveredStock.stock.market_state === 'POSTPOST') && (
                    <span className="inline-flex items-center text-[8.5px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded-full border leading-none bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
                      Post
                    </span>
                  )}
                  {(hoveredStock.stock.market_state === 'FUTURES' || hoveredStock.stock.market_state === 'OVERNIGHT') && (
                    <span className="inline-flex items-center text-[8.5px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded-full border leading-none bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20">
                      FUTURES
                    </span>
                  )}
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{hoveredStock.stock.sector}</span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="mt-3 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Tamaño (Cap.):</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatMarketCap(hoveredStock.stock.market_cap)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Precio Actual:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {hoveredStock.stock.price ? fmt.currency(hoveredStock.stock.price) : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Rendimiento Hoy:</span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    (hoveredStock.stock.change_pct ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {(hoveredStock.stock.change_pct ?? 0) >= 0 ? '↑ +' : '↓ '}
                  {hoveredStock.stock.change_pct?.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/80 dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-400 font-medium flex items-center justify-between">
              <span>Haz clic para ver gráfico y ficha</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
