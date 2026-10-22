import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  TrendingUp,
  Activity,
  ShieldCheck,
  BarChart3,
  TrendingDown,
  PieChart,
  Target,
  Sparkles,
  Info,
  Scale,
  Award,
  Calendar,
  Layers,
  Globe,
  Compass,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, LoadingDot } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { ReturnsChart, ReturnsChartSkeleton } from '@/components/charts/ReturnsChart'
import { AllocationChart } from '@/components/charts/AllocationChart'
import { BenchmarkEvolutionChart, type BenchmarkChartMode } from '@/components/charts/BenchmarkEvolutionChart'
import { MonthlyReturnsHeatmap } from '@/components/charts/MonthlyReturnsHeatmap'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { AssetBadge, PnlBadge } from '@/components/ui/Badge'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import { TableSkeletonRows } from '@/components/ui/TableSkeleton'
import { DiversificationDashboard } from '@/components/analytics/DiversificationDashboard'
import { fmt, cn } from '@/lib/utils'
import { useAnalytics, usePositions, useBenchmarkComparison } from '@/api/queries'
import type { Position } from '@/lib/mockData'

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTabParam = searchParams.get('tab')
  const [mainTab, setMainTab] = useState<'performance' | 'diversification'>(
    activeTabParam === 'diversification' ? 'diversification' : 'performance'
  )

  const handleTabChange = (tab: 'performance' | 'diversification') => {
    setMainTab(tab)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (tab === 'diversification') {
          next.set('tab', 'diversification')
        } else {
          next.delete('tab')
        }
        return next
      },
      { replace: true }
    )
  }

  const { data: analytics, isFetching: analyticsFetching } = useAnalytics()
  const { data: positions = [], isLoading: positionsLoading, isFetching: positionsFetching } = usePositions()
  const { data: benchmarkData, isFetching: benchmarkFetching } = useBenchmarkComparison()
  const [benchmarkMode, setBenchmarkMode] = useState<BenchmarkChartMode>('percent')
  const [secondaryView, setSecondaryView] = useState<'returns' | 'distribution'>('returns')
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)

  const isSharpeGood = (analytics?.sharpe_ratio ?? 0) >= 1.0

  const allocStats = useMemo(() => {
    if (!positions || positions.length === 0) return null
    const totalVal = positions.reduce((acc, p) => acc + (p.current_value || 0), 0)
    if (totalVal <= 0) return null

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
  }, [positions])

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Top Header Switcher: Performance vs Global Diversification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-3.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            {mainTab === 'performance' ? <BarChart3 size={20} /> : <Globe size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white leading-tight">
                {mainTab === 'performance' ? 'Métricas de Rentabilidad y Benchmarks' : 'Diagnóstico de Diversificación vs Mundo'}
              </h1>
              {mainTab === 'diversification' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  MSCI ACWI Benchmark
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {mainTab === 'performance'
                ? 'Rendimiento ponderado por tiempo (TWR), ratios de riesgo y comparativa histórica'
                : 'Ponderación geográfica vs capitalización global, sectores, exposición a divisas y salud de cartera'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60 dark:border-white/5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleTabChange('performance')}
            className={cn(
              'relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150',
              mainTab === 'performance'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            {mainTab === 'performance' && (
              <motion.div
                layoutId="analyticsMainTabPill"
                className="absolute inset-0 rounded-lg bg-white dark:bg-slate-700 shadow-sm"
                transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <TrendingUp size={14} />
              <span>Rentabilidad & Riesgo</span>
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleTabChange('diversification')}
            className={cn(
              'relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150',
              mainTab === 'diversification'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            {mainTab === 'diversification' && (
              <motion.div
                layoutId="analyticsMainTabPill"
                className="absolute inset-0 rounded-lg bg-white dark:bg-slate-700 shadow-sm"
                transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Globe size={14} />
              <span>Diversificación vs Mundo</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </span>
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mainTab === 'diversification' ? (
          <motion.div
            key="diversification"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full flex flex-col gap-4"
          >
            <DiversificationDashboard positions={positions} isLoading={positionsFetching} />
          </motion.div>
        ) : (
          <motion.div
            key="performance"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full flex flex-col gap-4"
          >
            {/* KPI grid with luxury styling */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
              <KpiCard
                hoverGlow
                label="TWR (Time-Weighted)"
                value={<AnimatedNumber value={analytics?.twr} format={fmt.pct} />}
                sub="Elimina efecto de aportaciones"
                changePositive={(analytics?.twr ?? 0) >= 0}
                delay={0}
                icon={<TrendingUp size={16} className="text-emerald-400" />}
                loading={analyticsFetching}
              />
              <KpiCard
                hoverGlow
                label="CAGR Anualizado"
                value={<AnimatedNumber value={analytics?.cagr} format={fmt.pct} />}
                sub="Crecimiento compuesto anual"
                changePositive={(analytics?.cagr ?? 0) >= 0}
                delay={0.04}
                icon={<BarChart3 size={16} className="text-blue-400" />}
                loading={analyticsFetching}
              />
              <KpiCard
                hoverGlow
                label="Volatilidad Anual"
                value={<AnimatedNumber value={analytics?.volatility} format={(n) => fmt.pct(n, false)} />}
                sub="Desviación típica (σ)"
                delay={0.08}
                icon={<Activity size={16} className="text-amber-400" />}
                loading={analyticsFetching}
              />
              <KpiCard
                hoverGlow
                label="Sharpe Ratio"
                value={<AnimatedNumber value={analytics?.sharpe_ratio} format={(n) => fmt.ratio(n)} />}
                sub={isSharpeGood ? 'Excelente (> 1.0)' : 'Aceptable'}
                changePositive={isSharpeGood}
                delay={0.12}
                icon={<ShieldCheck size={16} className="text-indigo-400" />}
                loading={analyticsFetching}
              />
              <KpiCard
                hoverGlow
                label="Max Drawdown"
                value={<AnimatedNumber value={analytics?.max_drawdown} format={fmt.pct} />}
                sub="Caída máxima histórica"
                changePositive={false}
                delay={0.16}
                icon={<TrendingDown size={16} className="text-rose-400" />}
                loading={analyticsFetching}
              />
            </div>

      {/* Benchmark Comparison Card */}
      <Card delay={0.18} loading={analyticsFetching || benchmarkFetching}>
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.05]">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <CardTitle className="text-sm sm:text-base font-semibold">Comparativa de Rentabilidad vs Benchmarks</CardTitle>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              Rendimiento ponderado en el tiempo (TWR) neutralizando aportaciones periódicas frente a índices globales de referencia.
            </p>
          </div>
        </div>

        <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 p-3 sm:p-3.5 transition-opacity duration-300", (analyticsFetching || benchmarkFetching) ? "opacity-65" : "opacity-100")}>
          <div data-private className="px-3.5 py-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/25">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700 dark:text-blue-300 font-bold block">Tu Cartera (TWR)</span>
              {(analyticsFetching || benchmarkFetching) && <LoadingDot />}
            </div>
            <span className={cn(
              "text-xl sm:text-2xl font-bold font-mono mt-0.5 block leading-tight",
              (benchmarkData?.summary?.portfolio_twr ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {benchmarkData?.summary
                ? `${benchmarkData.summary.portfolio_twr >= 0 ? '+' : ''}${benchmarkData.summary.portfolio_twr.toFixed(2)}%`
                : analytics?.twr !== undefined
                ? fmt.pct(analytics.twr)
                : '—'}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">Flujos neutralizados</span>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold block">S&P 500 (^GSPC)</span>
              {(analyticsFetching || benchmarkFetching) && <LoadingDot />}
            </div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5 block leading-tight">
              {benchmarkData?.summary
                ? `${benchmarkData.summary.sp500 >= 0 ? '+' : ''}${benchmarkData.summary.sp500.toFixed(2)}%`
                : '+14.58%'}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">Índice EE.UU.</span>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block">Tasa BCE / Depósito</span>
              {(analyticsFetching || benchmarkFetching) && <LoadingDot />}
            </div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5 block leading-tight">
              {benchmarkData?.summary?.bce_rate !== undefined
                ? `${benchmarkData.summary.bce_rate >= 0 ? '+' : ''}${benchmarkData.summary.bce_rate.toFixed(2)}%`
                : '+3.45%'}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">Tipo libre de riesgo</span>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-700 dark:text-purple-400 font-semibold block">MSCI World (URTH)</span>
              {(analyticsFetching || benchmarkFetching) && <LoadingDot />}
            </div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5 block leading-tight">
              {benchmarkData?.summary
                ? `${benchmarkData.summary.msci_world >= 0 ? '+' : ''}${benchmarkData.summary.msci_world.toFixed(2)}%`
                : '+14.70%'}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">Mercados Desarrollados</span>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block">Alfa vs S&P 500</span>
              {(analyticsFetching || benchmarkFetching) && <LoadingDot />}
            </div>
            <span className={cn(
              "text-xl sm:text-2xl font-bold font-mono mt-0.5 block leading-tight",
              (benchmarkData?.summary?.alpha_sp500 ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {benchmarkData?.summary
                ? `${benchmarkData.summary.alpha_sp500 >= 0 ? '+' : ''}${benchmarkData.summary.alpha_sp500.toFixed(2)}%`
                : '+7.87%'}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">Exceso de rentabilidad</span>
          </div>
        </div>
      </Card>

      {/* 2-Panel Charts Section: 65% (Main Benchmark Evolution) / 35% (Unified Panel: Distribution / Returns) */}
      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-3.5">
        {/* 1. Main Benchmark Evolution (65% width) */}
        <Card className="flex flex-col justify-between" delay={0.2} loading={benchmarkFetching}>
          <CardHeader className="h-[58px] min-h-[58px] py-2 px-3.5 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm sm:text-[15px] truncate">Evolución vs Índices</CardTitle>
                </div>
                <p className="hidden sm:block text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 truncate">
                  {benchmarkMode === 'percent'
                    ? 'Comparativa de rentabilidad ponderada en el tiempo (TWR) neutralizando aportaciones'
                    : 'Patrimonio total (€) frente al capital neto aportado'}
                </p>
              </div>
            </div>

            {/* Mode Switch between % TWR and € Total */}
            <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5 shrink-0">
              {(['percent', 'currency'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setBenchmarkMode(m)}
                  className={`relative rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    benchmarkMode === m
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title={
                    m === 'percent'
                      ? 'Comparativa de rentabilidad ponderada en el tiempo (TWR) neutralizando aportaciones'
                      : 'Patrimonio total (€) y capital neto aportado'
                  }
                >
                  {benchmarkMode === m && (
                    <motion.div
                      layoutId="benchmark-mode-indicator"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">
                    {m === 'percent' ? '% TWR' : '€ Total'}
                  </span>
                </button>
              ))}
            </div>
          </CardHeader>

          <div className={cn("px-4 pb-3 pt-1.5 flex-1 flex flex-col justify-between min-h-0 transition-opacity duration-300", benchmarkFetching ? "opacity-65" : "opacity-100")}>
            <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
              <BenchmarkEvolutionChart
                data={benchmarkData}
                height={260}
                mode={benchmarkMode}
                onModeChange={setBenchmarkMode}
                showModeSelector={false}
              />
            </div>
          </div>
        </Card>

        {/* 2. Combined Right Panel: Distribution or Returns by Period (35% width) */}
        <Card className="flex flex-col justify-between" delay={0.24} loading={secondaryView === 'returns' ? analyticsFetching : positionsFetching}>
          <CardHeader className="h-[58px] min-h-[58px] py-2 px-3.5 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className={cn(
                "p-1.5 rounded-lg border shrink-0 transition-colors",
                secondaryView === 'distribution'
                  ? "bg-violet-500/10 text-violet-500 dark:text-violet-400 border-violet-500/20"
                  : "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20"
              )}>
                {secondaryView === 'distribution' ? <PieChart className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-[15px] truncate">
                  {secondaryView === 'distribution' ? 'Distribución por Tipo' : 'Rentabilidad por Periodo'}
                </CardTitle>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 truncate">
                  {secondaryView === 'distribution' ? 'Desglose por clase de activo' : 'Retorno temporal continuo (TWR)'}
                </p>
              </div>
            </div>

            {/* Toggle Switch between Returns and Distribution */}
            <div className="flex rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#252526] p-0.5 shrink-0">
              {(['returns', 'distribution'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setSecondaryView(view)}
                  className={`relative rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    secondaryView === view
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {secondaryView === view && (
                    <motion.div
                      layoutId="analyticsSecondaryPill"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                      transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                    />
                  )}
                  <span className="relative z-10 text-[11px] font-bold">
                    {view === 'distribution' ? 'Distribución' : 'Rentabilidad'}
                  </span>
                </button>
              ))}
            </div>
          </CardHeader>

          <AnimatePresence mode="wait" initial={false}>
            {secondaryView === 'distribution' ? (
              <motion.div
                key="distribution"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="px-4 pb-3 pt-1.5 flex flex-col justify-between flex-1 min-h-0 w-full"
              >
                <div className="flex flex-col justify-center flex-1 min-h-0 overflow-hidden">
                  {positions.length > 0 ? (
                    <AllocationChart
                      positions={positions}
                      mode="type"
                      showLegend={false}
                      height={260}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                      Sin posiciones registradas
                    </div>
                  )}
                </div>

                {/* Allocation Stats Strip */}
                {allocStats && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0">
                    <div
                      className="flex items-center justify-between gap-1.5 px-3 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
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
                      <span data-private className="font-mono font-extrabold text-slate-950 dark:text-white text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-1">
                        {allocStats.box1Val}
                      </span>
                    </div>

                    <div
                      className="flex items-center justify-between gap-1.5 px-3 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
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
                      <span data-private className="font-mono font-extrabold text-slate-950 dark:text-white text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-1">
                        {allocStats.box2Val}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="returns"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={cn("px-4 pb-3 pt-1.5 flex flex-col justify-between flex-1 min-h-0 w-full transition-opacity duration-300", analyticsFetching ? "opacity-65" : "opacity-100")}
              >
                <div data-private className="flex flex-col justify-center flex-1 min-h-0 overflow-hidden">
                  {analyticsFetching && !analytics ? (
                    <ReturnsChartSkeleton compact={false} height={260} />
                  ) : analytics ? (
                    <ReturnsChart analytics={analytics} compact={false} height={260} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                      Sin datos de rentabilidad
                    </div>
                  )}
                </div>

              {/* Quick Stats Strip */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs shrink-0">
                <div
                  className="flex items-center justify-between gap-1.5 px-3 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
                  title={analytics?.return_1d !== undefined ? `Rentabilidad del día (1D): ${fmt.pct(analytics.return_1d)}` : 'Rentabilidad del día (1D)'}
                >
                  <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <TrendingUp size={12} />
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold whitespace-nowrap">1D:</span>
                  </div>
                  <span
                    data-private
                    className={cn(
                      'font-mono font-extrabold text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-1',
                      (analytics?.return_1d ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {analytics?.return_1d !== undefined ? fmt.pct(analytics.return_1d) : '—'}
                  </span>
                </div>

                <div
                  className="flex items-center justify-between gap-1.5 px-3 py-1 rounded-xl h-[32px] sm:h-[34px] bg-slate-100/90 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-colors min-w-0"
                  title={analytics?.return_ytd !== undefined ? `Rentabilidad acumulada en el año (YTD): ${fmt.pct(analytics.return_ytd)}` : 'Rentabilidad acumulada en el año (YTD)'}
                >
                  <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Calendar size={12} />
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold whitespace-nowrap">YTD:</span>
                  </div>
                  <span
                    data-private
                    className={cn(
                      'font-mono font-extrabold text-[11px] sm:text-xs whitespace-nowrap shrink-0 pl-1',
                      (analytics?.return_ytd ?? analytics?.return_1y ?? 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {analytics?.return_ytd !== undefined
                      ? fmt.pct(analytics.return_ytd)
                      : analytics?.return_1y !== undefined
                      ? fmt.pct(analytics.return_1y)
                      : '—'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      </div>

      {/* Matriz de Rendimientos Mensuales */}
      <Card delay={0.28} loading={analyticsFetching}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <CardTitle>Matriz de Rendimientos Mensuales</CardTitle>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Rendimiento neto ponderado en el tiempo mes a mes y acumulación anual
          </span>
        </CardHeader>
        <div data-private className="p-5">
          <MonthlyReturnsHeatmap />
        </div>
      </Card>

      {/* Risk Metrics Detail */}
      <Card delay={0.3} loading={analyticsFetching}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <CardTitle>Diagnóstico de Riesgo y Resiliencia</CardTitle>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Evaluación estadística del portfolio</span>
        </CardHeader>
        <div data-private className={cn("grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-white/[0.05] border-t border-slate-100 dark:border-white/[0.05] transition-opacity duration-300", analyticsFetching ? "opacity-65" : "opacity-100")}>
          {[
            {
              label: 'Volatilidad Anualizada',
              value: analytics && analytics.volatility !== undefined ? fmt.pct(analytics.volatility, false) : '—',
              desc: 'Desviación estándar anualizada de retornos. Un valor inferior al 15% indica una cartera equilibrada y defensiva.',
              color: 'text-amber-500 dark:text-amber-400',
              tag: analytics && analytics.volatility !== undefined && analytics.volatility < 15 ? 'Baja / Moderada' : 'Moderada',
            },
            {
              label: 'Máximo Drawdown Histórico',
              value: analytics && analytics.max_drawdown !== undefined ? fmt.pct(analytics.max_drawdown) : '—',
              desc: 'Mayor caída pico a valle registrada. Mide la resistencia patrimonial durante correcciones severas de mercado.',
              color: 'text-rose-500 dark:text-rose-400',
              tag: 'Bajo impacto',
            },
            {
              label: 'Ratio de Sharpe',
              value: analytics && analytics.sharpe_ratio !== undefined ? fmt.ratio(analytics.sharpe_ratio) : '—',
              desc: 'Rendimiento extra obtenido por unidad de riesgo asumido vs tasa libre de riesgo. > 1.0 se considera óptimo.',
              color: isSharpeGood ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400',
              tag: isSharpeGood ? 'Excelente' : 'Aceptable',
            },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, delay: i * 0.04 }}
              className="p-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{m.label}</p>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200/90 dark:bg-white/[0.05] dark:text-slate-200 dark:border-white/[0.08]">
                  {m.tag}
                </span>
              </div>
              <p className={`mt-2 text-3xl font-bold font-mono tabular-nums ${m.color}`}>{m.value}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Position Breakdown Table */}
      <Card delay={0.35} className="overflow-hidden relative">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <CardTitle>Rendimiento Relativo por Activo</CardTitle>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Ordenado por mayor plusvalía porcentual</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200/90 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01]">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Activo
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Tipo
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Coste Medio
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Precio NAV
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  P&L €
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  P&L %
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Peso
                </th>
              </tr>
            </thead>
            <tbody>
              {positionsLoading && positions.length === 0 ? (
                <TableSkeletonRows rows={6} cols={7} />
              ) : (
                positions
                  .slice()
                  .sort((a, b) => b.unrealized_pnl_pct - a.unrealized_pnl_pct)
                  .map((p) => (
                    <tr data-private
                      key={p.isin}
                      onClick={() => setSelectedPosition(p)}
                      className="group border-b border-slate-100 dark:border-white/[0.03] transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.035] cursor-pointer last:border-0"
                    >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <CompanyLogo
                          ticker={p.ticker || p.isin.slice(0, 4)}
                          name={p.name}
                          domain={p.domain}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-white transition-colors truncate max-w-[300px] text-[14.3px]">
                            {p.name}
                          </div>
                          <div className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">{p.isin}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <AssetBadge type={p.asset_type} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300 font-medium">
                      {fmt.currency(p.avg_cost)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {fmt.currency(p.current_price)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">
                      <PnlBadge value={p.unrealized_pnl} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">
                      <PnlBadge value={p.unrealized_pnl_pct} suffix="%" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${Math.min(p.weight, 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right tabular-nums font-mono text-slate-500 dark:text-slate-400 font-medium">
                          {p.weight.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )))}
            </tbody>
          </table>
        </div>
      </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Position Detail Modal */}
      <PositionDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}
