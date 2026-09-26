import { useEffect, useRef, useState, useMemo } from 'react'
import { createChart, AreaSeries, LineSeries, LineStyle, type IChartApi, ColorType } from 'lightweight-charts'
import type { PricePoint } from '@/lib/mockData'
import { useAppStore } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'

interface PerformanceChartProps {
  data: PricePoint[]
  height?: number
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

export function PerformanceChart({ data, height = 280 }: PerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const areaSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null)
  const investedSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null)
  const dataRef = useRef<PricePoint[]>(data)
  const theme = useAppStore(s => s.theme)

  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null)

  dataRef.current = data

  const latestPoint = useMemo(() => {
    if (!data || !data.length) return null
    return data[data.length - 1]
  }, [data])

  const activePoint = hoveredPoint || latestPoint

  const pnl = useMemo(() => {
    if (!activePoint || activePoint.invested === undefined) return null
    const diff = activePoint.value - activePoint.invested
    const pct = activePoint.invested > 0 ? (diff / activePoint.invested) * 100 : 0
    return { diff, pct }
  }, [activePoint])

  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false
    const isDark = theme === 'dark'
    const containerWidth = Math.max(10, containerRef.current.clientWidth || 300)

    let chart: IChartApi | null = null
    try {
      chart = createChart(containerRef.current, {
        width: containerWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: isDark ? '#94a3b8' : '#64748b',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
          horzLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
        },
        crosshair: {
          vertLine: {
            color: 'rgba(79,142,247,0.4)',
            labelBackgroundColor: '#4f8ef7',
            width: 1,
          },
          horzLine: {
            color: 'rgba(79,142,247,0.4)',
            labelBackgroundColor: '#4f8ef7',
          },
        },
        rightPriceScale: {
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          scaleMargins: { top: 0.12, bottom: 0.1 },
        },
        timeScale: {
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: true,
        handleScale: true,
      })

      // 1. Primary Area Series: Portfolio Total Value
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: '#3b82f6',
        topColor: 'rgba(59, 130, 246, 0.28)',
        bottomColor: 'rgba(59, 130, 246, 0.01)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: '#3b82f6',
        crosshairMarkerBorderColor: '#fff',
        crosshairMarkerBorderWidth: 2,
        title: 'Valor Cartera',
      })

      // 2. Secondary Line Series: Net Invested Capital (Dinero Aportado)
      const investedSeries = chart.addSeries(LineSeries, {
        color: isDark ? '#c084fc' : '#9333ea', // Violet
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#a855f7',
        crosshairMarkerBorderColor: '#fff',
        crosshairMarkerBorderWidth: 1.5,
        title: 'Dinero Aportado',
      })

      chartRef.current = chart
      areaSeriesRef.current = areaSeries
      investedSeriesRef.current = investedSeries

      const valPoints = sanitizeValuePoints(dataRef.current)
      if (valPoints.length) {
        areaSeries.setData(valPoints)
      }

      const invPoints = sanitizeInvestedPoints(dataRef.current)
      if (invPoints.length) {
        investedSeries.setData(invPoints)
      }

      if (valPoints.length) {
        chart.timeScale().fitContent()
      }

      // Crosshair inspection tracking
      chart.subscribeCrosshairMove(param => {
        if (!param || !param.time || !dataRef.current) {
          setHoveredPoint(null)
          return
        }
        const timeStr = typeof param.time === 'string' ? param.time : (param.time as any).year ? `${(param.time as any).year}-${String((param.time as any).month).padStart(2, '0')}-${String((param.time as any).day).padStart(2, '0')}` : String(param.time)
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
    }
  }, [height, theme])

  useEffect(() => {
    if (!areaSeriesRef.current || !chartRef.current || !data) return
    try {
      const valPoints = sanitizeValuePoints(data)
      areaSeriesRef.current.setData(valPoints)

      if (investedSeriesRef.current) {
        const invPoints = sanitizeInvestedPoints(data)
        investedSeriesRef.current.setData(invPoints)
      }

      if (valPoints.length) {
        chartRef.current.timeScale().fitContent()
      }
    } catch (err) {
      console.warn('Failed to update performance chart data:', err)
    }
  }, [data])

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Interactive Legend & Metric Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs px-1">
        {/* Series indicators */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Valor Cartera */}
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="w-3 h-1.5 rounded-sm bg-blue-500 shadow-sm" />
            <span className="text-slate-500 dark:text-slate-400">Valor Cartera:</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white">
              {fmt.currency(activePoint?.value)}
            </span>
          </div>

          {/* Dinero Aportado */}
          {activePoint?.invested !== undefined && (
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-purple-500" />
              <span className="text-slate-500 dark:text-slate-400">Dinero Aportado:</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                {fmt.currency(activePoint?.invested)}
              </span>
            </div>
          )}

          {/* Plusvalía Neta */}
          {pnl && (
            <div className="hidden sm:flex items-center gap-1.5 font-medium">
              <span className="text-slate-500 dark:text-slate-400">Ganancia:</span>
              <span className={cn('font-bold font-mono', pnl.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                {pnl.diff >= 0 ? '+' : ''}{fmt.currency(pnl.diff)} ({fmt.pct(pnl.pct)})
              </span>
            </div>
          )}
        </div>

        {/* Date tracker */}
        {activePoint?.date && (
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-white/[0.06]">
            {hoveredPoint ? `Inspeccionando: ${activePoint.date}` : `Último dato: ${activePoint.date}`}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} style={{ height }} className="w-full relative" />
    </div>
  )
}
