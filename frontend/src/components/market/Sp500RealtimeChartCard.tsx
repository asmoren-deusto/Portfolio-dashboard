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
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  Flame,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useSp500Chart,
  type Sp500ChartPoint,
  type SessionMarker,
  type MarketStock,
} from '@/api/queries'
import { fmt, cn } from '@/lib/utils'
import { isNativePlatform } from '@/api/config'
import { LoadingDot } from '@/components/ui/LoadingDot'
import { triggerChartAnimation, prepareChartForAnimation } from '@/lib/chartAnimation'

export interface Sp500RealtimeChartCardProps {
  onSelectStock?: (stock: MarketStock) => void
  className?: string
}

export const Sp500RealtimeChartCard: React.FC<Sp500RealtimeChartCardProps> = ({
  onSelectStock,
  className,
}) => {
  const [period, setPeriod] = useState<'1d' | '5d' | '1mo'>('1d')
  const [viewMode, setViewMode] = useState<'pts' | 'pct'>('pts')
  const [hoveredPoint, setHoveredPoint] = useState<Sp500ChartPoint | null>(null)

  const theme = useAppStore((state) => state.theme)
  const isDark = theme === 'dark'

  const { data, isLoading, isFetching } = useSp500Chart(period)

  const summary = data?.summary
  const chartPoints = useMemo(() => data?.chart_points ?? [], [data?.chart_points])
  const sessionMarkers = useMemo(() => {
    return (data?.session_markers ?? []).filter(
      (m) => m.type !== 'session_break' && m.phase !== 'SESSION' && !m.label?.startsWith('Sesión')
    )
  }, [data?.session_markers])

  const price = summary?.price ?? 0
  const prevClose = summary?.prev_close ?? summary?.official_close_price ?? price
  const change = summary?.change ?? (price - prevClose)
  const changePct = summary?.change_pct ?? (prevClose ? ((price - prevClose) / prevClose) * 100 : 0)

  // Current inspected / active values
  const currentPrice = hoveredPoint ? hoveredPoint.price : price
  const currentPct = hoveredPoint ? hoveredPoint.change_pct : changePct
  const currentPts = hoveredPoint ? hoveredPoint.change_pts : change

  const isOverallPositive = changePct >= 0
  const isPositive = hoveredPoint ? hoveredPoint.change_pct >= 0 : isOverallPositive

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const priceLineRef = useRef<any>(null)
  const chartPointsRef = useRef<Sp500ChartPoint[]>(chartPoints)
  chartPointsRef.current = chartPoints
  const sessionMarkersRef = useRef<SessionMarker[]>(sessionMarkers)
  sessionMarkersRef.current = sessionMarkers
  const lastSweepKeyRef = useRef<string>('')

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

    const firstTime = pts[0].time_unix
    const lastTime = pts[pts.length - 1].time_unix

    for (const marker of sessionMarkersRef.current) {
      if (marker.time_unix < firstTime - 600 || marker.time_unix > lastTime + 300) {
        continue
      }

      let closestTime = pts[0].time_unix
      let minDiff = Math.abs(pts[0].time_unix - marker.time_unix)
      for (let i = 1; i < pts.length; i++) {
        const diff = Math.abs(pts[i].time_unix - marker.time_unix)
        if (diff < minDiff) {
          minDiff = diff
          closestTime = pts[i].time_unix
        }
      }

      if (minDiff > 1800) {
        continue
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

  // Min and max values for context pill
  const { minVal, maxVal } = useMemo(() => {
    if (!chartPoints || !chartPoints.length) return { minVal: 0, maxVal: 0 }
    const vals = chartPoints.map((p) => (viewMode === 'pts' ? p.price : p.change_pct))
    return { minVal: Math.min(...vals), maxVal: Math.max(...vals) }
  }, [chartPoints, viewMode])

  // Day range progress calculation for visual bar
  const dayLow = summary?.day_low ?? price
  const dayHigh = summary?.day_high ?? price
  const rangeDiff = dayHigh - dayLow
  const currentRangePct = rangeDiff > 0 ? Math.max(0, Math.min(100, ((price - dayLow) / rangeDiff) * 100)) : 50

  // Initialize and maintain TradingView Lightweight Charts instance
  useEffect(() => {
    if (!chartContainerRef.current) return

    let disposed = false
    let chart: IChartApi | null = null

    try {
      const containerWidth = Math.max(10, chartContainerRef.current.clientWidth || 300)
      const containerHeight = Math.max(10, chartContainerRef.current.clientHeight || 285)

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
          visible: !isNativePlatform(),
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

      const seriesColor = isOverallPositive ? '#10b981' : '#f43f5e'
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: seriesColor,
        topColor: isOverallPositive
          ? (isDark ? 'rgba(16, 185, 129, 0.32)' : 'rgba(16, 185, 129, 0.22)')
          : (isDark ? 'rgba(244, 63, 94, 0.32)' : 'rgba(244, 63, 94, 0.22)'),
        bottomColor: 'rgba(0, 0, 0, 0.0)',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) =>
            viewMode === 'pts'
              ? p.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
              : `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: seriesColor,
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 2,
      })

      chartRef.current = chart
      seriesRef.current = areaSeries
      priceLineRef.current = null

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
      console.warn('Failed to initialize S&P 500 TradingView chart:', err)
    }

    // Auto-resize observer
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
      } catch { }
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
        } catch { }
      }
      chartRef.current = null
      seriesRef.current = null
      priceLineRef.current = null
    }
  }, [isDark])

  // Update series data, styles, price line and markers whenever data or viewMode changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !chartPoints || !chartPoints.length) return

    try {
      const seriesColor = isOverallPositive ? '#10b981' : '#f43f5e'
      seriesRef.current.applyOptions({
        lineColor: seriesColor,
        topColor: isOverallPositive
          ? (isDark ? 'rgba(16, 185, 129, 0.32)' : 'rgba(16, 185, 129, 0.22)')
          : (isDark ? 'rgba(244, 63, 94, 0.32)' : 'rgba(244, 63, 94, 0.22)'),
        bottomColor: 'rgba(0, 0, 0, 0.0)',
        priceFormat: {
          type: 'custom',
          formatter: (p: number) =>
            viewMode === 'pts'
              ? p.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
              : `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
      })

      // Update baseline price line
      if (priceLineRef.current) {
        try {
          seriesRef.current.removePriceLine(priceLineRef.current)
        } catch { }
        priceLineRef.current = null
      }

      const baselineVal = viewMode === 'pts' ? prevClose : 0
      if (baselineVal > 0 || viewMode === 'pct') {
        priceLineRef.current = seriesRef.current.createPriceLine({
          price: baselineVal,
          color: isDark ? 'rgba(255, 255, 255, 0.40)' : 'rgba(71, 85, 105, 0.45)',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: viewMode === 'pts' ? `Ref. ${baselineVal.toFixed(1)}` : 'Ref. 0.00%',
        })
      }

      const map = new Map<number, number>()
      for (const p of chartPoints) {
        const val = viewMode === 'pts' ? p.price : p.change_pct
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

        const sweepKey = `${period}_${viewMode}_${formatted.length}_${formatted[0]?.value}_${formatted[formatted.length - 1]?.value}`
        if (sweepKey !== lastSweepKeyRef.current) {
          lastSweepKeyRef.current = sweepKey
          if (chartContainerRef.current?.querySelector('canvas')) {
            prepareChartForAnimation(chartContainerRef.current)
            requestAnimationFrame(() => {
              triggerChartAnimation(chartContainerRef.current, 750)
            })
          }
        }

        requestAnimationFrame(() => {
          updateMarkerPositions()
        })
      }
    } catch (err) {
      console.warn('Error setting S&P 500 chart data:', err)
    }
  }, [chartPoints, sessionMarkers, viewMode, period, isDark, prevClose, isOverallPositive])

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] p-3 sm:p-3.5 gap-2.5 h-full',
        className
      )}
    >
      {/* Top Header of the Chart: Title, Live Pill & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <img
                  src="https://flagcdn.com/w40/us.png"
                  alt="EE. UU."
                  className="w-4 h-3 rounded-2xs object-cover shadow-2xs border border-black/10 dark:border-white/10"
                />
                <span>S&P 500 • Tiempo Real</span>
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                <span className="live-dot emerald" />
                EN DIRECTO
              </span>
              {isFetching && <LoadingDot />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <span>NYSE & CME Futures • Puente continuo</span>
            </p>
          </div>
        </div>

        {/* Controls: Unit Toggle (pts vs %) + Period (1D, 5D, 1M) */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Unit Toggle: Puntos vs % */}
          <div className="flex items-center h-7.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('pts')}
              className={cn(
                'h-full px-2.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center',
                viewMode === 'pts'
                  ? 'bg-white dark:bg-[#333333] text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
              title="Cotización en puntos del índice"
            >
              Pts
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pct')}
              className={cn(
                'h-full px-2.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center',
                viewMode === 'pct'
                  ? 'bg-white dark:bg-[#333333] text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
              title="Variación porcentual (%)"
            >
              %
            </button>
          </div>

          {/* Period selector */}
          <div className="flex items-center h-7.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5">
            {[
              { id: '1d' as const, label: '1D' },
              { id: '5d' as const, label: '5D' },
              { id: '1mo' as const, label: '1M' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriod(tab.id)}
                className={cn(
                  'h-full px-2.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center',
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

      {/* KPI Summary Header: Natural two-line layout without clipping */}
      <div className="min-h-[58px] flex items-center justify-between gap-2 mb-1 pb-2 border-b border-slate-200/60 dark:border-white/[0.06]">
        {hoveredPoint ? (
          /* Hover inspection state */
          <div className="flex flex-col justify-center min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span>A las {hoveredPoint.label} (Madrid)</span>
              <div className="flex items-center gap-1">
                {hoveredPoint.time_ny && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {hoveredPoint.time_ny} NY
                  </span>
                )}
                {hoveredPoint.phase && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold border',
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
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white">
                {hoveredPoint.price ? fmt.num(hoveredPoint.price, 2) : '—'}
              </span>
              <span
                className={cn(
                  'text-xs sm:text-sm font-bold font-mono px-2 py-0.5 rounded-lg border shadow-2xs inline-flex items-center gap-0.5',
                  currentPct >= 0
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                )}
              >
                {currentPct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {currentPct >= 0 ? '+' : ''}
                  {currentPct.toFixed(2)}%
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">
                  ({currentPts >= 0 ? '+' : ''}
                  {currentPts.toFixed(2)} pts)
                </span>
              </span>
            </div>
          </div>
        ) : summary?.is_pre_market ? (
          /* Pre-market live display with official close context */
          <div>
            <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="live-dot warn" />
                <span>Pre-mercado CME Futures</span>
              </span>
              {summary.official_close_price && (
                <>
                  <span className="text-slate-300 dark:text-white/20">•</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal normal-case">
                    Cierre Oficial: <strong className="font-mono font-bold text-slate-600 dark:text-slate-300">{fmt.num(summary.official_close_price, 2)} pts</strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {price ? fmt.num(price, 2) : '—'}
              </span>
              <span
                className={cn(
                  'text-xs sm:text-sm font-bold font-mono px-2 py-0.5 rounded-lg border shadow-2xs inline-flex items-center gap-1',
                  changePct >= 0
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                )}
              >
                {changePct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {changePct >= 0 ? '+' : ''}
                  {changePct.toFixed(2)}%
                </span>
                <span className="text-xs opacity-75">
                  ({change >= 0 ? '+' : ''}
                  {change.toFixed(2)} pts)
                </span>
              </span>
            </div>
          </div>
        ) : (
          /* Regular session display */
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>{period === '1d' ? 'Cotización Hoy' : `Periodo (${period.toUpperCase()})`}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white">
                {price ? fmt.num(price, 2) : '—'}
              </span>
              <span
                className={cn(
                  'text-xs sm:text-sm font-bold font-mono px-2 py-0.5 rounded-lg border shadow-2xs inline-flex items-center gap-1',
                  changePct >= 0
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                )}
              >
                {changePct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {changePct >= 0 ? '+' : ''}
                  {changePct.toFixed(2)}%
                </span>
                <span className="text-xs opacity-75">
                  ({change >= 0 ? '+' : ''}
                  {change.toFixed(2)} pts)
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Right Info: Base Cierre & Day Range */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-xs">Cierre Previo:</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {prevClose ? fmt.num(prevClose, 2) : '—'}
            </span>
          </div>
          {chartPoints.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 bg-white/90 dark:bg-white/[0.06] px-2.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {viewMode === 'pts' ? fmt.num(minVal, 1) : `${minVal >= 0 ? '+' : ''}${minVal.toFixed(2)}%`}
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-sans">↔</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {viewMode === 'pts' ? fmt.num(maxVal, 1) : `${maxVal >= 0 ? '+' : ''}${maxVal.toFixed(2)}%`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TradingView Lightweight Charts Container: Fixed locked height */}
      <div className="relative w-full h-[295px] min-h-[295px] max-h-[295px] select-none rounded-xl overflow-hidden border border-slate-200/70 dark:border-white/[0.06] bg-slate-100/40 dark:bg-black/20">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-xs text-slate-400 bg-slate-50/50 dark:bg-black/40 rounded-xl">
            <LoadingDot />
            <span className="ml-2 font-medium">Cargando gráfica S&P 500...</span>
          </div>
        )}

        <div
          ref={chartContainerRef}
          className="w-full h-full rounded-xl overflow-hidden"
          onMouseLeave={() => setHoveredPoint(null)}
        />

        {/* Dotted Vertical Session & Phase Markers */}
        {period === '1d' && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {markerPositions.map(({ marker, x }, index) => {
              const isCierre = marker.type === 'cierre_ayer'
              const isTokyo = marker.type === 'tokyo'
              const isEuropa = marker.type === 'europa'
              const isPre = marker.type === 'pre_market'
              const isWallStreet = marker.type === 'regular_open'
              const isAfterHours = marker.type === 'post_market'

              const labelText = marker.label
              const level = index % 3
              const badgeTopStyle = level === 0 ? 'top-[4px]' : level === 1 ? 'top-[26px]' : 'top-[48px]'

              return (
                <div
                  key={`${marker.time_unix}-${marker.label}`}
                  className="absolute inset-y-0 bottom-6 pointer-events-none overflow-visible"
                  style={{ left: `${Math.round(x)}px` }}
                >
                  <div
                    className="absolute inset-y-0 w-0 -translate-x-1/2 border-l-2 border-dotted"
                    style={{
                      borderColor: marker.color,
                      opacity: 0.85,
                    }}
                  />

                  <div
                    className={cn(
                      'absolute px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-tight whitespace-nowrap border select-none shadow-xs z-30 backdrop-blur-md transition-all',
                      badgeTopStyle,
                      isCierre ? 'translate-x-1.5' : '-translate-x-1/2',
                      isCierre
                        ? 'bg-slate-100/95 text-slate-700 border-slate-300 dark:bg-slate-800/95 dark:text-slate-300 dark:border-slate-600'
                        : isTokyo
                          ? 'bg-rose-50/95 text-rose-800 border-rose-400/50 dark:bg-rose-950/95 dark:text-rose-300 dark:border-rose-500/50'
                          : isEuropa
                            ? 'bg-blue-50/95 text-blue-800 border-blue-400/50 dark:bg-blue-950/95 dark:text-blue-300 dark:border-blue-500/50'
                            : isPre
                              ? 'bg-indigo-50/95 text-indigo-800 border-indigo-400/50 dark:bg-indigo-950/95 dark:text-indigo-300 dark:border-indigo-500/50'
                              : isWallStreet
                                ? 'bg-emerald-50/95 text-emerald-800 border-emerald-400/50 dark:bg-emerald-950/95 dark:text-emerald-300 dark:border-emerald-500/50'
                                : isAfterHours
                                  ? 'bg-amber-50/95 text-amber-800 border-amber-400/50 dark:bg-amber-950/95 dark:text-amber-300 dark:border-amber-500/50'
                                  : 'bg-slate-50/95 text-slate-800 border-slate-300 dark:bg-slate-800/95 dark:text-slate-200 dark:border-slate-600'
                    )}
                  >
                    {labelText}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Highlights Grid: Combined Session Range Card + Session & State Cards */}
      <div className="grid grid-cols-2 gap-2 mt-0.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
        {/* 1. Tarjeta Unificada de Rango de la Sesión (Ocupa las 2 columnas con barra de gradiente) */}
        <div className="col-span-2 p-2.5 sm:p-3 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Flame className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Rango de la Sesión</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold">
              <span className="text-rose-600 dark:text-rose-400">
                Mín: {dayLow ? fmt.num(dayLow, 2) : '—'}
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-sans">↔</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Máx: {dayHigh ? fmt.num(dayHigh, 2) : '—'}
              </span>
            </div>
          </div>

          {/* Barra horizontal visual verde-roja con aguja / cursor */}
          <div className="relative w-full pt-1.5 pb-1">
            {/* Track de gradiente de rojo a verde pasando por ámbar */}
            <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 overflow-hidden shadow-inner opacity-90" />

            {/* Marcador / cursor en el punto actual */}
            <div
              className="absolute top-0.5 -translate-x-1/2 flex flex-col items-center transition-all duration-300 pointer-events-none"
              style={{ left: `${currentRangePct}%` }}
            >
              <div className="w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-white shadow-md" />
            </div>
          </div>

          {/* Leyenda inferior y porcentaje dentro del rango */}
          <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="text-rose-600/90 dark:text-rose-400 font-semibold">0% (Mínimo)</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              Posición actual: {currentRangePct.toFixed(0)}%
            </span>
            <span className="text-emerald-600/90 dark:text-emerald-400 font-semibold">100% (Máximo)</span>
          </div>
        </div>

        {/* 2. Sesión Wall Street */}
        <div className="p-2.5 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Sesión Wall Street</span>
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div className="mt-1 font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
            15:30 - 22:00 CET
          </div>
        </div>

        {/* 3. Estado NYSE / CME */}
        <div className="p-2.5 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Estado NYSE / CME</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                'live-dot',
                summary?.market_state === 'REGULAR'
                  ? 'emerald'
                  : summary?.market_state === 'PRE'
                    ? 'warn'
                    : 'slate'
              )}
            />
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              {summary?.market_state === 'REGULAR'
                ? 'ABIERTO'
                : summary?.market_state === 'PRE'
                  ? 'PRE-MKT'
                  : summary?.market_state === 'POST'
                    ? 'AFTER-HOURS'
                    : 'CERRADO'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
