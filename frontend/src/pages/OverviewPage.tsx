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
  Eye,
  EyeOff,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Header } from '@/components/layout/Header'
import { KpiCard } from '@/components/ui/KpiCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { AllocationChart } from '@/components/charts/AllocationChart'
import { MonthlyReturnsHeatmap } from '@/components/charts/MonthlyReturnsHeatmap'
import { AssetBadge, BrokerBadge, PnlBadge } from '@/components/ui/Badge'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { MiniDonut } from '@/components/ui/MiniDonut'
import { MarketTicker } from '@/components/market/MarketTicker'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import { fmt, cn, PALETTE } from '@/lib/utils'
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
  const { currentUser, period } = useAppStore()
  const periodLabel = PERIOD_LABELS[period] || 'Periodo'
  const [allocMode, setAllocMode] = useState<AllocMode>('asset')
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [hoveredIsin, setHoveredIsin] = useState<string | null>(null)
  const [showLegend, setShowLegend] = useState(false)
  const [chartView, setChartView] = useState<'evolution' | 'heatmap'>('evolution')

  const { data: summary, isFetching: summaryFetching } = usePortfolioSummary()
  const { data: positions = [], isFetching: positionsFetching } = usePositions()

  const assetColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    positions.forEach((p, idx) => {
      map[p.isin] = PALETTE[idx % PALETTE.length]
    })
    return map
  }, [positions])
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

  const isGlobalUpdating = summaryFetching || positionsFetching
  const isPeriodUpdating = perfFetching || analyticsFetching
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

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Unified High-End Header */}
      <Header
        title="Visión General"
        subtitle={
          currentUser
            ? `${currentUser.strategy} • ${currentUser.broker}`
            : 'Resumen ejecutivo del patrimonio, evolución de rentabilidad y asignación global.'
        }
        showPeriodSelector
      />

      {/* Live Market Ticker */}
      <MarketTicker onSelectStock={setSelectedStock} />

      {/* 1. Métricas Globales (Totales Cartera) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Wallet size={13.5} className="text-blue-500" />
            <span>Métricas Globales y del Periodo ({periodLabel})</span>
            {isAnyUpdating && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-semibold lowercase tracking-normal">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                actualizando...
              </span>
            )}
          </div>
          <span data-private className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {perfStats ? `Rango: ${fmt.currency(perfStats.min)} - ${fmt.currency(perfStats.max)}` : `Filtro: ${periodLabel}`}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
          <KpiCard
            hero
            label="Valor Total de la Cartera"
            value={fmt.currency(displaySummary?.total_value)}
            change={
              displaySummary && displaySummary.total_invested > 0
                ? `${(displaySummary.total_pnl ?? 0) >= 0 ? '+' : ''}${fmt.currency(displaySummary.total_pnl)} (${fmt.pct(displaySummary.total_pnl_pct)})`
                : '—'
            }
            changePositive={pnlPositive}
            sub={displaySummary ? `Aportado: ${fmt.currency(displaySummary.total_invested)}` : undefined}
            tag={displaySummary ? `${displaySummary.num_positions ?? positions.length} pos.` : undefined}
            tagColor="blue"
            borderAccent="blue"
            delay={0}
            className="lg:col-span-2"
            icon={<Wallet size={16} className="text-blue-500 dark:text-blue-400" />}
            iconBg="bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400"
            loading={isGlobalUpdating}
          />
          <KpiCard
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
            change="TIR Anual"
            sub="tasa ponderada por flujos desde inicio"
            changePositive={true}
            delay={0.05}
            icon={<TrendingUp size={16} className="text-emerald-500 dark:text-emerald-400" />}
            iconBg="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
            loading={isGlobalUpdating || isPeriodUpdating}
          />
          <KpiCard
            label="Plusvalía Acumulada"
            value={displaySummary ? `${pnlPositive ? '+' : ''}${fmt.currency(displaySummary.total_pnl)}` : '—'}
            valueColor={pnlPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            change={displaySummary ? fmt.pct(displaySummary.total_pnl_pct) : undefined}
            tag={pnlPositive ? "+ Ganancia" : "- Pérdida"}
            tagColor={pnlPositive ? "emerald" : "rose"}
            borderAccent={pnlPositive ? "emerald" : "rose"}
            sub="ganancia neta total latente"
            changePositive={pnlPositive}
            delay={0.1}
            icon={<ArrowUpRight size={16} className={pnlPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"} />}
            iconBg={pnlPositive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"}
            loading={isGlobalUpdating}
          />
          <div
            className="group relative overflow-hidden rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 bg-white/95 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 hover:shadow-md dark:bg-[#111625]/85 dark:border-white/[0.08] dark:shadow-lg dark:shadow-black/20 dark:hover:border-white/[0.16] hover:border-indigo-500/40 dark:hover:border-indigo-500/40"
            title="Aportación programada (DCA): 416,66 € / mes cada día 7 en Indexa EPSV Más Rentabilidad Acciones. Próxima: 07/10/2026"
          >
            {isGlobalUpdating ? (
              <div className="pointer-events-none absolute -top-px left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 animate-pulse z-10" />
            ) : (
              <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent dark:via-white/15" />
            )}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
                  Total Invertido
                </p>
                {isGlobalUpdating && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 shrink-0 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    <span className="hidden sm:inline">Actualizando</span>
                  </span>
                )}
              </div>
              <span data-private className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                DCA 416,66 €/m
              </span>
            </div>

            <div className={cn("flex items-baseline justify-between gap-2 min-w-0 transition-opacity duration-300", isGlobalUpdating ? "opacity-65" : "opacity-100")}>
              <div data-private className="text-lg sm:text-[21px] font-bold font-mono tracking-tight text-slate-950 dark:text-white leading-tight shrink-0">
                {fmt.currency(displaySummary?.total_invested)}
              </div>
              <span data-private className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Indexa día 7 • {displaySummary?.num_positions ?? positions.length} pos.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Métricas del Periodo Seleccionado */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          <KpiCard
            label={`Rentabilidad (${periodLabel})`}
            value={
              perfStats
                ? fmt.pct(perfStats.realReturnPct)
                : analytics?.return_ytd !== undefined
                ? fmt.pct(analytics.return_ytd)
                : '—'
            }
            valueColor={(perfStats?.periodProfit ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            change={
              perfStats
                ? `${perfStats.periodProfit >= 0 ? '+' : ''}${fmt.currency(perfStats.periodProfit)}`
                : undefined
            }
            tag={(perfStats?.realReturnPct ?? 0) >= 0 ? "Rentabilidad" : "Pérdida"}
            tagColor={(perfStats?.realReturnPct ?? 0) >= 0 ? "emerald" : "rose"}
            borderAccent={(perfStats?.realReturnPct ?? 0) >= 0 ? "emerald" : "rose"}
            sub={`ganancia neta de mercado en ${periodLabel}`}
            changePositive={(perfStats?.periodProfit ?? 0) >= 0}
            delay={0.1}
            icon={<TrendingUp size={15} className={(perfStats?.realReturnPct ?? 0) >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"} />}
            iconBg={(perfStats?.realReturnPct ?? 0) >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"}
            loading={isPeriodUpdating}
          />
          <KpiCard
            label={`Aportaciones (${periodLabel})`}
            value={perfStats ? fmt.currency(perfStats.periodInflow) : '—'}
            valueColor="text-blue-600 dark:text-blue-400"
            change={perfStats && perfStats.periodInflow !== 0 ? 'DCA / Compras' : undefined}
            tag={perfStats && perfStats.periodInflow > 0 ? "Inversión neta" : "Sin compras"}
            tagColor="blue"
            borderAccent="blue"
            sub={`capital neto ingresado en ${periodLabel}`}
            changePositive={true}
            delay={0.12}
            icon={<Wallet size={15} className="text-blue-500 dark:text-blue-400" />}
            iconBg="bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400"
            loading={isPeriodUpdating}
          />
          <KpiCard
            label={`Volatilidad (${periodLabel})`}
            value={volVal !== null ? fmt.pct(volVal, false) : '—'}
            valueColor="text-amber-500 dark:text-amber-400"
            tag={volTag}
            tagColor="amber"
            borderAccent="amber"
            sub="fluctuación anualizada de mercado (σ)"
            delay={0.14}
            icon={<Activity size={15} className="text-amber-500 dark:text-amber-400" />}
            iconBg="bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400"
            loading={isPeriodUpdating}
          />
          <KpiCard
            label={`Máxima Caída (${periodLabel})`}
            value={ddVal !== null ? fmt.pct(ddVal) : '—'}
            valueColor="text-rose-500 dark:text-rose-400"
            tag={ddTag}
            tagColor="rose"
            borderAccent="rose"
            sub={`peor caída en ${periodLabel}`}
            changePositive={false}
            delay={0.16}
            icon={<TrendingDown size={15} className="text-rose-500 dark:text-rose-400" />}
            iconBg="bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"
            loading={isPeriodUpdating}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Performance Evolution Chart */}
        <Card className="lg:col-span-2" delay={0.2} loading={isPeriodUpdating}>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle>Evolución Patrimonial</CardTitle>
                  {isPeriodUpdating && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 shrink-0 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                      <span className="hidden sm:inline">Actualizando</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  Trayectoria histórica del valor liquidativo acumulado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0d121f] p-0.5">
                <button
                  onClick={() => setChartView('evolution')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    chartView === 'evolution'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Curva
                </button>
                <button
                  onClick={() => setChartView('heatmap')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    chartView === 'heatmap'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Matriz Mensual
                </button>
              </div>

              {/* Performance Period Stats Pill */}
              {perfStats && chartView === 'evolution' && (
                <div data-private
                  className={cn(
                    'hidden xl:flex items-center gap-3 text-xs font-mono bg-slate-100 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06] transition-opacity duration-300',
                    isPeriodUpdating ? 'opacity-65' : 'opacity-100'
                  )}
                >
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    Rango:{' '}
                    <span className="text-slate-900 dark:text-slate-100 font-bold">
                      {fmt.currency(perfStats.min)} - {fmt.currency(perfStats.max)}
                    </span>
                  </span>
                  <span
                    className={`font-bold ${
                      perfStats.periodProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                    title={`Ganancia neta: ${fmt.currency(perfStats.periodProfit)} | Aportaciones: ${fmt.currency(perfStats.periodInflow)}`}
                  >
                    {perfStats.periodProfit >= 0 ? '+' : ''}
                    {fmt.currency(perfStats.periodProfit)} ({fmt.pct(perfStats.realReturnPct)})
                  </span>
                </div>
              )}
            </div>
          </CardHeader>

          <div className={cn("px-5 pb-3.5 pt-1.5 transition-opacity duration-300", isPeriodUpdating ? "opacity-65" : "opacity-100")}>
            {chartView === 'evolution' ? (
              performance.length > 0 ? (
                <PerformanceChart data={performance} height={280} />
              ) : (
                <div className="flex h-[280px] items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                  Sin datos de evolución
                </div>
              )
            ) : (
              <div className="py-2">
                <MonthlyReturnsHeatmap data={performance} />
              </div>
            )}
          </div>
        </Card>

        {/* Asset Allocation Breakdown */}
        <Card className="lg:col-span-1 flex flex-col" delay={0.25}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20">
                <PieChart className="w-4 h-4" />
              </div>
              <CardTitle>Distribución</CardTitle>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Toggle Mode */}
              <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0d121f] p-0.5">
                {(['asset', 'type'] as AllocMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setAllocMode(m)}
                    className={`relative rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      allocMode === m
                        ? 'text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {allocMode === m && (
                      <motion.div
                        layoutId="overviewAllocPill"
                        className="absolute inset-0 rounded-lg bg-blue-600 shadow-sm shadow-blue-600/30"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                      />
                    )}
                    <span className="relative z-10">
                      {m === 'asset' ? 'Activo' : 'Tipo'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Toggle Legend Button matching EXACT style of selector */}
              <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0d121f] p-0.5">
                <button
                  type="button"
                  onClick={() => setShowLegend((v) => !v)}
                  title={showLegend ? 'Ocultar leyenda' : 'Mostrar leyenda'}
                  aria-label={showLegend ? 'Ocultar leyenda' : 'Mostrar leyenda'}
                  className={`relative rounded-lg h-[26px] w-[26px] sm:h-7 sm:w-7 flex items-center justify-center transition-colors ${
                    showLegend
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {showLegend && (
                    <motion.div
                      layoutId="overviewLegendPill"
                      className="absolute inset-0 rounded-lg bg-blue-600 shadow-sm shadow-blue-600/30"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center">
                    {showLegend ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </span>
                </button>
              </div>
            </div>
          </CardHeader>

          <div className="px-5 pb-3.5 pt-1.5 flex flex-col justify-center flex-1">
            {positions.length > 0 ? (
              <AllocationChart
                positions={positions}
                mode={allocMode}
                showLegend={showLegend}
                hoveredIsin={hoveredIsin}
                onHoverIsin={setHoveredIsin}
              />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-slate-500 text-sm">
                Sin posiciones registradas
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Mayores Posiciones en Cartera (Full Width with 2 Parallel Columns) */}
      <Card className="w-full" delay={0.3}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <CardTitle>Mayores Posiciones en Cartera</CardTitle>
          </div>

          <Link
            to="/positions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20"
          >
            <span>Ver todas (<span data-private>{positions.length}</span>)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        {/* 2 Parallel Columns Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-200/80 dark:divide-white/[0.04] overflow-hidden">
          {/* Column 1: Top 5 Positions */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/90 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01] text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-2 pl-3 pr-1 text-center w-6 text-slate-400">#</th>
                  <th className="py-2 px-2.5">Activo / Fondo</th>
                  <th className="py-2 px-2 text-center">Banco</th>
                  <th className="py-2 px-2 text-right">NAV</th>
                  <th className="py-2 px-2 text-right">Rend. Día</th>
                  <th className="py-2 px-2 text-right">Valor Actual</th>
                  <th className="py-2 px-2 text-right">Ganancia (P&L)</th>
                  <th className="py-2 pr-3 pl-1.5 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {sortedPositions.slice(0, 5).map((p, i) => {
                  const isRowHovered = hoveredIsin === p.isin
                  const assetColor = assetColorMap[p.isin]

                  return (
                    <motion.tr
                      key={p.isin}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                      onClick={() => setSelectedPosition(p)}
                      onMouseEnter={() => setHoveredIsin(p.isin)}
                      onMouseLeave={() => setHoveredIsin(null)}
                      className={cn(
                        'transition-colors group cursor-pointer',
                        isRowHovered
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                      )}
                    >
                      <td className="py-2.5 pl-3 pr-1 text-center">
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
                            <div className="flex items-center gap-1.5 font-mono text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                              <span>{p.isin}</span>
                              <AssetBadge type={p.asset_type} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <BrokerBadge broker={p.broker} />
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-[13.5px] leading-tight">
                          {p.current_price ? fmt.price(p.current_price, p.currency) : '—'}
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
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
                              'inline-flex items-center gap-0.5 font-mono text-[12px] font-bold',
                              p.daily_change_pct > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : p.daily_change_pct < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500 dark:text-slate-400'
                            )}
                          >
                            {p.daily_change_pct > 0 ? (
                              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                            ) : p.daily_change_pct < 0 ? (
                              <TrendingDown className="w-3 h-3 stroke-[2.5]" />
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
                          <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                            {fmt.pct(p.unrealized_pnl_pct)}
                          </span>
                        </div>
                      </td>
                      <td data-private className="py-2.5 pr-3 pl-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <MiniDonut value={p.weight} size={22} strokeWidth={3} color={assetColor} />
                          <span
                            className={cn(
                              'font-mono font-bold text-right text-[12px] transition-colors',
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
              <thead>
                <tr className="border-b border-slate-200/90 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01] text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-2 pl-3 pr-1 text-center w-6 text-slate-400">#</th>
                  <th className="py-2 px-2.5">Activo / Fondo</th>
                  <th className="py-2 px-2 text-center">Banco</th>
                  <th className="py-2 px-2 text-right">NAV</th>
                  <th className="py-2 px-2 text-right">Rend. Día</th>
                  <th className="py-2 px-2 text-right">Valor Actual</th>
                  <th className="py-2 px-2 text-right">Ganancia (P&L)</th>
                  <th className="py-2 pr-3 pl-1.5 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {sortedPositions.slice(5, 10).map((p, i) => {
                  const isRowHovered = hoveredIsin === p.isin
                  const assetColor = assetColorMap[p.isin]

                  return (
                    <motion.tr
                      key={p.isin}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.03 }}
                      onClick={() => setSelectedPosition(p)}
                      onMouseEnter={() => setHoveredIsin(p.isin)}
                      onMouseLeave={() => setHoveredIsin(null)}
                      className={cn(
                        'transition-colors group cursor-pointer',
                        isRowHovered
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                      )}
                    >
                      <td className="py-2.5 pl-3 pr-1 text-center">
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
                            <div className="flex items-center gap-1.5 font-mono text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                              <span>{p.isin}</span>
                              <AssetBadge type={p.asset_type} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <BrokerBadge broker={p.broker} />
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-[13.5px] leading-tight">
                          {p.current_price ? fmt.price(p.current_price, p.currency) : '—'}
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
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
                              'inline-flex items-center gap-0.5 font-mono text-[12px] font-bold',
                              p.daily_change_pct > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : p.daily_change_pct < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500 dark:text-slate-400'
                            )}
                          >
                            {p.daily_change_pct > 0 ? (
                              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                            ) : p.daily_change_pct < 0 ? (
                              <TrendingDown className="w-3 h-3 stroke-[2.5]" />
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
                          <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                            {fmt.pct(p.unrealized_pnl_pct)}
                          </span>
                        </div>
                      </td>
                      <td data-private className="py-2.5 pr-3 pl-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <MiniDonut value={p.weight} size={22} strokeWidth={3} color={assetColor} />
                          <span
                            className={cn(
                              'font-mono font-bold text-right text-[12px] transition-colors',
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
            <div className="h-64 rounded-2xl bg-slate-100 dark:bg-[#0f1424] border border-slate-200 dark:border-white/[0.08] animate-pulse flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs font-medium">
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
