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

export interface EntityConfig {
  id: string
  label: string
  color: string
  topColorDark: string
  topColorLight: string
  bottomColorDark: string
  bottomColorLight: string
  textColor: string
  badgeBg: string
  badgeBorder: string
}

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  myinvestor: {
    id: 'myinvestor',
    label: 'MyInvestor',
    color: '#3b82f6', // blue
    topColorDark: 'rgba(59, 130, 246, 0.42)',
    topColorLight: 'rgba(37, 99, 235, 0.28)',
    bottomColorDark: 'rgba(59, 130, 246, 0.20)',
    bottomColorLight: 'rgba(37, 99, 235, 0.12)',
    textColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeBorder: 'border-blue-500/30',
  },
  bbva: {
    id: 'bbva',
    label: 'BBVA',
    color: '#10b981', // emerald
    topColorDark: 'rgba(16, 185, 129, 0.52)',
    topColorLight: 'rgba(16, 185, 129, 0.38)',
    bottomColorDark: 'rgba(16, 185, 129, 0.28)',
    bottomColorLight: 'rgba(16, 185, 129, 0.18)',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/30',
  },
  indexa: {
    id: 'indexa',
    label: 'Indexa Capital',
    color: '#f59e0b', // amber
    topColorDark: 'rgba(245, 158, 11, 0.62)',
    topColorLight: 'rgba(245, 158, 11, 0.48)',
    bottomColorDark: 'rgba(245, 158, 11, 0.35)',
    bottomColorLight: 'rgba(245, 158, 11, 0.25)',
    textColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeBorder: 'border-amber-500/30',
  },
}

// Canonical stacking order from bottom to top: Indexa on bottom, BBVA in middle, MyInvestor on top
const CANONICAL_ORDER = ['indexa', 'bbva', 'myinvestor']

interface PerformanceChartProps {
  data: PricePoint[]
  height?: number
  chartMode?: ChartMode
  showInvested?: boolean
  showMilestones?: boolean
  showFooterStrip?: boolean
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

export function PerformanceChart({
  data,
  height = 260,
  chartMode = 'currency',
  showInvested = true,
  showMilestones = true,
  showFooterStrip = true,
}: PerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  // 3 stacked AreaSeries slots:
  // slot2 = Top layer (added 1st, drawn at back)
  // slot1 = Middle layer (added 2nd, drawn above slot2)
  // slot0 = Bottom layer (added 3rd, drawn in front of slot1)
  const slot2Ref = useRef<any>(null)
  const slot1Ref = useRef<any>(null)
  const slot0Ref = useRef<any>(null)

  const investedSeriesRef = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const zeroPriceLineRef = useRef<IPriceLine | null>(null)

  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null)

  // Dynamically detect available brokers
  const availableBrokers = useMemo(() => {
    if (!data || !data.length) return []
    const found = new Set<string>()
    for (const p of data) {
      if (p.brokers) {
        for (const [k, v] of Object.entries(p.brokers)) {
          if (v && v.value > 0) found.add(k)
        }
      }
    }
    // Sort according to canonical order
    return CANONICAL_ORDER.filter(b => found.has(b))
  }, [data])

  // Selected entities state (default: all active)
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(() => new Set(['indexa', 'bbva', 'myinvestor']))

  useEffect(() => {
    if (availableBrokers.length > 0 && selectedEntities.size === 0) {
      setSelectedEntities(new Set(availableBrokers))
    }
  }, [availableBrokers])

  const toggleEntity = (b: string) => {
    setSelectedEntities(prev => {
      const next = new Set(prev)
      if (next.has(b)) {
        if (next.size === 1) return prev // Keep at least one active
        next.delete(b)
      } else {
        next.add(b)
      }
      return next
    })
  }

  const dataRef = useRef<PricePoint[]>(data)
  dataRef.current = data

  // Active stack list in canonical order (bottom to top)
  const activeStackList = useMemo(() => {
    return availableBrokers.filter(b => selectedEntities.has(b))
  }, [availableBrokers, selectedEntities])

  // Metrics computation for selected sum
  const metrics = useMemo(() => {
    if (!data || data.length === 0) return null

    const valid = data.filter(p => p && p.date).sort((a, b) => a.date.localeCompare(b.date))
    if (!valid.length) return null

    const sumPoints: { date: string; value: number; invested: number }[] = []
    const seen = new Set<string>()

    for (const p of valid) {
      if (!seen.has(p.date)) {
        seen.add(p.date)
        let val = 0
        let inv = 0
        if (p.brokers && activeStackList.length > 0) {
          for (const b of activeStackList) {
            val += p.brokers[b]?.value ?? 0
            inv += p.brokers[b]?.invested ?? 0
          }
        } else {
          val = p.value
          inv = p.invested ?? 0
        }
        sumPoints.push({ date: p.date, value: Math.max(0, val), invested: Math.max(0, inv) })
      }
    }

    if (!sumPoints.length) return null

    const first = sumPoints[0]
    const last = sumPoints[sumPoints.length - 1]

    let maxPoint = sumPoints[0]
    let minPoint = sumPoints[0]

    for (const p of sumPoints) {
      if (p.value > maxPoint.value) maxPoint = p
      if (p.value < minPoint.value) minPoint = p
    }

    const currentVal = last.value
    const maxVal = maxPoint.value
    const drawdownPct = maxVal > 0 ? ((currentVal - maxVal) / maxVal) * 100 : 0

    const periodInflow = last.invested - first.invested
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
      sumPoints,
    }
  }, [data, activeStackList])

  // Active point (crosshair hover or latest)
  const activePoint = hoveredPoint || (data.length ? data[data.length - 1] : null)

  const activeSelectedMetrics = useMemo(() => {
    if (!activePoint) return null

    let val = 0
    let inv = 0

    if (activePoint.brokers && activeStackList.length > 0) {
      for (const b of activeStackList) {
        val += activePoint.brokers[b]?.value ?? 0
        inv += activePoint.brokers[b]?.invested ?? 0
      }
    } else {
      val = activePoint.value
      inv = activePoint.invested ?? 0
    }

    const diff = inv > 0 ? val - inv : (metrics?.first ? val - metrics.first.value : 0)
    const pct = inv > 0 ? (diff / inv) * 100 : (metrics?.first && metrics.first.value > 0 ? (diff / metrics.first.value) * 100 : 0)

    let periodPct = 0
    if (metrics && metrics.first) {
      const inflow = inv - metrics.first.invested
      const profit = (val - metrics.first.value) - inflow
      periodPct = metrics.first.value > 0 ? (profit / metrics.first.value) * 100 : 0
    }

    return { val, inv, diff, pct, periodPct }
  }, [activePoint, activeStackList, metrics])

  // Initialize Lightweight Charts
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
            color: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.20)',
            labelBackgroundColor: isDark ? '#2d2d2d' : '#1e293b',
            width: 1,
            style: LineStyle.Dotted,
          },
          horzLine: {
            color: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.20)',
            labelBackgroundColor: isDark ? '#2d2d2d' : '#1e293b',
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

      // 1. Slot 2: Top Layer AreaSeries (Added FIRST, drawn in background)
      const slot2 = chart.addSeries(AreaSeries, {
        lineColor: '#3b82f6',
        topColor: isDark ? 'rgba(59, 130, 246, 0.42)' : 'rgba(37, 99, 235, 0.28)',
        bottomColor: isDark ? 'rgba(59, 130, 246, 0.20)' : 'rgba(37, 99, 235, 0.12)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true, // Only Top layer shows badge on right axis
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: '#3b82f6',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => fmt.currency(p),
        },
      })

      // 2. Slot 1: Middle Layer AreaSeries (Added SECOND, drawn above slot 2)
      const slot1 = chart.addSeries(AreaSeries, {
        lineColor: '#10b981',
        topColor: isDark ? 'rgba(16, 185, 129, 0.52)' : 'rgba(16, 185, 129, 0.38)',
        bottomColor: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.18)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false, // Hidden on right axis
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#10b981',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => fmt.currency(p),
        },
      })

      // 3. Slot 0: Bottom Layer AreaSeries (Added THIRD, drawn in front of slot 1)
      const slot0 = chart.addSeries(AreaSeries, {
        lineColor: '#f59e0b',
        topColor: isDark ? 'rgba(245, 158, 11, 0.62)' : 'rgba(245, 158, 11, 0.48)',
        bottomColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false, // Hidden on right axis
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#f59e0b',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => fmt.currency(p),
        },
      })

      // 4. Invested Series (Dashed Line) (Added FOURTH, drawn on top of all area fills)
      const investedSeries = chart.addSeries(LineSeries, {
        color: isDark ? '#c084fc' : '#9333ea',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true, // Visible on right axis
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: isDark ? '#c084fc' : '#9333ea',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => fmt.currency(p),
        },
      })

      const markersPlugin = createSeriesMarkers(slot2, [])

      chartRef.current = chart
      slot2Ref.current = slot2
      slot1Ref.current = slot1
      slot0Ref.current = slot0
      investedSeriesRef.current = investedSeries
      markersRef.current = markersPlugin

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
      slot2Ref.current = null
      slot1Ref.current = null
      slot0Ref.current = null
      investedSeriesRef.current = null
      markersRef.current = null
      zeroPriceLineRef.current = null
    }
  }, [height, isDark])

  // Update Stacked Series Data on Changes
  useEffect(() => {
    if (!slot2Ref.current || !chartRef.current || !data || !metrics) return

    try {
      const chart = chartRef.current
      const slot2 = slot2Ref.current
      const slot1 = slot1Ref.current
      const slot0 = slot0Ref.current
      const inv = investedSeriesRef.current

      const validDates = metrics.sumPoints.map(p => p.date)
      const n = activeStackList.length

      if (chartMode === 'currency') {
        // Clean up zero line if was in percent mode
        if (zeroPriceLineRef.current) {
          try {
            slot2.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          zeroPriceLineRef.current = null
        }

        if (n === 3) {
          // Bottom layer: activeStackList[0] (Indexa, amber)
          const b0 = activeStackList[0]
          const cfg0 = ENTITY_CONFIGS[b0]
          const pts0 = validDates.map(d => {
            const orig = data.find(p => p.date === d)
            return { time: d, value: orig?.brokers?.[b0]?.value ?? 0 }
          })
          slot0.setData(pts0)
          slot0.applyOptions({
            visible: true,
            lineColor: cfg0.color,
            topColor: isDark ? cfg0.topColorDark : cfg0.topColorLight,
            bottomColor: isDark ? cfg0.bottomColorDark : cfg0.bottomColorLight,
            lastValueVisible: false,
          })

          // Middle layer: activeStackList[0] + activeStackList[1] (BBVA, emerald)
          const b1 = activeStackList[1]
          const cfg1 = ENTITY_CONFIGS[b1]
          const pts1 = validDates.map(d => {
            const orig = data.find(p => p.date === d)
            const v0 = orig?.brokers?.[b0]?.value ?? 0
            const v1 = orig?.brokers?.[b1]?.value ?? 0
            return { time: d, value: v0 + v1 }
          })
          slot1.setData(pts1)
          slot1.applyOptions({
            visible: true,
            lineColor: cfg1.color,
            topColor: isDark ? cfg1.topColorDark : cfg1.topColorLight,
            bottomColor: isDark ? cfg1.bottomColorDark : cfg1.bottomColorLight,
            lastValueVisible: false,
          })

          // Top layer: Total sum of all 3 (MyInvestor, blue)
          const b2 = activeStackList[2]
          const cfg2 = ENTITY_CONFIGS[b2]
          const pts2 = metrics.sumPoints.map(p => ({ time: p.date, value: p.value }))
          slot2.setData(pts2)
          slot2.applyOptions({
            visible: true,
            lineColor: cfg2.color,
            topColor: isDark ? cfg2.topColorDark : cfg2.topColorLight,
            bottomColor: isDark ? cfg2.bottomColorDark : cfg2.bottomColorLight,
            lastValueVisible: true, // ONLY the total shows on right axis
          })
        } else if (n === 2) {
          // Bottom layer: activeStackList[0]
          const b0 = activeStackList[0]
          const cfg0 = ENTITY_CONFIGS[b0]
          const pts0 = validDates.map(d => {
            const orig = data.find(p => p.date === d)
            return { time: d, value: orig?.brokers?.[b0]?.value ?? 0 }
          })
          slot0.setData(pts0)
          slot0.applyOptions({
            visible: true,
            lineColor: cfg0.color,
            topColor: isDark ? cfg0.topColorDark : cfg0.topColorLight,
            bottomColor: isDark ? cfg0.bottomColorDark : cfg0.bottomColorLight,
            lastValueVisible: false,
          })

          slot1.applyOptions({ visible: false })

          // Top layer: sum of the 2 active
          const b1 = activeStackList[1]
          const cfg1 = ENTITY_CONFIGS[b1]
          const pts2 = metrics.sumPoints.map(p => ({ time: p.date, value: p.value }))
          slot2.setData(pts2)
          slot2.applyOptions({
            visible: true,
            lineColor: cfg1.color,
            topColor: isDark ? cfg1.topColorDark : cfg1.topColorLight,
            bottomColor: isDark ? cfg1.bottomColorDark : cfg1.bottomColorLight,
            lastValueVisible: true,
          })
        } else if (n === 1) {
          slot0.applyOptions({ visible: false })
          slot1.applyOptions({ visible: false })

          // Only 1 entity: slot2 shows that entity
          const b0 = activeStackList[0]
          const cfg0 = ENTITY_CONFIGS[b0]
          const pts2 = metrics.sumPoints.map(p => ({ time: p.date, value: p.value }))
          slot2.setData(pts2)
          slot2.applyOptions({
            visible: true,
            lineColor: cfg0.color,
            topColor: isDark ? cfg0.topColorDark : cfg0.topColorLight,
            bottomColor: isDark ? cfg0.bottomColorDark : cfg0.bottomColorLight,
            lastValueVisible: true,
          })
        }

        // Invested Line Series
        if (inv) {
          const invPoints = metrics.sumPoints.map(p => ({ time: p.date, value: p.invested }))
          inv.setData(invPoints)
          inv.applyOptions({
            visible: showInvested,
            lastValueVisible: showInvested,
            priceFormat: {
              type: 'custom',
              formatter: (p: number) => fmt.currency(p),
            },
          })
        }

        // ATH / Low Markers
        if (markersRef.current) {
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
        // Percent Mode
        slot0.applyOptions({ visible: false })
        slot1.applyOptions({ visible: false })

        const baseVal = metrics.first.value
        const baseInv = metrics.first.invested

        const pctPoints = metrics.sumPoints.map(p => {
          const inflow = p.invested - baseInv
          const profit = (p.value - baseVal) - inflow
          const pct = baseVal > 0 ? (profit / baseVal) * 100 : 0
          return { time: p.date, value: Number(pct.toFixed(2)) }
        })

        const isPositive = (metrics.periodReturnPct ?? 0) >= 0
        const mainColor = isPositive ? '#10b981' : '#f43f5e'
        const topGrad = isPositive
          ? (isDark ? 'rgba(16, 185, 129, 0.32)' : 'rgba(16, 185, 129, 0.22)')
          : (isDark ? 'rgba(244, 63, 94, 0.32)' : 'rgba(244, 63, 94, 0.22)')

        slot2.setData(pctPoints)
        slot2.applyOptions({
          visible: true,
          lineColor: mainColor,
          topColor: topGrad,
          bottomColor: isPositive ? 'rgba(16, 185, 129, 0.01)' : 'rgba(244, 63, 94, 0.01)',
          lastValueVisible: true,
          priceFormat: {
            type: 'custom',
            formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
          },
        })

        if (inv) {
          inv.applyOptions({ visible: false, lastValueVisible: false })
        }

        // 0% Baseline
        if (!zeroPriceLineRef.current) {
          zeroPriceLineRef.current = slot2.createPriceLine({
            price: 0,
            color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: 'Base (0.0%)',
          })
        }

        if (markersRef.current) {
          markersRef.current.setMarkers([])
        }
      }

      chart.timeScale().fitContent()
    } catch (err) {
      console.warn('Error updating chart series:', err)
    }
  }, [data, chartMode, showInvested, showMilestones, activeStackList, isDark, metrics])

  return (
    <div className="w-full flex flex-col justify-between select-none space-y-2">
      {/* Dynamic HUD Bar with Inlined Entity Selectors (Matches exact mockup from user) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50/90 dark:bg-[#181818] border border-slate-200/80 dark:border-white/[0.08] text-xs">
        {/* Left: Patrimonio & Aportado */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Patrimonio:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              {chartMode === 'currency'
                ? fmt.currency(activeSelectedMetrics?.val)
                : `${(activeSelectedMetrics?.periodPct ?? 0) >= 0 ? '+' : ''}${(activeSelectedMetrics?.periodPct ?? 0).toFixed(2)}%`}
            </span>
          </div>

          {showInvested && chartMode === 'currency' && activeSelectedMetrics?.inv !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t-2 border-dashed border-purple-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Aportado:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                {fmt.currency(activeSelectedMetrics.inv)}
              </span>
            </div>
          )}
        </div>

        {/* Middle: Inlined Entity Selectors (Exact position from user screenshot) */}
        <div className="flex items-center gap-1.5 order-last sm:order-none w-full sm:w-auto justify-center sm:justify-start pt-1 sm:pt-0 border-t sm:border-0 border-slate-200/60 dark:border-white/[0.06]">
          {availableBrokers.map((b) => {
            const cfg = ENTITY_CONFIGS[b] || {
              label: b,
              color: '#64748b',
              badgeBg: 'bg-slate-500/10',
              textColor: 'text-slate-700',
              badgeBorder: 'border-slate-500/20',
            }
            const isSelected = selectedEntities.has(b)

            return (
              <button
                key={b}
                type="button"
                onClick={() => toggleEntity(b)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none',
                  isSelected
                    ? `${cfg.badgeBg} ${cfg.textColor} ${cfg.badgeBorder} shadow-xs font-bold`
                    : 'bg-white/50 dark:bg-white/[0.02] text-slate-400 border-slate-200/80 dark:border-white/[0.06] hover:text-slate-700 dark:hover:text-slate-200 opacity-60 line-through'
                )}
                title={`Haz clic para mostrar u ocultar ${cfg.label} en la gráfica`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? cfg.color : '#94a3b8' }}
                />
                <span>{cfg.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right: Beneficio & Fecha */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {activeSelectedMetrics && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Beneficio:</span>
              <span
                className={cn(
                  'font-mono font-bold px-1.5 py-0.5 rounded text-[11px]',
                  activeSelectedMetrics.diff >= 0
                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20'
                )}
              >
                {activeSelectedMetrics.diff >= 0 ? '+' : ''}{fmt.currency(activeSelectedMetrics.diff)} ({fmt.pct(activeSelectedMetrics.pct)})
              </span>
            </div>
          )}

          {activePoint?.date && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-[#252526] px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-white/[0.08] shrink-0">
              <Calendar size={11} className={hoveredPoint ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatDateSpanish(activePoint.date)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} style={{ height }} className="w-full relative rounded-lg overflow-hidden" />

      {/* Useful Milestones Strip */}
      {metrics && showFooterStrip && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.06] text-xs">
          {/* Max Peak */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            title={`Máximo del periodo (ATH): ${fmt.currency(metrics.maxPoint.value)}`}
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            title={`Mínimo del periodo: ${fmt.currency(metrics.minPoint.value)}`}
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            title={metrics.drawdownPct >= -0.05 ? 'En máximos' : `Distancia al pico: ${metrics.drawdownPct.toFixed(2)}%`}
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
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

export function PerformanceChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div style={{ height }} className="w-full flex flex-col justify-between p-4 animate-pulse">
      <div className="flex-1 w-full flex items-end gap-1.5 pb-3 border-b border-slate-200/50 dark:border-white/[0.05]">
        <div className="w-full h-full rounded-xl bg-slate-200/50 dark:bg-white/[0.04] relative overflow-hidden flex items-end">
          <div className="w-full h-1/2 bg-gradient-to-t from-slate-200/80 dark:from-white/[0.08] to-transparent rounded-b-xl" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2 px-1">
        <div className="w-12 h-2.5 bg-slate-200/60 dark:bg-white/[0.04] rounded" />
        <div className="w-12 h-2.5 bg-slate-200/60 dark:bg-white/[0.04] rounded" />
        <div className="w-12 h-2.5 bg-slate-200/60 dark:bg-white/[0.04] rounded" />
        <div className="w-12 h-2.5 bg-slate-200/60 dark:bg-white/[0.04] rounded" />
        <div className="w-12 h-2.5 bg-slate-200/60 dark:bg-white/[0.04] rounded" />
      </div>
    </div>
  )
}
