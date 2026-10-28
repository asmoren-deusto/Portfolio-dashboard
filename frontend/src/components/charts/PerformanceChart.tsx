import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
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
import { triggerChartAnimation, prepareChartForAnimation } from '@/lib/chartAnimation'

export type ChartMode = 'currency' | 'percent'
export type PerformanceViewMode = 'total' | 'broker' | 'asset_class'

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
    topColorDark: 'rgba(59, 130, 246, 0.40)',
    topColorLight: 'rgba(37, 99, 235, 0.30)',
    bottomColorDark: 'rgba(59, 130, 246, 0.05)',
    bottomColorLight: 'rgba(37, 99, 235, 0.05)',
    textColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeBorder: 'border-blue-500/30',
  },
  indexa: {
    id: 'indexa',
    label: 'Indexa Capital',
    color: '#f59e0b', // amber
    topColorDark: 'rgba(245, 158, 11, 0.40)',
    topColorLight: 'rgba(245, 158, 11, 0.30)',
    bottomColorDark: 'rgba(245, 158, 11, 0.05)',
    bottomColorLight: 'rgba(245, 158, 11, 0.05)',
    textColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeBorder: 'border-amber-500/30',
  },
  traderepublic: {
    id: 'traderepublic',
    label: 'Trade Republic',
    color: '#8b5cf6', // violet
    topColorDark: 'rgba(139, 92, 246, 0.40)',
    topColorLight: 'rgba(139, 92, 246, 0.30)',
    bottomColorDark: 'rgba(139, 92, 246, 0.05)',
    bottomColorLight: 'rgba(139, 92, 246, 0.05)',
    textColor: 'text-violet-600 dark:text-violet-400',
    badgeBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    badgeBorder: 'border-violet-500/30',
  },
  bbva: {
    id: 'bbva',
    label: 'BBVA',
    color: '#10b981', // emerald
    topColorDark: 'rgba(16, 185, 129, 0.40)',
    topColorLight: 'rgba(16, 185, 129, 0.30)',
    bottomColorDark: 'rgba(16, 185, 129, 0.05)',
    bottomColorLight: 'rgba(16, 185, 129, 0.05)',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/30',
  },
  kutxabank: {
    id: 'kutxabank',
    label: 'Kutxabank',
    color: '#f43f5e', // rose
    topColorDark: 'rgba(244, 63, 94, 0.40)',
    topColorLight: 'rgba(244, 63, 94, 0.30)',
    bottomColorDark: 'rgba(244, 63, 94, 0.05)',
    bottomColorLight: 'rgba(244, 63, 94, 0.05)',
    textColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeBorder: 'border-rose-500/30',
  },
  scalable: {
    id: 'scalable',
    label: 'Scalable Capital',
    color: '#06b6d4', // cyan
    topColorDark: 'rgba(6, 182, 212, 0.40)',
    topColorLight: 'rgba(6, 182, 212, 0.30)',
    bottomColorDark: 'rgba(6, 182, 212, 0.05)',
    bottomColorLight: 'rgba(6, 182, 212, 0.05)',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    badgeBorder: 'border-cyan-500/30',
  },
}

export interface AssetClassConfig {
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

export const ASSET_CLASS_CONFIGS: Record<string, AssetClassConfig> = {
  equity: {
    id: 'equity',
    label: 'Renta Variable',
    color: '#3b82f6', // blue
    topColorDark: 'rgba(59, 130, 246, 0.42)',
    topColorLight: 'rgba(37, 99, 235, 0.32)',
    bottomColorDark: 'rgba(59, 130, 246, 0.05)',
    bottomColorLight: 'rgba(37, 99, 235, 0.05)',
    textColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeBorder: 'border-blue-500/30',
  },
  fixed_income: {
    id: 'fixed_income',
    label: 'Renta Fija / Bonos',
    color: '#10b981', // emerald
    topColorDark: 'rgba(16, 185, 129, 0.42)',
    topColorLight: 'rgba(16, 185, 129, 0.32)',
    bottomColorDark: 'rgba(16, 185, 129, 0.05)',
    bottomColorLight: 'rgba(16, 185, 129, 0.05)',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/30',
  },
  commodity: {
    id: 'commodity',
    label: 'Oro / Materias Primas',
    color: '#f59e0b', // amber
    topColorDark: 'rgba(245, 158, 11, 0.42)',
    topColorLight: 'rgba(245, 158, 11, 0.32)',
    bottomColorDark: 'rgba(245, 158, 11, 0.05)',
    bottomColorLight: 'rgba(245, 158, 11, 0.05)',
    textColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeBorder: 'border-amber-500/30',
  },
  cash: {
    id: 'cash',
    label: 'Efectivo / Traspaso',
    color: '#06b6d4', // cyan
    topColorDark: 'rgba(6, 182, 212, 0.42)',
    topColorLight: 'rgba(6, 182, 212, 0.32)',
    bottomColorDark: 'rgba(6, 182, 212, 0.05)',
    bottomColorLight: 'rgba(6, 182, 212, 0.05)',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    badgeBorder: 'border-cyan-500/30',
  },
}

interface PerformanceChartProps {
  data: PricePoint[]
  height?: number
  chartMode?: ChartMode
  showInvested?: boolean
  showMilestones?: boolean
  showFooterStrip?: boolean
  viewMode?: PerformanceViewMode
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
  viewMode = 'total',
}: PerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  // Maximum 5 stacked layer slots for area breakdown
  // Layer slots are added to chart in order (0 to 4)
  const layerSlotsRef = useRef<any[]>([])
  const masterAreaRef = useRef<any>(null)
  const masterLineRef = useRef<any>(null)
  const investedSeriesRef = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const zeroPriceLineRef = useRef<IPriceLine | null>(null)
  const lastControlKeyRef = useRef<string>('')
  const lastSweepKeyRef = useRef<string>('')
  const animEndTimeRef = useRef<number>(0)

  const { theme } = useAppStore()
  const isDark = theme === 'dark'
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const { selectedBroker, period, refreshAnimKey } = useAppStore()

  // Helper to safely extract broker value and invested
  const getBrokerData = (p: PricePoint | null | undefined, brokerKey: string) => {
    if (!p || !p.brokers) return { value: 0, invested: 0 }
    const normKey = brokerKey.toLowerCase().replace(/[^a-z0-9]/g, '')
    const entry = p.brokers[brokerKey] ||
      Object.entries(p.brokers).find(([k]) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normKey)?.[1]
    return {
      value: entry?.value ?? 0,
      invested: entry?.invested ?? 0,
    }
  }

  // Helper to safely extract asset class value and invested
  const getAssetClassData = (p: PricePoint | null | undefined, acKey: string) => {
    if (!p || !p.asset_classes) return { value: 0, invested: 0 }
    const entry = p.asset_classes[acKey]
    return {
      value: entry?.value ?? 0,
      invested: entry?.invested ?? 0,
    }
  }

  // Dynamically detect active brokers sorted by current value descending (highest at base: MyInvestor -> Indexa -> Trade Republic)
  const availableBrokers = useMemo(() => {
    if (!data || !data.length) return []
    const found = new Set<string>()
    for (const p of data) {
      if (p.brokers) {
        for (const [k, v] of Object.entries(p.brokers)) {
          if (v && v.value > 0.01) {
            found.add(k.toLowerCase())
          }
        }
      }
    }
    const lastPoint = data[data.length - 1]
    const list = Array.from(found)
    list.sort((a, b) => {
      const valA = getBrokerData(lastPoint, a).value
      const valB = getBrokerData(lastPoint, b).value
      return valB - valA
    })
    return list
  }, [data])

  // Dynamically detect active asset classes sorted by current value descending (highest at base: Equity -> Fixed Income -> Commodity -> Cash)
  const availableAssetClasses = useMemo(() => {
    if (!data || !data.length) return []
    const found = new Set<string>()
    for (const p of data) {
      if (p.asset_classes) {
        for (const [k, v] of Object.entries(p.asset_classes)) {
          if (v && v.value > 0.01) {
            found.add(k)
          }
        }
      }
    }
    const lastPoint = data[data.length - 1]
    const list = Array.from(found)
    list.sort((a, b) => {
      const valA = getAssetClassData(lastPoint, a).value
      const valB = getAssetClassData(lastPoint, b).value
      return valB - valA
    })
    return list
  }, [data])

  const dataRef = useRef<PricePoint[]>(data)
  dataRef.current = data
  const dataMapRef = useRef<Map<string, PricePoint>>(new Map())
  useEffect(() => {
    const map = new Map<string, PricePoint>()
    for (const p of data || []) {
      if (p && p.date) {
        map.set(p.date, p)
        if (p.date.length > 10) {
          map.set(p.date.slice(0, 10), p)
        }
      }
    }
    dataMapRef.current = map
  }, [data])

  // Metrics computation for selected sum or single entity
  const metrics = useMemo(() => {
    if (!data || data.length === 0) return null

    const valid = data.filter(p => p && p.date).sort((a, b) => a.date.localeCompare(b.date))
    if (!valid.length) return null

    const sumPoints: { date: string; value: number; invested: number }[] = []
    const seen = new Set<string>()

    const isSingleBroker = selectedBroker !== 'all'
    const singleBrokerKey = selectedBroker.toLowerCase()

    for (const p of valid) {
      if (!seen.has(p.date)) {
        seen.add(p.date)
        let val = 0
        let inv = 0

        if (isSingleBroker) {
          const bd = getBrokerData(p, singleBrokerKey)
          val = bd.value > 0 ? bd.value : (p.value ?? 0)
          inv = bd.invested > 0 ? bd.invested : (p.invested ?? 0)
        } else {
          val = p.value
          inv = p.invested ?? 0
        }

        sumPoints.push({ date: p.date, value: Math.max(0, val), invested: Math.max(0, inv) })
      }
    }

    if (!sumPoints.length) return null

    if (sumPoints.length === 1) {
      const single = sumPoints[0]
      try {
        const d = new Date(single.date + 'T00:00:00')
        d.setDate(d.getDate() - 1)
        const prevDate = d.toISOString().slice(0, 10)
        sumPoints.unshift({ date: prevDate, value: 0, invested: 0 })
      } catch {
        sumPoints.unshift({ date: '2026-10-25', value: 0, invested: 0 })
      }
    }

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
    const capitalBase = first.value + Math.max(0, periodInflow) * 0.5
    const periodReturnPct = capitalBase > 0 ? (periodProfit / capitalBase) * 100 : 0

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
  }, [data, selectedBroker])

  // Active point (crosshair hover or latest)
  const activePoint = hoveredPoint || (data.length ? data[data.length - 1] : null)

  const activeSelectedMetrics = useMemo(() => {
    if (!activePoint) return null

    let val = 0
    let inv = 0

    if (selectedBroker !== 'all') {
      const bd = getBrokerData(activePoint, selectedBroker.toLowerCase())
      val = bd.value
      inv = bd.invested
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
      const capitalBase = metrics.first.value + Math.max(0, inflow) * 0.5
      periodPct = capitalBase > 0 ? (profit / capitalBase) * 100 : 0
    }

    return { val, inv, diff, pct, periodPct }
  }, [activePoint, selectedBroker, metrics])

  interface PointBadge {
    id: string
    label: string
    color: string
    y: number
    val?: number
    pct?: number
  }

  // Small tooltips / badges to the left of crosshair dots
  const adjustedBadges = useMemo<PointBadge[]>(() => {
    if (!hoveredPoint || !tooltipPos || !chartRef.current) return []
    const badges: PointBadge[] = []

    const hp = hoveredPoint as PricePoint
    const orig = (data || []).find((p) => p.date === hp.date) || hp

    if (chartMode === 'currency') {
      if (selectedBroker === 'all') {
        if (viewMode === 'broker' && availableBrokers.length > 1) {
          // Badges for each broker at its cumulative boundary
          let runningCumul = 0
          for (let i = 0; i < availableBrokers.length; i++) {
            const b = availableBrokers[i]
            const bVal = getBrokerData(orig, b).value
            runningCumul += bVal
            const cfg = ENTITY_CONFIGS[b] || { label: b, color: '#3b82f6' }
            const y = masterAreaRef.current?.priceToCoordinate(runningCumul)
            if (bVal > 0.01 && y !== null && y !== undefined && !isNaN(y) && y >= 0 && y <= height) {
              const weightPct = hp.value > 0 ? (bVal / hp.value) * 100 : 0
              badges.push({ id: b, label: cfg.label, color: cfg.color, y, val: bVal, pct: weightPct })
            }
          }
        } else if (viewMode === 'asset_class' && availableAssetClasses.length > 1) {
          // Badges for each asset class at its cumulative boundary
          let runningCumul = 0
          for (let i = 0; i < availableAssetClasses.length; i++) {
            const ac = availableAssetClasses[i]
            const acVal = getAssetClassData(orig, ac).value
            runningCumul += acVal
            const cfg = ASSET_CLASS_CONFIGS[ac] || { label: ac, color: '#3b82f6' }
            const y = masterAreaRef.current?.priceToCoordinate(runningCumul)
            if (acVal > 0.01 && y !== null && y !== undefined && !isNaN(y) && y >= 0 && y <= height) {
              const weightPct = hp.value > 0 ? (acVal / hp.value) * 100 : 0
              badges.push({ id: ac, label: cfg.label, color: cfg.color, y, val: acVal, pct: weightPct })
            }
          }
        } else {
          // Total mode: 1 single clean badge for Cartera Total
          const val = hp.value
          const y = masterAreaRef.current?.priceToCoordinate(val)
          if (y !== null && y !== undefined && !isNaN(y) && y >= 0 && y <= height) {
            badges.push({ id: 'total', label: 'Patrimonio Total', color: '#10b981', y, val })
          }
        }
      } else {
        // Single Broker
        const bKey = selectedBroker.toLowerCase()
        const cfg = ENTITY_CONFIGS[bKey] || { label: selectedBroker, color: '#10b981' }
        const val = getBrokerData(orig, bKey).value || hp.value
        const y = masterAreaRef.current?.priceToCoordinate(val)
        if (y !== null && y !== undefined && !isNaN(y) && y >= 0 && y <= height) {
          badges.push({ id: bKey, label: cfg.label, color: cfg.color, y, val })
        }
      }

      // Invested Series (Aportado)
      if (showInvested && investedSeriesRef.current) {
        const inv = hp.invested ?? 0
        const yInv = investedSeriesRef.current.priceToCoordinate(inv)
        if (yInv !== null && yInv !== undefined && !isNaN(yInv) && yInv >= 0 && yInv <= height) {
          badges.push({
            id: 'invested',
            label: 'Aportado',
            color: isDark ? '#818cf8' : '#6366f1',
            y: yInv,
            val: inv,
          })
        }
      }
    } else {
      // Percent Mode (%)
      const pct = activeSelectedMetrics?.pct ?? 0
      const y = masterAreaRef.current?.priceToCoordinate(pct)
      if (y !== null && y !== undefined && !isNaN(y) && y >= 0 && y <= height) {
        badges.push({ id: 'percent', label: 'Rentabilidad', color: '#10b981', y })
      }
    }

    if (badges.length <= 1) return badges

    // Anti-collision relaxation: sort ascending by y and ensure minimum gap of 22px
    const sorted = [...badges].sort((a, b) => a.y - b.y)
    const minGap = 22
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].y - sorted[i - 1].y < minGap) {
        sorted[i].y = sorted[i - 1].y + minGap
      }
    }
    return sorted
  }, [
    hoveredPoint,
    tooltipPos,
    chartMode,
    selectedBroker,
    viewMode,
    availableBrokers,
    availableAssetClasses,
    showInvested,
    height,
    isDark,
    data,
    activeSelectedMetrics,
  ])

  // Initialize Lightweight Charts
  const initChart = useCallback(() => {
    if (!containerRef.current) return null

    if (chartRef.current) {
      try {
        chartRef.current.remove()
      } catch {}
    }

    const containerWidth = Math.max(10, containerRef.current.clientWidth || 300)

    try {
      const chart = createChart(containerRef.current, {
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
            color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.25)',
            labelVisible: false,
            width: 1,
            style: LineStyle.Dashed,
          },
          horzLine: {
            visible: false,
            labelVisible: false,
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

      // Create 5 AreaSeries layer slots for stacked rendering
      // In Lightweight Charts, series added first are drawn in the background (higher cumulative values)
      // Series added later are drawn in front (lower cumulative values)
      const layers: any[] = []
      for (let i = 0; i < 5; i++) {
        const s = chart.addSeries(AreaSeries, {
          lineColor: '#3b82f6',
          topColor: 'rgba(59, 130, 246, 0.35)',
          bottomColor: 'rgba(59, 130, 246, 0.05)',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false, // Hidden on axis; master line shows total
          crosshairMarkerRadius: 4,
          crosshairMarkerBackgroundColor: '#3b82f6',
          crosshairMarkerBorderColor: '#ffffff',
          crosshairMarkerBorderWidth: 1.5,
          priceFormat: {
            type: 'custom',
            formatter: (p: number) => fmt.currency(p),
          },
        })
        layers.push(s)
      }
      layerSlotsRef.current = layers

      // Master Area Series (Used in 'total' mode and for auto-scaling reference)
      const masterArea = chart.addSeries(AreaSeries, {
        lineColor: '#10b981',
        topColor: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.18)',
        bottomColor: 'rgba(16, 185, 129, 0.00)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 5.5,
        crosshairMarkerBackgroundColor: '#10b981',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 2.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => fmt.currency(p),
        },
      })
      masterAreaRef.current = masterArea

      // Master Line Series (Draws a crisp master outline on top of stacked areas in 'broker' and 'asset_class' modes)
      const masterLine = chart.addSeries(LineSeries, {
        color: isDark ? '#ffffff' : '#0f172a',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: isDark ? '#ffffff' : '#0f172a',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => fmt.currency(p),
        },
      })
      masterLineRef.current = masterLine

      // Invested Series (Dashed Line) (Drawn on top of all area fills)
      const investedSeries = chart.addSeries(LineSeries, {
        color: isDark ? '#818cf8' : '#6366f1',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 3.5,
        crosshairMarkerBackgroundColor: isDark ? '#818cf8' : '#6366f1',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => fmt.currency(p),
        },
      })
      investedSeriesRef.current = investedSeries

      const markersPlugin = createSeriesMarkers(masterArea, [])
      markersRef.current = markersPlugin

      chartRef.current = chart

      // Crosshair inspection listener
      chart.subscribeCrosshairMove(param => {
        if (!param || !param.time || !dataRef.current || !param.point) {
          setHoveredPoint(null)
          setTooltipPos(null)
          return
        }
        let timeStr = ''
        if (typeof param.time === 'string') {
          timeStr = param.time
        } else if (typeof param.time === 'number') {
          const ms = param.time > 1e11 ? param.time : param.time * 1000
          timeStr = new Date(ms).toISOString().slice(0, 10)
        } else if (param.time && typeof param.time === 'object') {
          const t: any = param.time
          if (t.year) {
            timeStr = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
          }
        }

        const match =
          dataMapRef.current.get(timeStr) ||
          (dataRef.current || []).find(p => p.date === timeStr || p.date.startsWith(timeStr)) ||
          ((metrics?.sumPoints as any[]) || []).find(p => p.date === timeStr || p.date.startsWith(timeStr))

        if (match) {
          setHoveredPoint(match as PricePoint)
          setTooltipPos({ x: param.point.x, y: param.point.y })
        } else {
          setHoveredPoint(null)
          setTooltipPos(null)
        }
      })

      return chart
    } catch (err) {
      console.warn('Failed to initialize performance chart:', err)
      return null
    }
  }, [height, isDark])

  useEffect(() => {
    initChart()

    const ro = new ResizeObserver(entries => {
      if (!entries[0] || !chartRef.current) return
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
      ro.disconnect()
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch {}
      }
      chartRef.current = null
      layerSlotsRef.current = []
      masterAreaRef.current = null
      masterLineRef.current = null
      investedSeriesRef.current = null
      markersRef.current = null
      zeroPriceLineRef.current = null
    }
  }, [initChart])

  // Update Series Data on Changes (Supporting Modes A: Total, C: Broker, D: Asset Class)
  useEffect(() => {
    if (!containerRef.current || !data || !metrics) {
      return
    }

    if (!chartRef.current || !masterAreaRef.current) {
      initChart()
    }
    if (!masterAreaRef.current || !chartRef.current) {
      return
    }

    try {
      const chart = chartRef.current
      const layers = layerSlotsRef.current
      const masterArea = masterAreaRef.current
      const masterLine = masterLineRef.current
      const inv = investedSeriesRef.current

      const validDates = metrics.sumPoints.map(p => p.date)
      const isSingleBroker = selectedBroker !== 'all'

      if (chartMode === 'currency') {
        // Clean up zero line if was in percent mode
        if (zeroPriceLineRef.current) {
          try {
            masterArea.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          zeroPriceLineRef.current = null
        }

        if (!isSingleBroker && viewMode === 'broker' && availableBrokers.length > 1) {
          // ── Opción C: Desglose Apilado por Entidad / Broker ─────────────────────────
          masterArea.applyOptions({ visible: false, lastValueVisible: false })

          const n = Math.min(layers.length, availableBrokers.length)

          // Precompute cumulative values for each date
          // availableBrokers[0] is the base (e.g. MyInvestor)
          // availableBrokers[n-1] is the top (e.g. Trade Republic)
          const cumulValues: number[][] = validDates.map(d => {
            const orig = data.find(p => p.date === d)
            const row: number[] = []
            let running = 0
            for (let i = 0; i < n; i++) {
              const b = availableBrokers[i]
              const v = getBrokerData(orig, b).value
              running += v
              row.push(running)
            }
            return row
          })

          // Assign each layer slot:
          // In Lightweight Charts, layer 0 is drawn FIRST (background, largest cumulative)
          // layer n-1 is drawn LAST (front, lowest cumulative = base)
          for (let slotIdx = 0; slotIdx < layers.length; slotIdx++) {
            const layer = layers[slotIdx]
            if (slotIdx < n) {
              const catIdx = (n - 1) - slotIdx
              const bKey = availableBrokers[catIdx]
              const cfg = ENTITY_CONFIGS[bKey] || {
                color: '#3b82f6',
                topColorDark: 'rgba(59, 130, 246, 0.40)',
                topColorLight: 'rgba(37, 99, 235, 0.30)',
                bottomColorDark: 'rgba(59, 130, 246, 0.05)',
                bottomColorLight: 'rgba(37, 99, 235, 0.05)',
              }

              const pts = validDates.map((d, dIdx) => ({
                time: d,
                value: cumulValues[dIdx][catIdx] ?? 0,
              }))

              layer.setData(pts)
              layer.applyOptions({
                visible: true,
                lineColor: cfg.color,
                topColor: isDark ? cfg.topColorDark : cfg.topColorLight,
                bottomColor: isDark ? cfg.bottomColorDark : cfg.bottomColorLight,
                lastValueVisible: false,
                crosshairMarkerBackgroundColor: cfg.color,
              })
            } else {
              layer.applyOptions({ visible: false })
            }
          }

          // Master Line: Outline on top of the stacked areas at total wealth
          if (masterLine) {
            const masterPts = metrics.sumPoints.map(p => ({ time: p.date, value: p.value }))
            masterLine.setData(masterPts)
            masterLine.applyOptions({
              visible: true,
              color: isDark ? '#f8fafc' : '#1e293b',
              lineWidth: 2,
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
        } else if (!isSingleBroker && viewMode === 'asset_class' && availableAssetClasses.length > 1) {
          // ── Opción D: Desglose Apilado por Clase de Activo ──────────────────────────
          masterArea.applyOptions({ visible: false, lastValueVisible: false })

          const n = Math.min(layers.length, availableAssetClasses.length)

          // Precompute cumulative values for each date
          // availableAssetClasses[0] is the base (e.g. Equity / Renta Variable)
          // availableAssetClasses[n-1] is the top (e.g. Cash / Traspaso)
          const cumulValues: number[][] = validDates.map(d => {
            const orig = data.find(p => p.date === d)
            const row: number[] = []
            let running = 0
            for (let i = 0; i < n; i++) {
              const ac = availableAssetClasses[i]
              const v = getAssetClassData(orig, ac).value
              running += v
              row.push(running)
            }
            return row
          })

          for (let slotIdx = 0; slotIdx < layers.length; slotIdx++) {
            const layer = layers[slotIdx]
            if (slotIdx < n) {
              const catIdx = (n - 1) - slotIdx
              const acKey = availableAssetClasses[catIdx]
              const cfg = ASSET_CLASS_CONFIGS[acKey] || {
                color: '#3b82f6',
                topColorDark: 'rgba(59, 130, 246, 0.40)',
                topColorLight: 'rgba(37, 99, 235, 0.30)',
                bottomColorDark: 'rgba(59, 130, 246, 0.05)',
                bottomColorLight: 'rgba(37, 99, 235, 0.05)',
              }

              const pts = validDates.map((d, dIdx) => ({
                time: d,
                value: cumulValues[dIdx][catIdx] ?? 0,
              }))

              layer.setData(pts)
              layer.applyOptions({
                visible: true,
                lineColor: cfg.color,
                topColor: isDark ? cfg.topColorDark : cfg.topColorLight,
                bottomColor: isDark ? cfg.bottomColorDark : cfg.bottomColorLight,
                lastValueVisible: false,
                crosshairMarkerBackgroundColor: cfg.color,
              })
            } else {
              layer.applyOptions({ visible: false })
            }
          }

          if (masterLine) {
            const masterPts = metrics.sumPoints.map(p => ({ time: p.date, value: p.value }))
            masterLine.setData(masterPts)
            masterLine.applyOptions({
              visible: true,
              color: isDark ? '#f8fafc' : '#1e293b',
              lineWidth: 2,
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
        } else {
          // ── Opción A: Cartera Total Limpia (o Broker Individual) ───────────────────
          layers.forEach(layer => layer.applyOptions({ visible: false }))
          if (masterLine) {
            masterLine.applyOptions({ visible: false, lastValueVisible: false })
          }

          const isProfitable = (metrics.periodProfit ?? 0) >= 0
          const mainLineColor = isSingleBroker
            ? (ENTITY_CONFIGS[selectedBroker.toLowerCase()]?.color || '#3b82f6')
            : (isProfitable ? (isDark ? '#10b981' : '#059669') : (isDark ? '#f43f5e' : '#e11d48'))
          const mainTopColor = isSingleBroker
            ? (isDark ? 'rgba(59, 130, 246, 0.32)' : 'rgba(37, 99, 235, 0.22)')
            : (isProfitable
                ? (isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.18)')
                : (isDark ? 'rgba(244, 63, 94, 0.28)' : 'rgba(244, 63, 94, 0.18)'))
          const mainBottomColor = 'rgba(0, 0, 0, 0.00)'

          const pts = metrics.sumPoints.map(p => ({ time: p.date, value: p.value }))
          masterArea.setData(pts)
          masterArea.applyOptions({
            visible: true,
            lineColor: mainLineColor,
            topColor: mainTopColor,
            bottomColor: mainBottomColor,
            lineWidth: 2,
            crosshairMarkerBackgroundColor: mainLineColor,
            crosshairMarkerBorderColor: '#ffffff',
            crosshairMarkerBorderWidth: 2.5,
            crosshairMarkerRadius: 5.5,
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
      } else {
        // Percent Mode (%)
        layers.forEach(layer => layer.applyOptions({ visible: false }))
        if (masterLine) {
          masterLine.applyOptions({ visible: false, lastValueVisible: false })
        }

        const baseVal = metrics.first.value

        const pctPoints = metrics.sumPoints.map(p => {
          let pct = 0
          if (p.invested > 0) {
            pct = ((p.value - p.invested) / p.invested) * 100
          } else if (baseVal > 0) {
            pct = ((p.value - baseVal) / baseVal) * 100
          }
          return { time: p.date, value: Number(pct.toFixed(2)) }
        })

        const lastPct = pctPoints.length > 0 ? pctPoints[pctPoints.length - 1].value : (metrics.periodReturnPct ?? 0)
        const isPositive = lastPct >= 0
        const mainColor = isPositive ? (isDark ? '#10b981' : '#059669') : (isDark ? '#f43f5e' : '#e11d48')
        const topGrad = isPositive
          ? (isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.18)')
          : (isDark ? 'rgba(244, 63, 94, 0.28)' : 'rgba(244, 63, 94, 0.18)')
        const bottomGrad = 'rgba(0, 0, 0, 0.00)'

        masterArea.setData(pctPoints)
        masterArea.applyOptions({
          visible: true,
          lineColor: mainColor,
          topColor: topGrad,
          bottomColor: bottomGrad,
          lineWidth: 2,
          crosshairMarkerBackgroundColor: mainColor,
          crosshairMarkerBorderColor: '#ffffff',
          crosshairMarkerBorderWidth: 2.5,
          crosshairMarkerRadius: 5.5,
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
          zeroPriceLineRef.current = masterArea.createPriceLine({
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

      // Trigger timeline sweep animation on load & when viewMode, chartMode, period, or points change
      const controlKey = `${selectedBroker}_${viewMode}_${chartMode}_${period}_${refreshAnimKey}`
      const dataKey = `${metrics.sumPoints.length}_${metrics.sumPoints[0]?.value || 0}_${metrics.sumPoints[metrics.sumPoints.length - 1]?.value || 0}`
      const sweepKey = `${controlKey}_${dataKey}`

      if (metrics.sumPoints.length >= 2 && sweepKey !== lastSweepKeyRef.current) {
        const controlChanged = controlKey !== lastControlKeyRef.current
        const now = performance.now()
        const isCurrentlyAnimating = now < animEndTimeRef.current

        if (isCurrentlyAnimating && !controlChanged) {
          lastSweepKeyRef.current = sweepKey
          lastControlKeyRef.current = controlKey
        } else {
          lastSweepKeyRef.current = sweepKey
          lastControlKeyRef.current = controlKey
          animEndTimeRef.current = now + 1100

          const isProfitable = (metrics.periodProfit ?? 0) >= 0 || (metrics.last && metrics.last.value >= metrics.last.invested)
          const sweepAccentColor =
            isSingleBroker && ENTITY_CONFIGS[selectedBroker.toLowerCase()]
              ? ENTITY_CONFIGS[selectedBroker.toLowerCase()].color
              : (isProfitable ? (isDark ? '#34d399' : '#10b981') : (isDark ? '#fb7185' : '#f43f5e'))

          prepareChartForAnimation(containerRef.current, sweepAccentColor)
          requestAnimationFrame(() => {
            triggerChartAnimation(containerRef.current, 1100, sweepAccentColor)
          })
        }
      }
    } catch (err) {
      console.warn('Error updating chart series:', err)
    }
  }, [
    data,
    chartMode,
    showInvested,
    showMilestones,
    viewMode,
    selectedBroker,
    availableBrokers,
    availableAssetClasses,
    isDark,
    metrics,
    period,
    refreshAnimKey,
  ])

  return (
    <div
      data-private
      className="w-full flex flex-col justify-between flex-1 min-h-0 select-none relative"
    >
      {/* Canvas Container */}
      <div
        data-private
        ref={containerRef}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch') return
          if (!chartRef.current || !containerRef.current || !dataRef.current.length) return
          const rect = containerRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          if (x < 0 || x > rect.width || y < 0 || y > rect.height) return

          try {
            const time = chartRef.current.timeScale().coordinateToTime(x)
            if (time) {
              let timeStr = ''
              if (typeof time === 'string') {
                timeStr = time
              } else if (typeof time === 'number') {
                const ms = time > 1e11 ? time : time * 1000
                timeStr = new Date(ms).toISOString().slice(0, 10)
              } else if (typeof time === 'object' && (time as any).year) {
                const t: any = time
                timeStr = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
              }
              const match =
                (dataRef.current || []).find((p) => p.date === timeStr || p.date.startsWith(timeStr)) ||
                (((metrics?.sumPoints as any[]) || []).find((p) => p.date === timeStr || p.date.startsWith(timeStr)))
              if (match) {
                setHoveredPoint(match as PricePoint)
                setTooltipPos({ x, y })
              }
            }
          } catch {}
        }}
        onPointerLeave={() => {
          setHoveredPoint(null)
          setTooltipPos(null)
        }}
        onMouseLeave={() => {
          setHoveredPoint(null)
          setTooltipPos(null)
        }}
        style={{ height }}
        className="w-full relative rounded-lg overflow-hidden"
      >
        {/* Floating Mini Badges to the Left/Right of Crosshair Dots */}
        {hoveredPoint && tooltipPos && adjustedBadges.length > 0 && (
          <>
            {adjustedBadges.map((b) => {
              const clientW = containerRef.current?.clientWidth || 300
              const isMainOnRight = tooltipPos.x + 16 <= clientW - 195
              const isLeft = isMainOnRight ? tooltipPos.x >= 75 : tooltipPos.x < 75

              return (
                <div
                  key={b.id}
                  className={cn(
                    "pointer-events-none absolute z-35 flex items-center gap-1.5 px-2 py-0.5 rounded-md backdrop-blur-md shadow-md text-[10.5px] font-semibold tracking-tight select-none whitespace-nowrap border transition-transform duration-75",
                    isDark
                      ? "bg-[#181d28]/95 shadow-black/40 text-white"
                      : "bg-white/95 shadow-slate-900/10 text-slate-800"
                  )}
                  style={{
                    left: isLeft ? tooltipPos.x - 9 : tooltipPos.x + 9,
                    top: Math.max(12, Math.min(height - 12, b.y)),
                    transform: isLeft ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                    borderColor: `${b.color}${isDark ? '60' : '40'}`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: b.color }}
                  />
                  <span
                    className="font-bold leading-none"
                    style={{ color: b.color }}
                  >
                    {b.label}
                  </span>
                  {b.val !== undefined && b.val > 0 && chartMode === 'currency' && (
                    <span className="font-mono text-[9.5px] font-medium text-slate-500 dark:text-slate-400 leading-none pl-0.5">
                      {fmt.currency(b.val)}{b.pct !== undefined ? ` (${b.pct.toFixed(1)}%)` : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* Floating Balloon Tooltip */}
        {hoveredPoint && tooltipPos && (
          <div
            className="pointer-events-none absolute z-30 min-w-[190px] max-w-[260px] px-3.5 py-2.5 rounded-2xl bg-white/98 dark:bg-[#1a1f2b]/98 border border-slate-200/90 dark:border-white/10 shadow-2xl text-xs select-none"
            style={{
              left: Math.max(10, Math.min(
                (containerRef.current?.clientWidth || 300) - 200,
                tooltipPos.x + 16 > (containerRef.current?.clientWidth || 300) - 200
                  ? tooltipPos.x - 205
                  : tooltipPos.x + 16
              )),
              top: Math.max(10, Math.min(
                height - 140,
                tooltipPos.y - 45
              )),
            }}
          >
            {/* Date Header */}
            <div className="text-[11.5px] font-medium text-slate-400 dark:text-slate-400 mb-1.5 capitalize">
              {formatDateSpanish(hoveredPoint.date)}
            </div>

            {/* Metric Rows */}
            <div className="flex flex-col gap-1.5">
              {/* Total Value */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-300 font-medium text-[11.5px]">
                  {chartMode === 'currency'
                    ? (selectedBroker !== 'all' ? (ENTITY_CONFIGS[selectedBroker.toLowerCase()]?.label || selectedBroker) : 'Patrimonio')
                    : 'Rentabilidad'}
                </span>
                <span className={cn(
                  "font-mono font-bold text-[12.5px]",
                  chartMode === 'currency'
                    ? "text-slate-900 dark:text-white"
                    : ((activeSelectedMetrics?.pct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")
                )}>
                  {chartMode === 'currency'
                    ? fmt.currency(activeSelectedMetrics?.val)
                    : `${(activeSelectedMetrics?.pct ?? 0) >= 0 ? '+' : ''}${(activeSelectedMetrics?.pct ?? 0).toFixed(2)}%`}
                </span>
              </div>

              {/* Breakdown by Broker in Broker mode */}
              {selectedBroker === 'all' && viewMode === 'broker' && availableBrokers.length > 1 && chartMode === 'currency' && (
                <div className="flex flex-col gap-1 py-1 border-y border-slate-100 dark:border-white/[0.06] text-[10.5px]">
                  {availableBrokers.map((b) => {
                    const cfg = ENTITY_CONFIGS[b] || { label: b, color: '#3b82f6' }
                    const bVal = getBrokerData(hoveredPoint, b).value
                    const weightPct = (hoveredPoint.value ?? 0) > 0 ? (bVal / hoveredPoint.value) * 100 : 0
                    if (bVal <= 0.01) return null
                    return (
                      <div key={b} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                          <span className="truncate">{cfg.label}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                          {fmt.currency(bVal)} <span className="text-slate-400 text-[9.5px]">({weightPct.toFixed(1)}%)</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Breakdown by Asset Class in Asset Class mode */}
              {selectedBroker === 'all' && viewMode === 'asset_class' && availableAssetClasses.length > 1 && chartMode === 'currency' && (
                <div className="flex flex-col gap-1 py-1 border-y border-slate-100 dark:border-white/[0.06] text-[10.5px]">
                  {availableAssetClasses.map((ac) => {
                    const cfg = ASSET_CLASS_CONFIGS[ac] || { label: ac, color: '#3b82f6' }
                    const acVal = getAssetClassData(hoveredPoint, ac).value
                    const weightPct = (hoveredPoint.value ?? 0) > 0 ? (acVal / hoveredPoint.value) * 100 : 0
                    if (acVal <= 0.01) return null
                    return (
                      <div key={ac} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                          <span className="truncate">{cfg.label}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                          {fmt.currency(acVal)} <span className="text-slate-400 text-[9.5px]">({weightPct.toFixed(1)}%)</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Invertido */}
              {showInvested && chartMode === 'currency' && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium text-[11.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 shrink-0" />
                    Invertido
                  </span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[12.5px]">
                    {fmt.currency(activeSelectedMetrics?.inv)}
                  </span>
                </div>
              )}

              {/* Rendimiento / Ganancia */}
              {activeSelectedMetrics && (
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-white/[0.08] text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Rendimiento</span>
                  <span
                    className={cn(
                      'font-mono font-bold',
                      activeSelectedMetrics.diff >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {activeSelectedMetrics.diff >= 0 ? '+' : ''}{fmt.currency(activeSelectedMetrics.diff)} ({fmt.pct(activeSelectedMetrics.pct)})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating In-Chart Legend for Broker mode (Opción C) */}
        {selectedBroker === 'all' && viewMode === 'broker' && availableBrokers.length > 1 && (
          <div className="absolute top-2 left-2.5 z-10 pointer-events-none flex flex-wrap items-center gap-2.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#181818]/90 border border-slate-200/80 dark:border-white/[0.10] backdrop-blur-md text-[10.5px] text-slate-700 dark:text-slate-200 font-medium shadow-xs">
            {availableBrokers.map((b) => {
              const cfg = ENTITY_CONFIGS[b] || { label: b, color: '#3b82f6' }
              const bVal = activePoint ? getBrokerData(activePoint, b).value : 0
              const totalVal = activePoint ? activePoint.value : 0
              const weightPct = totalVal > 0 ? (bVal / totalVal) * 100 : 0
              if (bVal <= 0.01) return null
              return (
                <div key={b} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className="font-semibold">{cfg.label}</span>
                  {bVal > 0 && chartMode === 'currency' && (
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                      {fmt.currency(bVal)} <span className="text-slate-400 text-[9px] font-normal">({weightPct.toFixed(1)}%)</span>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Floating In-Chart Legend for Asset Class mode (Opción D) */}
        {selectedBroker === 'all' && viewMode === 'asset_class' && availableAssetClasses.length > 1 && (
          <div className="absolute top-2 left-2.5 z-10 pointer-events-none flex flex-wrap items-center gap-2.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#181818]/90 border border-slate-200/80 dark:border-white/[0.10] backdrop-blur-md text-[10.5px] text-slate-700 dark:text-slate-200 font-medium shadow-xs">
            {availableAssetClasses.map((ac) => {
              const cfg = ASSET_CLASS_CONFIGS[ac] || { label: ac, color: '#3b82f6' }
              const acVal = activePoint ? getAssetClassData(activePoint, ac).value : 0
              const totalVal = activePoint ? activePoint.value : 0
              const weightPct = totalVal > 0 ? (acVal / totalVal) * 100 : 0
              if (acVal <= 0.01) return null
              return (
                <div key={ac} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className="font-semibold">{cfg.label}</span>
                  {acVal > 0 && chartMode === 'currency' && (
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                      {fmt.currency(acVal)} <span className="text-slate-400 text-[9px] font-normal">({weightPct.toFixed(1)}%)</span>
                    </span>
                  )}
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

      {/* Bottom HUD Bar: Always Visible Metrics Strip */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0">
        {!isNativePlatform() && (
          <div className="hidden sm:flex items-center justify-between gap-2 px-3 py-1 rounded-xl bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] text-xs h-[32px] sm:h-[34px] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors">
            {/* Left: Patrimonio & Aportado */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5">
                {selectedBroker === 'all' && viewMode === 'broker' && availableBrokers.length > 1 ? (
                  <div className="flex -space-x-1 items-center shrink-0" title="Desglose apilado por entidades">
                    {availableBrokers.map((b) => (
                      <span
                        key={b}
                        className="w-2.5 h-2.5 rounded-full ring-1.5 ring-white dark:ring-[#252526] shrink-0"
                        style={{ backgroundColor: ENTITY_CONFIGS[b]?.color || '#3b82f6' }}
                      />
                    ))}
                  </div>
                ) : selectedBroker === 'all' && viewMode === 'asset_class' && availableAssetClasses.length > 1 ? (
                  <div className="flex -space-x-1 items-center shrink-0" title="Desglose apilado por clases de activos">
                    {availableAssetClasses.map((ac) => (
                      <span
                        key={ac}
                        className="w-2.5 h-2.5 rounded-full ring-1.5 ring-white dark:ring-[#252526] shrink-0"
                        style={{ backgroundColor: ASSET_CLASS_CONFIGS[ac]?.color || '#3b82f6' }}
                      />
                    ))}
                  </div>
                ) : selectedBroker === 'all' ? (
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full ring-2 shrink-0 transition-colors",
                    (activeSelectedMetrics?.diff ?? 0) >= 0
                      ? "bg-emerald-500 ring-emerald-500/25"
                      : "bg-rose-500 ring-rose-500/25"
                  )} />
                ) : (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-2"
                    style={{
                      backgroundColor: ENTITY_CONFIGS[selectedBroker.toLowerCase()]?.color || '#3b82f6',
                      boxShadow: `0 0 0 2px ${(ENTITY_CONFIGS[selectedBroker.toLowerCase()]?.color || '#3b82f6')}40`,
                    }}
                  />
                )}
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {selectedBroker !== 'all'
                    ? `${ENTITY_CONFIGS[selectedBroker.toLowerCase()]?.label || selectedBroker}:`
                    : viewMode === 'broker'
                    ? 'Patrimonio (Entidad):'
                    : viewMode === 'asset_class'
                    ? 'Patrimonio (Activo):'
                    : 'Patrimonio Total:'}
                </span>
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
            <div className="flex items-center justify-end gap-2">
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
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-[#1e1e1e] px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-white/[0.08] shrink-0">
                  <Calendar size={11} className={hoveredPoint ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDateSpanish(activePoint.date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Native / Mobile: Leyenda con los datos debajo del gráfico */}
        {activeSelectedMetrics && (
          <div
            data-private
            className={cn(
              "w-full items-center justify-between gap-2 px-1 py-1 text-xs select-none",
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
}: {
  height?: number
  showFooterStrip?: boolean
}) {
  return (
    <div className="w-full flex flex-col justify-between flex-1 select-none relative overflow-hidden animate-pulse">
      <div style={{ height }} className="w-full relative mb-0 rounded-xl overflow-hidden bg-slate-100/40 dark:bg-white/[0.015] border border-slate-200/40 dark:border-white/[0.04] flex flex-col justify-between p-4">
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

      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0">
        <div className="flex items-center justify-between gap-2 px-3 py-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] h-[32px] sm:h-[34px]">
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
            <div className="w-20 h-4 rounded bg-slate-200/90 dark:bg-white/[0.12]" />
          </div>
        </div>
      </div>
    </div>
  )
}
