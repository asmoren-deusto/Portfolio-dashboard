import React, { useState } from 'react'
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
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Header } from '@/components/layout/Header'
import { KpiCard } from '@/components/ui/KpiCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { AllocationChart } from '@/components/charts/AllocationChart'
import { AssetBadge, PnlBadge } from '@/components/ui/Badge'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { MarketTicker } from '@/components/market/MarketTicker'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import { fmt } from '@/lib/utils'

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

export function OverviewPage() {
  const [allocMode, setAllocMode] = useState<AllocMode>('asset')
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)

  const { data: summary } = usePortfolioSummary()
  const { data: positions = [] } = usePositions()
  const { data: performance = [] } = usePerformance()
  const { data: analytics } = useAnalytics()
  const { data: transactions = [] } = useTransactions()
  const { data: marketData } = useMarketQuotes('Todos')

  const pnlPositive = (summary?.total_pnl ?? 0) >= 0

  // Quick stats on performance period
  const perfStats = React.useMemo(() => {
    if (!performance || performance.length === 0) return null
    const first = performance[0].value
    const last = performance[performance.length - 1].value
    const diff = last - first
    const diffPct = first > 0 ? (diff / first) * 100 : 0
    let max = -Infinity
    let min = Infinity
    performance.forEach((p) => {
      if (p.value > max) max = p.value
      if (p.value < min) min = p.value
    })
    return { first, last, diff, diffPct, max, min }
  }, [performance])

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Unified High-End Header */}
      <Header
        title="Visión General"
        subtitle="Resumen ejecutivo del patrimonio, evolución de rentabilidad y asignación global."
        badge="Cartera MyInvestor"
        badgeColor="blue"
        showPeriodSelector
      />

      {/* Live Market Ticker */}
      <MarketTicker onSelectStock={setSelectedStock} />

      {/* Top Hero KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
        <KpiCard
          hero
          label="Valor Total de la Cartera"
          value={fmt.currency(summary?.total_value)}
          change={
            summary
              ? `${(summary.total_pnl ?? 0) >= 0 ? '+' : ''}${fmt.currency(summary.total_pnl)} (${fmt.pct(summary.total_pnl_pct)})`
              : '—'
          }
          changePositive={pnlPositive}
          sub={summary ? `Invertido: ${fmt.currency(summary.total_invested)}` : undefined}
          delay={0}
          className="lg:col-span-2"
          icon={<Wallet size={16} className="text-blue-400" />}
        />
        <KpiCard
          label="Rentabilidad Global"
          value={summary ? fmt.pct(summary.total_pnl_pct) : '—'}
          sub="acumulada desde inicio"
          changePositive={pnlPositive}
          delay={0.05}
          icon={
            pnlPositive ? (
              <TrendingUp size={16} className="text-emerald-400" />
            ) : (
              <TrendingDown size={16} className="text-rose-400" />
            )
          }
        />
        <KpiCard
          label="Tasa CAGR"
          value={analytics ? fmt.pct(analytics.cagr) : '—'}
          sub="crecimiento anual compuesto"
          changePositive={(analytics?.cagr ?? 0) >= 0}
          delay={0.1}
          icon={<BarChart3 size={16} className="text-indigo-400" />}
        />
        <KpiCard
          label="Sharpe Ratio"
          value={analytics ? fmt.ratio(analytics.sharpe_ratio) : '—'}
          sub="eficiencia riesgo / retorno"
          delay={0.15}
          icon={<ShieldCheck size={16} className="text-violet-400" />}
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        <KpiCard
          label="Rentabilidad Ponderada (TWR)"
          value={analytics ? fmt.pct(analytics.twr) : '—'}
          sub="time-weighted return"
          changePositive={(analytics?.twr ?? 0) >= 0}
          delay={0.1}
          icon={<Activity size={15} className="text-cyan-400" />}
        />
        <KpiCard
          label="Volatilidad Anualizada"
          value={analytics ? fmt.pct(analytics.volatility, false) : '—'}
          sub="desviación típica anual"
          delay={0.12}
          icon={<TrendingUp size={15} className="text-amber-400" />}
        />
        <KpiCard
          label="Máxima Caída (Drawdown)"
          value={analytics ? fmt.pct(analytics.max_drawdown) : '—'}
          sub="máxima pérdida histórica"
          changePositive={false}
          delay={0.14}
          icon={<TrendingDown size={15} className="text-rose-400" />}
        />
        <KpiCard
          label="Total Invertido"
          value={fmt.currency(summary?.total_invested)}
          sub={`${summary?.num_positions ?? positions.length} posiciones activas`}
          delay={0.16}
          icon={<Layers size={15} className="text-slate-300" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Performance Evolution Chart */}
        <Card className="lg:col-span-2" delay={0.2}>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <CardTitle>Evolución Patrimonial</CardTitle>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  Trayectoria histórica del valor liquidativo acumulado
                </p>
              </div>
            </div>

            {/* Performance Period Stats Pill */}
            {perfStats && (
              <div className="hidden sm:flex items-center gap-3 text-xs font-mono bg-slate-100 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Rango:{' '}
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {fmt.currency(perfStats.min)} - {fmt.currency(perfStats.max)}
                  </span>
                </span>
                <span
                  className={`font-bold ${
                    perfStats.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {perfStats.diff >= 0 ? '+' : ''}
                  {fmt.pct(perfStats.diffPct)}
                </span>
              </div>
            )}
          </CardHeader>

          <div className="px-5 pb-3.5 pt-1.5">
            {performance.length > 0 ? (
              <PerformanceChart data={performance} height={280} />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                Sin datos de evolución
              </div>
            )}
          </div>
        </Card>

        {/* Asset Allocation Breakdown */}
        <Card className="lg:col-span-1" delay={0.25}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20">
                <PieChart className="w-4 h-4" />
              </div>
              <CardTitle>Distribución</CardTitle>
            </div>

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
          </CardHeader>

          <div className="px-5 pb-3.5 pt-1.5 flex flex-col justify-center">
            {positions.length > 0 ? (
              <AllocationChart positions={positions} mode={allocMode} />
            ) : (
              <div className="flex h-[220px] items-center justify-center text-slate-500 text-sm">
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
                <tr className="border-b border-slate-200/90 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01] text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <th className="py-2 pl-3.5 pr-1 text-center w-7 text-slate-400">#</th>
                  <th className="py-2 px-3">Activo / Fondo</th>
                  <th className="py-2 px-2.5">Tipo</th>
                  <th className="py-2 px-2.5 text-right">Valor Actual</th>
                  <th className="py-2 px-2.5 text-right">Fecha Act.</th>
                  <th className="py-2 px-2.5 text-right">Ganancia (P&L)</th>
                  <th className="py-2 pr-3.5 pl-2 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {positions.slice(0, 5).map((p, i) => (
                  <motion.tr
                    key={p.isin}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.03 }}
                    onClick={() => setSelectedPosition(p)}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="py-2.5 pl-3.5 pr-1 text-center">
                      <span className="font-mono font-bold text-xs text-slate-400 dark:text-slate-500">
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <CompanyLogo
                          ticker={p.ticker || p.isin.slice(0, 4)}
                          name={p.name}
                          domain={p.domain}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[120px] sm:max-w-[140px] 2xl:max-w-[190px] text-[13.5px]">
                            {p.name}
                          </div>
                          <div className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                            {p.isin}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <AssetBadge type={p.asset_type} />
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-white text-[13.5px]">
                      {fmt.currency(p.current_value)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {p.last_updated ? format(parseISO(p.last_updated), 'dd/MM/yyyy') : p.asset_type === 'fund' ? '24/09/2026' : '25/09/2026'}
                    </td>
                    <td className="py-2.5 px-2.5 text-right">
                      <div className="flex flex-col items-end">
                        <PnlBadge value={p.unrealized_pnl} />
                        <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                          {fmt.pct(p.unrealized_pnl_pct)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3.5 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1.5 w-10 sm:w-12 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm shadow-blue-500/30"
                            style={{ width: `${Math.min(p.weight, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 w-9 text-right text-xs">
                          {p.weight.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Column 2: Next 5 Positions */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/90 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01] text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <th className="py-2 pl-3.5 pr-1 text-center w-7 text-slate-400">#</th>
                  <th className="py-2 px-3">Activo / Fondo</th>
                  <th className="py-2 px-2.5">Tipo</th>
                  <th className="py-2 px-2.5 text-right">Valor Actual</th>
                  <th className="py-2 px-2.5 text-right">Fecha Act.</th>
                  <th className="py-2 px-2.5 text-right">Ganancia (P&L)</th>
                  <th className="py-2 pr-3.5 pl-2 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {positions.slice(5, 10).map((p, i) => (
                  <motion.tr
                    key={p.isin}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.03 }}
                    onClick={() => setSelectedPosition(p)}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="py-2.5 pl-3.5 pr-1 text-center">
                      <span className="font-mono font-bold text-xs text-slate-400 dark:text-slate-500">
                        {i + 6}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <CompanyLogo
                          ticker={p.ticker || p.isin.slice(0, 4)}
                          name={p.name}
                          domain={p.domain}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[120px] sm:max-w-[140px] 2xl:max-w-[190px] text-[13.5px]">
                            {p.name}
                          </div>
                          <div className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                            {p.isin}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <AssetBadge type={p.asset_type} />
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-white text-[13.5px]">
                      {fmt.currency(p.current_value)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {p.last_updated ? format(parseISO(p.last_updated), 'dd/MM/yyyy') : p.asset_type === 'fund' ? '24/09/2026' : '25/09/2026'}
                    </td>
                    <td className="py-2.5 px-2.5 text-right">
                      <div className="flex flex-col items-end">
                        <PnlBadge value={p.unrealized_pnl} />
                        <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                          {fmt.pct(p.unrealized_pnl_pct)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3.5 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1.5 w-10 sm:w-12 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm shadow-blue-500/30"
                            style={{ width: `${Math.min(p.weight, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 w-9 text-right text-xs">
                          {p.weight.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
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

          <div className="p-4 pt-2.5 space-y-2">
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
