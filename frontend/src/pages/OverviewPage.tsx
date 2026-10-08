import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  ShieldCheck,
  Activity,
  Layers,
  PieChart,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  Sparkles,
  Euro,
  Percent,
  Target,
  Building2,
  Flame,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { KpiCard } from '@/components/ui/KpiCard'
import { Card, CardHeader, CardTitle, LoadingDot } from '@/components/ui/Card'
import { PerformanceChart, PerformanceChartSkeleton } from '@/components/charts/PerformanceChart'
import { AllocationChart, AllocationChartSkeleton } from '@/components/charts/AllocationChart'
import { ReturnsChart, ReturnsChartSkeleton } from '@/components/charts/ReturnsChart'
import { MonthlyReturnsHeatmap } from '@/components/charts/MonthlyReturnsHeatmap'
import { AssetBadge, BrokerBadge, PnlBadge } from '@/components/ui/Badge'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { MiniDonut } from '@/components/ui/MiniDonut'
import { MarketTicker } from '@/components/market/MarketTicker'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import { fmt, cn, PALETTE_LIGHT, PALETTE_DARK } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

import {
  usePortfolioSummary,
  usePositions,
  usePerformance,
  useAnalytics,
  useTransactions,
  useMarketQuotes,
  type MarketStock,
  type Position,
} from '@/api/queries'

type AllocMode = 'asset' | 'type'

const BROKER_ORDER = ['myinvestor', 'indexa', 'bbva', 'kutxabank', 'traderepublic', 'scalable']

function brokerRank(broker?: string | null): number {
  const key = (broker || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const idx = BROKER_ORDER.indexOf(key)
  return idx === -1 ? BROKER_ORDER.length : idx
}

const PERIOD_LABELS: Record<string, string> = {
  '1mo': '1 Mes',
  '3mo': '3 Meses',
  '6mo': '6 Meses',
  '1y': '1 Año',
  '2y': '2 Años',
  '5y': 'Todo',
}

export function OverviewPage() {
  const { currentUser, period, theme, isRefreshingPrices } = useAppStore()
  const periodLabel = PERIOD_LABELS[period] || 'Periodo'
  const [allocMode, setAllocMode] = useState<AllocMode>('asset')
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [hoveredIsin, setHoveredIsin] = useState<string | null>(null)
  const [chartView, setChartView] = useState<'evolution' | 'heatmap'>('evolution')
  const [perfChartMode, setPerfChartMode] = useState<'currency' | 'percent'>('currency')
  const [perfShowInvested, setPerfShowInvested] = useState(true)
  const [perfShowMilestones, setPerfShowMilestones] = useState(true)
  const [returnsPeriodMode, setReturnsPeriodMode] = useState<'global' | 'weekly'>('global')

  const { data: summary, isFetching: summaryFetching } = usePortfolioSummary()
  const { data: positions = [], isFetching: positionsFetching } = usePositions()

  const palette = theme === 'dark' ? PALETTE_DARK : PALETTE_LIGHT
  const assetColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    positions.forEach((p, idx) => {
      map[p.isin] = palette[idx % palette.length]
    })
    return map
  }, [positions, palette])
  const sortedPositions = useMemo(
    () =>
      [...positions].sort((a, b) => {
        const brokerCompare = brokerRank(a.broker) - brokerRank(b.broker)
        if (brokerCompare !== 0) return brokerCompare
        return (b.current_value ?? 0) - (a.current_value ?? 0)
      }),
    [positions]
  )

  const { data: performance = [], isFetching: perfFetching } = usePerformance()
  const { data: analytics, isFetching: analyticsFetching } = useAnalytics()
  const { data: transactions = [] } = useTransactions()
  const { data: marketData } = useMarketQuotes('Todos')

  const isGlobalUpdating = summaryFetching || positionsFetching || isRefreshingPrices
  const isPeriodUpdating = perfFetching || analyticsFetching || isRefreshingPrices
  const isAnyUpdating = isGlobalUpdating || isPeriodUpdating

  // Real portfolio summary directly from backend or calculated from active positions if loading
  const displaySummary = React.useMemo(() => {
    if (summary && summary.total_value > 0) return summary
    if (positions.length > 0) {
      const total_value = positions.reduce((acc, p) => acc + (p.current_value || 0), 0)
      const total_invested = positions.reduce((acc, p) => acc + (p.invested_amount || 0), 0)
      const total_pnl = total_value - total_invested
      const total_pnl_pct = total_invested > 0 ? (total_pnl / total_invested) * 100 : 0
      return {
        total_value: Math.round(total_value * 100) / 100,
        total_invested: Math.round(total_invested * 100) / 100,
        total_pnl: Math.round(total_pnl * 100) / 100,
        total_pnl_pct: Math.round(total_pnl_pct * 100) / 100,
        num_positions: positions.length,
        last_updated: positions[0]?.last_updated || new Date().toISOString(),
      }
    }
    return summary
  }, [summary, positions])

  const pnlPositive = (displaySummary?.total_pnl ?? 0) >= 0

  // Quick stats on performance period directly from real performance series
  const perfStats = React.useMemo(() => {
    if (!performance || performance.length === 0) return null
    const firstPoint = performance[0]
    const lastPoint = performance[performance.length - 1]

    const first = firstPoint.value
    const last = lastPoint.value
    const firstInvested = firstPoint.invested ?? first
    const lastInvested = lastPoint.invested ?? last

    // Ganancia/Pérdida neta real de mercado generada durante este periodo (exclusiva de rentabilidad)
    const startPnl = first - firstInvested
    const endPnl = last - lastInvested
    const periodProfit = Math.round((endPnl - startPnl) * 100) / 100

    // Aportaciones netas de capital ingresadas en este periodo
    const periodInflow = Math.round((lastInvested - firstInvested) * 100) / 100

    // Crecimiento patrimonial bruto (saldo final - saldo inicial)
    const grossGrowth = Math.round((last - first) * 100) / 100

    // Rentabilidad porcentual real ponderada (Dietz Modificado)
    let realReturnPct = 0
    if (firstInvested <= 0.01) {
      realReturnPct = lastInvested > 0 ? (endPnl / lastInvested) * 100 : 0
    } else {
      const capitalBase = first + Math.max(0, periodInflow) * 0.5
      realReturnPct = capitalBase > 0 ? (periodProfit / capitalBase) * 100 : 0
    }
    realReturnPct = Math.round(realReturnPct * 100) / 100

    let max = -Infinity
    let min = Infinity
    let marketIndex = 100.0
    let peakIndex = 100.0
    let maxDrawdown = 0
    const dailyRets: number[] = []

    for (let i = 0; i < performance.length; i++) {
      const p = performance[i]
      if (p.value > max) max = p.value
      if (p.value < min) min = p.value

      if (i > 0) {
        const prev = performance[i - 1].value
        const prevInvested = performance[i - 1].invested ?? prev
        const curInvested = p.invested ?? p.value
        const netInflow = curInvested - prevInvested

        if (prev > 0) {
          // Market return of the day excluding net cash inflows
          const dayReturn = (p.value - netInflow - prev) / prev
          dailyRets.push(dayReturn)

          marketIndex = marketIndex * (1.0 + dayReturn)
          if (marketIndex > peakIndex) peakIndex = marketIndex
          const dd = peakIndex > 0 ? ((marketIndex - peakIndex) / peakIndex) * 100 : 0
          if (dd < maxDrawdown) maxDrawdown = dd
        }
      }
    }

    let periodVolatility: number | null = null
    if (dailyRets.length > 2) {
      const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length
      const variance = dailyRets.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (dailyRets.length - 1)
      periodVolatility = Math.sqrt(variance) * Math.sqrt(252) * 100
    }

    return {
      first,
      last,
      grossGrowth,
      periodProfit,
      periodInflow,
      realReturnPct,
      max,
      min,
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      periodVolatility: periodVolatility !== null ? Number(periodVolatility.toFixed(2)) : null,
    }
  }, [performance])

  const volVal =
    analytics?.volatility !== undefined && (periodLabel === '1 Año' || periodLabel === 'Todo')
      ? analytics.volatility
      : perfStats?.periodVolatility !== null && perfStats?.periodVolatility !== undefined
      ? perfStats.periodVolatility
      : null

  const volTag =
    volVal !== null
      ? volVal < 14
        ? 'Baja / Defensiva'
        : volVal < 22
        ? 'Moderada'
        : 'Elevada'
      : undefined

  const ddVal =
    analytics?.max_drawdown !== undefined && (periodLabel === '1 Año' || periodLabel === 'Todo')
      ? analytics.max_drawdown
      : perfStats?.maxDrawdown !== undefined
      ? perfStats.maxDrawdown
      : null

  const ddTag =
    ddVal !== null
      ? ddVal > -8
        ? 'Bajo impacto'
        : ddVal > -16
        ? 'Controlada'
        : 'Severa'
      : undefined

  const allocStats = useMemo(() => {
    if (!positions || positions.length === 0) return null
    const totalVal = positions.reduce((acc, p) => acc + (p.current_value || 0), 0)
    if (totalVal <= 0) return null

    if (allocMode === 'asset') {
      const sorted = [...positions].sort((a, b) => (b.current_value || 0) - (a.current_value || 0))
      const top1 = sorted[0]
      const top1Pct = top1 ? ((top1.current_value || 0) / totalVal) * 100 : 0
      const top3Sum = sorted.slice(0, 3).reduce((acc, p) => acc + (p.current_value || 0), 0)
      const top3Pct = (top3Sum / totalVal) * 100
      return {
        box1Label: 'Top 1:',
        box1Val: `${top1Pct.toFixed(1)}%`,
        box1Title: `Mayor activo: ${top1?.name || top1?.ticker || '—'} (${top1Pct.toFixed(1)}%)`,
        box2Label: 'Top 3:',
        box2Val: `${top3Pct.toFixed(1)}%`,
        box2Title: `Concentración 3 mayores activos: ${top3Pct.toFixed(1)}%`,
      }
    } else {
      const byType: Record<string, number> = {}
      for (const p of positions) {
        const t = p.asset_type || 'Otros'
        byType[t] = (byType[t] || 0) + (p.current_value || 0)
      }
      const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1])
      const topType = sorted[0]
      const topPct = topType ? (topType[1] / totalVal) * 100 : 0
      return {
        box1Label: 'Líder:',
        box1Val: `${topPct.toFixed(1)}%`,
        box1Title: `Categoría principal: ${topType?.[0] || '—'} (${topPct.toFixed(1)}%)`,
        box2Label: 'Clases:',
        box2Val: `${sorted.length}`,
        box2Title: `${sorted.length} clases de activos distintas`,
      }
    }
  }, [positions, allocMode])

  // Latest reporting NAV date across active positions
  const latestNavDate = useMemo(() => {
    return positions.reduce((max, p) => {
      const d = p.price_date || p.last_updated
      return d && d > max ? d : max
    }, '')
  }, [positions])

  const updatedPositionsCount = useMemo(() => {
    if (!positions.length || !latestNavDate) return 0
    return positions.filter((p) => (p.price_date || p.last_updated) === latestNavDate).length
  }, [positions, latestNavDate])

  const shortTermMetrics = useMemo(() => {
    let dayPct: number | undefined = undefined
    let dayAmount: number | null = null
    let weekPct: number | undefined = undefined
    let weekAmount: number | null = null

    // 1. Compute Day Metric (1D) strictly from active positions updated to the latest reporting NAV date.
    // Unupdated positions compute as 0.00 € (0.00%) today.
    // dayAmount and dayPct MUST be computed together to guarantee matching signs and magnitude.
    if (positions.length > 0) {
      const totalDailyChange = positions.reduce((acc, p) => {
        const pDate = p.price_date || p.last_updated
        if (pDate && pDate === latestNavDate) {
          return acc + (p.daily_change || 0) * (p.shares || 1)
        }
        return acc
      }, 0)
      const totalVal = positions.reduce((acc, p) => acc + (p.current_value || 0), 0)
      dayAmount = Math.round(totalDailyChange * 100) / 100
      const prevVal = totalVal - totalDailyChange
      dayPct = prevVal > 0 ? (totalDailyChange / prevVal) * 100 : 0
    } else if (analytics?.return_1d !== undefined) {
      dayPct = analytics.return_1d
      if (displaySummary?.total_value) {
        dayAmount = Math.round(displaySummary.total_value * (dayPct / 100) * 100) / 100
      }
    }

    // 2. Compute Week Metric (7D) from performance history curve
    if (performance && performance.length >= 2) {
      const sorted = [...performance]
        .filter((p) => p && p.date && typeof p.value === 'number')
        .sort((a, b) => a.date.localeCompare(b.date))

      if (sorted.length >= 2) {
        const navSorted = latestNavDate ? sorted.filter((p) => p.date <= latestNavDate) : sorted
        const activeSorted = navSorted.length >= 2 ? navSorted : sorted
        const last = activeSorted[activeSorted.length - 1]

        // 7 business sessions ago (or up to 7 sessions)
        const weekIdx = Math.max(0, activeSorted.length - 1 - 7)
        const weekPoint = activeSorted[weekIdx]
        const weekInflow = (last.invested ?? 0) - (weekPoint.invested ?? 0)
        const wProfit = (last.value - weekPoint.value) - weekInflow
        weekAmount = Math.round(wProfit * 100) / 100
        weekPct = weekPoint.value > 0 ? (wProfit / weekPoint.value) * 100 : 0
      }
    } else if (analytics?.return_1w !== undefined) {
      weekPct = analytics.return_1w
      if (displaySummary?.total_value) {
        weekAmount = Math.round(displaySummary.total_value * (weekPct / 100) * 100) / 100
      }
    }

    return {
      dayPct: dayPct !== undefined ? Number(dayPct.toFixed(2)) : undefined,
      dayAmount: dayAmount !== null && !isNaN(dayAmount) ? Math.round(dayAmount * 100) / 100 : undefined,
      weekPct: weekPct !== undefined ? Number(weekPct.toFixed(2)) : undefined,
      weekAmount: weekAmount !== null && !isNaN(weekAmount) ? Math.round(weekAmount * 100) / 100 : undefined,
    }
  }, [performance, analytics, positions, displaySummary, latestNavDate])

  const weeklyReturnsData = useMemo(() => {
    if (!performance || performance.length < 2) return []

    const valid = [...performance]
      .filter((p) => p && p.date && typeof p.value === 'number' && !isNaN(p.value))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (valid.length < 2) return []

    // Deduplicate by date (keep latest value if duplicate dates exist)
    const seen = new Set<string>()
    const uniquePoints: typeof performance = []
    for (const p of valid) {
      if (!seen.has(p.date)) {
        seen.add(p.date)
        uniquePoints.push(p)
      } else {
        uniquePoints[uniquePoints.length - 1] = p
      }
    }

    if (uniquePoints.length < 2) return []

    // In mutual funds, NAVs publish with a lag (today the NAVs of yesterday are received).
    // The bar 'Hoy' represents the performance being realized today as those NAVs are published.
    // Therefore, truncate curve points at latestNavDate so the last session in the chart
    // corresponds to this reporting session ('Hoy'), and previous sessions go backwards.
    const navPoints = latestNavDate
      ? uniquePoints.filter((p) => p.date <= latestNavDate)
      : uniquePoints
    const activePoints = navPoints.length >= 2 ? navPoints : uniquePoints

    // Up to 7 daily returns requires up to 8 points (since daily return = (day[i] - day[i-1]))
    const pointsNeeded = Math.min(activePoints.length, 8)
    const slice = activePoints.slice(activePoints.length - pointsNeeded)

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    const result: Array<{ name: string; fullName: string; value: number; amount?: number; subtitle?: string }> = []

    for (let i = 1; i < slice.length; i++) {
      const prev = slice[i - 1]
      const cur = slice[i]

      const prevInvested = prev.invested ?? prev.value
      const curInvested = cur.invested ?? cur.value
      const netInflow = curInvested - prevInvested

      let dayReturnAmount = (cur.value - netInflow) - prev.value
      let dayReturnPct = 0
      if (prev.value > 0) {
        dayReturnPct = (dayReturnAmount / prev.value) * 100
      }

      const isLatest = i === slice.length - 1
      if (isLatest) {
        if (shortTermMetrics?.dayPct !== undefined) {
          // Today's return takes the real-time calculated return of today's incoming NAV batch
          dayReturnPct = shortTermMetrics.dayPct
        }
        if (shortTermMetrics?.dayAmount !== undefined) {
          dayReturnAmount = shortTermMetrics.dayAmount
        }
      }

      dayReturnPct = Math.round(dayReturnPct * 100) / 100
      dayReturnAmount = Math.round(dayReturnAmount * 100) / 100

      const [y, m, d] = cur.date.split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      const dayName = dayNames[dateObj.getDay()] || ''

      const name = `${dayName} ${d}`
      const dateFormatted = dateObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      })
      const fullName = dateFormatted
      const subtitle = isLatest
        ? `Última sesión de NAVs (${d}/${m})`
        : `Sesión NAVs ${d}/${m}`

      result.push({
        name,
        fullName,
        value: dayReturnPct,
        amount: dayReturnAmount,
        subtitle,
      })
    }

    return result
  }, [performance, shortTermMetrics?.dayPct, shortTermMetrics?.dayAmount, latestNavDate])

  const secondaryStats = useMemo(() => {
    if (returnsPeriodMode === 'global') {
      const dayPct = shortTermMetrics?.dayPct ?? analytics?.return_1d
      const ytd = analytics?.return_ytd
      return {
        box1Label: '1D:',
        box1Val: dayPct !== undefined ? fmt.pct(dayPct) : '—',
        box1Title: dayPct !== undefined ? `Rendimiento de hoy (1 Día): ${fmt.pct(dayPct)}` : 'Rendimiento de hoy (1 Día)',
        box1Positive: (dayPct ?? 0) >= 0,
        box2Label: 'YTD:',
        box2Val: ytd !== undefined ? fmt.pct(ytd) : '—',
        box2Title: 'Rentabilidad acumulada en el año en curso (YTD)',
        box2Positive: (ytd ?? 0) >= 0,
      }
    } else {
      const weekPct = shortTermMetrics?.weekPct ?? analytics?.return_1w
      const weekAmt = shortTermMetrics?.weekAmount
      return {
        box1Label: '7D:',
        box1Val: weekPct !== undefined ? fmt.pct(weekPct) : '—',
        box1Title: weekAmt !== undefined ? `Rendimiento últimos 7 días: ${fmt.currency(weekAmt)} (${fmt.pct(weekPct || 0)})` : 'Rendimiento últimos 7 días',
        box1Positive: (weekPct ?? 0) >= 0,
        box2Label: '7D €:',
        box2Val: weekAmt !== undefined ? fmt.currency(weekAmt) : '—',
        box2Title: weekAmt !== undefined ? `Ganancia o pérdida neta últimos 7 días: ${fmt.currency(weekAmt)}` : 'Ganancia o pérdida neta 7 días',
        box2Positive: (weekAmt ?? 0) >= 0,
      }
    }
  }, [returnsPeriodMode, shortTermMetrics, analytics])

  const perfMetrics = useMemo(() => {
    if (!performance || performance.length === 0) return null
    const valid = performance
      .filter((p) => p && p.date && typeof p.value === 'number' && !isNaN(p.value))
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
    }
  }, [performance])

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Live Market Ticker */}

      {/* Live Market Ticker */}
      <MarketTicker onSelectStock={setSelectedStock} />

      {/* 1. Métricas Globales (Totales Cartera) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Wallet size={13.5} className="text-blue-500" />
            <span>Métricas Globales y del Periodo ({periodLabel})</span>
            {isAnyUpdating && <LoadingDot />}
          </div>
          <span data-private className="hidden sm:inline text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {perfStats ? `Rango: ${fmt.currency(perfStats.min)} - ${fmt.currency(perfStats.max)}` : `Filtro: ${periodLabel}`}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
          <KpiCard
            hoverGlow
            hero
            label="Valor Total de la Cartera"
            value={fmt.currency(displaySummary?.total_value)}
            extra={
              shortTermMetrics && (shortTermMetrics.dayPct !== undefined || shortTermMetrics.weekPct !== undefined) && (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {shortTermMetrics.dayPct !== undefined && (
                    <span
                      data-private
                      title={shortTermMetrics.dayAmount !== undefined ? `Rendimiento Hoy (1D): ${shortTermMetrics.dayAmount >= 0 ? '+' : ''}${fmt.currency(shortTermMetrics.dayAmount)} (${fmt.pct(shortTermMetrics.dayPct)})` : `Rendimiento Hoy (1D): ${fmt.pct(shortTermMetrics.dayPct)}`}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-xs font-semibold border transition-all cursor-default',
                        shortTermMetrics.dayPct >= 0
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      )}
                    >
                      <Zap className="w-3 h-3 stroke-[2.5]" />
                      <span>Hoy:</span>
                      <span className="font-bold">{fmt.pct(shortTermMetrics.dayPct)}</span>
                    </span>
                  )}

                  {shortTermMetrics.weekPct !== undefined && (
                    <span
                      data-private
                      title={shortTermMetrics.weekAmount !== undefined ? `Rendimiento 7 Días: ${shortTermMetrics.weekAmount >= 0 ? '+' : ''}${fmt.currency(shortTermMetrics.weekAmount)} (${fmt.pct(shortTermMetrics.weekPct)})` : `Rendimiento 7 Días: ${fmt.pct(shortTermMetrics.weekPct)}`}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-xs font-semibold border transition-all cursor-default',
                        shortTermMetrics.weekPct >= 0
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      )}
                    >
                      <Calendar className="w-3 h-3 stroke-[2.5]" />
                      <span>7D:</span>
                      <span className="font-bold">{fmt.pct(shortTermMetrics.weekPct)}</span>
                    </span>
                  )}
                </div>
              )
            }
            sub={displaySummary ? `Aportado: ${fmt.currency(displaySummary.total_invested)}` : undefined}
            tag={
              displaySummary
                ? `${displaySummary.num_positions ?? positions.length} pos. (act. ${updatedPositionsCount}/${displaySummary.num_positions ?? positions.length})`
                : undefined
            }
            tagColor="blue"
            borderAccent="blue"
            delay={0}
            className="lg:col-span-2"
            icon={<Wallet size={16} className="text-blue-500 dark:text-blue-400" />}
            iconBg="bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400"
            loading={isGlobalUpdating}
          />
          <KpiCard
            hoverGlow
            label="Rendimiento Anualizado"
            value={
              analytics?.annualized_return !== undefined
                ? fmt.pct(analytics.annualized_return)
                : displaySummary
                ? fmt.pct(displaySummary.total_pnl_pct)
                : '—'
            }
            valueColor="text-emerald-600 dark:text-emerald-400"
            tag="TIR Anual"
            tagColor="emerald"
            borderAccent="emerald"
            sub="tasa ponderada por flujos desde inicio"
            delay={0.05}
            icon={<TrendingUp size={16} className="text-emerald-500 dark:text-emerald-400" />}
            iconBg="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
            loading={isGlobalUpdating || isPeriodUpdating}
          />
          <KpiCard
            hoverGlow
            label="Plusvalía Acumulada"
            value={displaySummary ? `${pnlPositive ? '+' : ''}${fmt.currency(displaySummary.total_pnl)}` : '—'}
            valueColor={pnlPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            tag={pnlPositive ? "+ Ganancia" : "- Pérdida"}
            tagColor={pnlPositive ? "emerald" : "rose"}
            borderAccent={pnlPositive ? "emerald" : "rose"}
            sub="ganancia neta total latente"
            delay={0.1}
            icon={<ArrowUpRight size={16} className={pnlPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"} />}
            iconBg={pnlPositive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"}
            loading={isGlobalUpdating}
          />
          <div
            className="group relative overflow-hidden rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 cursor-card backdrop-blur-md transition-all duration-200 ease-out bg-white/95 border border-slate-200/80 shadow-card hover:shadow-card-hover hover:border-slate-300/90 dark:bg-[#181922]/90 dark:border-white/[0.08] dark:hover:border-white/[0.16]"
            title="Aportación programada (DCA): 416,66 € / mes cada día 7 en Indexa EPSV Más Rentabilidad Acciones. Próxima: 07/10/2026"
          >
            <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent dark:via-white/[0.12] z-10" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ backgroundImage: 'radial-gradient(ellipse at top left, rgba(99, 102, 241, 0.05), transparent 58%), linear-gradient(90deg, rgba(99, 102, 241, 0.015), transparent 78%)' }}
            />
            <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
                  Total Invertido
                </p>
                {isGlobalUpdating && <LoadingDot />}
              </div>
              <span data-private className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {currentUser?.isDemo ? 'DCA 1.200 €/m' : 'DCA 416,66 €/m'}
              </span>
            </div>

            <div className={cn("flex items-baseline justify-between gap-2 min-w-0 transition-opacity duration-300", isGlobalUpdating ? "opacity-65" : "opacity-100")}>
              <div data-private className="text-lg sm:text-[21px] font-bold font-mono tracking-tight text-slate-950 dark:text-white leading-tight shrink-0">
                {fmt.currency(displaySummary?.total_invested)}
              </div>
              <span data-private className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                {currentUser?.isDemo ? 'Scalable día 5' : 'Indexa día 7'} • {displaySummary?.num_positions ?? positions.length} pos. (act. {updatedPositionsCount}/{displaySummary?.num_positions ?? positions.length})
              </span>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Métricas del Periodo Seleccionado */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
          <KpiCard
            hoverGlow
            hideTagOnMobile
            label={`Rentabilidad (${periodLabel})`}
            value={
              perfStats
                ? fmt.pct(perfStats.realReturnPct)
                : analytics?.return_ytd !== undefined
                ? fmt.pct(analytics.return_ytd)
                : '—'
            }
            valueColor={(perfStats?.periodProfit ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            tag={(perfStats?.realReturnPct ?? 0) >= 0 ? "Rentabilidad" : "Pérdida"}
            tagColor={(perfStats?.realReturnPct ?? 0) >= 0 ? "emerald" : "rose"}
            borderAccent={(perfStats?.realReturnPct ?? 0) >= 0 ? "emerald" : "rose"}
            sub={`rendimiento del periodo ${periodLabel}`}
            delay={0.1}
            icon={<TrendingUp size={15} className={(perfStats?.realReturnPct ?? 0) >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"} />}
            iconBg={(perfStats?.realReturnPct ?? 0) >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"}
            loading={isPeriodUpdating}
          />
          <KpiCard
            hoverGlow
            hideTagOnMobile
            label={`Plusvalía (${periodLabel})`}
            value={perfStats ? `${perfStats.periodProfit >= 0 ? '+' : ''}${fmt.currency(perfStats.periodProfit)}` : '—'}
            valueColor={(perfStats?.periodProfit ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            tag={(perfStats?.periodProfit ?? 0) >= 0 ? "+ Ganancia" : "- Pérdida"}
            tagColor={(perfStats?.periodProfit ?? 0) >= 0 ? "emerald" : "rose"}
            borderAccent={(perfStats?.periodProfit ?? 0) >= 0 ? "emerald" : "rose"}
            sub={`ganancia neta de mercado en ${periodLabel}`}
            delay={0.12}
            icon={<TrendingUp size={15} className={(perfStats?.periodProfit ?? 0) >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"} />}
            iconBg={(perfStats?.periodProfit ?? 0) >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"}
            loading={isPeriodUpdating}
          />
          <KpiCard
            hoverGlow
            hideTagOnMobile
            label={`Aportaciones (${periodLabel})`}
            value={perfStats ? fmt.currency(perfStats.periodInflow) : '—'}
            valueColor="text-blue-600 dark:text-blue-400"
            tag={perfStats && perfStats.periodInflow > 0 ? "Inversión neta" : "Sin compras"}
            tagColor="blue"
            borderAccent="blue"
            sub={`capital neto ingresado en ${periodLabel}`}
            delay={0.14}
            icon={<Wallet size={15} className="text-blue-500 dark:text-blue-400" />}
            iconBg="bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400"
            loading={isPeriodUpdating}
          />
          <KpiCard
            hoverGlow
            hideTagOnMobile
            label={`Volatilidad (${periodLabel})`}
            value={volVal !== null ? fmt.pct(volVal, false) : '—'}
            valueColor="text-amber-500 dark:text-amber-400"
            tag={volTag}
            tagColor="amber"
            borderAccent="amber"
            sub="fluctuación anualizada de mercado (σ)"
            delay={0.16}
            icon={<Activity size={15} className="text-amber-500 dark:text-amber-400" />}
            iconBg="bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400"
            loading={isPeriodUpdating}
          />
          <KpiCard
            hoverGlow
            hideTagOnMobile
            label={`Máxima Caída (${periodLabel})`}
            value={ddVal !== null ? fmt.pct(ddVal) : '—'}
            valueColor="text-rose-500 dark:text-rose-400"
            tag={ddTag}
            tagColor="rose"
            borderAccent="rose"
            sub={`peor caída en ${periodLabel}`}
            changePositive={false}
            delay={0.18}
            icon={<TrendingDown size={15} className="text-rose-500 dark:text-rose-400" />}
            iconBg="bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"
            loading={isPeriodUpdating}
          />
        </div>
      </div>

      {/* Charts Section: 60% / 20% / 20% */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Performance Evolution (60% on desktop: lg:col-span-3, md:col-span-2) */}
        <Card className="lg:col-span-3 md:col-span-2 flex flex-col justify-between" delay={0.2} loading={isPeriodUpdating}>
          <CardHeader className="h-[58px] min-h-[58px] py-2 px-3.5 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm sm:text-[15px] truncate">Evolución Patrimonial</CardTitle>
                </div>
                <p className="hidden sm:block text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 truncate">
                  Trayectoria histórica del valor liquidativo acumulado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Evolution Chart Controls in CardHeader (hidden on mobile) */}
              {chartView === 'evolution' && (
                <div className="hidden sm:flex items-center gap-1.5">
                  {/* Mode Selector (€ vs %) */}
                  <div className="flex rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#191a21] p-0.5">
                    <button
                      onClick={() => setPerfChartMode('currency')}
                      className={`min-w-[24px] px-2 py-0.5 text-xs font-bold rounded-md transition-colors text-center ${
                        perfChartMode === 'currency'
                          ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                      title="Ver evolución en Euros (€)"
                    >
                      €
                    </button>
                    <button
                      onClick={() => setPerfChartMode('percent')}
                      className={`min-w-[24px] px-2 py-0.5 text-xs font-bold rounded-md transition-colors text-center ${
                        perfChartMode === 'percent'
                          ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                      title="Ver rentabilidad acumulada en porcentaje (%)"
                    >
                      %
                    </button>
                  </div>

                  {/* Toggle Invested Capital (only in € mode) */}
                  {perfChartMode === 'currency' && (
                    <button
                      onClick={() => setPerfShowInvested(v => !v)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition-all ${
                        perfShowInvested
                          ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                      }`}
                      title="Mostrar u ocultar aportaciones"
                    >
                      <span className={`w-2.5 h-0.5 border-t-2 border-dashed ${perfShowInvested ? 'border-purple-600 dark:border-purple-400' : 'border-slate-400'}`} />
                      <span>Aportado</span>
                    </button>
                  )}

                  {/* Toggle Milestones */}
                  <button
                    onClick={() => setPerfShowMilestones(v => !v)}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition-all ${
                      perfShowMilestones
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                    title="Mostrar u ocultar picos máximos y mínimos"
                  >
                    <Target size={11} className={perfShowMilestones ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                    <span>Picos</span>
                  </button>
                </div>
              )}

              {/* Curva / Matriz Mensual ALWAYS on the far right */}
              <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#191a21] p-0.5 shrink-0">
                <button
                  onClick={() => setChartView('evolution')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    chartView === 'evolution'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Curva
                </button>
                <button
                  onClick={() => setChartView('heatmap')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    chartView === 'heatmap'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Matriz<span className="hidden sm:inline"> Mensual</span>
                </button>
              </div>
            </div>
          </CardHeader>

          <div className="px-4 pb-3 pt-1.5 flex-1 flex flex-col justify-between min-h-0 relative">
            <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
              {isPeriodUpdating ? (
                <PerformanceChartSkeleton height={260} />
              ) : chartView === 'evolution' ? (
                performance.length > 0 ? (
                  <PerformanceChart
                    data={performance}
                    height={260}
                    chartMode={perfChartMode}
                    showInvested={perfShowInvested}
                    showMilestones={perfShowMilestones}
                    showFooterStrip={false}
                  />
                ) : (
                  <div className="flex h-[260px] items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                    Sin datos de evolución
                  </div>
                )
              ) : (
                <div className="py-0.5 flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
                  <MonthlyReturnsHeatmap data={performance} tableMaxHeight="200px" />
                </div>
              )}
            </div>

            {/* Shared Milestone Strip for BOTH Curva and Matriz Mensual at the EXACT same footer */}
            {isPeriodUpdating ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0 animate-pulse">
                <div className="h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
                <div className="h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
                <div className="h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
                <div className="h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
              </div>
            ) : perfMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0">
                {/* Max Peak */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl h-[34px] bg-slate-100/90 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                  title={`Máximo del periodo (ATH): ${fmt.currency(perfMetrics.maxPoint.value)}`}
                >
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <TrendingUp size={14} />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">Máx:</span>
                    <span data-private className="font-mono font-extrabold text-slate-950 dark:text-white text-xs truncate">
                      {fmt.currency(perfMetrics.maxPoint.value)}
                    </span>
                  </div>
                </div>

                {/* Period Low */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl h-[34px] bg-slate-100/90 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                  title={`Mínimo del periodo: ${fmt.currency(perfMetrics.minPoint.value)}`}
                >
                  <div className="p-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                    <TrendingDown size={14} />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">Mín:</span>
                    <span data-private className="font-mono font-extrabold text-slate-950 dark:text-white text-xs truncate">
                      {fmt.currency(perfMetrics.minPoint.value)}
                    </span>
                  </div>
                </div>

                {/* Current Drawdown */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl h-[34px] bg-slate-100/90 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                  title={perfMetrics.drawdownPct >= -0.05 ? 'La cartera está en máximos del periodo' : `Distancia actual al pico: ${perfMetrics.drawdownPct.toFixed(2)}%`}
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
                        perfMetrics.drawdownPct >= -0.05
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      )}
                    >
                      {perfMetrics.drawdownPct >= -0.05 ? (
                        <>
                          <span className="sm:hidden">Máximos</span>
                          <span className="hidden sm:inline">En Máximos (ATH)</span>
                        </>
                      ) : (
                        `${perfMetrics.drawdownPct.toFixed(2)}%`
                      )}
                    </span>
                  </div>
                </div>

                {/* Net Return */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl h-[34px] bg-slate-100/90 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                  title={`Ganancia neta del periodo: ${fmt.currency(perfMetrics.periodProfit)} (${fmt.pct(perfMetrics.periodReturnPct)})`}
                >
                  <div className={cn(
                    "p-1 rounded-lg shrink-0",
                    perfMetrics.periodProfit >= 0
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
                        perfMetrics.periodProfit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {perfMetrics.periodProfit >= 0 ? '+' : ''}{fmt.currency(perfMetrics.periodProfit)}
                      <span className="hidden sm:inline"> ({fmt.pct(perfMetrics.periodReturnPct)})</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Asset Allocation Breakdown (20% on desktop: lg:col-span-1, md:col-span-1) */}
        <Card className="lg:col-span-1 md:col-span-1 flex flex-col justify-between" delay={0.23} loading={isGlobalUpdating}>
          <CardHeader className="h-[58px] min-h-[58px] py-2 px-3.5 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20 shrink-0">
                <PieChart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">Distribución</CardTitle>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 truncate">
                  Desglose de cartera
                </p>
              </div>
            </div>

            {/* Toggle Mode */}
            <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#191a21] p-0.5">
              {(['asset', 'type'] as AllocMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setAllocMode(m)}
                  className={`relative rounded-lg px-2 py-0.5 text-xs font-semibold transition-colors ${
                    allocMode === m
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {allocMode === m && (
                    <motion.div
                      layoutId="overviewAllocPill"
                      className="absolute inset-0 rounded-lg bg-blue-600"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10 text-[11px]">
                    {m === 'asset' ? 'Activo' : 'Tipo'}
                  </span>
                </button>
              ))}
            </div>
          </CardHeader>

          <div className="px-3 pb-3 pt-1.5 flex flex-col justify-between flex-1 min-h-0 relative">
            <div className="flex flex-col justify-center flex-1 min-h-0 overflow-hidden">
              {isGlobalUpdating ? (
                <AllocationChartSkeleton height={260} />
              ) : positions.length > 0 ? (
                <AllocationChart
                  positions={positions}
                  mode={allocMode}
                  showLegend={false}
                  hoveredIsin={hoveredIsin}
                  onHoverIsin={setHoveredIsin}
                  height={260}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                  Sin posiciones registradas
                </div>
              )}
            </div>

            {/* Useful Stats Strip (Matching Card 1) */}
            {isGlobalUpdating ? (
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0 animate-pulse">
                <div className="h-[32px] sm:h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
                <div className="h-[32px] sm:h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
              </div>
            ) : allocStats && (
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0">
                {/* Box 1 */}
                <div
                  className="flex items-center justify-between gap-1 px-2 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
                  title={allocStats.box1Title}
                >
                  <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                      <PieChart size={12} />
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold whitespace-nowrap">
                      {allocStats.box1Label}
                    </span>
                  </div>
                  <span data-private className="font-mono font-extrabold text-slate-950 dark:text-white text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-0.5">
                    {allocStats.box1Val}
                  </span>
                </div>

                {/* Box 2 */}
                <div
                  className="flex items-center justify-between gap-1 px-2 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
                  title={allocStats.box2Title}
                >
                  <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Layers size={12} />
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold whitespace-nowrap">
                      {allocStats.box2Label}
                    </span>
                  </div>
                  <span data-private className="font-mono font-extrabold text-slate-950 dark:text-white text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-0.5">
                    {allocStats.box2Val}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 3. Performance by Period (Global / Semanal 7D) (20% on desktop: lg:col-span-1, md:col-span-1) */}
        <Card className="lg:col-span-1 md:col-span-1 flex flex-col justify-between" delay={0.26} loading={isPeriodUpdating}>
          <CardHeader className="h-[58px] min-h-[58px] py-2 px-3.5 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">Rendimiento</CardTitle>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 truncate">
                  {returnsPeriodMode === 'global' ? 'Rentabilidad por periodo' : 'Últimos 7 días'}
                </p>
              </div>
            </div>

            <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#191a21] p-0.5">
              <button
                onClick={() => setReturnsPeriodMode('global')}
                className={`relative rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                  returnsPeriodMode === 'global'
                    ? 'text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {returnsPeriodMode === 'global' && (
                  <motion.div
                    layoutId="returnsPeriodPill"
                    className="absolute inset-0 rounded-lg bg-blue-600"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10 text-[11px]">Global</span>
              </button>
              <button
                onClick={() => setReturnsPeriodMode('weekly')}
                className={`relative rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                  returnsPeriodMode === 'weekly'
                    ? 'text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {returnsPeriodMode === 'weekly' && (
                  <motion.div
                    layoutId="returnsPeriodPill"
                    className="absolute inset-0 rounded-lg bg-blue-600"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10 text-[11px]">Semanal</span>
              </button>
            </div>
          </CardHeader>

          <div className="px-3 pb-3 pt-1.5 flex flex-col justify-between flex-1 min-h-0 relative">
            <div data-private className="flex flex-col justify-center flex-1 min-h-0 overflow-hidden">
              {isPeriodUpdating ? (
                <ReturnsChartSkeleton compact height={260} />
              ) : (
                <ReturnsChart
                  analytics={analytics}
                  mode={returnsPeriodMode}
                  weeklyData={weeklyReturnsData}
                  day1Pct={shortTermMetrics?.dayPct}
                  day1Amount={shortTermMetrics?.dayAmount}
                  weekAmount={shortTermMetrics?.weekAmount}
                  totalPortfolioValue={displaySummary?.total_value}
                  compact
                  height={260}
                />
              )}
            </div>

            {/* Useful Stats Strip (Matching Card 1) */}
            {isPeriodUpdating ? (
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0 animate-pulse">
                <div className="h-[32px] sm:h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
                <div className="h-[32px] sm:h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
              </div>
            ) : secondaryStats && (
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0">
                {/* Box 1 */}
                <div
                  className="flex items-center justify-between gap-1 px-2 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
                  title={secondaryStats.box1Title}
                >
                  <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                        secondaryStats.box1Positive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      <Zap size={12} />
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold whitespace-nowrap">
                      {secondaryStats.box1Label}
                    </span>
                  </div>
                  <span
                    data-private
                    className={cn(
                      'font-mono font-extrabold text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-0.5',
                      secondaryStats.box1Positive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {secondaryStats.box1Val}
                  </span>
                </div>

                {/* Box 2 */}
                <div
                  className="flex items-center justify-between gap-1 px-2 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#1a1c22] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
                  title={secondaryStats.box2Title}
                >
                  <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                        returnsPeriodMode === 'global'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : secondaryStats.box2Positive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {returnsPeriodMode === 'global' ? <Calendar size={12} /> : <Euro size={12} />}
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold whitespace-nowrap">
                      {secondaryStats.box2Label}
                    </span>
                  </div>
                  <span
                    data-private
                    className={cn(
                      'font-mono font-extrabold text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-0.5',
                      secondaryStats.box2Positive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {secondaryStats.box2Val}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Posiciones en Cartera (Full Width with 2 Parallel Columns) */}
      <Card className="w-full" delay={0.3} loading={isGlobalUpdating}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <CardTitle>Posiciones en Cartera</CardTitle>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                • Indicador azul = NAV actualizado
              </span>
            </div>
          </div>

          <Link
            to="/positions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20"
          >
            <span>Ver todas ({positions.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        {/* 2 Parallel Columns Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-200/80 dark:divide-white/[0.04] overflow-hidden">
          {/* Column 1: Top 5 Positions */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/90 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01] text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-2 pl-3 pr-1 text-center w-6 text-slate-400">#</th>
                  <th className="py-2 px-2.5">Activo / Fondo</th>
                  <th className="py-2 px-2 text-right">NAV</th>
                  <th className="py-2 px-2 text-right">Rend. Día</th>
                  <th className="py-2 px-2 text-right">Valor Actual</th>
                  <th className="py-2 px-2 text-right">Ganancia (P&L)</th>
                  <th className="py-2 px-2 text-center">Banco</th>
                  <th className="py-2 pr-3 pl-1.5 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {sortedPositions.slice(0, 5).map((p, i) => {
                  const isRowHovered = hoveredIsin === p.isin
                  const assetColor = assetColorMap[p.isin]
                  const isUpdated = Boolean(latestNavDate && (p.price_date || p.last_updated) === latestNavDate)

                  return (
                    <motion.tr
                      key={p.isin}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                      onClick={() => setSelectedPosition(p)}
                      onMouseEnter={() => setHoveredIsin(p.isin)}
                      onMouseLeave={() => setHoveredIsin(null)}
                      title={isUpdated ? `Actualizado con último NAV (${p.price_date || p.last_updated})` : `Pendiente de nuevo NAV (último: ${p.price_date || p.last_updated})`}
                      className={cn(
                        'transition-colors group cursor-pointer relative',
                        isRowHovered
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                      )}
                    >
                      <td className="py-2.5 pl-3 pr-1 text-center relative">
                        {isUpdated && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-blue-500/80 dark:bg-blue-400/80 pointer-events-none"
                          />
                        )}
                        <div className="flex items-center justify-center">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150"
                            style={{
                              backgroundColor: assetColor || '#3b82f6',
                              transform: isRowHovered ? 'scale(1.4)' : 'scale(1)',
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <CompanyLogo
                            isin={p.isin}
                            ticker={p.ticker || p.isin.slice(0, 4)}
                            name={p.name}
                            domain={p.domain}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[110px] sm:max-w-[130px] 2xl:max-w-[160px] text-[14px]">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[12.5px] font-semibold text-slate-600 dark:text-slate-400">
                              <span>{p.isin}</span>
                              <AssetBadge type={p.asset_type} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-[13px] sm:text-[14px] leading-tight whitespace-nowrap">
                          {p.current_price ? fmt.price(p.current_price, p.currency) : '—'}
                        </div>
                        <div className="text-[11.5px] font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                          {(() => {
                            const raw = p.price_date || p.last_updated
                            if (!raw) return '—'
                            try {
                              const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw
                              return format(parseISO(dateOnly), 'dd/MM/yyyy')
                            } catch {
                              return raw
                            }
                          })()}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {p.daily_change_pct !== null && p.daily_change_pct !== undefined ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 font-mono text-[13px] font-bold',
                              p.daily_change_pct > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : p.daily_change_pct < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500 dark:text-slate-400'
                            )}
                          >
                            {p.daily_change_pct > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : p.daily_change_pct < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : null}
                            <span>{fmt.pct(p.daily_change_pct)}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td data-private className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white text-[14px]">
                        {fmt.currency(p.current_value)}
                      </td>
                      <td data-private className="py-2.5 px-2 text-right">
                        <div className="flex flex-col items-end">
                          <PnlBadge value={p.unrealized_pnl} />
                          <span className="text-[12px] font-mono font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                            {fmt.pct(p.unrealized_pnl_pct)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <BrokerBadge broker={p.broker} />
                      </td>
                      <td className="py-2.5 pr-3 pl-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <MiniDonut value={p.weight} size={22} strokeWidth={3} color={assetColor} />
                          <span
                            className={cn(
                              'font-mono font-bold text-right text-[13px] transition-colors',
                              isRowHovered ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
                            )}
                          >
                            {p.weight.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Column 2: Next 5 Positions */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="hidden xl:table-header-group">
                <tr className="border-b border-slate-200/90 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01] text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-2 pl-3 pr-1 text-center w-6 text-slate-400">#</th>
                  <th className="py-2 px-2.5">Activo / Fondo</th>
                  <th className="py-2 px-2 text-right">NAV</th>
                  <th className="py-2 px-2 text-right">Rend. Día</th>
                  <th className="py-2 px-2 text-right">Valor Actual</th>
                  <th className="py-2 px-2 text-right">Ganancia (P&L)</th>
                  <th className="py-2 px-2 text-center">Banco</th>
                  <th className="py-2 pr-3 pl-1.5 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {sortedPositions.slice(5, 10).map((p, i) => {
                  const isRowHovered = hoveredIsin === p.isin
                  const assetColor = assetColorMap[p.isin]
                  const isUpdated = Boolean(latestNavDate && (p.price_date || p.last_updated) === latestNavDate)

                  return (
                    <motion.tr
                      key={p.isin}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.03 }}
                      onClick={() => setSelectedPosition(p)}
                      onMouseEnter={() => setHoveredIsin(p.isin)}
                      onMouseLeave={() => setHoveredIsin(null)}
                      title={isUpdated ? `Actualizado con último NAV (${p.price_date || p.last_updated})` : `Pendiente de nuevo NAV (último: ${p.price_date || p.last_updated})`}
                      className={cn(
                        'transition-colors group cursor-pointer relative',
                        isRowHovered
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                      )}
                    >
                      <td className="py-2.5 pl-3 pr-1 text-center relative">
                        {isUpdated && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-blue-500/80 dark:bg-blue-400/80 pointer-events-none"
                          />
                        )}
                        <div className="flex items-center justify-center">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-150"
                            style={{
                              backgroundColor: assetColor || '#3b82f6',
                              transform: isRowHovered ? 'scale(1.4)' : 'scale(1)',
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <CompanyLogo
                            isin={p.isin}
                            ticker={p.ticker || p.isin.slice(0, 4)}
                            name={p.name}
                            domain={p.domain}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[110px] sm:max-w-[130px] 2xl:max-w-[160px] text-[14px]">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[12.5px] font-semibold text-slate-600 dark:text-slate-400">
                              <span>{p.isin}</span>
                              <AssetBadge type={p.asset_type} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-[13px] sm:text-[14px] leading-tight whitespace-nowrap">
                          {p.current_price ? fmt.price(p.current_price, p.currency) : '—'}
                        </div>
                        <div className="text-[11.5px] font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
                          {(() => {
                            const raw = p.price_date || p.last_updated
                            if (!raw) return '—'
                            try {
                              const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw
                              return format(parseISO(dateOnly), 'dd/MM/yyyy')
                            } catch {
                              return raw
                            }
                          })()}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {p.daily_change_pct !== null && p.daily_change_pct !== undefined ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 font-mono text-[13px] font-bold',
                              p.daily_change_pct > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : p.daily_change_pct < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500 dark:text-slate-400'
                            )}
                          >
                            {p.daily_change_pct > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : p.daily_change_pct < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : null}
                            <span>{fmt.pct(p.daily_change_pct)}</span>
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td data-private className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white text-[14px]">
                        {fmt.currency(p.current_value)}
                      </td>
                      <td data-private className="py-2.5 px-2 text-right">
                        <div className="flex flex-col items-end">
                          <PnlBadge value={p.unrealized_pnl} />
                          <span className="text-[12px] font-mono font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                            {fmt.pct(p.unrealized_pnl_pct)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <BrokerBadge broker={p.broker} />
                      </td>
                      <td className="py-2.5 pr-3 pl-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <MiniDonut value={p.weight} size={22} strokeWidth={3} color={assetColor} />
                          <span
                            className={cn(
                              'font-mono font-bold text-right text-[13px] transition-colors',
                              isRowHovered ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
                            )}
                          >
                            {p.weight.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Live Market Heatmap & Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-start">
        {/* Heatmap (2 cols) */}
        <div className="lg:col-span-2">
          {marketData?.stocks && marketData.stocks.length > 0 ? (
            <MarketHeatmap
              stocks={marketData.stocks}
              onSelectStock={(s) => setSelectedStock(s)}
              showViewAllLink
            />
          ) : (
            <div className="h-64 rounded-2xl bg-slate-100 dark:bg-[#181922] border border-slate-200 dark:border-white/[0.08] animate-pulse flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs font-medium">
              Cargando mapa de calor del mercado...
            </div>
          )}
        </div>

        {/* Recent Transactions Widget (1 col) */}
        <Card className="lg:col-span-1" delay={0.35}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                <Calendar className="w-4 h-4" />
              </div>
              <CardTitle>Últimos Movimientos</CardTitle>
            </div>

            <Link
              to="/transactions"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20"
            >
              <span>Historial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          <div data-private className="p-4 pt-2.5 space-y-2">
            {transactions.slice(0, 8).map((t) => {
              const isBuy = t.type === 'buy'
              const isDiv = t.type === 'dividend'
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    const pos = positions.find((p) => p.isin === t.isin)
                    if (pos) setSelectedPosition(pos)
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04] hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isBuy
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : isDiv
                          ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isBuy ? 'C' : isDiv ? 'D' : 'V'}
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white text-[14px] truncate max-w-[150px]">
                        {t.name}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5 font-medium">
                        {fmt.date(t.date)} • {t.broker}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                      {fmt.currency(t.amount)}
                    </div>
                    {t.shares > 0 && (
                      <div className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
                        {fmt.num(t.shares)} part.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Stock Detail Modal */}
      <StockDetailModal
        stock={selectedStock}
        onClose={() => setSelectedStock(null)}
      />

      {/* Position Detail Modal */}
      <PositionDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}
