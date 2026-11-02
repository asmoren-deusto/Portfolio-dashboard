import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  TrendingUp,
  ShieldCheck,
  TrendingDown,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  Award,
  AlertTriangle,
  ArrowUpRight,
  Info,
  CheckCircle2,
  Flame,
  LineChart,
  Activity,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, LoadingDot } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { AssetBadge } from '@/components/ui/Badge'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { fmt, cn } from '@/lib/utils'
import { usePortfolioBacktest, type BacktestCurvePoint } from '@/api/queries'
import { useAppStore } from '@/store/appStore'

type ChartViewMode = 'growth' | 'cumulative' | 'drawdown' | 'annual'

export function BacktestPage() {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  const [timeframe, setTimeframe] = useState<'5y' | '10y'>('10y')
  const [viewMode, setViewMode] = useState<ChartViewMode>('growth')
  const [selectedCrisisId, setSelectedCrisisId] = useState<string | null>(null)

  // Interactive line toggles
  const [visibleSeries, setVisibleSeries] = useState({
    portfolio: true,
    sp500: true,
    msci: true,
    b6040: false,
  })

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const { data: backtestData, isLoading, isFetching } = usePortfolioBacktest(timeframe)
  const summary = backtestData?.summary
  const curves = backtestData?.curves || []
  const annualMatrix = backtestData?.annual_matrix || []
  const crises = backtestData?.crises || []
  const attribution = backtestData?.asset_attribution || []

  const activeCrisis = useMemo(() => {
    if (!selectedCrisisId) return crises[0] || null
    return crises.find((c) => c.id === selectedCrisisId) || crises[0] || null
  }, [selectedCrisisId, crises])

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <History size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white leading-tight">
                Simulación & Backtest Histórico de Cartera
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Trackback {timeframe.toUpperCase()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Análisis cuantitativo de cómo se habría comportado tu asignación actual de activos en los últimos 5 y 10 años, sometida a los mayores shocks del mercado (Covid, Inflación 2022 y Guerra Comercial).
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          {/* Timeframe Selector */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.08]">
            <button
              onClick={() => setTimeframe('5y')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                timeframe === '5y'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              )}
            >
              5 Años
            </button>
            <button
              onClick={() => setTimeframe('10y')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                timeframe === '10y'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              )}
            >
              10 Años
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: CAGR */}
        <KpiCard
          label={`Rentabilidad Anual (${timeframe.toUpperCase()})`}
          value={isLoading ? '...' : `${summary ? (summary.portfolio_cagr > 0 ? '+' : '') + summary.portfolio_cagr.toFixed(1) : 0}% / año`}
          sub={
            summary
              ? `vs S&P 500: +${summary.sp500_cagr.toFixed(1)}% · MSCI: +${summary.msci_cagr.toFixed(1)}%`
              : 'CAGR ponderado'
          }
          icon={<TrendingUp size={16} />}
          change={summary ? `+${summary.portfolio_cum.toFixed(1)}% acum.` : undefined}
          changePositive={true}
          tag="CAGR"
          tagColor="blue"
        />

        {/* KPI 2: Multiplicación de 10.000€ */}
        <KpiCard
          label="Crecimiento Base 10k"
          value={isLoading ? '...' : `${summary ? fmt.currency(summary.growth_10k_portfolio) : '10.000 €'}`}
          sub={
            summary
              ? `Multiplicador: ${(summary.growth_10k_portfolio / 10000).toFixed(2)}x (60/40: ${(summary.growth_10k_b6040 / 10000).toFixed(2)}x)`
              : 'Simulación de 10.000 € iniciales'
          }
          icon={<Sparkles size={16} />}
          tag="Base 10k"
          tagColor="emerald"
        />

        {/* KPI 3: Max Drawdown en Crisis */}
        <KpiCard
          label="Caída Máxima Histórica (Max DD)"
          value={isLoading ? '...' : `${summary ? summary.max_drawdown_portfolio.toFixed(1) : 0}%`}
          sub={
            summary
              ? `S&P 500: ${summary.max_drawdown_sp500.toFixed(1)}% · Evitaste ${summary.crisis_drop_avoided_pp.toFixed(1)} pp`
              : 'Drawdown máximo en crisis'
          }
          icon={<ShieldCheck size={16} />}
          tag="Defensa"
          tagColor="amber"
        />

        {/* KPI 4: Downside Capture Ratio */}
        <KpiCard
          label="Ratio de Captura Bajista"
          value={isLoading ? '...' : `${summary ? summary.downside_capture_ratio.toFixed(1) : 0}%`}
          sub={
            summary
              ? `Volatilidad: ${summary.volatility_portfolio.toFixed(1)}% vs ${summary.volatility_sp500.toFixed(1)}% S&P 500`
              : 'Sensibilidad ante correcciones'
          }
          icon={<BarChart3 size={16} />}
          tag="Riesgo"
          tagColor="indigo"
        />
      </div>

      {/* Main Interactive Chart Section */}
      <Card className="w-full relative overflow-hidden" loading={isFetching}>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <LineChart size={18} />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                {viewMode === 'growth' && 'Crecimiento de Capital (Base 10.000 €)'}
                {viewMode === 'cumulative' && 'Rentabilidad Acumulada (%)'}
                {viewMode === 'drawdown' && 'Curva de Drawdowns Subacuáticos (Caídas en Crisis %)'}
                {viewMode === 'annual' && 'Matriz de Rentabilidad Anual por Años Naturales'}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cartera actual simulada vs S&P 500 (SPY), MSCI World (URTH) y Cartera 60/40
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.08] text-xs">
            <button
              onClick={() => setViewMode('growth')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all',
                viewMode === 'growth'
                  ? 'bg-white dark:bg-blue-600 text-slate-950 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              )}
            >
              Base 10k (€)
            </button>
            <button
              onClick={() => setViewMode('cumulative')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all',
                viewMode === 'cumulative'
                  ? 'bg-white dark:bg-blue-600 text-slate-950 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              )}
            >
              Retorno (%)
            </button>
            <button
              onClick={() => setViewMode('drawdown')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all',
                viewMode === 'drawdown'
                  ? 'bg-white dark:bg-blue-600 text-slate-950 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              )}
            >
              Drawdown Subacuático
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all',
                viewMode === 'annual'
                  ? 'bg-white dark:bg-blue-600 text-slate-950 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              )}
            >
              Por Años
            </button>
          </div>
        </CardHeader>

        {/* Interactive Series Legend Pill Toggles (for chart views) */}
        {viewMode !== 'annual' && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.04]">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
              Curvas activas:
            </span>
            <button
              onClick={() => toggleSeries('portfolio')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border',
                visibleSeries.portfolio
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                  : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/10 opacity-60'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
              Cartera Usuario
            </button>
            <button
              onClick={() => toggleSeries('sp500')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border',
                visibleSeries.sp500
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/10 opacity-60'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              S&P 500 (SPY)
            </button>
            <button
              onClick={() => toggleSeries('msci')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border',
                visibleSeries.msci
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                  : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/10 opacity-60'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              MSCI World (URTH)
            </button>
            <button
              onClick={() => toggleSeries('b6040')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border',
                visibleSeries.b6040
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-transparent text-slate-400 border-slate-200 dark:border-white/10 opacity-60'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Cartera 60/40 (RV/RF)
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6">
          {viewMode === 'annual' ? (
            /* Annual Matrix Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Año Natural</th>
                    <th className="py-3 px-3 text-right">Cartera Usuario</th>
                    <th className="py-3 px-3 text-right">S&P 500</th>
                    <th className="py-3 px-3 text-right">MSCI World</th>
                    <th className="py-3 px-3 text-right">Cartera 60/40</th>
                    <th className="py-3 px-3 text-right">Alfa vs S&P</th>
                    <th className="py-3 px-4">Diagnóstico / Resiliencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {annualMatrix.map((row) => {
                    const isPositive = row.portfolio_return >= 0
                    const isAlphaPos = row.alpha_vs_sp500 >= 0
                    return (
                      <tr
                        key={row.year}
                        className={cn(
                          'hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors',
                          
                        )}
                      >
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {row.year}
                        </td>
                        <td
                          className={cn(
                            'py-3 px-3 text-right font-mono font-bold',
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {isPositive ? '+' : ''}
                          {row.portfolio_return.toFixed(1)}%
                        </td>
                        <td
                          className={cn(
                            'py-3 px-3 text-right font-mono',
                            row.sp500_return >= 0
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-rose-500 dark:text-rose-400'
                          )}
                        >
                          {row.sp500_return >= 0 ? '+' : ''}
                          {row.sp500_return.toFixed(1)}%
                        </td>
                        <td
                          className={cn(
                            'py-3 px-3 text-right font-mono',
                            row.msci_return >= 0
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-rose-500 dark:text-rose-400'
                          )}
                        >
                          {row.msci_return >= 0 ? '+' : ''}
                          {row.msci_return.toFixed(1)}%
                        </td>
                        <td
                          className={cn(
                            'py-3 px-3 text-right font-mono',
                            row.b6040_return >= 0
                              ? 'text-slate-600 dark:text-slate-400'
                              : 'text-rose-500 dark:text-rose-400'
                          )}
                        >
                          {row.b6040_return >= 0 ? '+' : ''}
                          {row.b6040_return.toFixed(1)}%
                        </td>
                        <td
                          className={cn(
                            'py-3 px-3 text-right font-mono font-bold',
                            isAlphaPos
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          )}
                        >
                          {isAlphaPos ? '+' : ''}
                          {row.alpha_vs_sp500.toFixed(1)} pp
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md font-medium',
                              row.year === 2022
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold'
                                : row.is_crisis_year
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                : 'text-slate-600 dark:text-slate-400'
                            )}
                          >
                            {row.protection_label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Recharts Line/Area Chart */
            <div className="h-[380px] w-full">
              {isLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Calculando simulación cuantitativa de cartera ({timeframe.toUpperCase()})...
                  </span>
                </div>
              ) : curves.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 text-center p-6">
                  <Activity className="w-8 h-8 text-blue-500/60 animate-pulse" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Cargando curvas de simulación histórica...
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    Sincronizando series temporales con el motor financiero.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curves} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradDrawdown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.0} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    domain={viewMode === 'drawdown' ? [-40, 2] : ['auto', 'auto']}
                    tickFormatter={(val) => {
                      if (viewMode === 'growth') {
                        return `${(val / 1000).toFixed(0)}k€`
                      }
                      return `${val.toFixed(0)}%`
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null
                      return (
                        <div className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md p-3.5 shadow-xl text-xs min-w-[210px]">
                          <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-1.5 mb-2 flex items-center justify-between">
                            <span>Fecha: {label}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {viewMode === 'growth' ? 'Base 10.000 €' : viewMode === 'cumulative' ? 'Retorno' : 'Caída'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1.5 font-mono">
                            {payload.map((item: any) => (
                              <div key={item.name} className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-sans">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                  {item.name}:
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {viewMode === 'growth'
                                    ? fmt.currency(item.value)
                                    : `${item.value >= 0 && viewMode !== 'drawdown' ? '+' : ''}${item.value.toFixed(1)}%`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }}
                  />

                  {/* Portfolio Curve */}
                  {visibleSeries.portfolio && (
                    <Area
                      type="monotone"
                      dataKey={
                        viewMode === 'growth'
                          ? 'portfolio_val'
                          : viewMode === 'cumulative'
                          ? 'portfolio_cum'
                          : 'portfolio_drawdown'
                      }
                      name="Cartera Usuario"
                      stroke="#2563eb"
                      strokeWidth={2.4}
                      fill={viewMode === 'drawdown' ? 'url(#gradDrawdown)' : 'url(#gradPortfolio)'}
                    />
                  )}

                  {/* S&P 500 */}
                  {visibleSeries.sp500 && (
                    <Line
                      type="monotone"
                      dataKey={
                        viewMode === 'growth'
                          ? 'sp500_val'
                          : viewMode === 'cumulative'
                          ? 'sp500_cum'
                          : 'sp500_drawdown'
                      }
                      name="S&P 500 (SPY)"
                      stroke="#10b981"
                      strokeWidth={1.8}
                      dot={false}
                    />
                  )}

                  {/* MSCI World */}
                  {visibleSeries.msci && (
                    <Line
                      type="monotone"
                      dataKey={
                        viewMode === 'growth'
                          ? 'msci_val'
                          : viewMode === 'cumulative'
                          ? 'msci_cum'
                          : 'msci_drawdown'
                      }
                      name="MSCI World (URTH)"
                      stroke="#a855f7"
                      strokeWidth={1.8}
                      dot={false}
                    />
                  )}

                  {/* Cartera 60/40 */}
                  {visibleSeries.b6040 && (
                    <Line
                      type="monotone"
                      dataKey={
                        viewMode === 'growth'
                          ? 'b6040_val'
                          : viewMode === 'cumulative'
                          ? 'b6040_cum'
                          : 'b6040_drawdown'
                      }
                      name="Cartera 60/40"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Stress-Testing in Historical Crises */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-blue-600 dark:text-blue-400" size={20} />
              Simulador de Estrés en Crisis Históricas
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Comportamiento real de los activos en los episodios de pánico más severos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {crises.map((crisis) => {
            const isSelected = activeCrisis?.id === crisis.id
            return (
              <div
                key={crisis.id}
                onClick={() => setSelectedCrisisId(crisis.id)}
                className={cn(
                  'cursor-pointer rounded-2xl p-4 transition-all border flex flex-col justify-between gap-3',
                  isSelected
                    ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-white dark:bg-[#1e1e1e] border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {crisis.period_label}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${crisis.color}15`, color: crisis.color }}
                    >
                      {crisis.severity}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {crisis.title}
                  </h3>
                </div>

                {/* Crisis KPI numbers */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-slate-100 dark:border-white/[0.04]">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Cartera:</span>
                    <span
                      className={cn(
                        'text-sm font-mono font-bold',
                        crisis.portfolio_return >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {crisis.portfolio_return >= 0 ? '+' : ''}
                      {crisis.portfolio_return.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">S&P 500:</span>
                    <span
                      className={cn(
                        'text-sm font-mono font-bold',
                        crisis.sp500_return >= 0
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {crisis.sp500_return >= 0 ? '+' : ''}
                      {crisis.sp500_return.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {crisis.conclusion}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Crisis Detailed Breakdown Panel */}
        {activeCrisis && (
          <motion.div
            key={activeCrisis.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl bg-white dark:bg-[#1e1e1e] border border-slate-200/80 dark:border-white/10 p-5 shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Detalle del Episodio: {activeCrisis.title}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {activeCrisis.period_label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeCrisis.conclusion}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Tiempo Recuperación</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {activeCrisis.recovery_months} meses
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hero Cushion Assets */}
              <div className="rounded-xl p-3.5 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck size={16} />
                  Activos Escudo / Héroes Defensivos:
                </div>
                <div className="flex flex-col gap-2">
                  {activeCrisis.hero_assets.map((asset, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{asset.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{asset.desc}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {asset.ret}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vulnerable Assets */}
              <div className="rounded-xl p-3.5 bg-rose-500/[0.04] dark:bg-rose-500/[0.06] border border-rose-500/20">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                  <AlertTriangle size={16} />
                  Activos Más Penalizados en este Ciclo:
                </div>
                <div className="flex flex-col gap-2">
                  {activeCrisis.vulnerable_assets.map((asset, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{asset.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{asset.desc}</span>
                      </div>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                        {asset.ret}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Asset Attribution & Role Table */}
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Atribución y Rol Estratégico por Activo
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ponderación, retorno anualizado y comportamiento defensivo en los peores años del mercado
              </p>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Activo / Fondo</th>
                <th className="py-3 px-3 text-right">Peso Cartera</th>
                <th className="py-3 px-3">Rol Estratégico</th>
                <th className="py-3 px-3 text-right">CAGR 5A</th>
                <th className="py-3 px-3 text-right">CAGR 10A</th>
                <th className="py-3 px-3 text-right">Año 2022</th>
                <th className="py-3 px-3 text-right">Covid 2020</th>
                <th className="py-3 px-3 text-right">Max Drawdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {attribution.map((item) => (
                <tr key={item.isin} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white leading-tight">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {item.isin} · Proxy: {item.proxy_sym}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {item.weight.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.08]">
                      {item.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    +{item.cagr_5y.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    +{item.cagr_10y.toFixed(1)}%
                  </td>
                  <td
                    className={cn(
                      'py-3 px-3 text-right font-mono font-bold',
                      item.ret_2022 >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {item.ret_2022 >= 0 ? '+' : ''}
                    {item.ret_2022.toFixed(1)}%
                  </td>
                  <td
                    className={cn(
                      'py-3 px-3 text-right font-mono font-bold',
                      item.ret_2020 >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {item.ret_2020 >= 0 ? '+' : ''}
                    {item.ret_2020.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-500 dark:text-rose-400">
                    {item.max_drawdown.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default BacktestPage
