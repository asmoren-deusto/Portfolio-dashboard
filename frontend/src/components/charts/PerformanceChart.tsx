import { useEffect, useRef } from 'react'
import { createChart, AreaSeries, type IChartApi, ColorType } from 'lightweight-charts'
import type { PricePoint } from '@/lib/mockData'
import { useAppStore } from '@/store/appStore'

interface PerformanceChartProps {
  data: PricePoint[]
  height?: number
}

function sanitizePoints(points: PricePoint[]): { time: any; value: number }[] {
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

export function PerformanceChart({ data, height = 280 }: PerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null)
  const dataRef = useRef<PricePoint[]>(data)
  const theme = useAppStore(s => s.theme)

  dataRef.current = data

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
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: true,
        handleScale: true,
      })

      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: '#4f8ef7',
        topColor: 'rgba(79, 142, 247, 0.28)',
        bottomColor: 'rgba(79, 142, 247, 0.01)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 5,
        crosshairMarkerBackgroundColor: '#4f8ef7',
        crosshairMarkerBorderColor: '#fff',
        crosshairMarkerBorderWidth: 2,
      })

      chartRef.current = chart
      seriesRef.current = areaSeries

      const initialPoints = sanitizePoints(dataRef.current)
      if (initialPoints.length) {
        areaSeries.setData(initialPoints)
        chart.timeScale().fitContent()
      }
    } catch (err) {
      console.warn('Failed to initialize performance chart:', err)
    }

    const ro = new ResizeObserver(entries => {
      if (disposed || !entries[0] || !chartRef.current) return
      try {
        const w = Math.max(10, entries[0].contentRect.width)
        chartRef.current.applyOptions({ width: w })
      } catch {
        // Ignored
      }
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
      seriesRef.current = null
    }
  }, [height, theme])

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || !data) return
    try {
      const points = sanitizePoints(data)
      seriesRef.current.setData(points)
      if (points.length) {
        chartRef.current.timeScale().fitContent()
      }
    } catch (err) {
      console.warn('Failed to update performance chart data:', err)
    }
  }, [data])

  return <div ref={containerRef} style={{ height }} className="w-full relative" />
}
