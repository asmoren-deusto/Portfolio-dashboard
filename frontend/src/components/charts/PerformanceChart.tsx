import { useEffect, useRef, useState, useMemo } from 'react'
import {
  createChart,
  AreaSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  ColorType,
  createSeriesMarkers,
} from 'lightweight-charts'
import type { PricePoint } from '@/lib/mockData'
import { useAppStore } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  Flame,
} from 'lucide-react'

export type ChartMode = 'currency' | 'percent'

interface PerformanceChartProps {
  data: PricePoint[]
  height?: number
  chartMode?: ChartMode
  showInvested?: boolean
  showMilestones?: boolean
}

function formatDateSpanish(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    if (!year || !month || !day) return dateStr
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${day} ${months[month - 1]} ${year}`
  } catch {
    return dateStr
  }
}

function sanitizeValuePoints(points: PricePoint[]): { time: any; value: number }[] {
  if (!points || !points.length) return []
  const valid = points
    .filter(p => p && p.date && typeof p.value === 'number' && !isNaN(p.value))
    .sort((a, b) => a.date.localeCompare(b.date))

  const unique: { time: any; value: number }[] = []
  const seen = new Set<string>()
  for (const p of valid) {
    if (!seen.has(p.date)) {
      seen.add(p.date)
      unique.push({ time: p.date as any, value: p.value })
    }
  }
  return unique
}

function sanitizeInvestedPoints(points: PricePoint[]): { time: any; value: number }[] {
  if (!points || !points.length) return []
  const valid = points
    .filter(p => p && p.date && typeof p.invested === 'number' && !isNaN(p.invested))
    .sort((a, b) => a.date.localeCompare(b.date))

  const unique: { time: any; value: number }[] = []
  const seen = new Set<string>()
  for (const p of valid) {
    if (!seen.has(p.date)) {
      seen.add(p.date)
      unique.push({ time: p.date as any, value: p.invested! })
    }
  }
  return unique
}

function sanitizePercentPoints(points: PricePoint[]): { time: any; value: number }[] {
  if (!points || !points.length) return []
  const valid = points
    .filter(p => p && p.date && typeof p.value === 'number' && !isNaN(p.value))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (!valid.length) return []
  const base = valid[0]
  const unique: { time: any; value: number }[] = []
  const seen = new Set<string>()

  for (const p of valid) {
    if (!seen.has(p.date)) {
      seen.add(p.date)
      const periodInflow = (p.invested ?? 0) - (base.invested ?? 0)
      const profit = (p.value - base.value) - periodInflow
      const pct = base.value > 0 ? (profit / base.value) * 100 : 0
      unique.push({ time: p.date as any, value: Number(pct.toFixed(2)) })
    }
  }
  return unique
}

export function PerformanceChart({
  data,
  height = 260,
  chartMode = 'currency',
  showInvested = true,
  showMilestones = true,
}: PerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const areaSeriesRef = useRef<any>(null)
  const investedSeriesRef = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const zeroPriceLineRef = useRef<IPriceLine | null>(null)

  const theme = useAppStore(s => s.theme)
  const isDark = theme === 'dark'

  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null)

  const dataRef = useRef<PricePoint[]>(data)
  dataRef.current = data

  // Metrics computation for milestones & quick stats
  const metrics = useMemo(() => {
    if (!data || data.length === 0) return null

    const valid = data
      .filter(p => p && p.date && typeof p.value === 'number' && !isNaN(p.value))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (valid.length === 0) return null

    const first = valid[0]
    const last = valid[valid.length - 1]

    let maxPoint = valid[0]
    let minPoint = valid[0]

    for (const p of valid) {
      if (p.value > maxPoint.value) maxPoint = p
      if (p.value < minPoint.value) minPoint = p
    }

    const currentVal = last.value
    const maxVal = maxPoint.value
    const drawdownPct = maxVal > 0 ? ((currentVal - maxVal) / maxVal) * 100 : 0

    const periodInflow = (last.invested ?? 0) - (first.invested ?? 0)
    const periodProfit = (last.value - first.value) - periodInflow
    const periodReturnPct = first.value > 0 ? (periodProfit / first.value) * 100 : 0

    return {
      first,
      last,
      maxPoint,
      minPoint,
      drawdownPct,
      periodProfit,
      periodReturnPct,
      periodInflow,
    }
  }, [data])

  const activePoint = hoveredPoint || (metrics ? metrics.last : null)

  const activePnl = useMemo(() => {
    if (!activePoint) return null
    if (activePoint.invested !== undefined && activePoint.invested > 0) {
      const diff = activePoint.value - activePoint.invested
      const pct = (diff / activePoint.invested) * 100
      return { diff, pct }
    }
    if (metrics && metrics.first) {
      const diff = activePoint.value - metrics.first.value
      const pct = metrics.first.value > 0 ? (diff / metrics.first.value) * 100 : 0
      return { diff, pct }
    }
    return null
  }, [activePoint, metrics])

  // Active percent return from period start if in percent mode
  const activePercentReturn = useMemo(() => {
    if (!activePoint || !metrics || !metrics.first) return 0
    const periodInflow = (activePoint.invested ?? 0) - (metrics.first.invested ?? 0)
    const profit = (activePoint.value - metrics.first.value) - periodInflow
    return metrics.first.value > 0 ? (profit / metrics.first.value) * 100 : 0
  }, [activePoint, metrics])

  // Initialize and maintain chart instance
  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false
    const containerWidth = Math.max(10, containerRef.current.clientWidth || 300)

    let chart: IChartApi | null = null
    try {
      chart = createChart(containerRef.current, {
        width: containerWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: isDark ? '#94a3b8' : '#64748b',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
          horzLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
        },
        crosshair: {
          vertLine: {
            color: isDark ? 'rgba(96,165,250,0.45)' : 'rgba(37,99,235,0.35)',
            labelBackgroundColor: '#2563eb',
            width: 1,
            style: LineStyle.Dotted,
          },
          horzLine: {
            color: isDark ? 'rgba(96,165,250,0.45)' : 'rgba(37,99,235,0.35)',
            labelBackgroundColor: '#2563eb',
            style: LineStyle.Dotted,
          },
        },
        rightPriceScale: {
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          scaleMargins: { top: 0.12, bottom: 0.08 },
        },
        timeScale: {
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: true,
        handleScale: true,
      })

      // Primary Area Series (Portfolio Value or %)
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: '#2563eb',
        topColor: isDark ? 'rgba(37, 99, 235, 0.32)' : 'rgba(37, 99, 235, 0.22)',
        bottomColor: 'rgba(37, 99, 235, 0.01)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: '#2563eb',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => fmt.currency(p),
        },
      })

      // Secondary Line Series (Net Invested Capital)
      const investedSeries = chart.addSeries(LineSeries, {
        color: isDark ? '#c084fc' : '#9333ea',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: isDark ? '#c084fc' : '#9333ea',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => fmt.currency(p),
        },
      })

      // Markers handle
      const markersPlugin = createSeriesMarkers(areaSeries, [])

      chartRef.current = chart
      areaSeriesRef.current = areaSeries
      investedSeriesRef.current = investedSeries
      markersRef.current = markersPlugin

      // Initial data population & automatic fit
      const valPoints = sanitizeValuePoints(dataRef.current)
      if (valPoints.length) {
        areaSeries.setData(valPoints)
      }

      const invPoints = sanitizeInvestedPoints(dataRef.current)
      if (invPoints.length) {
        investedSeries.setData(invPoints)
      }

      // Auto-fit immediately on mount
      if (valPoints.length) {
        chart.timeScale().fitContent()
      }

      // Crosshair inspection listener
      chart.subscribeCrosshairMove(param => {
        if (!param || !param.time || !dataRef.current) {
          setHoveredPoint(null)
          return
        }
        const timeStr = typeof param.time === 'string'
          ? param.time
          : (param.time as any).year
          ? `${(param.time as any).year}-${String((param.time as any).month).padStart(2, '0')}-${String((param.time as any).day).padStart(2, '0')}`
          : String(param.time)

        const match = dataRef.current.find(p => p.date === timeStr)
        if (match) {
          setHoveredPoint(match)
        } else {
          setHoveredPoint(null)
        }
      })
    } catch (err) {
      console.warn('Failed to initialize performance chart:', err)
    }

    const ro = new ResizeObserver(entries => {
      if (disposed || !entries[0] || !chartRef.current) return
      try {
        const w = Math.max(10, entries[0].contentRect.width)
        chartRef.current.applyOptions({ width: w })
        chartRef.current.timeScale().fitContent()
      } catch {}
    })

    if (containerRef.current) {
      ro.observe(containerRef.current)
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
      areaSeriesRef.current = null
      investedSeriesRef.current = null
      markersRef.current = null
      zeroPriceLineRef.current = null
    }
  }, [height, isDark])

  // Update Series Data, Mode, Colors, Markers, and Auto-fit automatically
  useEffect(() => {
    if (!areaSeriesRef.current || !chartRef.current || !data) return

    try {
      const area = areaSeriesRef.current
      const inv = investedSeriesRef.current
      const chart = chartRef.current

      if (chartMode === 'currency') {
        const valPoints = sanitizeValuePoints(data)
        area.setData(valPoints)
        area.applyOptions({
          lineColor: '#2563eb',
          topColor: isDark ? 'rgba(37, 99, 235, 0.32)' : 'rgba(37, 99, 235, 0.22)',
          bottomColor: 'rgba(37, 99, 235, 0.01)',
          crosshairMarkerBackgroundColor: '#2563eb',
          priceFormat: {
            type: 'custom',
            formatter: (p: number) => fmt.currency(p),
          },
        })

        // Clean up zero line if was in percent mode
        if (zeroPriceLineRef.current) {
          try {
            area.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          zeroPriceLineRef.current = null
        }

        // Invested line series
        if (inv) {
          inv.applyOptions({ visible: showInvested })
          if (showInvested) {
            const invPoints = sanitizeInvestedPoints(data)
            inv.setData(invPoints)
          }
        }

        // High / Low markers
        if (markersRef.current && metrics) {
          if (showMilestones && metrics.maxPoint && metrics.minPoint && metrics.maxPoint.date !== metrics.minPoint.date) {
            markersRef.current.setMarkers([
              {
                time: metrics.maxPoint.date,
                position: 'aboveBar',
                color: '#10b981',
                shape: 'arrowDown',
                text: `Pico: ${fmt.currency(metrics.maxPoint.value)}`,
              },
              {
                time: metrics.minPoint.date,
                position: 'belowBar',
                color: '#f43f5e',
                shape: 'arrowUp',
                text: `Mín: ${fmt.currency(metrics.minPoint.value)}`,
              },
            ])
          } else {
            markersRef.current.setMarkers([])
          }
        }
      } else {
        // Percent mode
        const pctPoints = sanitizePercentPoints(data)
        area.setData(pctPoints)

        const isPositive = (metrics?.periodReturnPct ?? 0) >= 0
        const mainColor = isPositive ? '#10b981' : '#f43f5e'
        const topGrad = isPositive
          ? (isDark ? 'rgba(16, 185, 129, 0.30)' : 'rgba(16, 185, 129, 0.22)')
          : (isDark ? 'rgba(244, 63, 94, 0.30)' : 'rgba(244, 63, 94, 0.22)')

        area.applyOptions({
          lineColor: mainColor,
          topColor: topGrad,
          bottomColor: isPositive ? 'rgba(16, 185, 129, 0.01)' : 'rgba(244, 63, 94, 0.01)',
          crosshairMarkerBackgroundColor: mainColor,
          priceFormat: {
            type: 'custom',
            formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
          },
        })

        // In percent mode, invested line is hidden as reference is 0%
        if (inv) {
          inv.applyOptions({ visible: false })
        }

        // Add 0% baseline price line
        if (!zeroPriceLineRef.current) {
          zeroPriceLineRef.current = area.createPriceLine({
            price: 0,
            color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: 'Base (0.0%)',
          })
        }

        // Markers for % mode
        if (markersRef.current && metrics) {
          if (showMilestones && metrics.maxPoint && metrics.minPoint && metrics.maxPoint.date !== metrics.minPoint.date) {
            const maxPct = sanitizePercentPoints([metrics.first, metrics.maxPoint])[1]?.value ?? 0
            const minPct = sanitizePercentPoints([metrics.first, metrics.minPoint])[1]?.value ?? 0

            markersRef.current.setMarkers([
              {
                time: metrics.maxPoint.date,
                position: 'aboveBar',
                color: '#10b981',
                shape: 'arrowDown',
                text: `Pico: +${maxPct.toFixed(1)}%`,
              },
              {
                time: metrics.minPoint.date,
                position: 'belowBar',
                color: '#f43f5e',
                shape: 'arrowUp',
                text: `Mín: ${minPct.toFixed(1)}%`,
              },
            ])
          } else {
            markersRef.current.setMarkers([])
          }
        }
      }

      // Automatically auto-fit the view to the full period data width without needing a button
      chart.timeScale().fitContent()
    } catch (err) {
      console.warn('Failed to update performance chart:', err)
    }
  }, [data, chartMode, showInvested, showMilestones, metrics, isDark])

  return (
    <div data-private className="w-full flex flex-col gap-2">
      {/* 1. Dynamic HUD: Interactive Inspection & Live Metric Strip (Compact) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50/90 dark:bg-[#0c101c]/80 border border-slate-200/80 dark:border-white/[0.06]">
        {/* Left: Value, Return & Gain at current cursor or last point */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium">
          {/* Main Portfolio Value / Return */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">
              {chartMode === 'currency' ? 'Patrimonio:' : 'Rentabilidad:'}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {chartMode === 'currency'
                ? fmt.currency(activePoint?.value)
                : `${activePercentReturn >= 0 ? '+' : ''}${activePercentReturn.toFixed(2)}%`}
            </span>
          </div>

          {/* Invested Capital */}
          {activePoint?.invested !== undefined && chartMode === 'currency' && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-0.5 border-t-2 border-dashed border-purple-500" />
              <span className="text-slate-500 dark:text-slate-400">Aportado:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {fmt.currency(activePoint.invested)}
              </span>
            </div>
          )}

          {/* Net Profit (Plusvalía) */}
          {activePnl && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Beneficio:</span>
              <span
                className={cn(
                  'font-mono font-bold px-1.5 py-0.5 rounded text-[11px]',
                  activePnl.diff >= 0
                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                    : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                )}
              >
                {activePnl.diff >= 0 ? '+' : ''}{fmt.currency(activePnl.diff)} ({fmt.pct(activePnl.pct)})
              </span>
            </div>
          )}
        </div>

        {/* Right: Date inspection pill */}
        {activePoint?.date && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-white/[0.04] px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-white/[0.06]">
            <Calendar size={11} className={hoveredPoint ? 'text-blue-500' : 'text-slate-400'} />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatDateSpanish(activePoint.date)}
            </span>
            {hoveredPoint && (
              <span className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400 ml-0.5">
                (Inspección)
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Canvas Container */}
      <div ref={containerRef} style={{ height }} className="w-full relative rounded-lg overflow-hidden" />

      {/* 3. Useful Milestones Strip (Larger, higher contrast, and with label on 4th box) */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.06] text-xs">
          {/* Max Peak */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#121727] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            title={`Máximo del periodo (ATH): ${fmt.currency(metrics.maxPoint.value)} el ${formatDateSpanish(metrics.maxPoint.date)}`}
          >
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">Máx:</span>
              <span className="font-mono font-extrabold text-slate-950 dark:text-white text-xs truncate">
                {fmt.currency(metrics.maxPoint.value)}
              </span>
            </div>
          </div>

          {/* Period Low */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#121727] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            title={`Mínimo del periodo: ${fmt.currency(metrics.minPoint.value)} el ${formatDateSpanish(metrics.minPoint.date)}`}
          >
            <div className="p-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              <TrendingDown size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">Mín:</span>
              <span className="font-mono font-extrabold text-slate-950 dark:text-white text-xs truncate">
                {fmt.currency(metrics.minPoint.value)}
              </span>
            </div>
          </div>

          {/* Current Drawdown */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#121727] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            title={metrics.drawdownPct >= -0.05 ? 'La cartera está en máximos del periodo' : `Distancia actual al pico: ${metrics.drawdownPct.toFixed(2)}%`}
          >
            <div className="p-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Flame size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">Pico:</span>
              <span
                className={cn(
                  'font-mono font-extrabold text-xs truncate',
                  metrics.drawdownPct >= -0.05
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                )}
              >
                {metrics.drawdownPct >= -0.05 ? 'En Máximos (ATH)' : `${metrics.drawdownPct.toFixed(2)}%`}
              </span>
            </div>
          </div>

          {/* Net Return */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#121727] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            title={`Ganancia neta del periodo: ${fmt.currency(metrics.periodProfit)} (${fmt.pct(metrics.periodReturnPct)})`}
          >
            <div className={cn(
              "p-1 rounded-lg shrink-0",
              metrics.periodProfit >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}>
              <ArrowUpRight size={14} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">Neto:</span>
              <span
                className={cn(
                  'font-mono font-extrabold text-xs truncate',
                  metrics.periodProfit >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {metrics.periodProfit >= 0 ? '+' : ''}{fmt.currency(metrics.periodProfit)} ({fmt.pct(metrics.periodReturnPct)})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
