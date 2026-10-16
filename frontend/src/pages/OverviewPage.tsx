import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Building2,
  Flame,
  Zap,
  Award,
  ArrowDownRight,
  Coins,
  History,
  CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { KpiCard } from '@/components/ui/KpiCard'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Card, CardHeader, CardTitle, LoadingDot } from '@/components/ui/Card'
import { PerformanceChart, PerformanceChartSkeleton } from '@/components/charts/PerformanceChart'
import { AllocationChart, AllocationChartSkeleton } from '@/components/charts/AllocationChart'
import { ReturnsChart, ReturnsChartSkeleton } from '@/components/charts/ReturnsChart'
import { MonthlyReturnsHeatmap } from '@/components/charts/MonthlyReturnsHeatmap'
import { BenchmarkEvolutionChart, type BenchmarkChartMode } from '@/components/charts/BenchmarkEvolutionChart'
import { AssetBadge, BrokerBadge, PnlBadge } from '@/components/ui/Badge'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { MiniDonut } from '@/components/ui/MiniDonut'
import { MarketTicker } from '@/components/market/MarketTicker'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import { TableSkeletonRows } from '@/components/ui/TableSkeleton'
import { fmt, cn, PALETTE_LIGHT, PALETTE_DARK } from '@/lib/utils'
import { isNativePlatform } from '@/api/config'
import { useAppStore } from '@/store/appStore'

import {
  usePortfolioSummary,
  usePositions,
  usePerformance,
  useAnalytics,
  useTransactions,
  useMarketQuotes,
  useSimulatedPortfolio,
  useBenchmarkComparison,
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
  const { currentUser, period, theme, isRefreshingPrices, selectedBroker, refreshAnimKey } = useAppStore()
  const periodLabel = PERIOD_LABELS[period] || 'Periodo'
  const [allocMode, setAllocMode] = useState<AllocMode>('asset')
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [hoveredIsin, setHoveredIsin] = useState<string | null>(null)
  const [chartView, setChartView] = useState<'evolution' | 'heatmap'>('evolution')
  const [perfChartMode, setPerfChartMode] = useState<'currency' | 'percent'>('currency')
  const [perfShowInvested, setPerfShowInvested] = useState(true)
  const [returnsPeriodMode, setReturnsPeriodMode] = useState<'global' | 'weekly'>(() => {
    return (localStorage.getItem('returns_period_mode') as 'global' | 'weekly') || 'weekly'
  })
  const [benchmarkMode, setBenchmarkMode] = useState<BenchmarkChartMode>('percent')

  const { data: summary, isFetching: summaryFetching } = usePortfolioSummary()
  const { data: positions = [], isLoading: positionsLoading, isFetching: positionsFetching } = usePositions()

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
  const { data: benchmarkData, isFetching: benchmarkFetching } = useBenchmarkComparison()
  const { data: transactions = [], isLoading: txLoading, isFetching: txFetching } = useTransactions()
  const { data: marketData } = useMarketQuotes('Todos')
  const { data: simPortfolioData, isFetching: simPortfolioFetching } = useSimulatedPortfolio('1d')

  const [txFilterType, setTxFilterType] = useState<'all' | 'buy' | 'dividend' | 'sell'>('all')

  const alphaSp = useMemo(() => {
    if (benchmarkData?.summary?.alpha_sp500 !== undefined && benchmarkData?.summary?.alpha_sp500 !== null) {
      return benchmarkData.summary.alpha_sp500
    }
    if (benchmarkData?.points && benchmarkData.points.length > 0) {
      const last = benchmarkData.points[benchmarkData.points.length - 1]
      if (last.portfolio_twr !== undefined && last.sp500 !== undefined) {
        return Number((last.portfolio_twr - last.sp500).toFixed(2))
      }
    }
    return null
  }, [benchmarkData])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (txFilterType !== 'all' && t.type !== txFilterType) return false
      return true
    })
  }, [transactions, txFilterType])

  const txStats = useMemo(() => {
    const buys = transactions.filter((t) => t.type === 'buy')
    const divs = transactions.filter((t) => t.type === 'dividend')
    const sells = transactions.filter((t) => t.type === 'sell')
    const totalBought = buys.reduce((acc, t) => acc + (t.amount || 0), 0)
    const totalDivs = divs.reduce((acc, t) => acc + (t.amount || 0), 0)
    return {
      buysCount: buys.length,
      divsCount: divs.length,
      sellsCount: sells.length,
      totalBought,
      totalDivs,
    }
  }, [transactions])

  const simSummary = simPortfolioData?.summary
  const sessionPct = simSummary?.fx_info?.simulated_eur_pct ?? simSummary?.simulated_daily_pct
  const sessionAmount = simSummary?.fx_info?.simulated_eur_amount ?? simSummary?.simulated_daily_amount
  const sessionMarketState = simSummary?.market_state

  const isGlobalUpdating = isRefreshingPrices || (!summary && summaryFetching) || (positions.length === 0 && positionsFetching)
  const isPeriodUpdating = isRefreshingPrices || (performance.length === 0 && perfFetching) || (!analytics && analyticsFetching)
  const isAnyUpdating = isGlobalUpdating || isPeriodUpdating

  // Real portfolio summary: calculate from active valid positions when available
  // to guarantee exact parity with the holdings table and avoid phantom transfer artifacts
  const displaySummary = React.useMemo(() => {
    if (positions.length > 0) {
      const validPositions = positions.filter(
        (p) => p.isin !== 'TR_TRANSFER' && !p.isin.startsWith('TR_') && !p.name?.includes('Trade Republic')
      )
      const total_value = validPositions.reduce((acc, p) => acc + (p.current_value || 0), 0)
      const total_invested = validPositions.reduce((acc, p) => acc + (p.invested_amount || 0), 0)
      const total_pnl = total_value - total_invested
      const total_pnl_pct = total_invested > 0 ? (total_pnl / total_invested) * 100 : 0
      return {
        total_value: Math.round(total_value * 100) / 100,
        total_invested: Math.round(total_invested * 100) / 100,
        total_pnl: Math.round(total_pnl * 100) / 100,
        total_pnl_pct: Math.round(total_pnl_pct * 100) / 100,
        num_positions: validPositions.length,
        last_updated: validPositions[0]?.last_updated || summary?.last_updated || new Date().toISOString(),
      }
    }
    if (summary && summary.total_value > 0) return summary
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

  const periodProfitValue = useMemo(() => {
    if (period === '5y' && displaySummary?.total_pnl !== undefined) {
      return displaySummary.total_pnl
    }
    return perfStats?.periodProfit ?? displaySummary?.total_pnl ?? 0
  }, [period, displaySummary, perfStats])

  const periodReturnPct = useMemo(() => {
    if (period === '5y') {
      return analytics?.twr ?? displaySummary?.total_pnl_pct ?? perfStats?.realReturnPct ?? 0
    }
    if (period === '1y' && analytics?.return_1y !== undefined && analytics.return_1y !== null) {
      return analytics.return_1y
    }
    if (period === '6mo' && analytics?.return_6m !== undefined && analytics.return_6m !== null) {
      return analytics.return_6m
    }
    if (period === '3mo' && analytics?.return_3m !== undefined && analytics.return_3m !== null) {
      return analytics.return_3m
    }
    if (period === '1mo' && analytics?.return_1m !== undefined && analytics.return_1m !== null) {
      return analytics.return_1m
    }
    return perfStats?.realReturnPct ?? analytics?.return_ytd ?? 0
  }, [period, analytics, displaySummary, perfStats])

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

  // Latest reporting NAV date across active positions (ignoring weekend dates)
  // Uses the date where majority (or mode) of positions have reported
  const latestNavDate = useMemo(() => {
    if (!positions.length) return ''
    const counts: Record<string, number> = {}
    for (const p of positions) {
      const d = p.price_date || p.last_updated
      if (!d) continue
      const dayOfWeek = new Date(d + 'T12:00:00Z').getUTCDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) continue
      counts[d] = (counts[d] || 0) + 1
    }
    const dates = Object.keys(counts).sort()
    if (!dates.length) return ''
    const latest = dates[dates.length - 1]
    if (counts[latest] >= Math.ceil(positions.length / 2)) {
      return latest
    }
    const sortedByCount = Object.entries(counts).sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
    return sortedByCount[0][0]
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
    let hasPositionChanges = false

    // 1. Compute Day Metric (1D)
    // Only count position daily changes if the position's price date matches latestNavDate
    let positionsDailyChange = 0

    if (positions.length > 0) {
      for (const p of positions) {
        const pDate = p.price_date || p.last_updated
        if (pDate && latestNavDate && pDate === latestNavDate) {
          if (typeof p.daily_change === 'number' && !isNaN(p.daily_change) && p.daily_change !== 0) {
            hasPositionChanges = true
            positionsDailyChange += p.daily_change * (p.shares || 1)
          }
        }
      }
    }

    if (hasPositionChanges) {
      const totalVal = positions.reduce((acc, p) => acc + (p.current_value || 0), 0)
      dayAmount = Math.round(positionsDailyChange * 100) / 100
      const prevVal = totalVal - positionsDailyChange
      dayPct = prevVal > 0 ? (positionsDailyChange / prevVal) * 100 : 0
    } else if (performance && performance.length >= 2) {
      // Compute 1D directly from the last 2 sessions of the performance series
      const sorted = [...performance]
        .filter((p) => p && p.date && typeof p.value === 'number')
        .sort((a, b) => a.date.localeCompare(b.date))
      const navSorted = latestNavDate ? sorted.filter((p) => p.date <= latestNavDate) : sorted
      const activeSorted = navSorted.length >= 2 ? navSorted : sorted
      if (activeSorted.length >= 2) {
        const last = activeSorted[activeSorted.length - 1]
        const prev = activeSorted[activeSorted.length - 2]
        const lastInv = last.invested ?? last.value
        const prevInv = prev.invested ?? prev.value
        const inflow = lastInv - prevInv
        const diff = (last.value - inflow) - prev.value
        dayAmount = Math.round(diff * 100) / 100
        dayPct = prev.value > 0 ? (diff / prev.value) * 100 : 0
      }
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
        const lastInv = last.invested ?? last.value
        const weekInv = weekPoint.invested ?? weekPoint.value
        const weekInflow = lastInv - weekInv
        const wProfit = (last.value - weekInflow) - weekPoint.value
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
      hasPositionChanges,
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

      const dayReturnAmount = Math.round(((cur.value - netInflow) - prev.value) * 100) / 100
      let dayReturnPct = 0
      if (prev.value > 0) {
        dayReturnPct = Number((((cur.value - netInflow) - prev.value) / prev.value * 100).toFixed(2))
      }

      const isLatest = i === slice.length - 1

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
  }, [performance, latestNavDate])

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
      // For weekly view, compute 7D and 7D € directly from the 7 sessions shown in weeklyReturnsData
      let weekAmt = shortTermMetrics?.weekAmount
      let weekPct = shortTermMetrics?.weekPct ?? analytics?.return_1w

      if (weeklyReturnsData && weeklyReturnsData.length > 0) {
        let sumAmt = 0
        let compFactor = 1.0
        for (const bar of weeklyReturnsData) {
          sumAmt += bar.amount ?? 0
          compFactor *= (1.0 + (bar.value || 0) / 100.0)
        }
        weekAmt = Math.round(sumAmt * 100) / 100
        weekPct = Number(((compFactor - 1.0) * 100).toFixed(2))
      }

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
  }, [returnsPeriodMode, weeklyReturnsData, shortTermMetrics, analytics])

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Live Market Ticker */}
      <MarketTicker onSelectStock={setSelectedStock} />

      {/* 1. Métricas Globales (Totales Cartera) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Wallet size={13.5} className="text-blue-500" />
            <span>Métricas Globales</span>
            {isGlobalUpdating && <LoadingDot />}
          </div>
          <span data-private className="hidden sm:inline text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Total Cartera
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
          <KpiCard
            hoverGlow
            hero
            label="Valor Total de la Cartera"
            value={
              <AnimatedNumber
                value={displaySummary?.total_value}
                format={fmt.currency}
              />
            }
            extra={
              ((shortTermMetrics && (shortTermMetrics.dayPct !== undefined || shortTermMetrics.weekPct !== undefined)) || (sessionPct !== undefined && !isNaN(sessionPct))) && (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {shortTermMetrics?.dayPct !== undefined && (
                    <span
                      data-private
                      title={shortTermMetrics.dayAmount !== undefined ? `Rendimiento Hoy (1D - NAV oficial): ${shortTermMetrics.dayAmount >= 0 ? '+' : ''}${fmt.currency(shortTermMetrics.dayAmount)} (${fmt.pct(shortTermMetrics.dayPct)})` : `Rendimiento Hoy (1D - NAV oficial): ${fmt.pct(shortTermMetrics.dayPct)}`}
                      className={cn(
                        'inline-flex items-center font-mono font-semibold border transition-all cursor-default',
                        isNativePlatform() ? 'px-1.5 py-0.5 text-[10.5px] rounded-md gap-0.5' : 'px-2 py-0.5 text-xs rounded-lg gap-1',
                        shortTermMetrics.dayPct >= 0
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      )}
                    >
                      <Zap className={isNativePlatform() ? "w-2.5 h-2.5 stroke-[2.2]" : "w-3 h-3 stroke-[2.5]"} />
                      <span>Hoy:</span>
                      <span className="font-bold">{fmt.pct(shortTermMetrics.dayPct)}</span>
                    </span>
                  )}

                  {sessionPct !== undefined && !isNaN(sessionPct) && (
                    <Link
                      to="/market"
                      data-private
                      title={`Rendimiento Sesión Hoy (Mercado en directo): ${sessionPct >= 0 ? '+' : ''}${fmt.pct(sessionPct)}${sessionAmount !== undefined && !isNaN(sessionAmount) ? ` (${sessionAmount >= 0 ? '+' : ''}${fmt.currency(sessionAmount)})` : ''} • Estimación en EUR con réplica de ETFs líquidos (${sessionMarketState || 'LIVE'}). Clic para abrir Mercado.`}
                      className={cn(
                        'inline-flex items-center font-mono font-semibold border transition-all hover:opacity-85 active:scale-95 cursor-pointer',
                        isNativePlatform() ? 'px-1.5 py-0.5 text-[10.5px] rounded-md gap-0.5' : 'px-2 py-0.5 text-xs rounded-lg gap-1',
                        sessionPct >= 0
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      )}
                    >
                      <Activity className={isNativePlatform() ? "w-2.5 h-2.5 stroke-[2.2]" : "w-3 h-3 stroke-[2.5]"} />
                      <span>Live:</span>
                      <span className="font-bold">{fmt.pct(sessionPct)}</span>
                    </Link>
                  )}

                  {shortTermMetrics?.weekPct !== undefined && (
                    <span
                      data-private
                      title={shortTermMetrics.weekAmount !== undefined ? `Rendimiento 7 Días: ${shortTermMetrics.weekAmount >= 0 ? '+' : ''}${fmt.currency(shortTermMetrics.weekAmount)} (${fmt.pct(shortTermMetrics.weekPct)})` : `Rendimiento 7 Días: ${fmt.pct(shortTermMetrics.weekPct)}`}
                      className={cn(
                        'inline-flex items-center font-mono font-semibold border transition-all cursor-default',
                        isNativePlatform() ? 'px-1.5 py-0.5 text-[10.5px] rounded-md gap-0.5' : 'px-2 py-0.5 text-xs rounded-lg gap-1',
                        shortTermMetrics.weekPct >= 0
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      )}
                    >
                      <Calendar className={isNativePlatform() ? "w-2.5 h-2.5 stroke-[2.2]" : "w-3 h-3 stroke-[2.5]"} />
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
              analytics?.annualized_return !== undefined ? (
                <AnimatedNumber value={analytics.annualized_return} format={fmt.pct} />
              ) : displaySummary ? (
                <AnimatedNumber value={displaySummary.total_pnl_pct} format={fmt.pct} />
              ) : (
                '—'
              )
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
            value={
              displaySummary ? (
                <AnimatedNumber
                  value={displaySummary.total_pnl}
                  format={(n) => `${n >= 0 ? '+' : ''}${fmt.currency(n)}`}
                />
              ) : (
                '—'
              )
            }
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
            className="group relative overflow-hidden rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 cursor-card backdrop-blur-md transition-all duration-200 ease-out bg-white/95 border border-slate-200/80 shadow-card hover:shadow-card-hover hover:border-slate-300/90 dark:bg-[#1e1e1e]/96 dark:border-white/[0.08] dark:hover:border-white/[0.16]"
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

              <div className={cn("flex items-baseline justify-between gap-2 min-w-0 transition-opacity duration-300", isRefreshingPrices ? "opacity-65" : "opacity-100")}>
                <div data-private className="text-lg sm:text-[21px] font-bold font-mono tracking-tight text-slate-950 dark:text-white leading-tight shrink-0">
                  <AnimatedNumber value={displaySummary?.total_invested} format={fmt.currency} />
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
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Calendar size={13.5} className="text-indigo-500" />
            <span>Métricas del Periodo ({periodLabel})</span>
            {isPeriodUpdating && <LoadingDot />}
          </div>
          <span data-private className="hidden sm:inline text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {perfStats ? `Rango: ${fmt.currency(perfStats.min)} - ${fmt.currency(perfStats.max)}` : `Filtro: ${periodLabel}`}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
          <KpiCard
            hoverGlow
            hideTagOnMobile
            label={`Rentabilidad (${periodLabel})`}
            value={<AnimatedNumber value={periodReturnPct} format={fmt.pct} />}
            valueColor={periodReturnPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            tag={periodReturnPct >= 0 ? "Rentabilidad" : "Pérdida"}
            tagColor={periodReturnPct >= 0 ? "emerald" : "rose"}
            borderAccent={periodReturnPct >= 0 ? "emerald" : "rose"}
            sub={`rendimiento del periodo ${periodLabel}`}
            delay={0.1}
            icon={<TrendingUp size={15} className={periodReturnPct >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"} />}
            iconBg={periodReturnPct >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"}
            loading={isPeriodUpdating}
          />
          <KpiCard
            hoverGlow
            hideTagOnMobile
            label={`Plusvalía (${periodLabel})`}
            value={
              <AnimatedNumber
                value={periodProfitValue}
                format={(n) => `${n >= 0 ? '+' : ''}${fmt.currency(n)}`}
              />
            }
            valueColor={periodProfitValue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            tag={periodProfitValue >= 0 ? "+ Ganancia" : "- Pérdida"}
            tagColor={periodProfitValue >= 0 ? "emerald" : "rose"}
            borderAccent={periodProfitValue >= 0 ? "emerald" : "rose"}
            sub={`ganancia neta de mercado en ${periodLabel}`}
            delay={0.12}
            icon={<TrendingUp size={15} className={periodProfitValue >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"} />}
            iconBg={periodProfitValue >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"}
            loading={isPeriodUpdating}
          />
          <KpiCard
            hoverGlow
            hideTagOnMobile
            label={`Aportaciones (${periodLabel})`}
            value={perfStats ? <AnimatedNumber value={perfStats.periodInflow} format={fmt.currency} /> : '—'}
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
            value={volVal !== null ? <AnimatedNumber value={volVal} format={(n) => fmt.pct(n, false)} /> : '—'}
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
            value={ddVal !== null ? <AnimatedNumber value={ddVal} format={fmt.pct} /> : '—'}
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
        <Card className="lg:col-span-3 md:col-span-2 flex flex-col justify-between" delay={0.2} loading={isRefreshingPrices}>
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
                  {chartView === 'evolution'
                    ? 'Trayectoria histórica del valor liquidativo acumulado'
                    : 'Rentabilidad neta mes a mes y acumulación anual de la cartera'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Evolution Chart Controls in CardHeader (hidden on mobile) */}
              {chartView === 'evolution' && (
                <div className="hidden sm:flex items-center gap-1.5">
                  {/* Mode Selector (€ vs %) */}
                  <div className="flex rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setPerfChartMode('currency')}
                      className={`relative min-w-[24px] px-2 py-0.5 text-xs font-semibold rounded-md transition-colors text-center ${perfChartMode === 'currency'
                          ? 'text-slate-900 dark:text-white font-bold'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      title="Ver evolución en Euros (€)"
                    >
                      {perfChartMode === 'currency' && (
                        <motion.div
                          layoutId="perfChartModePill"
                          className="absolute inset-0 rounded-md bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                          transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                        />
                      )}
                      <span className="relative z-10">€</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setPerfChartMode('percent')}
                      className={`relative min-w-[24px] px-2 py-0.5 text-xs font-semibold rounded-md transition-colors text-center ${perfChartMode === 'percent'
                          ? 'text-slate-900 dark:text-white font-bold'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      title="Ver rentabilidad acumulada en porcentaje (%)"
                    >
                      {perfChartMode === 'percent' && (
                        <motion.div
                          layoutId="perfChartModePill"
                          className="absolute inset-0 rounded-md bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                          transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                        />
                      )}
                      <span className="relative z-10">%</span>
                    </motion.button>
                  </div>

                  {/* Toggle Invested Capital (only in € mode) */}
                  {perfChartMode === 'currency' && (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setPerfShowInvested(v => !v)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition-all ${perfShowInvested
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      title="Mostrar u ocultar aportaciones"
                    >
                      <span className={`w-2.5 h-0.5 border-t-2 border-dashed ${perfShowInvested ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-400'}`} />
                      <span>Aportado</span>
                    </motion.button>
                  )}
                </div>
              )}

              {/* Curva / Matriz Mensual ALWAYS on the far right */}
              <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setChartView('evolution')}
                  className={`relative rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${chartView === 'evolution'
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                  {chartView === 'evolution' && (
                    <motion.div
                      layoutId="overviewChartViewPill"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                      transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                    />
                  )}
                  <span className="relative z-10">Curva</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setChartView('heatmap')}
                  className={`relative rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${chartView === 'heatmap'
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                  {chartView === 'heatmap' && (
                    <motion.div
                      layoutId="overviewChartViewPill"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                      transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                    />
                  )}
                  <span className="relative z-10">
                    Matriz<span className="hidden sm:inline"> Mensual</span>
                  </span>
                </motion.button>
              </div>
            </div>
          </CardHeader>

          <div className="px-3 pb-3 pt-1.5 flex-1 flex flex-col justify-between min-h-0 relative">
            <div data-private className="flex-1 flex flex-col justify-center min-h-0">
              <AnimatePresence mode="wait" initial={false}>
                {chartView === 'evolution' ? (
                  <motion.div
                    key="evolution"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex-1 flex flex-col justify-center min-h-0 w-full"
                  >
                    {performance.length === 0 && perfFetching ? (
                      <PerformanceChartSkeleton height={260} />
                    ) : performance.length > 0 ? (
                      <PerformanceChart
                        data={performance}
                        height={260}
                        chartMode={perfChartMode}
                        showInvested={perfShowInvested}
                        showMilestones={false}
                        showFooterStrip={false}
                      />
                    ) : (
                      <div className="flex h-[260px] items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                        Sin datos de evolución
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="heatmap"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="py-0.5 flex-1 flex flex-col justify-center min-h-0 w-full"
                  >
                    <MonthlyReturnsHeatmap showStats={true} tableMaxHeight="260px" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Card>

        {/* 2. Asset Allocation Breakdown (20% on desktop: lg:col-span-1, md:col-span-1) */}
        <Card className="lg:col-span-1 md:col-span-1 flex flex-col justify-between" delay={0.2} loading={isRefreshingPrices}>
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
            <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5">
              {(['asset', 'type'] as AllocMode[]).map((m) => (
                <motion.button
                  key={m}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setAllocMode(m)}
                  className={`relative rounded-lg px-2 py-0.5 text-xs font-semibold transition-colors ${allocMode === m
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                  {allocMode === m && (
                    <motion.div
                      layoutId="overviewAllocPill"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                      transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                    />
                  )}
                  <span className="relative z-10 text-[11px]">
                    {m === 'asset' ? 'Activo' : 'Tipo'}
                  </span>
                </motion.button>
              ))}
            </div>
          </CardHeader>

          <div className="px-3 pb-3 pt-1.5 flex flex-col justify-between flex-1 min-h-0 relative">
            <div className="flex flex-col justify-center flex-1 min-h-0 overflow-hidden">
              {positions.length === 0 && positionsFetching ? (
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
            {!allocStats && positionsFetching ? (
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0 animate-pulse">
                <div className="h-[32px] sm:h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
                <div className="h-[32px] sm:h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
              </div>
            ) : allocStats && (
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0">
                {/* Box 1 */}
                <div
                  className="flex items-center justify-between gap-1 px-2 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
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
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`alloc1-${selectedBroker}-${allocMode}-${allocStats.box1Val}`}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.2 }}
                      data-private
                      className="font-mono font-extrabold text-slate-950 dark:text-white text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-0.5"
                    >
                      {allocStats.box1Val}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Box 2 */}
                <div
                  className="flex items-center justify-between gap-1 px-2 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
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
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`alloc2-${selectedBroker}-${allocMode}-${allocStats.box2Val}`}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.2 }}
                      data-private
                      className="font-mono font-extrabold text-slate-950 dark:text-white text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-0.5"
                    >
                      {allocStats.box2Val}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 3. Performance by Period (Global / Semanal 7D) (20% on desktop: lg:col-span-1, md:col-span-1) */}
        <Card className="lg:col-span-1 md:col-span-1 flex flex-col justify-between" delay={0.2} loading={isRefreshingPrices}>
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
                  {returnsPeriodMode === 'global' ? 'Por periodo' : 'Últimos 7 días'}
                </p>
              </div>
            </div>

            <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setReturnsPeriodMode('global')
                  try { localStorage.setItem('returns_period_mode', 'global') } catch { }
                }}
                className={`relative rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-colors ${returnsPeriodMode === 'global'
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                {returnsPeriodMode === 'global' && (
                  <motion.div
                    layoutId="returnsPeriodPill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                    transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                  />
                )}
                <span className="relative z-10 text-[11px]">Global</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setReturnsPeriodMode('weekly')
                  try { localStorage.setItem('returns_period_mode', 'weekly') } catch { }
                }}
                className={`relative rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-colors ${returnsPeriodMode === 'weekly'
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                {returnsPeriodMode === 'weekly' && (
                  <motion.div
                    layoutId="returnsPeriodPill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                    transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                  />
                )}
                <span className="relative z-10 text-[11px]">Semanal</span>
              </motion.button>
            </div>
          </CardHeader>

          <div className="px-3 pb-3 pt-1.5 flex flex-col justify-between flex-1 min-h-0 relative">
            <div data-private className="flex flex-col justify-center flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${returnsPeriodMode}-${selectedBroker}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex flex-col justify-center flex-1 min-h-0 w-full"
                >
                  {returnsPeriodMode === 'global' ? (
                    !analytics && analyticsFetching ? (
                      <ReturnsChartSkeleton compact height={260} />
                    ) : (
                      <ReturnsChart
                        analytics={analytics}
                        mode={returnsPeriodMode}
                        weeklyData={weeklyReturnsData}
                        day1Pct={shortTermMetrics?.dayPct}
                        day1Amount={shortTermMetrics?.dayAmount}
                        weekPct={shortTermMetrics?.weekPct}
                        weekAmount={shortTermMetrics?.weekAmount}
                        totalPortfolioValue={displaySummary?.total_value}
                        compact
                        height={260}
                      />
                    )
                  ) : (
                    (!weeklyReturnsData || weeklyReturnsData.length === 0) && perfFetching ? (
                      <ReturnsChartSkeleton compact height={260} />
                    ) : (
                      <ReturnsChart
                        analytics={analytics}
                        mode={returnsPeriodMode}
                        weeklyData={weeklyReturnsData}
                        day1Pct={shortTermMetrics?.dayPct}
                        day1Amount={shortTermMetrics?.dayAmount}
                        weekPct={shortTermMetrics?.weekPct}
                        weekAmount={shortTermMetrics?.weekAmount}
                        totalPortfolioValue={displaySummary?.total_value}
                        compact
                        height={260}
                      />
                    )
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Useful Stats Strip (Matching Card 1) */}
            {!secondaryStats && (perfFetching || analyticsFetching) ? (
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0 animate-pulse">
                <div className="h-[32px] sm:h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
                <div className="h-[32px] sm:h-[34px] rounded-xl bg-slate-100 dark:bg-white/[0.03]" />
              </div>
            ) : secondaryStats && (
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0">
                {/* Box 1 */}
                <div
                  className="flex items-center justify-between gap-1 px-2 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
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
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`box1-${selectedBroker}-${returnsPeriodMode}-${secondaryStats.box1Val}`}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.2 }}
                      data-private
                      className={cn(
                        'font-mono font-extrabold text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-0.5',
                        secondaryStats.box1Positive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {secondaryStats.box1Val}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Box 2 */}
                <div
                  className="flex items-center justify-between gap-1 px-2 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
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
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`box2-${selectedBroker}-${returnsPeriodMode}-${secondaryStats.box2Val}`}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.2 }}
                      data-private
                      className={cn(
                        'font-mono font-extrabold text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-0.5',
                        returnsPeriodMode === 'global'
                          ? 'text-slate-900 dark:text-white'
                          : secondaryStats.box2Positive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {secondaryStats.box2Val}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Posiciones en Cartera (Full Width with 2 Parallel Columns) */}
      <Card className="w-full relative overflow-hidden" delay={0.3} loading={isRefreshingPrices}>
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border border-slate-200/80 dark:border-white/[0.08]"
          >
            <span>Ver todas ({positions.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        {/* Dynamic Parallel Columns Grid (switches cleanly to full-width if <= 5 positions to avoid empty column) */}
        {(() => {
          const overviewPositions = sortedPositions.slice(0, 10)
          const hasSecondColumn = overviewPositions.length > 5
          const splitIndex = hasSecondColumn ? Math.ceil(overviewPositions.length / 2) : overviewPositions.length
          const col1Positions = overviewPositions.slice(0, splitIndex)
          const col2Positions = hasSecondColumn ? overviewPositions.slice(splitIndex) : []

          return (
            <div className={cn(
              "overflow-hidden transition-all duration-200",
              hasSecondColumn
                ? "grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-200/80 dark:divide-white/[0.04]"
                : "w-full"
            )}>
              {/* Column 1: Top Positions */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/90 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01] text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-2 pl-3 pr-1 text-center w-6 text-slate-400">#</th>
                      <th className="py-2 px-2.5">Activo / Fondo</th>
                      <th className="py-2 px-2 text-right">NAV</th>
                      <th className="py-2 px-2 text-right">Rend. Día</th>
                      <th className="py-2 px-2 text-right">{isNativePlatform() ? 'Valor' : 'Valor Actual'}</th>
                      <th className="py-2 px-2 text-right">{isNativePlatform() ? 'Ganancia' : 'Ganancia (P&L)'}</th>
                      {!isNativePlatform() && <th className="py-2 px-2 text-center">Banco</th>}
                      <th className="py-2 pr-3 pl-1.5 text-right">Peso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {positionsLoading && positions.length === 0 ? (
                      <TableSkeletonRows rows={5} cols={8} />
                    ) : (
                      col1Positions.map((p) => {
                        const isRowHovered = hoveredIsin === p.isin
                        const assetColor = assetColorMap[p.isin]
                        const isUpdated = Boolean(latestNavDate && (p.price_date || p.last_updated) === latestNavDate)

                        return (
                          <motion.tr
                            key={p.isin}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setSelectedPosition(p)}
                            onMouseEnter={() => setHoveredIsin(p.isin)}
                            onMouseLeave={() => setHoveredIsin(null)}
                            title={isUpdated ? `Actualizado con último NAV (${p.price_date || p.last_updated})` : `Pendiente de nuevo NAV (último: ${p.price_date || p.last_updated})`}
                            className={cn(
                              'transition-colors group cursor-pointer relative',
                              isRowHovered
                                ? 'bg-slate-100/80 dark:bg-[#2a2d2e]'
                                : 'hover:bg-slate-50/80 dark:hover:bg-[#2a2d2e]/60'
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
                                  <div className="font-semibold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-white transition-colors truncate max-w-[110px] sm:max-w-[130px] 2xl:max-w-[160px] text-[14px]">
                                    {p.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 font-mono text-[12.5px] font-semibold text-slate-600 dark:text-slate-400">
                                    <span>{p.isin}</span>
                                    {!isNativePlatform() && <AssetBadge type={p.asset_type} />}
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
                            {!isNativePlatform() && (
                              <td className="py-2.5 px-2 text-center">
                                <BrokerBadge broker={p.broker} />
                              </td>
                            )}
                            <td className="py-2.5 pr-3 pl-1.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <MiniDonut value={p.weight} size={22} strokeWidth={3} color={assetColor} />
                                <span
                                  className={cn(
                                    'font-mono font-bold text-right text-[13px] transition-colors',
                                    isRowHovered ? 'text-slate-950 dark:text-white font-extrabold' : 'text-slate-800 dark:text-slate-200'
                                  )}
                                >
                                  {p.weight.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Column 2: Remaining Positions (rendered only when > 5 positions) */}
              {hasSecondColumn && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="hidden xl:table-header-group">
                      <tr className="border-b border-slate-200/90 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01] text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-2 pl-3 pr-1 text-center w-6 text-slate-400">#</th>
                        <th className="py-2 px-2.5">Activo / Fondo</th>
                        <th className="py-2 px-2 text-right">NAV</th>
                        <th className="py-2 px-2 text-right">Rend. Día</th>
                        <th className="py-2 px-2 text-right">{isNativePlatform() ? 'Valor' : 'Valor Actual'}</th>
                        <th className="py-2 px-2 text-right">{isNativePlatform() ? 'Ganancia' : 'Ganancia (P&L)'}</th>
                        {!isNativePlatform() && <th className="py-2 px-2 text-center">Banco</th>}
                        <th className="py-2 pr-3 pl-1.5 text-right">Peso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                      {positionsLoading && positions.length === 0 ? (
                        <TableSkeletonRows rows={5} cols={8} />
                      ) : (
                        col2Positions.map((p) => {
                          const isRowHovered = hoveredIsin === p.isin
                          const assetColor = assetColorMap[p.isin]
                          const isUpdated = Boolean(latestNavDate && (p.price_date || p.last_updated) === latestNavDate)

                          return (
                            <motion.tr
                              key={p.isin}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15 }}
                              onClick={() => setSelectedPosition(p)}
                              onMouseEnter={() => setHoveredIsin(p.isin)}
                              onMouseLeave={() => setHoveredIsin(null)}
                              title={isUpdated ? `Actualizado con último NAV (${p.price_date || p.last_updated})` : `Pendiente de nuevo NAV (último: ${p.price_date || p.last_updated})`}
                              className={cn(
                                'transition-colors group cursor-pointer relative',
                                isRowHovered
                                  ? 'bg-slate-100/80 dark:bg-[#2a2d2e]'
                                  : 'hover:bg-slate-50/80 dark:hover:bg-[#2a2d2e]/60'
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
                                    <div className="font-semibold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-white transition-colors truncate max-w-[110px] sm:max-w-[130px] 2xl:max-w-[160px] text-[14px]">
                                      {p.name}
                                    </div>
                                    <div className="flex items-center gap-1.5 font-mono text-[12.5px] font-semibold text-slate-600 dark:text-slate-400">
                                      <span>{p.isin}</span>
                                      {!isNativePlatform() && <AssetBadge type={p.asset_type} />}
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
                              {!isNativePlatform() && (
                                <td className="py-2.5 px-2 text-center">
                                  <BrokerBadge broker={p.broker} />
                                </td>
                              )}
                              <td className="py-2.5 pr-3 pl-1.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <MiniDonut value={p.weight} size={22} strokeWidth={3} color={assetColor} />
                                  <span
                                    className={cn(
                                      'font-mono font-bold text-right text-[13px] transition-colors',
                                      isRowHovered ? 'text-slate-950 dark:text-white font-extrabold' : 'text-slate-800 dark:text-slate-200'
                                    )}
                                  >
                                    {p.weight.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}
      </Card>

      {/* ── Comparativa de Rendimiento vs Benchmarks (Analítica) ─────────────── */}
      <Card className="w-full" delay={0.32} loading={benchmarkFetching}>
        <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Comparativa de Rendimiento vs Benchmarks
                </CardTitle>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/20">
                  Time-Weighted
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Evolución comparativa neutralizando aportaciones frente a S&P 500, MSCI World, NASDAQ y tipo libre de riesgo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {alphaSp !== null && (
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3 h-[30px] rounded-xl border text-xs transition-all shrink-0",
                  alphaSp >= 0
                    ? "bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/40 text-rose-800 dark:text-rose-300"
                )}
                title="Alfa generado frente al índice S&P 500 (rentabilidad de tu cartera menos rentabilidad del S&P 500 para el periodo seleccionado)"
              >
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                  {alphaSp >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span>Alfa vs S&P 500:</span>
                </div>
                <span className="font-mono font-bold text-xs">
                  {alphaSp >= 0 ? '+' : ''}
                  {alphaSp.toFixed(2)}%
                </span>
              </div>
            )}

            <Link
              to="/analytics"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-3 h-[30px] rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border border-slate-200/80 dark:border-white/[0.08] shrink-0"
            >
              <span>Ver analítica completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardHeader>

        <div className="p-4 sm:p-5 pt-1">
          <BenchmarkEvolutionChart
            data={benchmarkData}
            height={300}
            mode={benchmarkMode}
            onModeChange={setBenchmarkMode}
            showModeSelector={true}
          />
        </div>
      </Card>

      {/* ── Últimos Movimientos y Mapa de Calor del Mercado (Uno a cada lado) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Columna Izquierda: Tabla de Últimos Movimientos */}
        <Card className="w-full flex flex-col h-full relative overflow-hidden" delay={0.35}>
          <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Últimos Movimientos
                  </CardTitle>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.08]">
                    {filteredTransactions.length} {filteredTransactions.length === 1 ? 'operación' : 'operaciones'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Historial reciente de operaciones
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
              {/* Filter Pills */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
                {(['all', 'buy', 'dividend', 'sell'] as const).map((type) => {
                  const label = type === 'all' ? 'Todos' : type === 'buy' ? 'Compras' : type === 'dividend' ? 'Div.' : 'Ventas'
                  const count = type === 'all' ? transactions.length : type === 'buy' ? txStats.buysCount : type === 'dividend' ? txStats.divsCount : txStats.sellsCount
                  const active = txFilterType === type
                  return (
                    <button
                      key={type}
                      onClick={() => setTxFilterType(type)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                        active
                          ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {label} <span className="opacity-60 text-[10.5px]">({count})</span>
                    </button>
                  )
                })}
              </div>

              <Link
                to="/transactions"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border border-slate-200/80 dark:border-white/[0.08] shrink-0"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>

          {/* Quick summary strip */}
          <div className="px-4 py-2 bg-slate-50/50 dark:bg-white/[0.01] border-b border-slate-100 dark:border-white/[0.04] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Compras: <strong className="text-slate-900 dark:text-white font-mono">{fmt.currency(txStats.totalBought)}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Dividendos: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">+{fmt.currency(txStats.totalDivs)}</strong>
              </span>
            </div>
          </div>

          {/* Transactions Table */}
          <div data-private className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.01]">
                  <th className="py-2.5 px-3 font-semibold">Fecha</th>
                  <th className="py-2.5 px-3 font-semibold">Activo</th>
                  <th className="py-2.5 px-2 font-semibold text-center">Tipo</th>
                  <th className="py-2.5 px-2 font-semibold text-center hidden xl:table-cell">Entidad</th>
                  <th className="py-2.5 px-2 font-semibold text-right hidden 2xl:table-cell">Títulos</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {txLoading && transactions.length === 0 ? (
                  <TableSkeletonRows rows={5} cols={6} />
                ) : !filteredTransactions.length ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                      No se han encontrado movimientos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.slice(0, 10).map((t) => {
                    const isBuy = t.type === 'buy'
                    const isDiv = t.type === 'dividend'
                    const isSell = t.type === 'sell'
                    const pos = positions.find((p) => p.isin === t.isin)

                    return (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                          onClick={() => {
                            if (pos) setSelectedPosition(pos)
                          }}
                          className="hover:bg-slate-50/90 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                        >
                          {/* Fecha */}
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {fmt.date(t.date)}
                          </td>

                          {/* Activo con logo */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2 min-w-[130px]">
                              <div className="w-6 h-6 rounded-md overflow-hidden shrink-0 flex items-center justify-center bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08]">
                                <CompanyLogo ticker={pos?.ticker || t.isin} name={t.name || ''} domain={pos?.domain} size="sm" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[170px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {t.name || t.isin}
                                </div>
                                <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 truncate">
                                  {pos?.ticker || t.isin}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Tipo badge */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold",
                              isBuy && "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
                              isDiv && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
                              isSell && "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                            )}>
                              {isBuy ? 'Compra' : isDiv ? 'Dividendo' : isSell ? 'Venta' : 'Traspaso'}
                            </span>
                          </td>

                          {/* Broker badge */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap hidden xl:table-cell">
                            <BrokerBadge broker={t.broker} />
                          </td>

                          {/* Títulos / participaciones */}
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap hidden 2xl:table-cell">
                            {t.shares > 0 ? `${fmt.num(t.shares)} part.` : '—'}
                          </td>

                          {/* Importe Total */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                            <span className={cn(
                              "text-[12.5px]",
                              isDiv ? "text-emerald-600 dark:text-emerald-400" : isSell ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                            )}>
                              {isDiv ? `+${fmt.currency(t.amount)}` : fmt.currency(t.amount)}
                            </span>
                          </td>
                        </motion.tr>
                      )
                    })
                  )}
              </tbody>
            </table>
          </div>

          {/* Footer link */}
          <div className="p-3 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/30 dark:bg-white/[0.01] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{Math.min(10, filteredTransactions.length)} de {filteredTransactions.length} movs</span>
            <Link
              to="/transactions"
              className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <span>Historial completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Columna Derecha: Mapa de Calor del Mercado */}
        <div className="w-full h-full">
          {marketData?.stocks && marketData.stocks.length > 0 ? (
            <MarketHeatmap
              stocks={marketData.stocks}
              onSelectStock={(s) => setSelectedStock(s)}
              showViewAllLink
              defaultExpanded={true}
            />
          ) : (
            <div className="h-64 rounded-2xl bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/[0.08] animate-pulse flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs font-medium">
              Cargando mapa de calor del mercado...
            </div>
          )}
        </div>
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
