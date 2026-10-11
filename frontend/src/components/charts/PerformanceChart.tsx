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
import { triggerChartAnimation } from '@/lib/chartAnimation'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  Flame,
  Layers,
  Building2,
} from 'lucide-react'

export type ChartMode = 'currency' | 'percent'

export interface EntityConfig {
  id: string
  label: string
  color: string
  areaTopColor: string
  areaBottomColor: string
  textColor: string
  badgeBg: string
  badgeBorder: string
}

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  myinvestor: {
    id: 'myinvestor',
    label: 'MyInvestor',
    color: '#3b82f6', // blue
    areaTopColor: 'rgba(59, 130, 246, 0.16)',
    areaBottomColor: 'rgba(59, 130, 246, 0.00)',
    textColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeBorder: 'border-blue-500/30',
  },
  bbva: {
    id: 'bbva',
    label: 'BBVA',
    color: '#10b981', // emerald
    areaTopColor: 'rgba(16, 185, 129, 0.16)',
    areaBottomColor: 'rgba(16, 185, 129, 0.00)',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/30',
  },
  indexa: {
    id: 'indexa',
    label: 'Indexa Capital',
    color: '#f59e0b', // amber
    areaTopColor: 'rgba(245, 158, 11, 0.16)',
    areaBottomColor: 'rgba(245, 158, 11, 0.00)',
    textColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeBorder: 'border-amber-500/30',
  },
}

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

// Helper to sanitize selected sum points in currency mode
function sanitizeSelectedSumPoints(
  points: PricePoint[],
  selected: Set<string>,
  allBrokers: string[]
): { time: any; value: number }[] {
  if (!points || !points.length) return []
  const valid = points.filter(p => p && p.date && typeof p.value === 'number' && !isNaN(p.value))
    .sort((a, b) => a.date.localeCompare(b.date))

  const unique: { time: any; value: number }[] = []
  const seen = new Set<string>()

  for (const p of valid) {
    if (!seen.has(p.date)) {
      seen.add(p.date)
      let val = p.value
      if (p.brokers && selected.size > 0 && selected.size < allBrokers.length) {
        val = 0
        for (const b of selected) {
          val += p.brokers[b]?.value ?? 0
        }
      }
      unique.push({ time: p.date as any, value: Math.max(0, val) })
    }
  }
  return unique
}

// Helper to sanitize selected invested points
function sanitizeSelectedInvestedPoints(
  points: PricePoint[],
  selected: Set<string>,
  allBrokers: string[]
): { time: any; value: number }[] {
  if (!points || !points.length) return []
  const valid = points.filter(p => p && p.date).sort((a, b) => a.date.localeCompare(b.date))
  const unique: { time: any; value: number }[] = []
  const seen = new Set<string>()

  for (const p of valid) {
    if (!seen.has(p.date)) {
      seen.add(p.date)
      let inv = p.invested ?? 0
      if (p.brokers && selected.size > 0 && selected.size < allBrokers.length) {
        inv = 0
        for (const b of selected) {
          inv += p.brokers[b]?.invested ?? 0
        }
      }
      unique.push({ time: p.date as any, value: Math.max(0, inv) })
    }
  }
  return unique
}

// Helper to sanitize selected sum in percent mode
function sanitizeSelectedSumPercentPoints(
  points: PricePoint[],
  selected: Set<string>,
  allBrokers: string[]
): { time: any; value: number }[] {
  const sumPoints = sanitizeSelectedSumPoints(points, selected, allBrokers)
  if (!sumPoints.length) return []
  const base = sumPoints[0]
  if (base.value <= 0) return []

  const invPoints = sanitizeSelectedInvestedPoints(points, selected, allBrokers)
  const baseInv = invPoints[0]?.value ?? 0

  const unique: { time: any; value: number }[] = []
  for (let i = 0; i < sumPoints.length; i++) {
    const curVal = sumPoints[i].value
    const curInv = invPoints[i]?.value ?? 0
    const periodInflow = curInv - baseInv
    const profit = (curVal - base.value) - periodInflow
    const pct = base.value > 0 ? (profit / base.value) * 100 : 0
    unique.push({ time: sumPoints[i].time, value: Number(pct.toFixed(2)) })
  }
  return unique
}

// Helper to sanitize an individual entity line in currency mode
function sanitizeEntityCurrencyPoints(
  points: PricePoint[],
  broker: string
): { time: any; value: number }[] {
  if (!points || !points.length) return []
  const valid = points.filter(p => p && p.date).sort((a, b) => a.date.localeCompare(b.date))
  const unique: { time: any; value: number }[] = []
  const seen = new Set<string>()

  for (const p of valid) {
    if (!seen.has(p.date)) {
      seen.add(p.date)
      const val = p.brokers?.[broker]?.value ?? 0
      if (val > 0) {
        unique.push({ time: p.date as any, value: val })
      }
    }
  }
  return unique
}

// Helper to sanitize an individual entity line in percent mode
function sanitizeEntityPercentPoints(
  points: PricePoint[],
  broker: string
): { time: any; value: number }[] {
  const currPoints = sanitizeEntityCurrencyPoints(points, broker)
  if (!currPoints.length) return []
  const base = currPoints[0]
  if (base.value <= 0) return []

  const baseOrig = points.find(p => p.date === base.time)
  const baseInv = baseOrig?.brokers?.[broker]?.invested ?? 0

  const unique: { time: any; value: number }[] = []
  for (const pt of currPoints) {
    const orig = points.find(p => p.date === pt.time)
    const curInv = orig?.brokers?.[broker]?.invested ?? 0
    const periodInflow = curInv - baseInv
    const profit = (pt.value - base.value) - periodInflow
    const pct = base.value > 0 ? (profit / base.value) * 100 : 0
    unique.push({ time: pt.time, value: Number(pct.toFixed(2)) })
  }
  return unique
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
  const areaSeriesRef = useRef<any>(null)
  const investedSeriesRef = useRef<any>(null)
  const entitySeriesMapRef = useRef<Map<string, any>>(new Map())
  const markersRef = useRef<any>(null)
  const zeroPriceLineRef = useRef<IPriceLine | null>(null)

  const { theme, refreshAnimKey } = useAppStore()
  const isDark = theme === 'dark'

  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null)

  // Dynamically detect available brokers in data
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
    return Array.from(found).sort()
  }, [data])

  // Selectors State: showTotal and set of active entities
  const [showTotal, setShowTotal] = useState<boolean>(true)
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(() => new Set(['myinvestor', 'bbva', 'indexa']))

  // Auto-sync available brokers on initial load if empty
  useEffect(() => {
    if (availableBrokers.length > 0 && selectedEntities.size === 0) {
      setSelectedEntities(new Set(availableBrokers))
    }
  }, [availableBrokers])

  const toggleEntity = (b: string) => {
    setSelectedEntities(prev => {
      const next = new Set(prev)
      if (next.has(b)) {
        if (next.size === 1 && !showTotal) return prev // keep at least one visible
        next.delete(b)
      } else {
        next.add(b)
      }
      return next
    })
  }

  const toggleTotal = () => {
    if (showTotal && selectedEntities.size === 0) return // keep something visible
    setShowTotal(v => !v)
  }

  const dataRef = useRef<PricePoint[]>(data)
  dataRef.current = data

  // Metrics computation for selected entities sum
  const metrics = useMemo(() => {
    if (!data || data.length === 0) return null

    const sumPoints = sanitizeSelectedSumPoints(data, selectedEntities, availableBrokers)
    if (sumPoints.length === 0) return null

    const invPoints = sanitizeSelectedInvestedPoints(data, selectedEntities, availableBrokers)

    const first = sumPoints[0]
    const last = sumPoints[sumPoints.length - 1]
    const firstInv = invPoints[0]?.value ?? 0
    const lastInv = invPoints[invPoints.length - 1]?.value ?? 0

    let maxPoint = sumPoints[0]
    let minPoint = sumPoints[0]

    for (const p of sumPoints) {
      if (p.value > maxPoint.value) maxPoint = p
      if (p.value < minPoint.value) minPoint = p
    }

    const currentVal = last.value
    const maxVal = maxPoint.value
    const drawdownPct = maxVal > 0 ? ((currentVal - maxVal) / maxVal) * 100 : 0

    const periodInflow = lastInv - firstInv
    const periodProfit = (last.value - first.value) - periodInflow
    const periodReturnPct = first.value > 0 ? (periodProfit / first.value) * 100 : 0

    return {
      first,
      last,
      firstInv,
      lastInv,
      maxPoint,
      minPoint,
      drawdownPct,
      periodProfit,
      periodReturnPct,
      periodInflow,
    }
  }, [data, selectedEntities, availableBrokers])

  // Active point (either crosshair inspection or latest)
  const activePoint = hoveredPoint || (data.length ? data[data.length - 1] : null)

  // Compute active selected values on active point
  const activeSelectedMetrics = useMemo(() => {
    if (!activePoint) return null

    let val = activePoint.value
    let inv = activePoint.invested ?? 0

    if (activePoint.brokers && selectedEntities.size > 0 && selectedEntities.size < availableBrokers.length) {
      val = 0
      inv = 0
      for (const b of selectedEntities) {
        val += activePoint.brokers[b]?.value ?? 0
        inv += activePoint.brokers[b]?.invested ?? 0
      }
    }

    const diff = inv > 0 ? val - inv : (metrics?.first ? val - metrics.first.value : 0)
    const pct = inv > 0 ? (diff / inv) * 100 : (metrics?.first && metrics.first.value > 0 ? (diff / metrics.first.value) * 100 : 0)

    // Return from period start in percent mode
    let periodPct = 0
    if (metrics && metrics.first) {
      const inflow = inv - (metrics.firstInv ?? 0)
      const profit = (val - metrics.first.value) - inflow
      periodPct = metrics.first.value > 0 ? (profit / metrics.first.value) * 100 : 0
    }

    return { val, inv, diff, pct, periodPct }
  }, [activePoint, selectedEntities, availableBrokers, metrics])

  // Initialize Lightweight-Charts canvas
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

      // 1. Primary Area Series (Sumatorio / Total Cartera)
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: '#2563eb',
        topColor: isDark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(37, 99, 235, 0.20)',
        bottomColor: 'rgba(59, 130, 246, 0.00)',
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

      // 2. Secondary Line Series (Net Invested Capital of Selected Entities)
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

      // 3. Individual Entity Line Series (MyInvestor, BBVA, Indexa)
      const entityMap = new Map<string, any>()
      for (const [bKey, cfg] of Object.entries(ENTITY_CONFIGS)) {
        const entSeries = chart.addSeries(LineSeries, {
          color: cfg.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBackgroundColor: cfg.color,
          crosshairMarkerBorderColor: '#ffffff',
          crosshairMarkerBorderWidth: 1.5,
          priceFormat: {
            type: 'custom',
            formatter: (p: number) => fmt.currency(p),
          },
        })
        entityMap.set(bKey, entSeries)
      }

      const markersPlugin = createSeriesMarkers(areaSeries, [])

      chartRef.current = chart
      areaSeriesRef.current = areaSeries
      investedSeriesRef.current = investedSeries
      entitySeriesMapRef.current = entityMap
      markersRef.current = markersPlugin

      // Auto-fit immediately on mount
      const sumPoints = sanitizeSelectedSumPoints(dataRef.current, selectedEntities, availableBrokers)
      if (sumPoints.length) {
        areaSeries.setData(sumPoints)
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
      entitySeriesMapRef.current.clear()
      markersRef.current = null
      zeroPriceLineRef.current = null
    }
  }, [height, isDark])

  // Update Series Data, Active Entities, Mode, Colors, Markers
  useEffect(() => {
    if (!areaSeriesRef.current || !chartRef.current || !data) return

    try {
      const area = areaSeriesRef.current
      const inv = investedSeriesRef.current
      const chart = chartRef.current
      const entMap = entitySeriesMapRef.current

      if (chartMode === 'currency') {
        // 1. Total / Sumatorio Area Series
        const sumPoints = sanitizeSelectedSumPoints(data, selectedEntities, availableBrokers)
        area.setData(sumPoints)
        area.applyOptions({
          visible: showTotal,
          lineColor: '#2563eb',
          topColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(37, 99, 235, 0.20)',
          bottomColor: 'rgba(59, 130, 246, 0.00)',
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

        // 2. Invested Line Series for selected entities
        if (inv) {
          const invPoints = sanitizeSelectedInvestedPoints(data, selectedEntities, availableBrokers)
          inv.setData(invPoints)
          inv.applyOptions({
            visible: showInvested && showTotal,
            priceFormat: {
              type: 'custom',
              formatter: (p: number) => fmt.currency(p),
            },
          })
        }

        // 3. Individual Entity Lines
        for (const [bKey, s] of entMap.entries()) {
          const cfg = ENTITY_CONFIGS[bKey]
          const isSelected = selectedEntities.has(bKey)
          if (isSelected) {
            const entPoints = sanitizeEntityCurrencyPoints(data, bKey)
            s.setData(entPoints)
            s.applyOptions({
              visible: true,
              color: cfg.color,
              priceFormat: {
                type: 'custom',
                formatter: (p: number) => fmt.currency(p),
              },
            })
          } else {
            s.applyOptions({ visible: false })
          }
        }

        // 4. ATH / Low Markers
        if (markersRef.current && metrics) {
          if (showMilestones && showTotal && metrics.maxPoint && metrics.minPoint && metrics.maxPoint.time !== metrics.minPoint.time) {
            markersRef.current.setMarkers([
              {
                time: metrics.maxPoint.time,
                position: 'aboveBar',
                color: '#10b981',
                shape: 'arrowDown',
                text: `Pico: ${fmt.currency(metrics.maxPoint.value)}`,
              },
              {
                time: metrics.minPoint.time,
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
        const sumPctPoints = sanitizeSelectedSumPercentPoints(data, selectedEntities, availableBrokers)
        area.setData(sumPctPoints)

        const isPositive = (metrics?.periodReturnPct ?? 0) >= 0
        const mainColor = isPositive ? '#10b981' : '#f43f5e'
        const topGrad = isPositive
          ? (isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.20)')
          : (isDark ? 'rgba(244, 63, 94, 0.28)' : 'rgba(244, 63, 94, 0.20)')

        area.applyOptions({
          visible: showTotal,
          lineColor: mainColor,
          topColor: topGrad,
          bottomColor: isPositive ? 'rgba(16, 185, 129, 0.01)' : 'rgba(244, 63, 94, 0.01)',
          crosshairMarkerBackgroundColor: mainColor,
          priceFormat: {
            type: 'custom',
            formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
          },
        })

        if (inv) {
          inv.applyOptions({ visible: false })
        }

        // Individual Entity Lines in percent mode
        for (const [bKey, s] of entMap.entries()) {
          const cfg = ENTITY_CONFIGS[bKey]
          const isSelected = selectedEntities.has(bKey)
          if (isSelected) {
            const entPctPoints = sanitizeEntityPercentPoints(data, bKey)
            s.setData(entPctPoints)
            s.applyOptions({
              visible: true,
              color: cfg.color,
              priceFormat: {
                type: 'custom',
                formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
              },
            })
          } else {
            s.applyOptions({ visible: false })
          }
        }

        // 0% Baseline
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

        if (markersRef.current) {
          markersRef.current.setMarkers([])
        }
      }

      chart.timeScale().fitContent()
    } catch (err) {
      console.warn('Error updating chart series:', err)
    }
  }, [data, chartMode, showInvested, showMilestones, showTotal, selectedEntities, availableBrokers, isDark, metrics])

  return (
    <div className="w-full flex flex-col justify-between select-none space-y-2">
      {/* 1. Entity Selectors Toolbar: Desglose por Entidad & Sumatorio */}
      {availableBrokers.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-100/90 dark:bg-[#181818] border border-slate-200/80 dark:border-white/[0.07] text-xs">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 pr-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Entidades:
            </span>

            {/* Total / Sumatorio Toggle */}
            <button
              onClick={toggleTotal}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all',
                showTotal
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 shadow-xs font-bold'
                  : 'bg-white/60 dark:bg-white/[0.03] text-slate-400 border-slate-200/80 dark:border-white/[0.06] hover:text-slate-700 dark:hover:text-slate-200'
              )}
              title="Mostrar u ocultar el sumatorio total en la gráfica"
            >
              <span className={cn('w-2 h-2 rounded-full', showTotal ? 'bg-blue-500' : 'bg-slate-400')} />
              <span>
                {selectedEntities.size < availableBrokers.length ? 'Sumatorio' : 'Total'}
              </span>
            </button>

            {/* Individual Broker Toggles */}
            {availableBrokers.map((b) => {
              const cfg = ENTITY_CONFIGS[b] || {
                label: b,
                color: '#64748b',
                badgeBg: 'bg-slate-500/10',
                textColor: 'text-slate-700 dark:text-slate-300',
                badgeBorder: 'border-slate-500/30',
              }
              const isSelected = selectedEntities.has(b)

              return (
                <button
                  key={b}
                  onClick={() => toggleEntity(b)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all',
                    isSelected
                      ? `${cfg.badgeBg} ${cfg.textColor} ${cfg.badgeBorder} shadow-xs font-bold`
                      : 'bg-white/60 dark:bg-white/[0.03] text-slate-400 border-slate-200/80 dark:border-white/[0.06] hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                  title={`Mostrar u ocultar ${cfg.label} en la gráfica`}
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

          <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-medium hidden sm:inline shrink-0">
            {selectedEntities.size} de {availableBrokers.length} activas
          </span>
        </div>
      )}

      {/* 2. Dynamic HUD: Interactive Inspection & Live Metric Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50/90 dark:bg-[#181818] border border-slate-200/80 dark:border-white/[0.08]">
        {/* Main values */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-x-3.5 sm:gap-x-4 gap-y-1 text-xs font-medium">
          {/* Main Portfolio Value / Return */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">
              {chartMode === 'currency'
                ? selectedEntities.size < availableBrokers.length
                  ? 'Sumatorio:'
                  : 'Patrimonio:'
                : 'Rentabilidad:'}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {chartMode === 'currency'
                ? fmt.currency(activeSelectedMetrics?.val)
                : `${(activeSelectedMetrics?.periodPct ?? 0) >= 0 ? '+' : ''}${(activeSelectedMetrics?.periodPct ?? 0).toFixed(2)}%`}
            </span>
          </div>

          {/* Invested Capital */}
          {activeSelectedMetrics?.inv !== undefined && activeSelectedMetrics.inv > 0 && chartMode === 'currency' && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-0.5 border-t-2 border-dashed border-purple-500" />
              <span className="text-slate-500 dark:text-slate-400">Aportado:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {fmt.currency(activeSelectedMetrics.inv)}
              </span>
            </div>
          )}
        </div>

        {/* Right side: Beneficio + Date pill */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-medium pt-1 sm:pt-0 border-t border-slate-200/60 dark:border-white/[0.04] sm:border-0">
          {activeSelectedMetrics && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Beneficio:</span>
              <span
                className={cn(
                  'font-mono font-bold px-1.5 py-0.5 rounded text-[11px]',
                  activeSelectedMetrics.diff >= 0
                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                    : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
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
              {hoveredPoint && (
                <span className="text-[9px] uppercase font-bold text-slate-700 dark:text-slate-300 ml-0.5">
                  (Inspección)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Entity Breakdown Chips for the active inspection date */}
      {activePoint?.brokers && (
        <div className="flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] text-[11px]">
          {availableBrokers.map((b) => {
            const bData = activePoint.brokers?.[b]
            const cfg = ENTITY_CONFIGS[b] || { label: b, color: '#64748b' }
            const isSelected = selectedEntities.has(b)
            if (!bData || bData.value <= 0) return null

            const totalForPct = activeSelectedMetrics?.val || activePoint.value || 1
            const sharePct = (bData.value / totalForPct) * 100

            return (
              <div
                key={b}
                className={cn(
                  'flex items-center gap-1.5 transition-opacity',
                  isSelected ? 'opacity-100' : 'opacity-40 line-through'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="font-semibold text-slate-600 dark:text-slate-400">{cfg.label}:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {fmt.currency(bData.value)}
                </span>
                {isSelected && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    ({sharePct.toFixed(1)}%)
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 4. Canvas Container */}
      <div ref={containerRef} style={{ height }} className="w-full relative rounded-lg overflow-hidden" />

      {/* 5. Useful Milestones Strip */}
      {metrics && showFooterStrip && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.06] text-xs">
          {/* Max Peak */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            title={`Máximo de la selección: ${fmt.currency(metrics.maxPoint.value)}`}
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
            title={`Mínimo de la selección: ${fmt.currency(metrics.minPoint.value)}`}
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
