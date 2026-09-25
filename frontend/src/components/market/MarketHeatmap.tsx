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
}

const HEADER_HEIGHT = 24

function getHeatmapColor(changePct: number | null | undefined): {
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

  // Positive gains (green scale)
  if (changePct >= 3.0) {
    return {
      bg: '#047857',
      hoverBg: '#059669',
      text: '#ecfdf5',
      border: '#10b981',
    }
  }
  if (changePct >= 2.0) {
    return {
      bg: '#059669',
      hoverBg: '#10b981',
      text: '#ecfdf5',
      border: '#34d399',
    }
  }
  if (changePct >= 1.0) {
    return {
      bg: '#0f766e',
      hoverBg: '#14b8a6',
      text: '#f0fdfa',
      border: '#2dd4bf',
    }
  }
  if (changePct >= 0.2) {
    return {
      bg: '#064e3b',
      hoverBg: '#065f46',
      text: '#d1fae5',
      border: '#059669',
    }
  }

  // Neutral (close to 0%)
  if (changePct > -0.2) {
    return {
      bg: '#27272a',
      hoverBg: '#3f3f46',
      text: '#cbd5e1',
      border: '#52525b',
    }
  }

  // Negative drops (red scale)
  if (changePct > -1.0) {
    return {
      bg: '#7f1d1d',
      hoverBg: '#991b1b',
      text: '#fee2e2',
      border: '#b91c1c',
    }
  }
  if (changePct > -2.0) {
    return {
      bg: '#991b1b',
      hoverBg: '#b91c1c',
      text: '#fef2f2',
      border: '#dc2626',
    }
  }
  if (changePct > -3.0) {
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

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({
  stocks,
  onSelectStock,
  selectedSector: propSector,
  onSectorChange,
  showViewAllLink = false,
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
      className={`flex flex-col rounded-2xl bg-white/95 dark:bg-[#0f1424] border border-slate-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-2xl transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] rounded-none p-5 sm:p-6 bg-slate-100 dark:bg-[#0a0d18] overflow-hidden'
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
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Heatmap S&P 500 / Global
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              Tamaño por capitalización bursátil • Color por rentabilidad diaria
            </p>
          </div>
        </div>

        {/* Controls: Sector Filter, Height Toggle, Legend & Fullscreen */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Sector Selector */}
          <div className="relative">
            <select
              value={activeSector}
              onChange={(e) => setSector(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200/90 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500/50 cursor-pointer"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'Todos' ? 'Todos los Sectores' : sec}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Color Scale Legend */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200/90 dark:border-white/[0.06] text-xs font-mono font-medium">
            <span className="text-rose-600 dark:text-rose-400 font-bold">-3%</span>
            <div className="flex items-center h-2 w-24 rounded-full overflow-hidden mx-1">
              <div className="flex-1 h-full bg-[#dc2626]" />
              <div className="flex-1 h-full bg-[#b91c1c]" />
              <div className="flex-1 h-full bg-[#7f1d1d]" />
              <div className="w-1.5 h-full bg-[#27272a]" />
              <div className="flex-1 h-full bg-[#064e3b]" />
              <div className="flex-1 h-full bg-[#059669]" />
              <div className="flex-1 h-full bg-[#047857]" />
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+3%</span>
          </div>

          {/* Height Adjuster Button (Toggle between Standard and Expanded) */}
          {!isFullscreen && (
            <button
              onClick={() =>
                setHeightMode((prev) => (prev === 'expanded' ? 'standard' : 'expanded'))
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                heightMode === 'expanded'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-500/40'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/90 dark:bg-[#141928] dark:text-slate-400 dark:hover:text-white dark:border-white/[0.08]'
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
                  <span>Ajustar</span>
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3.5 h-3.5" />
                  <span>Ampliar abajo</span>
                </>
              )}
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/90 dark:bg-[#141928] dark:hover:bg-[#1a2136] dark:text-slate-400 dark:hover:text-white dark:border-white/[0.08] transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Ver mercado completo Link button */}
          {showViewAllLink && !isFullscreen && (
            <Link
              to="/market"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20"
            >
              <span>Ver mercado completo</span>
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
        className="relative w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0a0d18] border border-slate-200/90 dark:border-black/50 select-none transition-[height] duration-200"
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
              className="overflow-hidden border border-slate-300/80 dark:border-black/90 bg-slate-100 dark:bg-[#121624] pointer-events-none"
            >
              {/* Sector Header Bar */}
              <div
                style={{ height: `${HEADER_HEIGHT}px` }}
                className="px-2.5 flex items-center justify-between bg-slate-200/90 dark:bg-[#161c2d] border-b border-slate-300/90 dark:border-black/80 text-xs font-bold text-slate-900 dark:text-slate-300 tracking-wide uppercase select-none"
              >
                <span className="truncate">{sectorNode.sector}</span>
                {width > 120 && (
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-400 font-medium">
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

                  const colors = getHeatmapColor(stock.change_pct)
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
                      {/* Ticker */}
                      <span
                        className={`font-black tracking-tight text-white leading-none ${
                          isLarge
                            ? 'text-base lg:text-lg'
                            : isMedium
                            ? 'text-xs font-bold'
                            : 'text-xs font-bold'
                        }`}
                      >
                        {stock.ticker.replace('.MC', '').replace('.DE', '').replace('.AS', '').replace('.PA', '')}
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

                      {/* Small company name or market cap if large */}
                      {isLarge && w > 110 && h > 80 && (
                        <span className="text-xs text-white/90 font-medium truncate max-w-[90%] mt-1">
                          {formatMarketCap(stock.market_cap)}
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
            className="pointer-events-none z-50 w-64 rounded-2xl bg-white/95 dark:bg-[#0b0f1a]/95 border border-slate-200/90 dark:border-white/15 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
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
                  {hoveredStock.stock.name}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700 dark:text-slate-400">
                  <span>{hoveredStock.stock.ticker}</span>
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
