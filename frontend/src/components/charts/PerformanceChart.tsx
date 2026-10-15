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
import { isNativePlatform } from '@/api/config'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  Flame,
} from 'lucide-react'
import { triggerChartAnimation } from '@/lib/chartAnimation'

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
    topColorDark: 'rgba(59, 130, 246, 0.32)',
    topColorLight: 'rgba(37, 99, 235, 0.22)',
    bottomColorDark: 'rgba(59, 130, 246, 0.00)',
    bottomColorLight: 'rgba(37, 99, 235, 0.00)',
    textColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeBorder: 'border-blue-500/30',
  },
  bbva: {
    id: 'bbva',
    label: 'BBVA',
    color: '#10b981', // emerald
    topColorDark: 'rgba(16, 185, 129, 0.32)',
    topColorLight: 'rgba(16, 185, 129, 0.22)',
    bottomColorDark: 'rgba(16, 185, 129, 0.00)',
    bottomColorLight: 'rgba(16, 185, 129, 0.00)',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/30',
  },
  indexa: {
    id: 'indexa',
    label: 'Indexa Capital',
    color: '#f59e0b', // amber
    topColorDark: 'rgba(245, 158, 11, 0.32)',
    topColorLight: 'rgba(245, 158, 11, 0.22)',
    bottomColorDark: 'rgba(245, 158, 11, 0.00)',
    bottomColorLight: 'rgba(245, 158, 11, 0.00)',
    textColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeBorder: 'border-amber-500/30',
  },
  kutxabank: {
    id: 'kutxabank',
    label: 'Kutxabank',
    color: '#f43f5e', // rose
    topColorDark: 'rgba(244, 63, 94, 0.32)',
    topColorLight: 'rgba(244, 63, 94, 0.22)',
    bottomColorDark: 'rgba(244, 63, 94, 0.00)',
    bottomColorLight: 'rgba(244, 63, 94, 0.00)',
    textColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeBorder: 'border-rose-500/30',
  },
  traderepublic: {
    id: 'traderepublic',
    label: 'Trade Republic',
    color: '#8b5cf6', // violet
    topColorDark: 'rgba(139, 92, 246, 0.32)',
    topColorLight: 'rgba(139, 92, 246, 0.22)',
    bottomColorDark: 'rgba(139, 92, 246, 0.00)',
    bottomColorLight: 'rgba(139, 92, 246, 0.00)',
    textColor: 'text-violet-600 dark:text-violet-400',
    badgeBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    badgeBorder: 'border-violet-500/30',
  },
  scalable: {
    id: 'scalable',
    label: 'Scalable Capital',
    color: '#06b6d4', // cyan
    topColorDark: 'rgba(6, 182, 212, 0.32)',
    topColorLight: 'rgba(6, 182, 212, 0.22)',
    bottomColorDark: 'rgba(6, 182, 212, 0.00)',
    bottomColorLight: 'rgba(6, 182, 212, 0.00)',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    badgeBorder: 'border-cyan-500/30',
  },
}

// Canonical stacking order from bottom to top
const CANONICAL_ORDER = ['indexa', 'bbva', 'kutxabank', 'traderepublic', 'scalable', 'myinvestor']

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
  showMilestones = false,
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
  const entityPriceLinesRef = useRef<IPriceLine[]>([])

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

  const dataRef = useRef<PricePoint[]>(data)
  dataRef.current = data

  // All detected entities are always stacked automatically
  const activeStackList = availableBrokers

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
          vertLines: { color: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.025)', style: LineStyle.Dotted },
          horzLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.035)', style: LineStyle.Dotted },
        },
        crosshair: {
          vertLine: {
            color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
            labelBackgroundColor: isDark ? '#1e293b' : '#0f172a',
            width: 1,
            style: LineStyle.Dashed,
          },
          horzLine: {
            color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
            labelBackgroundColor: isDark ? '#1e293b' : '#0f172a',
            width: 1,
            style: LineStyle.Dashed,
          },
        },
        rightPriceScale: {
          visible: !isNativePlatform(),
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          scaleMargins: { top: 0.12, bottom: 0.08 },
        },
        timeScale: {
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: true,
        handleScale: true,
      })

      // 1. Slot 2: Top Layer AreaSeries (Added FIRST, drawn in background)
      const slot2 = chart.addSeries(AreaSeries, {
        lineColor: '#10b981',
        topColor: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.18)',
        bottomColor: 'rgba(16, 185, 129, 0.00)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true, // Only Top layer shows badge on right axis
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: '#10b981',
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
        topColor: isDark ? 'rgba(16, 185, 129, 0.32)' : 'rgba(16, 185, 129, 0.22)',
        bottomColor: 'rgba(16, 185, 129, 0.00)',
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
        topColor: isDark ? 'rgba(245, 158, 11, 0.32)' : 'rgba(245, 158, 11, 0.22)',
        bottomColor: 'rgba(245, 158, 11, 0.00)',
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
        color: isDark ? '#818cf8' : '#6366f1',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true, // Visible on right axis
        crosshairMarkerRadius: 3.5,
        crosshairMarkerBackgroundColor: isDark ? '#818cf8' : '#6366f1',
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
      entityPriceLinesRef.current = []
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

        // Clean up entity price lines before re-creating
        if (entityPriceLinesRef.current.length > 0 && slot2) {
          entityPriceLinesRef.current.forEach(pl => {
            try {
              slot2.removePriceLine(pl)
            } catch {}
          })
          entityPriceLinesRef.current = []
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
            autoscaleInfoProvider: (original: any) => {
              const res = original()
              if (!res) return null
              return {
                priceRange: {
                  minValue: 0,
                  maxValue: res.priceRange.maxValue,
                },
                margins: res.margins,
              }
            },
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
            autoscaleInfoProvider: (original: any) => {
              const res = original()
              if (!res) return null
              return {
                priceRange: {
                  minValue: 0,
                  maxValue: res.priceRange.maxValue,
                },
                margins: res.margins,
              }
            },
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
            autoscaleInfoProvider: (original: any) => {
              const res = original()
              if (!res) return null
              return {
                priceRange: {
                  minValue: 0,
                  maxValue: res.priceRange.maxValue,
                },
                margins: res.margins,
              }
            },
          })
        } else {
          slot0.applyOptions({ visible: false })
          slot1.applyOptions({ visible: false })

          const isProfitable = (metrics.periodProfit ?? 0) >= 0
          const mainLineColor = isProfitable
            ? (isDark ? '#10b981' : '#059669')
            : (isDark ? '#f43f5e' : '#e11d48')
          const mainTopColor = isProfitable
            ? (isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.18)')
            : (isDark ? 'rgba(244, 63, 94, 0.28)' : 'rgba(244, 63, 94, 0.18)')
          const mainBottomColor = isProfitable
            ? 'rgba(16, 185, 129, 0.00)'
            : 'rgba(244, 63, 94, 0.00)'

          const pts2 = metrics.sumPoints.map(p => ({ time: p.date, value: p.value }))
          slot2.setData(pts2)
          slot2.applyOptions({
            visible: true,
            lineColor: mainLineColor,
            topColor: mainTopColor,
            bottomColor: mainBottomColor,
            lineWidth: 2,
            crosshairMarkerBackgroundColor: mainLineColor,
            lastValueVisible: true,
            autoscaleInfoProvider: (original: any) => {
              const res = original()
              if (!res) return null
              return {
                priceRange: {
                  minValue: 0,
                  maxValue: res.priceRange.maxValue,
                },
                margins: res.margins,
              }
            },
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

        // Colored Entity Partial Value Badges on Y-Axis
        const latestPoint = data && data.length > 0 ? data[data.length - 1] : null
        if (latestPoint?.brokers && slot2 && n > 1) {
          const newPriceLines: IPriceLine[] = []
          activeStackList.forEach(b => {
            const bVal = latestPoint.brokers?.[b]?.value ?? 0
            if (bVal > 0) {
              const cfg = ENTITY_CONFIGS[b] || {
                color: '#64748b',
                label: b,
              }
              try {
                const pl = slot2.createPriceLine({
                  price: bVal,
                  color: cfg.color,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dotted,
                  lineVisible: false,
                  axisLabelVisible: true,
                  axisLabelColor: cfg.color,
                  axisLabelTextColor: '#ffffff',
                  title: '',
                })
                newPriceLines.push(pl)
              } catch (e) {
                console.warn('Error creating entity price line', e)
              }
            }
          })
          entityPriceLinesRef.current = newPriceLines
        }
      } else {
        // Percent Mode
        slot0.applyOptions({ visible: false })
        slot1.applyOptions({ visible: false })

        // Clean up entity price lines in percent mode
        if (entityPriceLinesRef.current.length > 0 && slot2) {
          entityPriceLinesRef.current.forEach(pl => {
            try {
              slot2.removePriceLine(pl)
            } catch {}
          })
          entityPriceLinesRef.current = []
        }

        const baseVal = metrics.first.value
        const baseInv = metrics.first.invested

        const pctPoints = metrics.sumPoints.map(p => {
          const inflow = p.invested - baseInv
          const profit = (p.value - baseVal) - inflow
          const pct = baseVal > 0 ? (profit / baseVal) * 100 : 0
          return { time: p.date, value: Number(pct.toFixed(2)) }
        })

        const isPositive = (metrics.periodReturnPct ?? 0) >= 0
        const mainColor = isPositive ? (isDark ? '#10b981' : '#059669') : (isDark ? '#f43f5e' : '#e11d48')
        const topGrad = isPositive
          ? (isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.18)')
          : (isDark ? 'rgba(244, 63, 94, 0.28)' : 'rgba(244, 63, 94, 0.18)')
        const bottomGrad = isPositive ? 'rgba(16, 185, 129, 0.00)' : 'rgba(244, 63, 94, 0.00)'

        slot2.setData(pctPoints)
        slot2.applyOptions({
          visible: true,
          lineColor: mainColor,
          topColor: topGrad,
          bottomColor: bottomGrad,
          lineWidth: 2,
          crosshairMarkerBackgroundColor: mainColor,
          lastValueVisible: true,
          autoscaleInfoProvider: undefined,
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
      triggerChartAnimation(containerRef.current, 1400)
    } catch (err) {
      console.warn('Error updating chart series:', err)
    }
  }, [data, chartMode, showInvested, showMilestones, activeStackList, isDark, metrics])

  return (
    <div data-private className="w-full flex flex-col justify-between select-none space-y-2">
      {/* Dynamic HUD Bar with Inlined Entity Selectors (Desktop only) */}
      {!isNativePlatform() && (
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50/90 dark:bg-[#181818] border border-slate-200/80 dark:border-white/[0.08] text-xs">
          {/* Left: Patrimonio & Aportado */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-2 h-2 rounded-full ring-2 shrink-0 transition-colors",
                (activeSelectedMetrics?.diff ?? 0) >= 0
                  ? "bg-emerald-500 ring-emerald-500/25"
                  : "bg-rose-500 ring-rose-500/25"
              )} />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Patrimonio:</span>
              <span data-private className="font-mono font-bold text-slate-950 dark:text-white text-xs sm:text-sm">
                {chartMode === 'currency'
                  ? fmt.currency(activeSelectedMetrics?.val)
                  : `${(activeSelectedMetrics?.periodPct ?? 0) >= 0 ? '+' : ''}${(activeSelectedMetrics?.periodPct ?? 0).toFixed(2)}%`}
              </span>
            </div>

            {showInvested && chartMode === 'currency' && activeSelectedMetrics?.inv !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-t-2 border-dashed border-indigo-500 dark:border-indigo-400 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Aportado:</span>
                <span data-private className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                  {fmt.currency(activeSelectedMetrics.inv)}
                </span>
              </div>
            )}
          </div>

          {/* Right: Beneficio & Fecha */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            {activeSelectedMetrics && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Beneficio:</span>
                <span
                  data-private
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
      )}

      {/* Native / Mobile: Leyenda con los datos (ej: 78.831 €) encima del gráfico pero a la derecha */}
      {activeSelectedMetrics && (
        <div
          data-private
          className={cn(
            "w-full items-center justify-end gap-2 px-1 py-1 text-xs select-none",
            isNativePlatform() ? "flex" : "flex sm:hidden"
          )}
        >
          <div className="flex items-center gap-1.5 font-mono">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
              (activeSelectedMetrics?.diff ?? 0) >= 0 ? "bg-emerald-500" : "bg-rose-500"
            )} />
            <span data-private className="font-extrabold text-slate-950 dark:text-white text-xs sm:text-sm">
              {chartMode === 'currency'
                ? fmt.currency(activeSelectedMetrics.val)
                : `${(activeSelectedMetrics?.periodPct ?? 0) >= 0 ? '+' : ''}${(activeSelectedMetrics?.periodPct ?? 0).toFixed(2)}%`}
            </span>
          </div>

          <span
            data-private
            className={cn(
              'font-mono font-bold px-1.5 py-0.5 rounded text-[10.5px]',
              activeSelectedMetrics.diff >= 0
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20'
            )}
          >
            {activeSelectedMetrics.diff >= 0 ? '+' : ''}{fmt.currency(activeSelectedMetrics.diff)} ({fmt.pct(activeSelectedMetrics.pct)})
          </span>

          {activePoint?.date && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
              {formatDateSpanish(activePoint.date)}
            </span>
          )}
        </div>
      )}

      {/* Canvas Container */}
      <div data-private ref={containerRef} style={{ height }} className="w-full relative rounded-lg overflow-hidden">
        {/* Floating Small In-Chart Legend */}
        {availableBrokers.length > 1 && (
          <div className="absolute top-2 left-2.5 z-10 pointer-events-none flex items-center gap-2.5 px-2 py-0.5 rounded-md bg-white/80 dark:bg-[#181818]/80 border border-slate-200/60 dark:border-white/[0.08] backdrop-blur-xs text-[10px] text-slate-600 dark:text-slate-300 font-medium shadow-2xs">
            {availableBrokers.map((b) => {
              const cfg = ENTITY_CONFIGS[b] || { label: b, color: '#64748b' }
              return (
                <div key={b} className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className="font-semibold">{cfg.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Floating In-Chart Y-Axis Scale on the LEFT (Native app) */}
        {isNativePlatform() && metrics && (
          <div className="absolute left-2 top-2.5 bottom-7 pointer-events-none flex flex-col justify-between items-start z-10 text-[9.5px] font-mono select-none">
            <span className="px-1.5 py-0.5 rounded bg-white/75 dark:bg-[#181818]/80 border border-slate-200/70 dark:border-white/10 backdrop-blur-xs text-slate-700 dark:text-slate-300 font-bold shadow-2xs leading-none">
              {chartMode === 'currency'
                ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(metrics.maxPoint.value)
                : `${(metrics.periodReturnPct || 0) >= 0 ? '+' : ''}${(metrics.periodReturnPct || 0).toFixed(1)}%`}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-[#181818]/60 border border-slate-200/40 dark:border-white/5 backdrop-blur-xs text-slate-500 dark:text-slate-400 font-medium leading-none">
              {chartMode === 'currency'
                ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format((metrics.maxPoint.value + metrics.minPoint.value) / 2)
                : '0.0%'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white/75 dark:bg-[#181818]/80 border border-slate-200/70 dark:border-white/10 backdrop-blur-xs text-slate-700 dark:text-slate-300 font-bold shadow-2xs leading-none">
              {chartMode === 'currency'
                ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(metrics.minPoint.value)
                : `${(metrics.periodReturnPct || 0) < 0 ? (metrics.periodReturnPct || 0).toFixed(1) : '0.0'}%`}
            </span>
          </div>
        )}
      </div>

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
              <span data-private className="font-mono font-extrabold text-slate-950 dark:text-white text-xs truncate">
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
              <span data-private className="font-mono font-extrabold text-slate-950 dark:text-white text-xs truncate">
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
                data-private
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
                data-private
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

export function PerformanceChartSkeleton({
  height = 260,
  showFooterStrip = false,
}: {
  height?: number
  showFooterStrip?: boolean
}) {
  return (
    <div style={{ height }} className="w-full flex flex-col justify-between py-1 select-none relative overflow-hidden animate-pulse">
      {/* Top HUD Skeleton */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-white/20" />
            <div className="w-16 h-3 rounded bg-slate-200/70 dark:bg-white/[0.08]" />
            <div className="w-20 h-4 rounded bg-slate-200/90 dark:bg-white/[0.12]" />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 dark:border-white/[0.08] pl-3">
            <div className="w-14 h-3 rounded bg-slate-200/70 dark:bg-white/[0.08]" />
            <div className="w-16 h-4 rounded bg-slate-200/90 dark:bg-white/[0.12]" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-5 rounded-lg bg-slate-200/70 dark:bg-white/[0.08]" />
          <div className="w-20 h-4 rounded bg-slate-200/70 dark:bg-white/[0.08]" />
        </div>
      </div>

      {/* Clean Plot Area Skeleton (Authentic loading box with dashed reference lines, NO fake curves) */}
      <div className="flex-1 w-full relative my-2 rounded-xl overflow-hidden bg-slate-100/40 dark:bg-white/[0.015] border border-slate-200/40 dark:border-white/[0.04] flex flex-col justify-between p-4">
        <div className="w-full border-b border-dashed border-slate-200/60 dark:border-white/[0.04]" />
        <div className="w-full border-b border-dashed border-slate-200/60 dark:border-white/[0.04]" />
        <div className="w-full border-b border-dashed border-slate-200/60 dark:border-white/[0.04]" />
        <div className="w-full flex justify-between pt-1">
          <div className="w-10 h-2 rounded bg-slate-200/50 dark:bg-white/[0.04]" />
          <div className="w-10 h-2 rounded bg-slate-200/50 dark:bg-white/[0.04]" />
          <div className="w-10 h-2 rounded bg-slate-200/50 dark:bg-white/[0.04]" />
          <div className="w-10 h-2 rounded bg-slate-200/50 dark:bg-white/[0.04]" />
        </div>
      </div>

      {/* Bottom Milestones Strip Skeleton (optional) */}
      {showFooterStrip && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.025] border border-slate-200/60 dark:border-white/[0.05]">
              <div className="w-5 h-5 rounded-lg bg-slate-200/80 dark:bg-white/[0.08]" />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="w-8 h-2 rounded bg-slate-200/60 dark:bg-white/[0.06]" />
                <div className="w-14 h-3 rounded bg-slate-200/80 dark:bg-white/[0.08]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
