import { useEffect, useRef, useState, useMemo } from 'react'
import {
  createChart,
  AreaSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  ColorType,
} from 'lightweight-charts'
import { useAppStore } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import { triggerChartAnimation } from '@/lib/chartAnimation'
import type { BenchmarkComparisonPoint, BenchmarkComparisonData } from '@/api/queries'

export type BenchmarkChartMode = 'percent' | 'currency'

export interface BenchmarkEvolutionChartProps {
  data: BenchmarkComparisonData | null | undefined
  height?: number
  defaultMode?: BenchmarkChartMode
  mode?: BenchmarkChartMode
  onModeChange?: (mode: BenchmarkChartMode) => void
  showModeSelector?: boolean
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

function sanitizePoints(
  points: BenchmarkComparisonPoint[],
  key: keyof BenchmarkComparisonPoint
): { time: any; value: number }[] {
  if (!points || !points.length) return []
  const valid = points
    .filter((p) => p && p.date && typeof p[key] === 'number' && !isNaN(p[key] as number))
    .sort((a, b) => a.date.localeCompare(b.date))

  const unique: { time: any; value: number }[] = []
  const seen = new Set<string>()
  for (const p of valid) {
    if (!seen.has(p.date)) {
      seen.add(p.date)
      unique.push({ time: p.date as any, value: p[key] as number })
    }
  }
  return unique
}

export function BenchmarkEvolutionChart({
  data,
  height = 260,
  defaultMode = 'percent',
  mode: propMode,
  onModeChange,
  showModeSelector = false,
}: BenchmarkEvolutionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const portfolioAreaRef = useRef<any>(null)
  const spLineRef = useRef<any>(null)
  const bceLineRef = useRef<any>(null)
  const msciLineRef = useRef<any>(null)
  const nasdaqLineRef = useRef<any>(null)
  const stoxxLineRef = useRef<any>(null)
  const nikkeiLineRef = useRef<any>(null)
  const investedLineRef = useRef<any>(null)
  const zeroPriceLineRef = useRef<IPriceLine | null>(null)
  const lastSweepKeyRef = useRef<string>('')

  const [internalMode, setInternalMode] = useState<BenchmarkChartMode>(defaultMode)
  const mode = propMode !== undefined ? propMode : internalMode
  const setMode = onModeChange || setInternalMode
  const [showPortfolio, setShowPortfolio] = useState<boolean>(true)
  const [showSp500, setShowSp500] = useState<boolean>(true)
  const [showBce, setShowBce] = useState<boolean>(true)
  const [showMsci, setShowMsci] = useState<boolean>(false)
  const [showNasdaq, setShowNasdaq] = useState<boolean>(false)
  const [showStoxx, setShowStoxx] = useState<boolean>(false)
  const [showNikkei, setShowNikkei] = useState<boolean>(false)
  // Bumped each time the chart instance is (re)created so data is re-applied to the new series
  const [chartVersion, setChartVersion] = useState(0)
  const [hoveredPoint, setHoveredPoint] = useState<BenchmarkComparisonPoint | null>(null)

  const theme = useAppStore((s) => s.theme)
  const isDark = theme === 'dark'

  const points = data?.points ?? []

  const pointsRef = useRef<BenchmarkComparisonPoint[]>(points)
  pointsRef.current = points

  const lastPoint = useMemo(() => {
    return points.length > 0 ? points[points.length - 1] : null
  }, [points])

  const activePoint = hoveredPoint ?? lastPoint

  // Initialize Lightweight-Charts instance
  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false
    let chart: IChartApi | null = null

    try {
      const containerWidth = containerRef.current.clientWidth || 600

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

      // 1. Portfolio Series (Area)
      const portfolioArea = chart.addSeries(AreaSeries, {
        lineColor: '#2563eb',
        topColor: isDark ? 'rgba(37, 99, 235, 0.28)' : 'rgba(37, 99, 235, 0.18)',
        bottomColor: 'rgba(37, 99, 235, 0.00)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#2563eb',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
      })

      // 2. S&P 500 Series (Line)
      const spLine = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#f59e0b',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
      })

      // 3. Tasa BCE / Depósito (€STR) (Line)
      const bceLine = chart.addSeries(LineSeries, {
        color: '#10b981',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#10b981',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
      })

      // 4. MSCI World Series (Line)
      const msciLine = chart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#a855f7',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
      })

      // 5. NASDAQ 100 Series (Line)
      const nasdaqLine = chart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#06b6d4',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
      })

      // 6. Euro Stoxx 50 Series (Line)
      const stoxxLine = chart.addSeries(LineSeries, {
        color: '#6366f1',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#6366f1',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
      })

      // 7. Nikkei 225 Series (Line)
      const nikkeiLine = chart.addSeries(LineSeries, {
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#ef4444',
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBorderWidth: 1.5,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
        },
      })

      // 8. Invested Capital Line (Only visible in Currency mode)
      const investedLine = chart.addSeries(LineSeries, {
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

      chartRef.current = chart
      portfolioAreaRef.current = portfolioArea
      spLineRef.current = spLine
      bceLineRef.current = bceLine
      msciLineRef.current = msciLine
      nasdaqLineRef.current = nasdaqLine
      stoxxLineRef.current = stoxxLine
      nikkeiLineRef.current = nikkeiLine
      investedLineRef.current = investedLine
      setChartVersion((v) => v + 1)

      // Crosshair tracking
      chart.subscribeCrosshairMove((param) => {
        if (!param || !param.time || !pointsRef.current) {
          setHoveredPoint(null)
          return
        }
        const timeStr =
          typeof param.time === 'string'
            ? param.time
            : (param.time as any).year
            ? `${(param.time as any).year}-${String((param.time as any).month).padStart(2, '0')}-${String(
                (param.time as any).day
              ).padStart(2, '0')}`
            : String(param.time)

        const match = pointsRef.current.find((p) => p.date === timeStr)
        setHoveredPoint(match || null)
      })
    } catch (err) {
      console.warn('Failed to initialize benchmark chart:', err)
    }

    const ro = new ResizeObserver((entries) => {
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
      portfolioAreaRef.current = null
      spLineRef.current = null
      bceLineRef.current = null
      msciLineRef.current = null
      nasdaqLineRef.current = null
      stoxxLineRef.current = null
      nikkeiLineRef.current = null
      investedLineRef.current = null
      zeroPriceLineRef.current = null
    }
  }, [height, isDark])

  // Update Series Data, Visibility, Options
  useEffect(() => {
    if (!chartRef.current || !portfolioAreaRef.current || !spLineRef.current || !msciLineRef.current)
      return

    try {
      const chart = chartRef.current
      const portfolio = portfolioAreaRef.current
      const sp = spLineRef.current
      const bce = bceLineRef.current
      const msci = msciLineRef.current
      const nasdaq = nasdaqLineRef.current
      const stoxx = stoxxLineRef.current
      const nikkei = nikkeiLineRef.current
      const inv = investedLineRef.current

      if (mode === 'percent') {
        // TWR % data
        const twrPts = sanitizePoints(points, 'portfolio_twr')
        const spPts = sanitizePoints(points, 'sp500')
        const bcePts = sanitizePoints(points, 'bce_rate')
        const msciPts = sanitizePoints(points, 'msci_world')
        const nasdaqPts = sanitizePoints(points, 'nasdaq100')
        const stoxxPts = sanitizePoints(points, 'eurostoxx50')
        const nikkeiPts = sanitizePoints(points, 'nikkei225')

        portfolio.applyOptions({
          visible: showPortfolio,
          lineColor: '#2563eb',
          topColor: isDark ? 'rgba(37, 99, 235, 0.28)' : 'rgba(37, 99, 235, 0.18)',
          bottomColor: 'rgba(37, 99, 235, 0.00)',
          lineWidth: 2,
          crosshairMarkerBackgroundColor: '#2563eb',
          priceFormat: {
            type: 'custom',
            formatter: (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`,
          },
        })
        portfolio.setData(showPortfolio ? twrPts : [])

        if (sp) {
          sp.applyOptions({ visible: showSp500 })
          if (showSp500) sp.setData(spPts)
        }

        if (bce) {
          bce.applyOptions({ visible: showBce })
          if (showBce) bce.setData(bcePts)
        }

        if (msci) {
          msci.applyOptions({ visible: showMsci })
          if (showMsci) msci.setData(msciPts)
        }

        if (nasdaq) {
          nasdaq.applyOptions({ visible: showNasdaq })
          if (showNasdaq) nasdaq.setData(nasdaqPts)
        }

        if (stoxx) {
          stoxx.applyOptions({ visible: showStoxx })
          if (showStoxx) stoxx.setData(stoxxPts)
        }

        if (nikkei) {
          nikkei.applyOptions({ visible: showNikkei })
          if (showNikkei) nikkei.setData(nikkeiPts)
        }

        if (inv) inv.applyOptions({ visible: false })

        // 0% Baseline - attached to whichever series is active
        if (zeroPriceLineRef.current) {
          try {
            portfolio.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          try {
            sp?.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          try {
            bce?.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          try {
            msci?.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          try {
            nasdaq?.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          try {
            stoxx?.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          try {
            nikkei?.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          zeroPriceLineRef.current = null
        }

        const hostSeries = showPortfolio
          ? portfolio
          : showSp500
          ? sp
          : showBce
          ? bce
          : showMsci
          ? msci
          : showNasdaq
          ? nasdaq
          : showStoxx
          ? stoxx
          : showNikkei
          ? nikkei
          : null

        if (hostSeries) {
          zeroPriceLineRef.current = hostSeries.createPriceLine({
            price: 0,
            color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: 'Base (0.0%)',
          })
        }
      } else {
        // Currency mode (€)
        const valPts = sanitizePoints(points, 'value')
        const invPts = sanitizePoints(points, 'invested')

        portfolio.applyOptions({
          visible: true,
          lineColor: '#2563eb',
          topColor: isDark ? 'rgba(37, 99, 235, 0.28)' : 'rgba(37, 99, 235, 0.18)',
          bottomColor: 'rgba(37, 99, 235, 0.00)',
          lineWidth: 2,
          crosshairMarkerBackgroundColor: '#2563eb',
          priceFormat: {
            type: 'custom',
            formatter: (p: number) => fmt.currency(p),
          },
        })
        portfolio.setData(valPts)

        if (sp) sp.applyOptions({ visible: false })
        if (bce) bce.applyOptions({ visible: false })
        if (msci) msci.applyOptions({ visible: false })
        if (nasdaq) nasdaq.applyOptions({ visible: false })
        if (stoxx) stoxx.applyOptions({ visible: false })
        if (nikkei) nikkei.applyOptions({ visible: false })

        if (inv) {
          inv.applyOptions({ visible: true })
          inv.setData(invPts)
        }

        if (zeroPriceLineRef.current) {
          try {
            portfolio.removePriceLine(zeroPriceLineRef.current)
          } catch {}
          zeroPriceLineRef.current = null
        }
      }

      chart.timeScale().fitContent()

      // Trigger timeline sweep animation on load & when benchmark, mode or period changes
      const sweepKey = `${points?.length || 0}_${mode}_${showPortfolio}_${showSp500}_${showBce}_${showMsci}_${showNasdaq}_${showStoxx}_${showNikkei}_${points?.[0]?.date || ''}_${points?.[points.length - 1]?.date || ''}`
      if (points.length > 0 && sweepKey !== lastSweepKeyRef.current) {
        lastSweepKeyRef.current = sweepKey
        requestAnimationFrame(() => {
          triggerChartAnimation(containerRef.current)
        })
      }
    } catch (err) {
      console.warn('Failed to update benchmark series:', err)
    }
  }, [points, mode, showPortfolio, showSp500, showBce, showMsci, showNasdaq, showStoxx, showNikkei, isDark, chartVersion])

  const alphaSp =
    activePoint && activePoint.portfolio_twr !== undefined && activePoint.sp500 !== undefined
      ? activePoint.portfolio_twr - activePoint.sp500
      : null

  const alphaBce =
    activePoint && activePoint.portfolio_twr !== undefined && activePoint.bce_rate !== undefined
      ? activePoint.portfolio_twr - activePoint.bce_rate
      : null

  return (
    <div data-private className="w-full flex flex-col justify-between h-full gap-2">
      {/* 1. Header Toolbar: Mode selector & Benchmarks toggles */}
      {(showModeSelector || mode === 'percent') && (
        <div className={cn("flex items-center gap-2 px-1", showModeSelector ? "flex-wrap justify-between" : "flex-wrap")}>
          {/* Toggle Mode: % (Rentabilidad vs Benchmarks) vs € (Patrimonio Total) */}
          {showModeSelector && (
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5">
                <button
                  onClick={() => setMode('percent')}
                  className={`min-w-[28px] px-2.5 py-0.5 text-xs font-bold rounded-md transition-colors text-center ${
                    mode === 'percent'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  title="Comparativa de rentabilidad ponderada en el tiempo (TWR) neutralizando aportaciones"
                >
                  % TWR
                </button>
                <button
                  onClick={() => setMode('currency')}
                  className={`min-w-[28px] px-2.5 py-0.5 text-xs font-bold rounded-md transition-colors text-center ${
                    mode === 'currency'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  title="Patrimonio total (€) y capital neto aportado"
                >
                  € Total
                </button>
              </div>

              <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {mode === 'percent' ? 'Aportaciones neutralizadas (Time-Weighted)' : 'Evolución de saldo neto'}
              </span>
            </div>
          )}

          {/* Legend / Toggles (Only in percent mode) */}
          {mode === 'percent' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Tu Cartera Toggle */}
              <button
                onClick={() => setShowPortfolio((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                  showPortfolio
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-400 opacity-60 line-through'
                )}
                title="Mostrar / Ocultar Tu Cartera"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Tu Cartera</span>
              </button>

              {/* S&P 500 Toggle */}
              <button
                onClick={() => setShowSp500((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                  showSp500
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-400 opacity-60 line-through'
                )}
                title="Mostrar / Ocultar S&P 500"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>S&P 500</span>
              </button>

              {/* Tasa BCE Toggle */}
              <button
                onClick={() => setShowBce((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                  showBce
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-400 opacity-60 line-through'
                )}
                title="Mostrar / Ocultar Tasa BCE / Depósito (Tipo libre de riesgo)"
              >
                <span className="w-3 h-0 border-t-2 border-dashed border-emerald-500" />
                <span>Tasa BCE</span>
              </button>

              {/* MSCI World Toggle */}
              <button
                onClick={() => setShowMsci((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                  showMsci
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
                    : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-400 opacity-60 line-through'
                )}
                title="Mostrar / Ocultar MSCI World"
              >
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>MSCI World</span>
              </button>

              {/* NASDAQ 100 Toggle */}
              <button
                onClick={() => setShowNasdaq((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                  showNasdaq
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
                    : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-400 opacity-60 line-through'
                )}
                title="Mostrar / Ocultar NASDAQ 100 (QQQ)"
              >
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>NASDAQ 100</span>
              </button>

              {/* Euro Stoxx 50 Toggle */}
              <button
                onClick={() => setShowStoxx((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                  showStoxx
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                    : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-400 opacity-60 line-through'
                )}
                title="Mostrar / Ocultar Euro Stoxx 50"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Euro Stoxx 50</span>
              </button>

              {/* Nikkei 225 Toggle */}
              <button
                onClick={() => setShowNikkei((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                  showNikkei
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-400 opacity-60 line-through'
                )}
                title="Mostrar / Ocultar Nikkei 225"
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Nikkei 225</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Dynamic HUD Inspection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50/90 dark:bg-[#0c101c]/80 border border-slate-200/80 dark:border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-x-3.5 sm:gap-x-4 gap-y-1 text-xs font-medium">
          {mode === 'percent' ? (
            <>
              {/* Tu Cartera */}
              {showPortfolio && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Cartera:</span>
                  <span
                    className={cn(
                      'font-mono font-bold',
                      (activePoint?.portfolio_twr ?? 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {activePoint
                      ? `${activePoint.portfolio_twr >= 0 ? '+' : ''}${activePoint.portfolio_twr.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              )}

              {/* S&P 500 */}
              {showSp500 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-500/20 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">S&P 500:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activePoint
                      ? `${activePoint.sp500 >= 0 ? '+' : ''}${activePoint.sp500.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              )}

              {/* Tasa BCE */}
              {showBce && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">BCE / Dep.:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activePoint && activePoint.bce_rate !== undefined
                      ? `${activePoint.bce_rate >= 0 ? '+' : ''}${activePoint.bce_rate.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              )}

              {/* MSCI World */}
              {showMsci && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 ring-2 ring-purple-500/20 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">MSCI World:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activePoint
                      ? `${activePoint.msci_world >= 0 ? '+' : ''}${activePoint.msci_world.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              )}

              {/* NASDAQ 100 */}
              {showNasdaq && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 ring-2 ring-cyan-500/20 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">NASDAQ:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activePoint && activePoint.nasdaq100 !== undefined
                      ? `${activePoint.nasdaq100 >= 0 ? '+' : ''}${activePoint.nasdaq100.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              )}

              {/* Euro Stoxx 50 */}
              {showStoxx && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/20 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Euro Stoxx:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activePoint && activePoint.eurostoxx50 !== undefined
                      ? `${activePoint.eurostoxx50 >= 0 ? '+' : ''}${activePoint.eurostoxx50.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              )}

              {/* Nikkei 225 */}
              {showNikkei && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-500/20 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Nikkei:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activePoint && activePoint.nikkei225 !== undefined
                      ? `${activePoint.nikkei225 >= 0 ? '+' : ''}${activePoint.nikkei225.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              )}

              {/* Alpha vs S&P 500 badge */}
              {alphaSp !== null && showSp500 && showPortfolio && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-400">Alfa SPX:</span>
                  <span
                    className={cn(
                      'font-mono font-bold px-1.5 py-0.5 rounded text-[11px]',
                      alphaSp >= 0
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                        : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                    )}
                  >
                    {alphaSp >= 0 ? '+' : ''}
                    {alphaSp.toFixed(2)}%
                  </span>
                </div>
              )}

              {/* Alpha vs BCE badge (when BCE is selected and SP500 is not) */}
              {alphaBce !== null && showBce && showPortfolio && !showSp500 && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-400">Alfa vs BCE:</span>
                  <span
                    className={cn(
                      'font-mono font-bold px-1.5 py-0.5 rounded text-[11px]',
                      alphaBce >= 0
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                        : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                    )}
                  >
                    {alphaBce >= 0 ? '+' : ''}
                    {alphaBce.toFixed(2)}%
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Patrimonio */}
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Patrimonio:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {fmt.currency(activePoint?.value)}
                </span>
              </div>

              {/* Aportado */}
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 border-t-2 border-dashed border-purple-500" />
                <span className="text-slate-500 dark:text-slate-400">Aportado:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {fmt.currency(activePoint?.invested)}
                </span>
              </div>

              {/* Plusvalía */}
              {activePoint && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Beneficio:</span>
                  <span
                    className={cn(
                      'font-mono font-bold px-1.5 py-0.5 rounded text-[11px]',
                      activePoint.value - activePoint.invested >= 0
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                        : 'text-rose-700 dark:text-rose-300 bg-rose-500/10'
                    )}
                  >
                    {activePoint.value - activePoint.invested >= 0 ? '+' : ''}
                    {fmt.currency(activePoint.value - activePoint.invested)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Date inspection pill */}
        {activePoint?.date && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-white/[0.04] px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-white/[0.06] shrink-0 self-start sm:self-auto">
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

      {/* 3. Canvas Container */}
      <div className="relative w-full flex-1 min-h-[220px]">
        {/* Always mounted: the chart is created once on mount and needs this node to exist */}
        <div ref={containerRef} className="w-full h-full" />
        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
            Cargando datos del benchmark...
          </div>
        )}
      </div>
    </div>
  )
}
