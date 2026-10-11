import React, { useState, useMemo } from 'react'
import {
  Activity,
  Zap,
  Layers,
  PieChart,
  Clock,
  Calendar,
} from 'lucide-react'
import { useSimulatedPortfolio } from '@/api/queries'
import { fmt, cn } from '@/lib/utils'
import { LoadingDot } from '@/components/ui/LoadingDot'
import { BrokerBadge } from '@/components/ui/Badge'

export interface EtfInfo {
  name: string
  shortName: string
  category: string
}

export const ETF_INFO_MAP: Record<string, EtfInfo> = {
  URTH: {
    name: 'MSCI World (Acciones Globales)',
    shortName: 'MSCI World',
    category: 'Renta Variable Global Desarrollada',
  },
  ACWI: {
    name: 'MSCI ACWI (Global All Country)',
    shortName: 'MSCI ACWI',
    category: 'Renta Variable Global Indexada',
  },
  XLK: {
    name: 'Tecnología EE.UU. (Big Tech)',
    shortName: 'Tecnología EE.UU.',
    category: 'Sector Tecnológico Global',
  },
  COWZ: {
    name: 'Alto Cash Flow & Value EE.UU.',
    shortName: 'Cash Cows Value',
    category: 'Renta Variable Value Dividendos',
  },
  EEM: {
    name: 'Mercados Emergentes (Global)',
    shortName: 'Emergentes',
    category: 'Renta Variable Emergente',
  },
  EWJ: {
    name: 'Japón (Nikkei 225)',
    shortName: 'Japón Nikkei',
    category: 'Renta Variable Japón',
  },
  FEZ: {
    name: 'Euro Stoxx 50 (Europa)',
    shortName: 'Euro Stoxx 50',
    category: 'Renta Variable Europea',
  },
  EFV: {
    name: 'EAFE Internacional Value',
    shortName: 'EAFE Value',
    category: 'RV Internacional Value',
  },
}

export const SimulatedPortfolioCard: React.FC = () => {
  const [period, setPeriod] = useState<string>('1d')
  const [activeTab, setActiveTab] = useState<'funds' | 'etfs'>('funds')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const { data, isLoading, isFetching } = useSimulatedPortfolio(period)

  const summary = data?.summary
  const holdings = data?.holdings ?? []
  const etfs = data?.etfs_summary ?? []
  const chartPoints = data?.chart_points ?? []

  const isPositive = (summary?.simulated_daily_pct ?? 0) >= 0

  // SVG Chart calculation: 100% Edge-to-Edge with ZERO empty margins on either side
  const svgData = useMemo(() => {
    if (!chartPoints || chartPoints.length < 2) return null

    const pcts = chartPoints.map((p) => p.simulated_pct)
    const minVal = Math.min(...pcts)
    const maxVal = Math.max(...pcts)

    // Dynamic amplitude scaling with natural breathing room
    const dataSpan = maxVal - minVal
    const span = Math.max(dataSpan, 0.25)
    const pad = span * 0.16
    let yMin = minVal - pad
    let yMax = maxVal + pad

    // If 0% is close to the range, include 0% cleanly
    if (minVal > 0 && minVal - pad <= 0.12) {
      yMin = Math.min(yMin, -0.04)
    } else if (maxVal < 0 && maxVal + pad >= -0.12) {
      yMax = Math.max(yMax, 0.04)
    }

    const yRange = yMax - yMin || 1

    // Chart spans 100% of the SVG width (chartWidth === width) so points start at 0 and end at 500
    const width = 500
    const chartWidth = 500
    const height = 240

    const points = chartPoints.map((p, i) => {
      const x = (i / (chartPoints.length - 1)) * chartWidth
      const y = height - ((p.simulated_pct - yMin) / yRange) * height
      return { x, y, point: p }
    })

    const zeroY = height - ((0 - yMin) / yRange) * height
    const hasZeroLine = zeroY >= 0 && zeroY <= height

    // Smooth bezier curve path from edge to edge
    const linePath = points.reduce((acc, curr, i, arr) => {
      if (i === 0) return `M ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`
      const prev = arr[i - 1]
      const cp1x = (prev.x + (curr.x - prev.x) * 0.5).toFixed(1)
      const cp1y = prev.y.toFixed(1)
      const cp2x = (prev.x + (curr.x - prev.x) * 0.5).toFixed(1)
      const cp2y = curr.y.toFixed(1)
      return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`
    }, '')

    const areaPath = `${linePath} L ${chartWidth},${height} L 0,${height} Z`
    const lastPoint = points[points.length - 1]

    // 3 Reference horizontal ticks for Y-axis
    const topTickVal = yMax - pad * 0.5
    const botTickVal = yMin + pad * 0.5
    const ticks = [
      {
        pct: topTickVal,
        y: height - ((topTickVal - yMin) / yRange) * height,
      },
      ...(hasZeroLine
        ? [
            {
              pct: 0,
              y: zeroY,
              isZero: true,
            },
          ]
        : []),
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
      hasZeroLine,
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
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                Simulación en Directo de Cartera
                <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                  ETFs Réplica
                </span>
              </h2>
              {isFetching && <LoadingDot />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
              <span>Estimación intradía de tus fondos ponderando cotizaciones de Wall Street</span>
              <span className="hidden md:inline text-slate-400">•</span>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                <Clock className="w-3 h-3" />
                15:30 - 22:00 (Hora española)
              </span>
            </p>
          </div>
        </div>

        {/* Status Badge & Period Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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
              : summary?.session_display
              ? `CERRADO (${summary.session_display})`
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

      {/* Main Content Grid: Balanced Proportions (5 Cols Chart + 7 Cols Combined Breakdown Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 items-stretch">
        
        {/* Left Column (lg:col-span-5): 100% Edge-to-Edge Proportional Chart */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] p-4">
          {/* KPI Summary Header */}
          <div className="flex items-start justify-between gap-2 mb-2 pb-2.5 border-b border-slate-200/60 dark:border-white/[0.06]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span>
                  {activeHoverPoint
                    ? `A las ${activeHoverPoint.label} (Madrid)`
                    : period === '1d'
                    ? summary?.is_session_today
                      ? 'Rendimiento Sesión Hoy'
                      : `Cierre Última Sesión • ${summary?.session_display || 'Viernes 9 oct.'}`
                    : `Periodo (${period.toUpperCase()})`}
                </span>
                {activeHoverPoint ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {activeHoverPoint.time_ny ? `${activeHoverPoint.time_ny} NY` : 'Inspección'}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>

              <div className="flex items-baseline gap-2.5 mt-1">
                <span
                  className={cn(
                    'text-2xl sm:text-3xl font-extrabold font-mono tracking-tight',
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
                    'text-sm font-bold font-mono px-2 py-0.5 rounded-lg border shadow-2xs',
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

            {/* Context Pills: Base & Min/Max */}
            <div className="flex flex-col items-end gap-1 text-xs">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Base:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {fmt.currency(summary?.total_value ?? 0)}
                </span>
              </div>
              {svgData && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-white/[0.04] px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-white/[0.06]">
                  <span className={svgData.minPct >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                    {svgData.minPct >= 0 ? '+' : ''}{svgData.minPct.toFixed(2)}%
                  </span>
                  <span>↔</span>
                  <span className={svgData.maxPct >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                    {svgData.maxPct >= 0 ? '+' : ''}{svgData.maxPct.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Intraday SVG Chart: 100% Edge-to-Edge with In-Chart Overlaid Ticks and No Side Gaps */}
          <div className="relative w-full h-[250px] select-none rounded-lg overflow-hidden border border-slate-200/60 dark:border-white/[0.05] bg-slate-100/40 dark:bg-black/20">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                <LoadingDot />
                <span className="ml-2 font-medium">Cargando cotizaciones intradía...</span>
              </div>
            ) : svgData ? (
              <svg
                viewBox={`0 0 ${svgData.width} ${svgData.height}`}
                className="w-full h-full"
                preserveAspectRatio="none"
                onMouseMove={handleMouseMove}
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

                {/* Horizontal Gridlines & In-Chart Y-Axis Scale Marks */}
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
                    {/* Y-axis percentage text label overlaid cleanly on the right edge */}
                    <text
                      x={svgData.chartWidth - 6}
                      y={t.y - 4}
                      textAnchor="end"
                      className={cn(
                        'text-[10px] font-mono select-none font-bold',
                        t.isZero
                          ? 'fill-slate-600 dark:fill-slate-300'
                          : 'fill-slate-400/90 dark:fill-slate-500'
                      )}
                    >
                      {t.pct >= 0 ? '+' : ''}
                      {t.pct.toFixed(2)}%
                    </text>
                  </g>
                ))}

                {/* Gradient Area Fill (from 0 to chartWidth edge-to-edge) */}
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

                {/* Last Value Live Badge overlaid cleanly on right */}
                {svgData.lastPoint && (
                  <g>
                    <rect
                      x={svgData.chartWidth - 66}
                      y={Math.max(4, Math.min(svgData.height - 24, svgData.lastPoint.y - 10))}
                      width="62"
                      height="20"
                      rx="4"
                      fill={isPositive ? '#10b981' : '#f43f5e'}
                    />
                    <text
                      x={svgData.chartWidth - 35}
                      y={Math.max(18, Math.min(svgData.height - 10, svgData.lastPoint.y + 4))}
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
                      r="5.5"
                      fill="#ffffff"
                      stroke={
                        svgData.points[hoveredIdx].point.simulated_pct >= 0
                          ? '#10b981'
                          : '#f43f5e'
                      }
                      strokeWidth="3"
                      className="shadow-md"
                    />

                    {/* Floating Tooltip Pill */}
                    {(() => {
                      const pt = svgData.points[hoveredIdx]
                      const tooltipWidth = 160
                      const tooltipHeight = 52
                      const isNearRight = pt.x > svgData.chartWidth - 170
                      const tx = isNearRight ? pt.x - tooltipWidth - 10 : pt.x + 10
                      const ty = Math.max(8, Math.min(svgData.height - tooltipHeight - 8, pt.y - tooltipHeight / 2))
                      const ptPositive = pt.point.simulated_pct >= 0

                      return (
                        <g transform={`translate(${tx}, ${ty})`}>
                          <rect
                            width={tooltipWidth}
                            height={tooltipHeight}
                            rx="8"
                            className="fill-slate-900/95 dark:fill-[#121212]/95 stroke-slate-700/60 dark:stroke-white/15 shadow-xl"
                            strokeWidth="1"
                          />
                          <text
                            x="10"
                            y="16"
                            fill="#94a3b8"
                            className="text-[9.5px] font-mono font-bold"
                          >
                            Hora: {pt.point.label} (Madrid)
                          </text>
                          <text
                            x="10"
                            y="29"
                            fill="#64748b"
                            className="text-[9px] font-mono"
                          >
                            {pt.point.time_ny ? `Wall St: ${pt.point.time_ny} EDT • ` : ''}
                            {pt.point.date || summary?.session_date || ''}
                          </text>
                          <text
                            x="10"
                            y="44"
                            fill={ptPositive ? '#34d399' : '#fb7185'}
                            className="text-[11px] font-mono font-bold"
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

          {/* Time X-Axis Markers: 100% Flush to Both Left and Right Edges, Zero Empty Gap */}
          {svgData && svgData.points.length > 0 && (
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-2 font-semibold px-0">
              <span className="text-left">{svgData.points[0]?.point.label}</span>
              <span className="text-center">{svgData.points[Math.floor(svgData.points.length * 0.25)]?.point.label}</span>
              <span className="text-center">{svgData.points[Math.floor(svgData.points.length * 0.5)]?.point.label}</span>
              <span className="text-center">{svgData.points[Math.floor(svgData.points.length * 0.75)]?.point.label}</span>
              <span className="text-right">{svgData.points[svgData.points.length - 1]?.point.label}</span>
            </div>
          )}

          {/* Session Footer Context Note */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 pt-1 border-t border-slate-200/50 dark:border-white/[0.04]">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>Hora española (Madrid CEST)</span>
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{summary?.session_display || 'Viernes 9 oct.'}</span>
            </span>
          </div>
        </div>

        {/* Right Column (lg:col-span-7): Combined Breakdown Table & Live Proxies */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] p-4">
          <div>
            {/* Top Toolbar: View Switcher & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-slate-200/60 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Desglose de Fondos y Réplicas
                </span>
              </div>

              {/* View Toggle Tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-white/[0.06] text-xs">
                <button
                  onClick={() => setActiveTab('funds')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all text-xs font-bold flex items-center gap-1.5',
                    activeTab === 'funds'
                      ? 'bg-white dark:bg-[#2c2c2d] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Por Fondos ({holdings.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('etfs')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all text-xs font-bold flex items-center gap-1.5',
                    activeTab === 'etfs'
                      ? 'bg-white dark:bg-[#2c2c2d] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <PieChart className="w-3.5 h-3.5 text-amber-500" />
                  <span>ETFs Agrupados ({etfs.length})</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Desglose por Fondos en Cartera */}
            {activeTab === 'funds' && (
              <div className="overflow-y-auto max-h-[305px] pr-1 divide-y divide-slate-100 dark:divide-white/[0.05]">
                {holdings.map((h) => {
                  const etfInfo = ETF_INFO_MAP[h.etf_ticker]
                  const displayName = etfInfo?.name || h.etf_desc || h.etf_name || h.etf_ticker
                  const isEtfPos = (h.etf_change_pct ?? 0) >= 0
                  const isGainPos = (h.simulated_gain_amount ?? 0) >= 0

                  return (
                    <div
                      key={h.isin}
                      className="py-2.5 px-2 hover:bg-slate-100/70 dark:hover:bg-white/[0.03] rounded-xl transition-colors flex items-center justify-between gap-3 group"
                    >
                      {/* Left: Prominent ETF Name + Ticker badge + Replicated Fund name */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* HIGHLIGHTED ETF NAME: Big, clear, legible */}
                          <span
                            className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[260px] sm:max-w-[320px]"
                            title={displayName}
                          >
                            {displayName}
                          </span>

                          {/* Secondary subtle ticker badge */}
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 font-semibold border border-slate-300/60 dark:border-white/[0.08]">
                            {h.etf_ticker}
                          </span>

                          {/* Matching broker badge with unified colored dot */}
                          <BrokerBadge broker={h.broker} className="scale-90 origin-left" />
                        </div>

                        {/* Replicated fund name */}
                        <p
                          className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium"
                          title={h.fund_name}
                        >
                          {h.fund_name}
                        </p>
                      </div>

                      {/* Middle: Portfolio Weight & Progress Bar */}
                      <div className="text-right shrink-0 min-w-[55px] hidden sm:block">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {h.weight.toFixed(1)}%
                        </span>
                        <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden ml-auto mt-1">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, (h.weight / 35) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Right: Live Quote Change % & Estimated Impact € */}
                      <div className="text-right shrink-0 min-w-[85px]">
                        <div
                          className={cn(
                            'font-mono font-bold text-xs',
                            isEtfPos
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {isEtfPos ? '+' : ''}
                          {h.etf_change_pct?.toFixed(2)}%
                        </div>
                        <div
                          className={cn(
                            'font-mono text-[11px] font-semibold mt-0.5',
                            isGainPos
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {isGainPos ? '+' : ''}
                          {fmt.currency(h.simulated_gain_amount ?? 0)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* TAB 2: Resumen Ponderado por ETFs Réplica */}
            {activeTab === 'etfs' && (
              <div className="overflow-y-auto max-h-[305px] pr-1 divide-y divide-slate-100 dark:divide-white/[0.05]">
                {etfs.map((etf) => {
                  const info = ETF_INFO_MAP[etf.ticker]
                  const displayName = info?.name || etf.name || etf.ticker
                  const isPos = (etf.change_pct ?? 0) >= 0

                  return (
                    <div
                      key={etf.ticker}
                      className="py-2.5 px-2 hover:bg-slate-100/70 dark:hover:bg-white/[0.03] rounded-xl transition-colors flex items-center justify-between gap-3 group"
                    >
                      {/* Left: Prominent Name + Ticker badge + Category */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[260px] sm:max-w-[340px]"
                            title={displayName}
                          >
                            {displayName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 font-semibold border border-slate-300/60 dark:border-white/[0.08]">
                            {etf.ticker}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                          {info?.category || 'Renta Variable'}
                          {etf.price ? ` • Cotiz: ${fmt.currency(etf.price, etf.currency)}` : ''}
                        </p>
                      </div>

                      {/* Middle: Relative Weight in Portfolio */}
                      <div className="text-right shrink-0 min-w-[70px]">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {etf.weight}%
                        </span>
                        <div className="w-14 h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden ml-auto mt-1">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, (etf.weight / 35) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Right: Live Quote Change */}
                      <div className="text-right shrink-0 min-w-[75px]">
                        <span
                          className={cn(
                            'font-mono font-bold text-xs px-2 py-0.5 rounded-md inline-block',
                            isPos
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                              : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                          )}
                        >
                          {isPos ? '+' : ''}
                          {etf.change_pct?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Panel Footer Summary */}
          <div className="pt-2.5 mt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between font-semibold">
            <span>Suma ponderada cartera: 100%</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Ponderación real asignada</span>
          </div>
        </div>

      </div>
    </div>
  )
}
