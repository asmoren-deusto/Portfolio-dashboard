import { useEffect, useRef } from 'react'
import { createChart, AreaSeries, type IChartApi, ColorType } from 'lightweight-charts'
import type { PricePoint } from '@/lib/mockData'
import { useAppStore } from '@/store/appStore'

interface PerformanceChartProps {
  data: PricePoint[]
  height?: number
}

export function PerformanceChart({ data, height = 280 }: PerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null)
  const dataRef = useRef<PricePoint[]>(data)
  const theme = useAppStore(s => s.theme)

  // Always keep dataRef fresh so we can use it inside the chart-creation effect
  dataRef.current = data

  // Recreate the chart whenever height or theme changes
  useEffect(() => {
    if (!containerRef.current) return

    const isDark = theme === 'dark'
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
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

    // Apply current data immediately so it's never blank after theme switch
    if (dataRef.current.length) {
      areaSeries.setData(
        dataRef.current.map(p => ({ time: p.date as any, value: p.value }))
      )
      chart.timeScale().fitContent()
    }

    const ro = new ResizeObserver(entries => {
      chart.applyOptions({ width: entries[0].contentRect.width })
    })
    ro.observe(containerRef.current!)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [height, theme])

  // Update data without recreating the chart
  useEffect(() => {
    if (!seriesRef.current || !data.length) return
    seriesRef.current.setData(
      data.map(p => ({ time: p.date as any, value: p.value }))
    )
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return <div ref={containerRef} style={{ height }} className="w-full" />
}
