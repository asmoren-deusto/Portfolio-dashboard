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

const ETF_FRIENDLY_NAMES: Record<string, string> = {
  URTH: 'MSCI World',
  ACWI: 'Global ACWI',
  XLK: 'Tecnología EE.UU.',
  COWZ: 'Cash Cows Value',
  EEM: 'Emergentes',
  EWJ: 'Japón Nikkei',
  FEZ: 'Euro Stoxx 50',
  EFV: 'EAFE Value',
}

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
  kutxabank: {
    label: 'Kutxabank',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
  },
  scalable: {
    label: 'Scalable',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-500/30',
  },
  traderepublic: {
    label: 'Trade Republic',
    bg: 'bg-violet-500/10 dark:bg-violet-500/20',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-500/30',
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

  // SVG Chart calculation with dedicated Y-axis and balanced proportions
  const svgData = useMemo(() => {
    if (!chartPoints || chartPoints.length < 2) return null

    const pcts = chartPoints.map((p) => p.simulated_pct)
    const minVal = Math.min(...pcts)
    const maxVal = Math.max(...pcts)
    const minWithZero = Math.min(minVal, 0)
    const maxWithZero = Math.max(maxVal, 0)
    const span = maxWithZero - minWithZero || 0.4
    const pad = span * 0.18
    const yMin = minWithZero - pad
    const yMax = maxWithZero + pad
    const yRange = yMax - yMin || 1

    const width = 800
    const chartWidth = 720
    const height = 240

    const points = chartPoints.map((p, i) => {
      const x = (i / (chartPoints.length - 1)) * chartWidth
      const y = height - ((p.simulated_pct - yMin) / yRange) * height
      return { x, y, point: p }
    })

    const zeroY = height - ((0 - yMin) / yRange) * height

    const linePath = points.reduce((acc, curr, i) => {
      return i === 0
        ? `M ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`
        : `${acc} L ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`
    }, '')

    const areaPath = `${linePath} L ${chartWidth},${height} L 0,${height} Z`
    const lastPoint = points[points.length - 1]

    // Reference horizontal ticks for Y-axis
    const topTickVal = maxWithZero + pad * 0.4
    const botTickVal = minWithZero - pad * 0.4
    const ticks = [
      {
        pct: topTickVal,
        y: height - ((topTickVal - yMin) / yRange) * height,
      },
      {
        pct: 0,
        y: zeroY,
        isZero: true,
      },
      {
        pct: botTickVal,
        y: height - ((botTickVal - yMin) / yRange) * height,
      },
    ].filter((t) => t.y >= 14 && t.y <= height - 14)

    return {
      points,
      linePath,
      areaPath,
      zeroY,
      width,
      chartWidth,
      height,
      yMin,
      yMax,
      minPct: minVal,
      maxPct: maxVal,
      lastPoint,
      ticks,
    }
  }, [chartPoints])

  const activeHoverPoint = hoveredIdx !== null && svgData ? svgData.points[hoveredIdx]?.point : null
  const currentPct = activeHoverPoint ? activeHoverPoint.simulated_pct : (summary?.simulated_daily_pct ?? 0)
  const currentAmount = activeHoverPoint ? activeHoverPoint.simulated_amount : (summary?.simulated_daily_amount ?? 0)

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgData || !svgData.points.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const relativeX = (mouseX / rect.width) * svgData.width
    const clampedX = Math.max(0, Math.min(svgData.chartWidth, relativeX))
    const idx = Math.round((clampedX / svgData.chartWidth) * (svgData.points.length - 1))
    if (idx >= 0 && idx < svgData.points.length) {
      setHoveredIdx(idx)
    }
  }

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
                <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                  ETFs Réplica
                </span>
              </h2>
              {isFetching && <LoadingDot />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Estimación intradía en tiempo real de tus fondos ponderando cotizaciones de ETFs equivalentes
            </p>
          </div>
        </div>

        {/* Status Badge & Period Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Market status badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0',
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
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors',
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

      {/* Main Content Grid: Balanced Chart on Left + Legible ETFs Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 items-stretch">
        {/* Left Column (lg:col-span-8): Hero Metric & High-Res Proportional Chart */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] p-4">
          {/* Hero KPI Summary Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200/60 dark:border-white/[0.06]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>
                  {activeHoverPoint
                    ? `Estimación a las ${activeHoverPoint.label}`
                    : period === '1d'
                    ? 'Rendimiento Estimado Hoy'
                    : `Rendimiento Periodo (${period.toUpperCase()})`}
                </span>
                {activeHoverPoint ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Inspección
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>

              <div className="flex items-baseline gap-3 mt-1.5">
                <span
                  className={cn(
                    'text-3xl sm:text-4xl font-extrabold font-mono tracking-tight',
                    currentPct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {currentPct >= 0 ? '+' : ''}
                  {currentPct.toFixed(2)}%
                </span>

                <span
                  className={cn(
                    'text-base sm:text-lg font-bold font-mono px-2.5 py-0.5 rounded-xl border shadow-2xs',
                    currentAmount >= 0
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                  )}
                >
                  {currentAmount >= 0 ? '+' : ''}
                  {fmt.currency(currentAmount)}
                </span>
              </div>
            </div>

            {/* Context Pills: Base Cartera & Rango Intradía */}
            <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-medium">Base Cartera:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {fmt.currency(summary?.total_value ?? 0)}
                </span>
              </div>
              {svgData && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-white/[0.04] px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-white/[0.06]">
                  <span>
                    Mín:{' '}
                    <strong
                      className={
                        svgData.minPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {svgData.minPct >= 0 ? '+' : ''}
                      {svgData.minPct.toFixed(2)}%
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Máx:{' '}
                    <strong
                      className={
                        svgData.maxPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {svgData.maxPct >= 0 ? '+' : ''}
                      {svgData.maxPct.toFixed(2)}%
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Intraday SVG Chart with Dedicated Right Y-Axis */}
          <div className="relative w-full h-[260px] select-none">
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
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <defs>
                  <linearGradient id="simAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isPositive ? '#10b981' : '#f43f5e'}
                      stopOpacity="0.32"
                    />
                    <stop
                      offset="100%"
                      stopColor={isPositive ? '#10b981' : '#f43f5e'}
                      stopOpacity="0.0"
                    />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Scale Marks */}
                {svgData.ticks.map((t, idx) => (
                  <g key={idx}>
                    <line
                      x1="0"
                      y1={t.y}
                      x2={svgData.chartWidth}
                      y2={t.y}
                      stroke="currentColor"
                      strokeDasharray={t.isZero ? '5 5' : '2 4'}
                      className={
                        t.isZero
                          ? 'text-slate-400/60 dark:text-white/20'
                          : 'text-slate-300/40 dark:text-white/06'
                      }
                      strokeWidth={t.isZero ? '1.2' : '0.8'}
                    />
                    {/* Y-axis percentage text label */}
                    <text
                      x={svgData.chartWidth + 10}
                      y={t.y + 3.5}
                      className={cn(
                        'text-[10px] font-mono select-none font-semibold',
                        t.isZero
                          ? 'fill-slate-500 dark:fill-slate-400 font-bold'
                          : 'fill-slate-400 dark:fill-slate-500'
                      )}
                    >
                      {t.pct >= 0 ? '+' : ''}
                      {t.pct.toFixed(2)}%
                    </text>
                  </g>
                ))}

                {/* Gradient Area Fill */}
                <path d={svgData.areaPath} fill="url(#simAreaGrad)" />

                {/* Main Trajectory Line */}
                <path
                  d={svgData.linePath}
                  fill="none"
                  stroke={isPositive ? '#10b981' : '#f43f5e'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Last Value Live Badge on Y-Axis */}
                {svgData.lastPoint && (
                  <g>
                    <rect
                      x={svgData.chartWidth + 6}
                      y={svgData.lastPoint.y - 10}
                      width="68"
                      height="20"
                      rx="4"
                      fill={isPositive ? '#10b981' : '#f43f5e'}
                    />
                    <text
                      x={svgData.chartWidth + 40}
                      y={svgData.lastPoint.y + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      className="text-[10px] font-mono font-bold select-none"
                    >
                      {svgData.lastPoint.point.simulated_pct >= 0 ? '+' : ''}
                      {svgData.lastPoint.point.simulated_pct.toFixed(2)}%
                    </text>
                  </g>
                )}

                {/* Interactive Crosshair & Point on Line */}
                {hoveredIdx !== null && svgData.points[hoveredIdx] && (
                  <g>
                    {/* Vertical guideline */}
                    <line
                      x1={svgData.points[hoveredIdx].x}
                      y1="0"
                      x2={svgData.points[hoveredIdx].x}
                      y2={svgData.height}
                      stroke="currentColor"
                      strokeDasharray="3 3"
                      className="text-indigo-500/80 dark:text-indigo-400/80"
                      strokeWidth="1.5"
                    />

                    {/* Illuminated Point circle */}
                    <circle
                      cx={svgData.points[hoveredIdx].x}
                      cy={svgData.points[hoveredIdx].y}
                      r="6"
                      fill="#ffffff"
                      stroke={
                        svgData.points[hoveredIdx].point.simulated_pct >= 0
                          ? '#10b981'
                          : '#f43f5e'
                      }
                      strokeWidth="3.5"
                      className="shadow-md"
                    />

                    {/* Floating Tooltip Pill */}
                    {(() => {
                      const pt = svgData.points[hoveredIdx]
                      const tooltipWidth = 135
                      const tooltipHeight = 44
                      const isNearRight = pt.x > svgData.chartWidth - 150
                      const tx = isNearRight ? pt.x - tooltipWidth - 10 : pt.x + 10
                      const ty = Math.max(10, Math.min(svgData.height - tooltipHeight - 10, pt.y - tooltipHeight / 2))
                      const ptPositive = pt.point.simulated_pct >= 0

                      return (
                        <g transform={`translate(${tx}, ${ty})`}>
                          <rect
                            width={tooltipWidth}
                            height={tooltipHeight}
                            rx="8"
                            className="fill-slate-900/90 dark:fill-[#121212]/95 stroke-slate-700/60 dark:stroke-white/15"
                            strokeWidth="1"
                          />
                          <text
                            x="10"
                            y="16"
                            fill="#94a3b8"
                            className="text-[9px] font-mono font-bold"
                          >
                            Hora: {pt.point.label}
                          </text>
                          <text
                            x="10"
                            y="34"
                            fill={ptPositive ? '#34d399' : '#fb7185'}
                            className="text-[12px] font-mono font-bold"
                          >
                            {ptPositive ? '+' : ''}
                            {pt.point.simulated_pct.toFixed(2)}% ({fmt.currency(pt.point.simulated_amount)})
                          </text>
                        </g>
                      )
                    })()}
                  </g>
                )}
              </svg>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos intradía disponibles en este momento
              </div>
            )}
          </div>

          {/* Time X-Axis Markers */}
          {svgData && svgData.points.length > 0 && (
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-600 dark:text-slate-400 px-2 mt-2 font-semibold">
              <span>{svgData.points[0]?.point.label}</span>
              <span>{svgData.points[Math.floor(svgData.points.length * 0.25)]?.point.label}</span>
              <span>{svgData.points[Math.floor(svgData.points.length * 0.5)]?.point.label}</span>
              <span>{svgData.points[Math.floor(svgData.points.length * 0.75)]?.point.label}</span>
              <span>{svgData.points[svgData.points.length - 1]?.point.label}</span>
              <span className="w-16" /> {/* Spacer for Y-axis align */}
            </div>
          )}
        </div>

        {/* Right Column (lg:col-span-4): Legible, High-Contrast ETF Proxies Panel */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] p-4">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200/60 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  ETFs Réplica en Directo
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-mono">
                {etfs.length} índices
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Pesos relativos y cotizaciones en vivo de los ETFs asignados a tus fondos:
            </p>

            {/* 2-Column Spacious Grid of ETF Cards */}
            <div className="grid grid-cols-2 gap-2">
              {etfs.map((etf) => {
                const pos = (etf.change_pct ?? 0) >= 0
                const friendlyName = ETF_FRIENDLY_NAMES[etf.ticker] || etf.name

                return (
                  <div
                    key={etf.ticker}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#252526] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs hover:border-indigo-500/30 transition-all flex flex-col justify-between"
                  >
                    {/* Top Row: Ticker badge & Percentage */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08]">
                        {etf.ticker}
                      </span>

                      <span
                        className={cn(
                          'text-xs font-bold font-mono px-1.5 py-0.5 rounded shrink-0',
                          pos
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                            : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                        )}
                      >
                        {pos ? '+' : ''}
                        {etf.change_pct?.toFixed(2)}%
                      </span>
                    </div>

                    {/* Middle Row: Friendly asset class name */}
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate block mb-1.5" title={friendlyName}>
                      {friendlyName}
                    </span>

                    {/* Bottom Row: Weight progress bar */}
                    <div className="flex items-center gap-1.5 w-full">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500/80 dark:bg-indigo-400/80"
                          style={{ width: `${Math.min(100, (etf.weight / 35) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        {etf.weight}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-[10px] text-slate-600 dark:text-slate-300 flex items-center justify-between font-semibold">
            <span>Suma total cartera: 100%</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Ponderación real</span>
          </div>
        </div>
      </div>

      {/* Expand / Collapse Holdings Breakdown Drawer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
        <button
          onClick={() => setShowHoldings((v) => !v)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Desglose de Fondos y su ETF Réplica ({holdings.length} posiciones asignadas)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
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
                            <span
                              className="font-semibold text-slate-900 dark:text-white block truncate max-w-[240px]"
                              title={h.fund_name}
                            >
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
                              <span
                                className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[160px]"
                                title={h.etf_name}
                              >
                                {ETF_FRIENDLY_NAMES[h.etf_ticker] || h.etf_desc}
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
