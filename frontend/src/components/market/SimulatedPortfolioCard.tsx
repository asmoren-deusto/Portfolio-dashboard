import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  createChart,
  AreaSeries,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useAppStore } from '@/store/appStore'
import {
  Activity,
  Zap,
  Layers,
  PieChart,
  Clock,
  Flame,
  TrendingDown,
} from 'lucide-react'
import {
  useSimulatedPortfolio,
  type SimulatedChartPoint,
  type MarketStock,
  type SessionMarker,
} from '@/api/queries'
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

export interface SimulatedPortfolioCardProps {
  marketStats?: {
    advancing: number
    declining: number
    unchanged?: number
  } | null
  bestStock?: MarketStock | null
  worstStock?: MarketStock | null
  totalStocks?: number
  onSelectStock?: (stock: MarketStock) => void
}

export const SimulatedPortfolioCard: React.FC<SimulatedPortfolioCardProps> = ({
  marketStats,
  bestStock,
  worstStock,
  totalStocks,
  onSelectStock,
}) => {
  const [period, setPeriod] = useState<string>('1d')
  const [currencyMode, setCurrencyMode] = useState<'eur' | 'usd'>('eur')
  const [activeTab, setActiveTab] = useState<'funds' | 'etfs'>('funds')
  const [hoveredPoint, setHoveredPoint] = useState<SimulatedChartPoint | null>(null)

  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  const { data, isLoading, isFetching } = useSimulatedPortfolio(period)

  const summary = data?.summary
  const fxInfo = summary?.fx_info
  const holdings = data?.holdings ?? []
  const etfs = data?.etfs_summary ?? []
  const chartPoints = data?.chart_points ?? []
  const sessionMarkers = useMemo(() => {
    return (data?.session_markers ?? []).filter(
      (m) => m.type !== 'session_break' && m.phase !== 'SESSION' && !m.label?.startsWith('Sesión')
    )
  }, [data?.session_markers])
  const hasExtendedHours = data?.has_extended_hours ?? data?.summary?.has_extended_hours ?? false

  const isPositive = (currencyMode === 'eur'
    ? (summary?.fx_info?.simulated_eur_pct ?? summary?.simulated_daily_pct ?? 0)
    : (summary?.simulated_daily_pct ?? 0)) >= 0

  // Chart refs and state
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const chartPointsRef = useRef<SimulatedChartPoint[]>(chartPoints)
  chartPointsRef.current = chartPoints
  const sessionMarkersRef = useRef<SessionMarker[]>(sessionMarkers)
  sessionMarkersRef.current = sessionMarkers

  // Dynamic vertical dotted line markers
  const [markerPositions, setMarkerPositions] = useState<
    Array<{ marker: SessionMarker; x: number }>
  >([])

  const updateMarkerPositions = () => {
    if (!chartRef.current || !chartPointsRef.current.length || !sessionMarkersRef.current.length) {
      setMarkerPositions([])
      return
    }
    const timeScale = chartRef.current.timeScale()
    const pts = chartPointsRef.current
    const positions: Array<{ marker: SessionMarker; x: number }> = []

    for (const marker of sessionMarkersRef.current) {
      // Find closest time_unix in dataset
      let closestTime = pts[0].time_unix
      let minDiff = Math.abs(pts[0].time_unix - marker.time_unix)
      for (let i = 1; i < pts.length; i++) {
        const diff = Math.abs(pts[i].time_unix - marker.time_unix)
        if (diff < minDiff) {
          minDiff = diff
          closestTime = pts[i].time_unix
        }
      }

      const x = timeScale.timeToCoordinate(closestTime as UTCTimestamp)
      if (x !== null && !isNaN(x)) {
        positions.push({ marker, x })
      }
    }
    setMarkerPositions(positions)
  }

  const updateMarkerPositionsRef = useRef<() => void>(updateMarkerPositions)
  updateMarkerPositionsRef.current = updateMarkerPositions

  // Min and max percentages
  const { minPct, maxPct } = useMemo(() => {
    if (!chartPoints || !chartPoints.length) return { minPct: 0, maxPct: 0 }
    const vals = chartPoints.map((p) =>
      currencyMode === 'eur' ? (p.simulated_eur_pct ?? p.simulated_pct) : p.simulated_pct
    )
    return { minPct: Math.min(...vals), maxPct: Math.max(...vals) }
  }, [chartPoints, currencyMode])

  // Active point for KPI display
  const activePoint = hoveredPoint || (chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null)
  const currentPct = activePoint
    ? (currencyMode === 'eur' ? (activePoint.simulated_eur_pct ?? activePoint.simulated_pct) : activePoint.simulated_pct)
    : (currencyMode === 'eur' ? (summary?.fx_info?.simulated_eur_pct ?? summary?.simulated_daily_pct ?? 0) : (summary?.simulated_daily_pct ?? 0))
  const currentAmount = activePoint
    ? (currencyMode === 'eur' ? (activePoint.simulated_eur_amount ?? activePoint.simulated_amount) : activePoint.simulated_amount)
    : (currencyMode === 'eur' ? (summary?.fx_info?.simulated_eur_amount ?? summary?.simulated_daily_amount ?? 0) : (summary?.simulated_daily_amount ?? 0))

  // Initialize and maintain TradingView Lightweight Charts instance
  useEffect(() => {
    if (!chartContainerRef.current) return

    let disposed = false
    let chart: IChartApi | null = null

    try {
      const containerWidth = Math.max(10, chartContainerRef.current.clientWidth || 300)
      const containerHeight = Math.max(10, chartContainerRef.current.clientHeight || 270)

      chart = createChart(chartContainerRef.current, {
        width: containerWidth,
        height: containerHeight,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: isDark ? '#94a3b8' : '#64748b',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
          horzLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
        },
        crosshair: {
          vertLine: {
            color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
            labelBackgroundColor: isDark ? '#2d2d2d' : '#1e293b',
            width: 1,
            style: LineStyle.Dotted,
          },
          horzLine: {
            color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
            labelBackgroundColor: isDark ? '#2d2d2d' : '#1e293b',
            style: LineStyle.Dotted,
          },
        },
        rightPriceScale: {
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          scaleMargins: { top: 0.18, bottom: 0.10 },
          autoScale: true,
        },
        timeScale: {
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: false,
        handleScale: false,
      })

      const seriesColor = isPositive ? '#10b981' : '#f43f5e'
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: seriesColor,
        topColor: isPositive
          ? (isDark ? 'rgba(16, 185, 129, 0.32)' : 'rgba(16, 185, 129, 0.22)')
          : (isDark ? 'rgba(244, 63, 94, 0.32)' : 'rgba(244, 63, 94, 0.22)'),
        bottomColor: 'rgba(0, 0, 0, 0.0)',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: seriesColor,
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 2,
      })

      // Add clean baseline at 0.00% (hidden on price scale to avoid overlapping the current price badge)
      areaSeries.createPriceLine({
        price: 0,
        color: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.20)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
      })

      chartRef.current = chart
      seriesRef.current = areaSeries

      // Interactive crosshair move tracking
      chart.subscribeCrosshairMove((param) => {
        if (!param || !param.time || !chartPointsRef.current.length) {
          setHoveredPoint(null)
          return
        }
        const tUnix = typeof param.time === 'number' ? param.time : (param.time as any)
        const match = chartPointsRef.current.find((p) => p.time_unix === tUnix)
        setHoveredPoint(match || null)
      })

      // Sync marker positions on timeScale visible range changes
      const handleRangeChange = () => {
        requestAnimationFrame(() => {
          updateMarkerPositionsRef.current()
        })
      }
      chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange)
      chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange)
    } catch (err) {
      console.warn('Failed to initialize simulated TradingView chart:', err)
    }

    // Auto-resize observer to dynamically adapt width and height without distortion
    const ro = new ResizeObserver((entries) => {
      if (disposed || !entries[0] || !chartRef.current) return
      try {
        const w = Math.max(10, entries[0].contentRect.width)
        const h = Math.max(10, entries[0].contentRect.height)
        chartRef.current.applyOptions({ width: w, height: h })
        chartRef.current.timeScale().fitContent()
        requestAnimationFrame(() => {
          updateMarkerPositionsRef.current()
        })
      } catch {}
    })

    if (chartContainerRef.current) {
      ro.observe(chartContainerRef.current)
    }

    return () => {
      disposed = true
      ro.disconnect()
      if (chart) {
        try {
          chart.remove()
        } catch {}
      }
      chartRef.current = null
      seriesRef.current = null
    }
  }, [isDark, isPositive])

  // Update series data whenever chartPoints or currencyMode change
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !chartPoints || !chartPoints.length) return

    try {
      const map = new Map<number, number>()
      for (const p of chartPoints) {
        const val = currencyMode === 'eur' ? (p.simulated_eur_pct ?? p.simulated_pct) : p.simulated_pct
        if (p.time_unix && typeof val === 'number' && !isNaN(val)) {
          map.set(p.time_unix, val)
        }
      }

      const formatted = Array.from(map.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([t, val]) => ({
          time: t as UTCTimestamp,
          value: val,
        }))

      if (formatted.length > 0) {
        seriesRef.current.setData(formatted)
        chartRef.current.timeScale().fitContent()

        // Update markers coordinate mapping after paint
        requestAnimationFrame(() => {
          updateMarkerPositions()
        })
      }
    } catch (err) {
      console.warn('Error setting simulated chart data:', err)
    }
  }, [chartPoints, sessionMarkers, currencyMode])

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-md shadow-sm dark:shadow-xl dark:shadow-black/20 p-3.5 sm:p-4 transition-all">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                Simulación en Directo de Cartera
                <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                  TradingView • ETFs Réplica
                </span>
              </h2>
              {isFetching && <LoadingDot />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
              <span>Estimación intradía de tus fondos ponderando cotizaciones de Wall Street</span>
              <span className="hidden md:inline text-slate-400">•</span>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                <Clock className="w-3 h-3" />
                {hasExtendedHours
                  ? 'Pre 10:00 • Regular 15:30 - 22:00 • Post 22:00 (Madrid)'
                  : '15:30 - 22:00 (Hora española)'}
              </span>
            </p>
          </div>
        </div>

        {/* Status Badge & Period Toggles */}
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

          {/* Currency display toggle: EUR (Neto) vs USD (Réplicas) */}
          <div className="flex rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5">
            <button
              onClick={() => setCurrencyMode('eur')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1',
                currencyMode === 'eur'
                  ? 'bg-white dark:bg-[#333333] text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
              title="Estimación neta en Euros (incluye el efecto divisa EUR/USD sobre activos internacionales)"
            >
              <span>EUR (€)</span>
            </button>
            <button
              onClick={() => setCurrencyMode('usd')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1',
                currencyMode === 'usd'
                  ? 'bg-white dark:bg-[#333333] text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
              title="Rendimiento nominal en Dólares de los ETFs réplica de Wall Street"
            >
              <span>USD ($)</span>
            </button>
          </div>

          {/* Conversión actual EUR/USD */}
          {fxInfo && (
            <div
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs border border-slate-200/90 dark:border-white/[0.08] bg-white/90 dark:bg-[#252526] shadow-2xs select-none"
              title={`Tipo de cambio EUR/USD: 1 € = ${fxInfo.eur_usd_rate.toFixed(4)} $. Variación de hoy frente al cierre anterior.`}
            >
              <div className="flex items-center gap-1 font-mono">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">EUR/USD:</span>
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  {fxInfo.eur_usd_rate.toFixed(4)}
                </span>
              </div>
              <span
                className={cn(
                  'text-[11px] font-bold font-mono px-1.5 py-0.2 rounded-md whitespace-nowrap inline-flex items-center',
                  fxInfo.eur_usd_change_pct >= 0
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25'
                )}
              >
                {fxInfo.eur_usd_change_pct >= 0 ? '+' : ''}{fxInfo.eur_usd_change_pct.toFixed(2)}%
              </span>
            </div>
          )}

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 items-stretch">
        
        {/* Left Column (lg:col-span-5): Official TradingView Chart (Zero Distortion, 100% Adaptive) */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] p-3 sm:p-3.5">
          {/* KPI Summary Header */}
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span>
                  {hoveredPoint
                    ? `A las ${hoveredPoint.label} (Madrid)`
                    : period === '1d'
                    ? summary?.is_session_today
                      ? 'Rendimiento Sesión Hoy'
                      : `Cierre Última Sesión • ${summary?.session_display || 'Viernes 9 oct.'}`
                    : `Periodo (${period.toUpperCase()})`}
                </span>
                {hoveredPoint ? (
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {hoveredPoint.time_ny ? `${hoveredPoint.time_ny} NY` : 'Inspección'}
                    </span>
                    {hoveredPoint.phase && (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[9px] font-bold border',
                          hoveredPoint.phase === 'REGULAR'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                            : hoveredPoint.phase === 'PRE'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25'
                        )}
                      >
                        {hoveredPoint.phase === 'REGULAR'
                          ? 'REGULAR'
                          : hoveredPoint.phase === 'PRE'
                          ? 'PRE-MKT'
                          : 'AFTER-HOURS'}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-1 flex-wrap">
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
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">Base:</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {fmt.currency(summary?.total_value ?? 0)}
                </span>
              </div>
              {chartPoints.length > 0 && (
                <div className="flex items-center gap-2 text-xs sm:text-[13px] font-mono text-slate-600 dark:text-slate-400 bg-white/90 dark:bg-white/[0.06] px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
                  <span className={minPct >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                    {minPct >= 0 ? '+' : ''}{minPct.toFixed(2)}%
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs font-sans">↔</span>
                  <span className={maxPct >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                    {maxPct >= 0 ? '+' : ''}{maxPct.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* TradingView Lightweight Charts HTML5 Canvas Container (100% Proportional, No Distortion) */}
          <div className="relative w-full h-[250px] sm:h-[270px] select-none rounded-lg overflow-hidden border border-slate-200/60 dark:border-white/[0.05] bg-slate-100/40 dark:bg-black/20">
            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center text-xs text-slate-400 bg-slate-50/50 dark:bg-black/40">
                <LoadingDot />
                <span className="ml-2 font-medium">Cargando gráfica TradingView...</span>
              </div>
            )}

            {/* Dotted Vertical Session & Phase Markers */}
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              {markerPositions.map(({ marker, x }) => {
                const isApertura = marker.label.includes('15:30') || marker.type === 'regular_open'
                const isAfterHours = marker.label.includes('22:00') || marker.type === 'post_market'
                const labelText = isApertura
                  ? '15:30 • Apertura'
                  : isAfterHours
                  ? '22:00 • After-Hours'
                  : marker.label

                return (
                  <div
                    key={`${marker.time_unix}-${marker.label}`}
                    className="absolute top-1 bottom-6 flex flex-col items-center"
                    style={{ left: `${Math.round(x)}px` }}
                  >
                    {/* Softened, readable session tag with description */}
                    <div
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-tight whitespace-nowrap -translate-x-1/2 border select-none shadow-2xs z-20 backdrop-blur-xs',
                        isApertura
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-400/40 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-500/40'
                          : isAfterHours
                          ? 'bg-amber-50 text-amber-800 border-amber-400/40 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-500/40'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-400/40 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-500/40'
                      )}
                    >
                      {labelText}
                    </div>
                    {/* Vertical dotted line from badge to bottom axis */}
                    <div
                      className="w-0 flex-1 border-l-2 border-dotted mt-0.5"
                      style={{
                        borderColor: marker.color,
                        opacity: 0.9,
                      }}
                    />
                  </div>
                )
              })}
            </div>

            <div
              ref={chartContainerRef}
              className="w-full h-full"
              onMouseLeave={() => setHoveredPoint(null)}
            />
          </div>

          {/* Market Overview Highlights (Moved UP under chart) */}
          {marketStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
              {/* Total Seguimiento */}
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Seguimiento</span>
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {totalStocks ?? 0} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">valores</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 truncate">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{marketStats.advancing} ↑</span> /{' '}
                  <span className="text-rose-600 dark:text-rose-400 font-bold">{marketStats.declining} ↓</span>
                </div>
              </div>

              {/* Mayor Ganancia Hoy */}
              {bestStock && (
                <div
                  onClick={() => onSelectStock?.(bestStock)}
                  className="p-2.5 rounded-xl bg-white/90 dark:bg-white/[0.03] hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 border border-emerald-500/25 hover:border-emerald-500/40 cursor-pointer transition-all shadow-2xs group"
                >
                  <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>Mayor Ganancia</span>
                    <Flame className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate max-w-[85px]" title={bestStock.name}>
                      {bestStock.name}
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
                      +{bestStock.change_pct?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 truncate mt-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{bestStock.ticker}</span> • {fmt.price(bestStock.price, bestStock.currency)}
                  </div>
                </div>
              )}

              {/* Mayor Caída Hoy */}
              {worstStock && (
                <div
                  onClick={() => onSelectStock?.(worstStock)}
                  className="p-2.5 rounded-xl bg-white/90 dark:bg-white/[0.03] hover:bg-rose-50/50 dark:hover:bg-rose-500/5 border border-rose-500/25 hover:border-rose-500/40 cursor-pointer transition-all shadow-2xs group"
                >
                  <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>Mayor Caída</span>
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate max-w-[85px]" title={worstStock.name}>
                      {worstStock.name}
                    </span>
                    <span className="text-xs font-bold font-mono text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 whitespace-nowrap">
                      {worstStock.change_pct?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 truncate mt-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{worstStock.ticker}</span> • {fmt.price(worstStock.price, worstStock.currency)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (lg:col-span-7): Combined Breakdown Table & Live Proxies */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] p-3 sm:p-3.5">
          <div>
            {/* Top Toolbar: View Switcher & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
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
              <div className="overflow-x-auto overflow-y-auto max-h-[350px] sm:max-h-[365px] rounded-lg border border-slate-200/60 dark:border-white/[0.06]">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead className="sticky top-0 bg-slate-100/95 dark:bg-[#252526]/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-white/[0.08] z-10 select-none">
                    <tr>
                      <th className="py-1.5 px-2.5 min-w-[240px]">Fondo en Cartera</th>
                      <th className="py-1.5 px-2.5 min-w-[190px]">ETF Réplica</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Valor Cartera</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Peso</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Cotiz. ETF</th>
                      <th className="py-1.5 px-2.5 text-right whitespace-nowrap">Impacto Hoy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {holdings.map((h) => {
                      const etfInfo = ETF_INFO_MAP[h.etf_ticker]
                      const displayName = etfInfo?.name || h.etf_desc || h.etf_name || h.etf_ticker
                      const isEtfPos = (h.etf_change_pct ?? 0) >= 0
                      const isGainPos = (h.simulated_gain_amount ?? 0) >= 0

                      return (
                        <tr
                          key={h.isin}
                          className="hover:bg-slate-100/70 dark:hover:bg-white/[0.03] transition-colors group"
                        >
                          {/* Col 1: Fondo y Badge de Entidad */}
                          <td className="py-1.5 px-2.5 min-w-[240px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[240px]"
                                title={h.fund_name}
                              >
                                {h.fund_name}
                              </span>
                              <BrokerBadge broker={h.broker} />
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {h.isin}
                            </div>
                          </td>

                          {/* Col 2: Fondo Réplica y Badge del Ticker */}
                          <td className="py-1.5 px-2.5 min-w-[190px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[190px]"
                                title={displayName}
                              >
                                {displayName}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 font-semibold border border-slate-300/60 dark:border-white/[0.08]">
                                {h.etf_ticker}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[200px] mt-0.5">
                              {etfInfo?.category || h.etf_desc || 'Renta Variable'}
                            </div>
                          </td>

                          {/* Fund Value in Portfolio */}
                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {fmt.currency(h.fund_value)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {fmt.num(h.shares, 2)} part.
                            </div>
                          </td>

                          {/* Weight */}
                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                              {h.weight.toFixed(1)}%
                            </div>
                            <div className="w-12 h-1 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden ml-auto mt-0.5">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${Math.min(100, (h.weight / 35) * 100)}%` }}
                              />
                            </div>
                          </td>

                          {/* Live ETF Quote Price and Daily % */}
                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {(summary?.market_state === 'PRE' || summary?.market_state === 'POST') && (
                                <span className="text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {summary.market_state}
                                </span>
                              )}
                              <span className={cn('font-mono font-bold text-xs', isEtfPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                {isEtfPos ? '+' : ''}{h.etf_change_pct?.toFixed(2)}%
                              </span>
                            </div>
                            {h.etf_price && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                {fmt.currency(h.etf_price, 'USD')}
                              </div>
                            )}
                          </td>

                          {/* Estimated Impact in € */}
                          <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                            <span
                              className={cn(
                                'font-mono font-bold text-xs px-2 py-0.5 rounded-md inline-block',
                                isGainPos
                                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                                  : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                              )}
                            >
                              {isGainPos ? '+' : ''}{fmt.currency(h.simulated_gain_amount ?? 0)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Resumen Ponderado por ETFs Réplica */}
            {activeTab === 'etfs' && (
              <div className="overflow-x-auto overflow-y-auto max-h-[350px] sm:max-h-[365px] rounded-lg border border-slate-200/60 dark:border-white/[0.06]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100/95 dark:bg-[#252526]/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-white/[0.08] z-10 select-none">
                    <tr>
                      <th className="py-1.5 px-2.5">ETF Réplica / Mercado</th>
                      <th className="py-1.5 px-2 text-right">Cotiz. en Vivo</th>
                      <th className="py-1.5 px-2 text-right">Var. Día</th>
                      <th className="py-1.5 px-2 text-right">Peso Cartera</th>
                      <th className="py-1.5 px-2 text-right">Capital Replicado</th>
                      <th className="py-1.5 px-2.5 text-right">Impacto Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {etfs.map((etf) => {
                      const info = ETF_INFO_MAP[etf.ticker]
                      const displayName = info?.name || etf.name || etf.ticker
                      const isPos = (etf.change_pct ?? 0) >= 0
                      const replicatedVal = (summary?.total_value ?? 0) * (etf.weight / 100)
                      const totalImpact = replicatedVal * ((etf.change_pct ?? 0) / 100)
                      const isImpactPos = totalImpact >= 0

                      return (
                        <tr
                          key={etf.ticker}
                          className="hover:bg-slate-100/70 dark:hover:bg-white/[0.03] transition-colors group"
                        >
                          <td className="py-1.5 px-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[220px]"
                                title={displayName}
                              >
                                {displayName}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400 font-semibold border border-slate-300/60 dark:border-white/[0.08]">
                                {etf.ticker}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[220px] mt-0.5 font-medium">
                              {info?.category || 'Renta Variable'}
                            </div>
                          </td>

                          <td className="py-1.5 px-2 text-right font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {(summary?.market_state === 'PRE' || summary?.market_state === 'POST') && (
                                <span className="text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {summary.market_state}
                                </span>
                              )}
                              <span>{etf.price ? fmt.currency(etf.price, etf.currency) : '-'}</span>
                            </div>
                          </td>

                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            <span
                              className={cn(
                                'font-mono font-bold text-xs px-2 py-0.5 rounded-md inline-block',
                                isPos
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                              : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                              )}
                            >
                              {isPos ? '+' : ''}{etf.change_pct?.toFixed(2)}%
                            </span>
                          </td>

                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                              {etf.weight}%
                            </div>
                            <div className="w-12 h-1 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden ml-auto mt-0.5">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${Math.min(100, (etf.weight / 35) * 100)}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-1.5 px-2 text-right font-mono font-bold text-xs text-slate-900 dark:text-white whitespace-nowrap">
                            {fmt.currency(replicatedVal)}
                          </td>

                          <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                            <span
                              className={cn(
                                'font-mono font-bold text-xs px-2 py-0.5 rounded-md inline-block',
                                isImpactPos
                                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                                  : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                              )}
                            >
                              {isImpactPos ? '+' : ''}{fmt.currency(totalImpact)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
