import React, { useState, useMemo } from 'react'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Sparkles,
  Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulatedPortfolio, type SimulatedHolding } from '@/api/queries'
import { fmt, cn } from '@/lib/utils'
import { LoadingDot } from '@/components/ui/LoadingDot'

const BROKER_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  myinvestor: {
    label: 'MyInvestor',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/30',
  },
  bbva: {
    label: 'BBVA',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
  },
  indexa: {
    label: 'Indexa Capital',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
  },
}

export const SimulatedPortfolioCard: React.FC = () => {
  const [period, setPeriod] = useState<string>('1d')
  const [showHoldings, setShowHoldings] = useState<boolean>(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const { data, isLoading, isFetching } = useSimulatedPortfolio(period)

  const summary = data?.summary
  const holdings = data?.holdings ?? []
  const etfs = data?.etfs_summary ?? []
  const chartPoints = data?.chart_points ?? []

  const isPositive = (summary?.simulated_daily_pct ?? 0) >= 0

  // SVG Chart calculation
  const svgData = useMemo(() => {
    if (!chartPoints || chartPoints.length < 2) return null

    const pcts = chartPoints.map((p) => p.simulated_pct)
    const minVal = Math.min(...pcts, 0)
    const maxVal = Math.max(...pcts, 0)
    const padding = (maxVal - minVal) * 0.15 || 0.2
    const yMin = minVal - padding
    const yMax = maxVal + padding
    const yRange = yMax - yMin || 1

    const width = 800
    const height = 180

    const points = chartPoints.map((p, i) => {
      const x = (i / (chartPoints.length - 1)) * width
      const y = height - ((p.simulated_pct - yMin) / yRange) * height
      return { x, y, point: p }
    })

    const zeroY = height - ((0 - yMin) / yRange) * height

    const linePath = points.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`
    }, '')

    const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`

    return { points, linePath, areaPath, zeroY, width, height, yMin, yMax }
  }, [chartPoints])

  const activeHoverPoint = hoveredIdx !== null && svgData ? svgData.points[hoveredIdx]?.point : null

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-md shadow-sm dark:shadow-xl dark:shadow-black/20 p-4 sm:p-5 transition-all">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                Simulación en Directo de Cartera
                <span className="hidden md:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                  ETFs Réplica
                </span>
              </h2>
              {isFetching && <LoadingDot />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Estimación en tiempo real de tus fondos ponderando cotizaciones de ETFs equivalentes
            </p>
          </div>
        </div>

        {/* Status Badge & Period Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Market status badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0',
              summary?.market_state === 'REGULAR'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                : summary?.market_state === 'PRE' || summary?.market_state === 'POST'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                summary?.market_state === 'REGULAR'
                  ? 'bg-emerald-500 animate-pulse'
                  : summary?.market_state === 'PRE' || summary?.market_state === 'POST'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              )}
            />
            {summary?.market_state === 'REGULAR'
              ? 'MERCADO ABIERTO'
              : summary?.market_state === 'PRE'
              ? 'PRE-MERCADO'
              : summary?.market_state === 'POST'
              ? 'AFTER-HOURS'
              : 'MERCADO CERRADO'}
          </span>

          {/* Period selector */}
          <div className="flex rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5">
            {[
              { id: '1d', label: '1D' },
              { id: '5d', label: '5D' },
              { id: '1mo', label: '1M' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={cn(
                  'px-2.5 py-0.5 text-xs font-semibold rounded-md transition-colors',
                  period === tab.id
                    ? 'bg-white dark:bg-[#333333] text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Performance Stats & Mini Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
        {/* Main Simulated Gain KPI */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>
              {activeHoverPoint
                ? `Estimación a las ${activeHoverPoint.label}`
                : period === '1d'
                ? 'Rendimiento Estimado Hoy'
                : `Rendimiento Periodo (${period})`}
            </span>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            )}
          </div>

          <div className="flex items-baseline gap-2.5 mt-2">
            <span
              className={cn(
                'text-2xl sm:text-3xl font-bold font-mono tracking-tight',
                (activeHoverPoint ? activeHoverPoint.simulated_pct >= 0 : isPositive)
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {activeHoverPoint
                ? `${activeHoverPoint.simulated_pct >= 0 ? '+' : ''}${activeHoverPoint.simulated_pct.toFixed(2)}%`
                : `${isPositive ? '+' : ''}${summary?.simulated_daily_pct?.toFixed(2) ?? '0.00'}%`}
            </span>

            <span
              className={cn(
                'text-sm sm:text-base font-bold font-mono px-2 py-0.5 rounded-lg border',
                (activeHoverPoint ? activeHoverPoint.simulated_amount >= 0 : (summary?.simulated_daily_amount ?? 0) >= 0)
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
              )}
            >
              {activeHoverPoint
                ? `${activeHoverPoint.simulated_amount >= 0 ? '+' : ''}${fmt.currency(activeHoverPoint.simulated_amount)}`
                : `${(summary?.simulated_daily_amount ?? 0) >= 0 ? '+' : ''}${fmt.currency(summary?.simulated_daily_amount ?? 0)}`}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5 flex items-center gap-1.5">
            <span>Base Cartera:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {fmt.currency(summary?.total_value ?? 0)}
            </span>
          </div>
        </div>

        {/* Quick ETF Drivers list */}
        <div className="md:col-span-2 p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            <span>ETFs Réplica Ponderados en Cartera</span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 lowercase">
              {etfs.length} índices equivalentes
            </span>
          </div>

          {/* Horizontal badge row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {etfs.slice(0, 4).map((etf) => {
              const pos = (etf.change_pct ?? 0) >= 0
              return (
                <div
                  key={etf.ticker}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-[#252526] border border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between min-w-0"
                >
                  <div className="min-w-0 pr-1">
                    <span className="text-[11px] font-bold font-mono text-slate-900 dark:text-white block truncate">
                      {etf.ticker}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {etf.weight}% cart.
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-bold font-mono shrink-0',
                      pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {pos ? '+' : ''}
                    {etf.change_pct?.toFixed(2)}%
                  </span>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5">
            {etfs.slice(4, 8).map((etf) => {
              const pos = (etf.change_pct ?? 0) >= 0
              return (
                <div
                  key={etf.ticker}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-[#252526] border border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between min-w-0"
                >
                  <div className="min-w-0 pr-1">
                    <span className="text-[11px] font-bold font-mono text-slate-900 dark:text-white block truncate">
                      {etf.ticker}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {etf.weight}% cart.
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-bold font-mono shrink-0',
                      pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {pos ? '+' : ''}
                    {etf.change_pct?.toFixed(2)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Intraday Simulation Interactive Chart */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
        <div className="relative w-full h-[180px] select-none">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              <LoadingDot />
              <span className="ml-2 font-medium">Cargando cotizaciones intradía...</span>
            </div>
          ) : svgData ? (
            <svg
              viewBox={`0 0 ${svgData.width} ${svgData.height}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <linearGradient id="simAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? '#10b981' : '#f43f5e'}
                    stopOpacity="0.28"
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? '#10b981' : '#f43f5e'}
                    stopOpacity="0.0"
                  />
                </linearGradient>
              </defs>

              {/* Zero baseline */}
              <line
                x1="0"
                y1={svgData.zeroY}
                x2={svgData.width}
                y2={svgData.zeroY}
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-slate-300 dark:text-white/15"
                strokeWidth="1"
              />

              {/* Gradient Area */}
              <path d={svgData.areaPath} fill="url(#simAreaGrad)" />

              {/* Primary Line */}
              <path
                d={svgData.linePath}
                fill="none"
                stroke={isPositive ? '#10b981' : '#f43f5e'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Hit Areas & Crosshair */}
              {svgData.points.map((pt, i) => {
                const isHovered = hoveredIdx === i
                return (
                  <g key={i}>
                    <rect
                      x={pt.x - 5}
                      y="0"
                      width="10"
                      height={svgData.height}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredIdx(i)}
                    />
                    {isHovered && (
                      <>
                        <line
                          x1={pt.x}
                          y1="0"
                          x2={pt.x}
                          y2={svgData.height}
                          stroke="currentColor"
                          strokeDasharray="2 2"
                          className="text-indigo-500"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          fill="#ffffff"
                          stroke={isPositive ? '#10b981' : '#f43f5e'}
                          strokeWidth="3"
                        />
                      </>
                    )}
                  </g>
                )
              })}
            </svg>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              Sin datos intradía disponibles en este momento
            </div>
          )}
        </div>

        {/* Time X-Axis Markers */}
        {svgData && svgData.points.length > 0 && (
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-600 dark:text-slate-300 px-1 mt-1 font-semibold">
            <span>{svgData.points[0]?.point.label}</span>
            <span>{svgData.points[Math.floor(svgData.points.length / 2)]?.point.label}</span>
            <span>{svgData.points[svgData.points.length - 1]?.point.label}</span>
          </div>
        )}
      </div>

      {/* Expand / Collapse Holdings Breakdown Drawer */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
        <button
          onClick={() => setShowHoldings((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Desglose de Fondos y su ETF Réplica ({holdings.length} posiciones)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <span>{showHoldings ? 'Ocultar' : 'Ver detalle'}</span>
            {showHoldings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        <AnimatePresence>
          {showHoldings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 dark:bg-[#252526] text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-white/[0.06]">
                    <tr>
                      <th className="py-2.5 px-3">Fondo en Cartera</th>
                      <th className="py-2.5 px-2">Entidad</th>
                      <th className="py-2.5 px-2 text-right">Valor Cartera</th>
                      <th className="py-2.5 px-2 text-right">Peso</th>
                      <th className="py-2.5 px-2.5">ETF Equivalente</th>
                      <th className="py-2.5 px-2 text-right">Cotización ETF</th>
                      <th className="py-2.5 px-3 text-right">Impacto Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {holdings.map((h) => {
                      const badge = BROKER_BADGES[h.broker.toLowerCase()] || {
                        label: h.broker,
                        bg: 'bg-slate-500/10',
                        text: 'text-slate-700 dark:text-slate-300',
                        border: 'border-slate-500/20',
                      }
                      const etfGainPositive = (h.simulated_gain_amount ?? 0) >= 0

                      return (
                        <tr
                          key={h.isin}
                          className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate max-w-[210px]" title={h.fund_name}>
                              {h.fund_name}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                              {h.isin}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={cn(
                                'inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border',
                                badge.bg,
                                badge.text,
                                badge.border
                              )}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                            {fmt.currency(h.fund_value)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                            {h.weight.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                {h.etf_ticker}
                              </span>
                              <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[140px]" title={h.etf_name}>
                                {h.etf_desc}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono">
                            <span
                              className={cn(
                                'font-bold',
                                (h.etf_change_pct ?? 0) >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              )}
                            >
                              {(h.etf_change_pct ?? 0) >= 0 ? '+' : ''}
                              {h.etf_change_pct?.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span
                              className={
                                etfGainPositive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {etfGainPositive ? '+' : ''}
                              {fmt.currency(h.simulated_gain_amount ?? 0)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
