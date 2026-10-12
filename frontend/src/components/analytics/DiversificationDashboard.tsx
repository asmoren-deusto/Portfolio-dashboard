import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  PieChart as PieChartIcon,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Coins,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  Scale,
  ShieldCheck,
  Compass,
  Cpu,
  Landmark,
  HeartPulse,
  Factory,
  ShoppingBag,
  Radio,
  Apple,
  Flame,
  Pickaxe,
  Lightbulb,
  Calculator,
  Sliders,
  ShieldAlert,
  Gauge,
  Zap,
  BarChart3,
  ArrowRight,
  DollarSign,
  Check,
  RotateCcw,
  Percent,
  Clock,
  Activity,
  Wallet,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { fmt, cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import {
  analyzePortfolioDiversification,
  calculateCashFlowRebalance,
  type GeographicComparisonItem,
  type SectorComparisonItem,
  type CurrencyItem,
  type AssetClassItem,
  type SuperSectorItem,
  type FxSensitivityScenario,
  type InferredRiskProfile,
  type RebalanceBandItem,
  type CashFlowRebalanceItem,
  type PortfolioAuditAdvice,
} from '@/lib/diversificationEngine'
import type { Position } from '@/lib/mockData'

interface DiversificationDashboardProps {
  positions: Position[]
  isLoading?: boolean
}

const SECTOR_ICON_MAP: Record<string, React.ElementType> = {
  Cpu,
  Landmark,
  HeartPulse,
  Factory,
  ShoppingBag,
  Radio,
  Apple,
  Flame,
  Pickaxe,
  Lightbulb,
}

export function DiversificationDashboard({ positions, isLoading = false }: DiversificationDashboardProps) {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  // Sub-tab selection inside Diversification
  const [activeTab, setActiveTab] = useState<'geo' | 'sectors' | 'currency' | 'assets' | 'rebalance'>('geo')
  const [hoveredGeoId, setHoveredGeoId] = useState<string | null>(null)

  // Interactive controls for deep-dive tabs
  const [sectorFilter, setSectorFilter] = useState<'all' | 'defensive' | 'cyclical' | 'sensitive'>('all')
  const [selectedFxIdx, setSelectedFxIdx] = useState<number>(0)
  const [rebalanceCashInput, setRebalanceCashInput] = useState<number>(1000)

  // Compute quantitative diagnosis
  const diagnosis = useMemo(() => {
    return analyzePortfolioDiversification(positions)
  }, [positions])

  const {
    score,
    scoreLabel,
    scoreColor,
    verdictTitle,
    verdictParagraphs,
    usExposurePct,
    homeBiasPct,
    emergingGapPct,
    weightedTer,
    rebalanceSuggestions,
    auditAdvice,
    geographicBreakdown,
    sectorBreakdown,
    superSectors,
    sectorHhi,
    top3SectorsWeight,
    currencyBreakdown,
    fxSensitivity,
    assetClassBreakdown,
    inferredProfile,
    rebalanceBands,
    totalPortfolioValue,
  } = diagnosis

  // Dynamic cash-flow rebalance allocation
  const cashRebalanceAllocation = useMemo(() => {
    return calculateCashFlowRebalance(totalPortfolioValue, geographicBreakdown, rebalanceCashInput)
  }, [totalPortfolioValue, geographicBreakdown, rebalanceCashInput])

  // Filtered sectors for Tab 2
  const filteredSectors = useMemo(() => {
    if (sectorFilter === 'all') return sectorBreakdown
    const defensiveIds = ['health', 'consumer_stap', 'utilities']
    const cyclicalIds = ['financials', 'consumer_disc', 'materials']
    const sensitiveIds = ['tech', 'comms', 'industrials', 'energy']
    if (sectorFilter === 'defensive') return sectorBreakdown.filter((s) => defensiveIds.includes(s.sector.id))
    if (sectorFilter === 'cyclical') return sectorBreakdown.filter((s) => cyclicalIds.includes(s.sector.id))
    if (sectorFilter === 'sensitive') return sectorBreakdown.filter((s) => sensitiveIds.includes(s.sector.id))
    return sectorBreakdown
  }, [sectorBreakdown, sectorFilter])

  // Donut data for geographic breakdown
  const geoDonutData = useMemo(() => {
    return geographicBreakdown.map((g) => ({
      name: g.region.name,
      shortName: g.region.shortName,
      value: g.portfolioValue,
      pct: g.portfolioWeight,
      color: g.region.color,
      id: g.region.id,
      flag: g.region.flag,
    }))
  }, [geographicBreakdown])

  // Active hovered geo item for donut interactive center
  const activeGeoItem = useMemo(() => {
    return geoDonutData.find((d) => d.id === hoveredGeoId) ?? null
  }, [geoDonutData, hoveredGeoId])

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. Hero Card: Global Health Score & Executive Summary ─────────────── */}
      <Card delay={0.1} className="overflow-hidden border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-blue-500/[0.02]">
        <div className="p-3.5 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            {/* Left: Title & Purpose */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Diagnóstico de Diversificación vs Mercado Mundial
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    MSCI ACWI Benchmark
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  Evaluación cuantitativa de tus activos frente a la capitalización bursátil global del planeta.
                </p>
              </div>
            </div>

            {/* Right: Circular Score Gauge */}
            <div className="flex items-center gap-3.5 sm:gap-4 bg-slate-50/90 dark:bg-white/[0.03] px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shrink-0 shadow-2xs self-start lg:self-auto">
              <div className="relative w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] flex items-center justify-center shrink-0">
                {/* SVG Radial Meter */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-white/[0.08]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    style={{ stroke: scoreColor, transition: 'stroke-dasharray 1s ease' }}
                    strokeDasharray={`${score}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-none">
                    {score}
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">/ 100</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Salud de Cartera</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white block mt-0.5" style={{ color: scoreColor }}>
                  {scoreLabel}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block leading-tight mt-1">
                  {score >= 80 ? 'Nivel institucional' : score >= 65 ? 'Adecuada y equilibrada' : 'Concentrada'}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Executive KPI Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2.5">
            {/* KPI 1: Exposición a EE.UU. */}
            <div className="px-3.5 py-2.5 sm:py-3 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Norteamérica (EE.UU.)</span>
                <span>🇺🇸</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-950 dark:text-white">
                  {usExposurePct.toFixed(1)}%
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">vs 63.8% mundo</span>
              </div>
              <span className={cn(
                'text-xs font-bold font-mono px-2.5 py-1 rounded-lg inline-block mt-1.5 border leading-tight shadow-2xs',
                Math.abs(usExposurePct - 63.8) <= 4
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : usExposurePct > 63.8
                  ? 'bg-blue-50 text-blue-800 border-blue-200/90 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                  : 'bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
              )}>
                {usExposurePct >= 63.8 ? '+' : ''}{(usExposurePct - 63.8).toFixed(1)}% vs mundo
              </span>
            </div>

            {/* KPI 2: Sesgo Local (Home Bias) */}
            <div className="px-3.5 py-2.5 sm:py-3 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Sesgo Europeo (Local)</span>
                <span>🇪🇺</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-950 dark:text-white">
                  {(geographicBreakdown.find((g) => g.region.id === 'europe')?.portfolioWeight ?? 0).toFixed(1)}%
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">vs 15.4% mundo</span>
              </div>
              <span className={cn(
                'text-xs font-bold font-mono px-2.5 py-1 rounded-lg inline-block mt-1.5 border leading-tight shadow-2xs',
                homeBiasPct > 4
                  ? 'bg-blue-50 text-blue-800 border-blue-200/90 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
              )}>
                {homeBiasPct >= 0 ? '+' : ''}{homeBiasPct.toFixed(1)}% sobrepeso local
              </span>
            </div>

            {/* KPI 3: Brecha en Emergentes */}
            <div className="px-3.5 py-2.5 sm:py-3 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Mercados Emergentes</span>
                <span>🌏</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-950 dark:text-white">
                  {(geographicBreakdown.find((g) => g.region.id === 'emerging')?.portfolioWeight ?? 0).toFixed(1)}%
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">vs 10.2% mundo</span>
              </div>
              <span className={cn(
                'text-xs font-bold font-mono px-2.5 py-1 rounded-lg inline-block mt-1.5 border leading-tight shadow-2xs',
                emergingGapPct <= 2
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
              )}>
                {emergingGapPct > 0 ? `Déficit de -${emergingGapPct.toFixed(1)}%` : 'Cobertura completa'}
              </span>
            </div>

            {/* KPI 4: Exposición a Divisa */}
            <div className="px-3.5 py-2.5 sm:py-3 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Riesgo Divisa (USD)</span>
                <span>💵</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-950 dark:text-white">
                  {(currencyBreakdown.find((c) => c.code === 'USD')?.weight ?? 0).toFixed(1)}%
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">en Dólares</span>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg inline-block mt-1.5 bg-slate-100 dark:bg-white/[0.07] border border-slate-200/80 dark:border-white/10 font-mono leading-tight shadow-2xs">
                {(currencyBreakdown.find((c) => c.code === 'EUR')?.weight ?? 0).toFixed(1)}% en Euro (sin riesgo)
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. Tab Navigation for Analytical Deep-Dives ──────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200/80 dark:border-white/[0.08] pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'geo', label: 'Geografía vs Mundo', icon: Globe },
            { id: 'sectors', label: 'Sectores vs MSCI World', icon: Factory },
            { id: 'currency', label: 'Divisas & Riesgo FX', icon: Coins },
            { id: 'assets', label: 'Clases de Activo', icon: Layers },
            { id: 'rebalance', label: 'Consejos & Auditoría', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
          Patrimonio evaluado: <span className="font-bold text-slate-900 dark:text-white">{fmt.currency(totalPortfolioValue)}</span>
        </div>
      </div>

      {/* ── 3. TAB 1: Geografía vs Capitalización Mundial (MSCI ACWI) ───────── */}
      {activeTab === 'geo' && (
        <div className="flex flex-col gap-4">
          {/* Dual Panel: Comparative Bars + Interactive Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Dual Bar Comparison vs World (lg:col-span-8) */}
            <Card className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Scale className="w-4 h-4 text-blue-500" />
                      Comparativa Región a Región vs MSCI ACWI
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Tu porcentaje ponderado (barra azul) frente a la capitalización real de mercado del mundo (barra de fondo).
                    </p>
                  </div>
                  <div className="flex items-center gap-3.5 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Tu Cartera
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/20" /> Mercado Mundial
                    </span>
                  </div>
                </div>

                {/* Region Comparison Rows */}
                <div className="flex flex-col gap-3 sm:gap-3.5">
                  {geographicBreakdown.map((item) => {
                    const isHovered = hoveredGeoId === item.region.id
                    const isDimmed = hoveredGeoId !== null && !isHovered
                    return (
                      <div
                        key={item.region.id}
                        onMouseEnter={() => setHoveredGeoId(item.region.id)}
                        onMouseLeave={() => setHoveredGeoId(null)}
                        className={cn(
                          'px-4 py-2.5 sm:py-3 rounded-xl transition-all border cursor-pointer',
                          isHovered
                            ? 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-400/50 dark:border-blue-400/40 shadow-xs ring-1 ring-blue-500/20'
                            : isDimmed
                            ? 'opacity-40 border-transparent'
                            : 'border-transparent hover:border-slate-200/70 dark:hover:border-white/[0.05]'
                        )}
                      >
                        {/* Top line: Name, Flag, Weights & Status */}
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg select-none leading-none">{item.region.flag}</span>
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {item.region.name}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                              ({fmt.currency(item.portfolioValue)})
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 font-mono">
                            <div className="text-right">
                              <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                                {item.portfolioWeight.toFixed(1)}%
                              </span>
                              <span className="text-xs text-slate-400 ml-1">
                                (Mundo: {item.worldWeight.toFixed(1)}%)
                              </span>
                            </div>

                            <span
                              className={cn(
                                'text-[11px] font-bold px-2.5 py-0.5 rounded-md whitespace-nowrap border',
                                item.status === 'aligned'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                                  : item.status === 'overweight'
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                              )}
                            >
                              {item.statusLabel}
                            </span>
                          </div>
                        </div>

                        {/* Comparative Dual Progress Bar */}
                        <div className="relative w-full h-3 sm:h-3.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                          {/* Benchmark World Marker Background */}
                          <div
                            className="absolute top-0 bottom-0 bg-slate-300/80 dark:bg-white/20 rounded-full"
                            style={{ width: `${Math.min(100, item.worldWeight)}%` }}
                            title={`Peso mundial de referencia: ${item.worldWeight}%`}
                          />
                          {/* User Portfolio Fill Bar */}
                          <div
                            className="absolute top-0 bottom-0 rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, item.portfolioWeight)}%`,
                              backgroundColor: item.region.color,
                            }}
                          />
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate leading-relaxed">
                          {item.region.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            {/* Right: Geographic Allocation Donut (lg:col-span-4) */}
            <Card className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="pb-3.5 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <PieChartIcon className="w-4 h-4 text-emerald-500" />
                    Distribución de Tu Cartera
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Ponderación porcentual efectiva por geografía.
                  </p>
                </div>

                <div className="h-[300px] sm:h-[320px] w-full relative flex items-center justify-center min-w-0">
                  <ResponsiveContainer width="100%" height={310}>
                    <PieChart>
                      <Pie
                        data={geoDonutData}
                        cx="50%"
                        cy="50%"
                        dataKey="value"
                        nameKey="shortName"
                        innerRadius={72}
                        outerRadius={108}
                        paddingAngle={1.5}
                        minAngle={4}
                        animationDuration={350}
                        onMouseEnter={(_, index) => {
                          if (geoDonutData[index]) {
                            setHoveredGeoId(geoDonutData[index].id)
                          }
                        }}
                        onMouseLeave={() => setHoveredGeoId(null)}
                      >
                        {geoDonutData.map((entry) => {
                          const isHovered = hoveredGeoId === entry.id
                          const isDimmed = hoveredGeoId !== null && !isHovered
                          return (
                            <Cell
                              key={`geo-donut-${entry.id}`}
                              fill={entry.color}
                              stroke={isHovered ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#1e1e1e' : '#ffffff')}
                              strokeWidth={isHovered ? 2.5 : 1}
                              opacity={isDimmed ? 0.35 : 1}
                              style={{
                                cursor: 'pointer',
                                transition: 'opacity 0.2s ease, stroke-width 0.2s ease',
                                filter: isHovered ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' : 'none',
                              }}
                            />
                          )
                        })}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any) => [fmt.currency(Number(val) || 0), 'Valor']}
                        contentStyle={{
                          backgroundColor: isDark ? '#1f2937' : '#ffffff',
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Total / Interactive Hover Detail */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2 text-center transition-all duration-200">
                    {activeGeoItem ? (
                      <div className="flex flex-col items-center animate-in fade-in duration-150">
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
                          <span className="text-lg select-none leading-none">{activeGeoItem.flag}</span>
                          <span className="truncate max-w-[145px]">{activeGeoItem.shortName}</span>
                        </span>
                        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-950 dark:text-white leading-tight mt-1.5">
                          {fmt.currency(activeGeoItem.value)}
                        </span>
                        <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                          {activeGeoItem.pct.toFixed(1)}% de cartera
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Total Cartera
                        </span>
                        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-950 dark:text-white leading-tight mt-1.5">
                          {fmt.currency(totalPortfolioValue)}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
                          {positions.length} activos evaluados
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mini Legend List with amounts, percentages and bidirectional hover */}
                <div className="flex flex-col gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-white/[0.06]">
                  {geoDonutData.map((d) => {
                    const isRowHovered = hoveredGeoId === d.id
                    const isRowDimmed = hoveredGeoId !== null && !isRowHovered
                    return (
                      <div
                        key={`legend-${d.id}`}
                        onMouseEnter={() => setHoveredGeoId(d.id)}
                        onMouseLeave={() => setHoveredGeoId(null)}
                        className={cn(
                          'flex items-center justify-between text-xs sm:text-sm font-medium py-2 px-2.5 rounded-xl transition-all cursor-pointer',
                          isRowHovered
                            ? 'bg-blue-500/10 dark:bg-blue-500/15 shadow-2xs font-semibold'
                            : isRowDimmed
                            ? 'opacity-40'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                        )}
                      >
                        <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                            style={{
                              backgroundColor: d.color,
                              transform: isRowHovered ? 'scale(1.25)' : 'scale(1)',
                            }}
                          />
                          <span className="truncate font-medium">{d.flag} {d.shortName}</span>
                        </span>
                        <div className="flex items-center gap-2.5 shrink-0 font-mono">
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {fmt.currency(d.value)}
                          </span>
                          <span className="font-bold text-slate-950 dark:text-white w-12 text-right text-xs sm:text-sm">
                            {d.pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Executive Verdict / Narrative Diagnosis */}
          <Card delay={0.15} className="p-5 sm:p-6 bg-gradient-to-r from-blue-500/[0.04] via-indigo-500/[0.02] to-transparent border-blue-500/25">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {verdictTitle}
                  </h4>
                  <button
                    onClick={() => setActiveTab('rebalance')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
                  >
                    <span>Ver Auditoría de 5 Pilares ({auditAdvice.length})</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
                <div className="flex flex-col gap-2 mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {verdictParagraphs.map((p, idx) => (
                    <p key={`verdict-p-${idx}`} dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>') }} />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── 4. TAB 2: Sectores vs MSCI World & Macro Super-Sectores ───────────── */}
      {activeTab === 'sectors' && (
        <div className="flex flex-col gap-4">
          {/* Top: Macro Super-Sectors (Defensive vs Cyclical vs Sensitive) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {superSectors.map((ss) => {
              const isSensitive = ss.id === 'sensitive'
              const isCyclical = ss.id === 'cyclical'
              return (
                <Card
                  key={ss.id}
                  className={cn(
                    'p-4 sm:p-5 border-l-4 transition-all',
                    isSensitive
                      ? 'border-l-blue-500 bg-gradient-to-br from-blue-500/[0.03] to-transparent'
                      : isCyclical
                      ? 'border-l-emerald-500 bg-gradient-to-br from-emerald-500/[0.03] to-transparent'
                      : 'border-l-pink-500 bg-gradient-to-br from-pink-500/[0.03] to-transparent'
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <span className="flex items-center gap-1.5 text-xs sm:text-sm">
                      {isSensitive ? '⚡' : isCyclical ? '📈' : '🛡️'}
                      {ss.name.split(' (')[0]}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold',
                        ss.delta >= 0
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                          : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                      )}
                    >
                      {ss.delta >= 0 ? `+${ss.delta.toFixed(1)}%` : `${ss.delta.toFixed(1)}%`}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-950 dark:text-white">
                      {ss.portfolioWeight.toFixed(1)}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      vs {ss.worldWeight.toFixed(1)}% mundo
                    </span>
                  </div>

                  <div className="relative w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden mt-2.5">
                    <div
                      className="absolute top-0 bottom-0 bg-slate-300 dark:bg-white/20 rounded-full"
                      style={{ width: `${Math.min(100, ss.worldWeight)}%` }}
                      title={`MSCI World: ${ss.worldWeight}%`}
                    />
                    <div
                      className="absolute top-0 bottom-0 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, ss.portfolioWeight)}%`,
                        backgroundColor: ss.color,
                      }}
                    />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                    {ss.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06]">
                    {ss.sectorNames.map((sName) => (
                      <span
                        key={sName}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10"
                      >
                        {sName}
                      </span>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Concentration KPI Strip */}
          <Card className="p-4 sm:p-5 bg-slate-50/70 dark:bg-white/[0.02]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-white/[0.08]">
              <div className="px-2 py-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Concentración Top 3 Sectores
                </span>
                <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                  {top3SectorsWeight.toFixed(1)}% de cartera
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block truncate">
                  {sectorBreakdown.slice(0, 3).map((s) => s.sector.name.split(' ')[0]).join(', ')}
                </span>
              </div>

              <div className="px-2 py-1 sm:pl-4">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Índice de Concentración (HHI)
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white">
                    {sectorHhi.toLocaleString()}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                      sectorHhi < 1800
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        : sectorHhi < 2500
                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                    )}
                  >
                    {sectorHhi < 1800 ? 'Alta Diversificación' : sectorHhi < 2500 ? 'Concentración Moderada' : 'Concentrado'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Benchmark MSCI World: ~1.350 puntos
                </span>
              </div>

              <div className="px-2 py-1 sm:pl-4">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Líder Sectorial Absoluto
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1 block truncate">
                  {sectorBreakdown[0]?.sector.name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 block">
                  {sectorBreakdown[0]?.portfolioWeight.toFixed(1)}% ({fmt.currency(sectorBreakdown[0]?.portfolioValue || 0)})
                </span>
              </div>
            </div>
          </Card>

          {/* 10 GICS Sectors with Filter Chips */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Factory className="w-4 h-4 text-indigo-500" />
                  Diversificación Sectorial (10 Sectores GICS vs MSCI World)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ponderación por industrias de tus fondos frente al índice sectorial global.
                </p>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'Todos (10)' },
                  { id: 'sensitive', label: '⚡ Sensibles (4)' },
                  { id: 'cyclical', label: '📈 Cíclicos (3)' },
                  { id: 'defensive', label: '🛡️ Defensivos (3)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSectorFilter(f.id as typeof sectorFilter)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer',
                      sectorFilter === f.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                        : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSectors.map((item) => {
                const Icon = SECTOR_ICON_MAP[item.sector.iconName] || Factory
                return (
                  <div
                    key={item.sector.id}
                    className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] hover:border-slate-300 dark:hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="p-1.5 rounded-lg shrink-0"
                          style={{
                            backgroundColor: `${item.sector.color}15`,
                            color: item.sector.color,
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.sector.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {item.portfolioWeight.toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-400">
                          (Mundo: {item.worldWeight.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className="relative w-full h-2.5 sm:h-3 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 bg-slate-300 dark:bg-white/20 rounded-full"
                        style={{ width: `${Math.min(100, item.worldWeight)}%` }}
                        title={`MSCI World: ${item.worldWeight}%`}
                      />
                      <div
                        className="absolute top-0 bottom-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, item.portfolioWeight)}%`,
                          backgroundColor: item.sector.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Capital asignado: <strong className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{fmt.currency(item.portfolioValue)}</strong></span>
                      <span
                        className={cn(
                          'font-bold font-mono text-[11px] px-2 py-0.5 rounded-md border',
                          item.delta >= 0
                            ? 'text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.05] border-slate-200/70 dark:border-white/10'
                        )}
                      >
                        {item.delta >= 0 ? `+${item.delta.toFixed(1)}% sobrepeso` : `${item.delta.toFixed(1)}% infra`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── 5. TAB 3: Divisas & Riesgo Cambiario (FX) con Simulador ──────────── */}
      {activeTab === 'currency' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Currency Breakdown & Hedging Guide (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <Card className="p-5 sm:p-6">
              <div className="pb-3.5 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  Desglose de Exposición por Divisa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Identificación del riesgo de tipo de cambio frente a tu moneda base (EUR).
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {currencyBreakdown.map((c) => (
                  <div
                    key={c.code}
                    className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl select-none leading-none">{c.flag}</span>
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {c.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 ml-2 font-mono">
                            {c.code}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white block">
                          {c.weight.toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {fmt.currency(c.value)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          c.code === 'EUR' ? 'bg-emerald-500' : c.code === 'USD' ? 'bg-blue-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${Math.min(100, c.weight)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs mt-2 text-slate-500 dark:text-slate-400">
                      <span>Régimen cambiario:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.riskType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Hedging Drag & Long-Term Strategy */}
            <Card className="p-5 sm:p-6 bg-gradient-to-br from-blue-500/[0.03] to-transparent border-blue-500/20">
              <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-white/[0.06]">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Guía Institucional: ¿Cubrir Divisa (Hedged) o No Cubrir?
                </h4>
              </div>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                <p>
                  • <strong>Coste de Cobertura (Carry Drag):</strong> Los fondos con clase con cobertura (EUR-Hedged) pagan anualmente el diferencial de tipos de interés entre el BCE y la Reserva Federal mediante contratos forwards. Históricamente esto resta entre un <strong>1.2% y 2.0% anual</strong> de rentabilidad neta.
                </p>
                <p>
                  • <strong>Recomendación a Largo Plazo:</strong> Para horizontes &gt; 5 años en Renta Variable Global, los principales gestores patrimoniales recomiendan mantener las posiciones <em>unhedged</em> (sin cubrir), beneficiándose de la diversificación cambiaria sin pagar comisiones financieras ocultas.
                </p>
              </div>
            </Card>
          </div>

          {/* Right Column: FX Sensitivity Simulator (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <Card className="p-5 sm:p-6 flex flex-col justify-between border-amber-500/25 bg-gradient-to-br from-amber-500/[0.03] via-transparent to-orange-500/[0.02]">
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      Simulador de Sensibilidad EUR/USD
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Impacto monetario estimado según la evolución del dólar.
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    FX Scanner
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                  Actualmente tienes <strong className="text-slate-900 dark:text-white font-mono">{fmt.currency(currencyBreakdown.find((c) => c.code === 'USD')?.value || 0)}</strong> ({currencyBreakdown.find((c) => c.code === 'USD')?.weight.toFixed(1)}%) expuestos al Dólar USA. Selecciona un escenario cambiario:
                </p>

                {/* Scenario Selectors */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {fxSensitivity.map((sc, idx) => (
                    <button
                      key={sc.label}
                      onClick={() => setSelectedFxIdx(idx)}
                      className={cn(
                        'p-2.5 rounded-xl text-left border transition-all cursor-pointer',
                        selectedFxIdx === idx
                          ? 'bg-amber-500/15 border-amber-500/60 shadow-xs ring-1 ring-amber-500/30 font-semibold'
                          : 'bg-white/70 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/10 hover:border-slate-300'
                      )}
                    >
                      <span className="text-[11px] font-bold block text-slate-700 dark:text-slate-300">
                        {sc.label}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-mono font-bold mt-0.5 block',
                          sc.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {sc.isPositive ? '+' : ''}{fmt.currency(sc.portfolioEuroImpact)}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Highlighted Result Box */}
                {fxSensitivity[selectedFxIdx] && (
                  <div className="p-4 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Efecto Estimado en Patrimonio Total
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span
                        className={cn(
                          'text-2xl sm:text-3xl font-extrabold font-mono',
                          fxSensitivity[selectedFxIdx].isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {fxSensitivity[selectedFxIdx].isPositive ? '+' : ''}
                        {fmt.currency(fxSensitivity[selectedFxIdx].portfolioEuroImpact)}
                      </span>
                      <span
                        className={cn(
                          'text-sm font-bold font-mono',
                          fxSensitivity[selectedFxIdx].isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        ({fxSensitivity[selectedFxIdx].isPositive ? '+' : ''}
                        {fxSensitivity[selectedFxIdx].portfolioPctImpact.toFixed(2)}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {fxSensitivity[selectedFxIdx].isPositive
                        ? '🟢 Una subida del dólar incrementa el contravalor en euros de tus acciones estadounidenses, actuando como un colchón positivo.'
                        : '🔴 Una apreciación del euro reduce temporalmente la valoración contable de tus activos en dólares, aunque abarata tus nuevas compras sistemáticas.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Natural Hedge Alert */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 font-medium mt-4">
                🛡️ <strong>Efecto Refugio Global:</strong> En momentos de pánico financiero internacional, el capital global suele refugiarse en bonos del Tesoro y Dólares USA, lo que históricamente ha mitigado las pérdidas contables para inversores en Euros.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── 6. TAB 4: Clases de Activo & Perfil Inversor ───────────────────────── */}
      {activeTab === 'assets' && (
        <div className="flex flex-col gap-4">
          {/* Top Hero: Inferred Risk Profile Scanner */}
          <Card className="p-5 sm:p-6 border-indigo-500/25 bg-gradient-to-br from-indigo-500/[0.04] via-blue-500/[0.02] to-transparent">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Perfil Inferido Cuantitativo
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                      {(inferredProfile.equityRatio).toFixed(0)}% RV / {(100 - inferredProfile.equityRatio).toFixed(0)}% Otros
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {inferredProfile.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {inferredProfile.tagline}
                  </p>
                </div>
              </div>

              {/* Inferred Expected Horizon Badge */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.03] px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 shrink-0 self-start lg:self-auto">
                <Clock className="w-4 h-4 text-blue-500" />
                <div className="text-xs">
                  <span className="text-slate-400 block font-medium">Horizonte Sugerido:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{inferredProfile.recommendedHorizon}</span>
                </div>
              </div>
            </div>

            {/* 4 Quantitative Profile Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Volatilidad Anual</span>
                  <Activity size={14} className="text-blue-500" />
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-950 dark:text-white mt-1">
                  ~{inferredProfile.expectedVolatilityPct}%
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Desviación estándar típica
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Drawdown Máx Histórico</span>
                  <ShieldAlert size={14} className="text-rose-500" />
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1">
                  {inferredProfile.historicalMaxDrawdownPct}%
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Picos de crisis (2008 / 2020)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Rentabilidad Real CAGR</span>
                  <TrendingUp size={14} className="text-emerald-500" />
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  ~{inferredProfile.expectedRealReturnPct}% anual
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Descontada inflación histórica
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Pólvora Seca (Caja)</span>
                  <Wallet size={14} className="text-cyan-500" />
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                  {inferredProfile.dryPowderPct.toFixed(1)}%
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  {fmt.currency(inferredProfile.dryPowderAmount)}
                </span>
              </div>
            </div>
          </Card>

          {/* Asset Allocation Breakdown Cards */}
          <Card className="p-5 sm:p-6">
            <div className="pb-3.5 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Asignación Estratégica por Clase de Activo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Distribución macro y rol de cada categoría en la cartera.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {assetClassBreakdown.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span>{a.name}</span>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1.5">
                      {a.weight.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {fmt.currency(a.value)}
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden mt-2.5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, a.weight)}%`, backgroundColor: a.color }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] leading-relaxed">
                    {a.roleDescription}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── 7. TAB 5: Consejos & Calculadora de Rebalanceo Inteligente ───────── */}
      {activeTab === 'rebalance' && (
        <div className="flex flex-col gap-4">
          {/* Smart Cash-Flow Rebalancing Calculator (Zero-Tax via New Inflows) */}
          <Card className="p-5 sm:p-6 border-blue-500/25 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-indigo-500/[0.02]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-500" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Calculadora de Rebalanceo Inteligente por Flujo de Caja
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    0% Peaje Fiscal
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Rebalancea aportando nuevo capital sin vender activos ni tributar por plusvalías en IRPF.
                </p>
              </div>

              {/* Inflow Input and Quick Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nueva aportación:</span>
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setRebalanceCashInput(amt)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer',
                      rebalanceCashInput === amt
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-blue-400'
                    )}
                  >
                    +{amt} €
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Distribution Grid */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Asignación Matemática Óptima para {fmt.currency(rebalanceCashInput)}:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cashRebalanceAllocation.map((rec) => {
                  const hasAllocation = rec.suggestedCashAmount > 0.01
                  return (
                    <div
                      key={rec.regionId}
                      className={cn(
                        'p-3.5 rounded-xl border transition-all',
                        hasAllocation
                          ? 'bg-blue-500/[0.05] dark:bg-blue-500/10 border-blue-400/40 dark:border-blue-500/30 shadow-2xs'
                          : 'bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/[0.05] opacity-70'
                      )}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{rec.flag}</span>
                          <span className="truncate">{rec.regionName}</span>
                        </span>
                        <span
                          className={cn(
                            'font-mono font-bold text-xs',
                            hasAllocation ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                          )}
                        >
                          {rec.suggestedCashShare.toFixed(0)}% del aporte
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-extrabold font-mono text-slate-950 dark:text-white">
                          {fmt.currency(rec.suggestedCashAmount)}
                        </span>
                        <div className="text-[11px] font-mono text-right text-slate-500 dark:text-slate-400">
                          <span>{rec.currentWeight.toFixed(1)}%</span>
                          <span className="mx-1">→</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {rec.projectedWeight.toFixed(1)}%
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1">
                            (obj: {rec.targetWeight.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      <div className="relative w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mt-2">
                        <div
                          className="absolute top-0 bottom-0 bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, rec.projectedWeight * 1.5)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Swensen 5/25 Tolerance Bands Monitor */}
          <Card className="p-5 sm:p-6">
            <div className="pb-3.5 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Auditoría de Bandas de Tolerancia 5/25 (Regla David Swensen)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Determina si una posición requiere rebalanceo al desviarse &gt;5% absoluto o &gt;25% relativo de su objetivo mundial.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="pb-2.5 font-bold">Región Geográfica</th>
                    <th className="pb-2.5 font-bold text-right">Peso Actual</th>
                    <th className="pb-2.5 font-bold text-right">Objetivo Mundial</th>
                    <th className="pb-2.5 font-bold text-center">Banda Permitida [Mín - Máx]</th>
                    <th className="pb-2.5 font-bold text-right">Desviación</th>
                    <th className="pb-2.5 font-bold text-center">Estado Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {rebalanceBands.map((b) => (
                    <tr key={b.regionId} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-base">{b.flag}</span>
                        <span>{b.regionName}</span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {b.currentWeight.toFixed(1)}%
                      </td>
                      <td className="py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                        {b.targetWeight.toFixed(1)}%
                      </td>
                      <td className="py-3 text-center font-mono text-slate-600 dark:text-slate-300">
                        [{b.lowerBand.toFixed(1)}% – {b.upperBand.toFixed(1)}%]
                      </td>
                      <td className="py-3 text-right font-mono font-semibold">
                        <span
                          className={cn(
                            b.deviationAbs <= 3.0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : b.deviationAbs <= 6.0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {b.currentWeight >= b.targetWeight ? '+' : '-'}
                          {b.deviationAbs.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={cn(
                            'text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1',
                            b.urgency === 'optimal'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                              : b.urgency === 'warning'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25'
                          )}
                        >
                          {b.urgency === 'optimal' ? '🟢 En Tolerancia' : b.urgency === 'warning' ? '🟡 Desviación Moderada' : '🔴 Rebalanceo Prioritario'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Institutional Portfolio Audit: 5 Pillars & Recommendations */}
          <Card className="p-5 sm:p-6 border-slate-200 dark:border-white/[0.08]">
            <div className="pb-3.5 mb-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Auditoría Rigurosa y Consejos de Optimización (5 Pilares Institucionales)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detección proactiva de fricciones de costes, sesgos estructurales y ventajas fiscales aplicables.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                TER medio: ~{weightedTer.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {auditAdvice.map((advice) => {
                const isSuccess = advice.severity === 'success'
                const isWarning = advice.severity === 'warning'
                return (
                  <div
                    key={advice.id}
                    className={cn(
                      'p-4 rounded-xl border transition-all flex flex-col justify-between',
                      isSuccess
                        ? 'bg-emerald-500/[0.03] border-emerald-500/25 dark:border-emerald-500/20'
                        : isWarning
                        ? 'bg-amber-500/[0.03] border-amber-500/30 dark:border-amber-500/25'
                        : 'bg-blue-500/[0.03] border-blue-500/25 dark:border-blue-500/20'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={cn(
                            'text-[10.5px] font-bold px-2 py-0.5 rounded-md border font-mono uppercase tracking-wider',
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : isWarning
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                          )}
                        >
                          {advice.badgeText}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {isSuccess ? '✅ Cumplido' : isWarning ? '⚠️ A Corregir' : '💡 Recomendación'}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {advice.title}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                        {advice.subtitle}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-normal">
                        {advice.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06] flex items-start gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">Acción:</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-tight">
                        {advice.actionableStep}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Qualitative Actionable Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rebalanceSuggestions.map((sug, i) => (
              <Card key={`sug-${i}`} className="p-4 sm:p-5 border-l-4 border-l-blue-500">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                      {sug.targetRegion}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {sug.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1.5 font-normal">
                      {sug.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
