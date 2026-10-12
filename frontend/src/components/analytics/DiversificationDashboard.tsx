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
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { fmt, cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import {
  analyzePortfolioDiversification,
  type GeographicComparisonItem,
  type SectorComparisonItem,
  type CurrencyItem,
  type AssetClassItem,
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
    rebalanceSuggestions,
    geographicBreakdown,
    sectorBreakdown,
    currencyBreakdown,
    assetClassBreakdown,
    totalPortfolioValue,
  } = diagnosis

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
            <div className="flex items-center gap-3 bg-slate-50/90 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06] shrink-0 shadow-2xs self-start lg:self-auto">
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
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
                  <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white leading-none">
                    {score}
                  </span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">/ 100</span>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-none">Salud de Cartera</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5" style={{ color: scoreColor }}>
                  {scoreLabel}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-none mt-0.5">
                  {score >= 80 ? 'Nivel institucional' : score >= 65 ? 'Adecuada y equilibrada' : 'Concentrada'}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Executive KPI Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-2.5">
            {/* KPI 1: Exposición a EE.UU. */}
            <div className="px-3 py-2 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-2xs">
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
                'text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md inline-block mt-1 border',
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
            <div className="px-3 py-2 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-2xs">
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
                'text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md inline-block mt-1 border',
                homeBiasPct > 4
                  ? 'bg-blue-50 text-blue-800 border-blue-200/90 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
              )}>
                {homeBiasPct >= 0 ? '+' : ''}{homeBiasPct.toFixed(1)}% sobrepeso local
              </span>
            </div>

            {/* KPI 3: Brecha en Emergentes */}
            <div className="px-3 py-2 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-2xs">
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
                'text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md inline-block mt-1 border',
                emergingGapPct <= 2
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
              )}>
                {emergingGapPct > 0 ? `Déficit de -${emergingGapPct.toFixed(1)}%` : 'Cobertura completa'}
              </span>
            </div>

            {/* KPI 4: Exposición a Divisa */}
            <div className="px-3 py-2 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-2xs">
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
              <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md inline-block mt-1 bg-slate-100 dark:bg-white/[0.07] border border-slate-200/80 dark:border-white/10 font-mono">
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
            { id: 'rebalance', label: 'Consejos de Rebalanceo', icon: Sparkles },
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
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {verdictTitle}
                </h4>
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

      {/* ── 4. TAB 2: Sectores vs MSCI World ─────────────────────────────────── */}
      {activeTab === 'sectors' && (
        <Card delay={0.15} className="p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Factory className="w-4 h-4 text-indigo-500" />
                Diversificación Sectorial (10 Sectores GICS vs MSCI World)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ponderación por industrias de tus fondos frente al índice sectorial global.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Tu Cartera
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/20" /> MSCI World
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {sectorBreakdown.map((item) => {
              const Icon = SECTOR_ICON_MAP[item.sector.iconName] || Factory
              return (
                <div
                  key={item.sector.id}
                  className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Icon size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.sector.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {item.portfolioWeight.toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-400">
                        (Mundo: {item.worldWeight.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="relative w-full h-2.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 bg-slate-300 dark:bg-white/20 rounded-full"
                      style={{ width: `${Math.min(100, item.worldWeight)}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 rounded-full transition-all duration-700 bg-indigo-500"
                      style={{ width: `${Math.min(100, item.portfolioWeight)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Capital asignado: {fmt.currency(item.portfolioValue)}</span>
                    <span className={cn(
                      'font-bold',
                      item.delta >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                    )}>
                      {item.delta >= 0 ? `+${item.delta.toFixed(1)}% sobrepeso` : `${item.delta.toFixed(1)}% infra`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── 5. TAB 3: Divisas & Riesgo Cambiario (FX) ────────────────────────── */}
      {activeTab === 'currency' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-4 sm:p-5">
            <div className="pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                Desglose de Exposición a Divisas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Identificación del riesgo de tipo de cambio frente a tu moneda base (EUR).
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {currencyBreakdown.map((c) => (
                <div
                  key={c.code}
                  className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{c.flag}</span>
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {c.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 ml-2">
                          {c.code}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-slate-900 dark:text-white block">
                        {c.weight.toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-400">
                        {fmt.currency(c.value)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        c.code === 'EUR' ? 'bg-emerald-500' : c.code === 'USD' ? 'bg-blue-500' : 'bg-amber-500'
                      )}
                      style={{ width: `${Math.min(100, c.weight)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                    <span>Clasificación de riesgo:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{c.riskType}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Right: Currency Risk Assessment Note */}
          <Card className="p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-amber-500/[0.03] to-transparent border-amber-500/20">
            <div>
              <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-white/[0.06]">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Evaluación de Riesgo FX
                </h4>
              </div>

              <div className="flex flex-col gap-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  El <strong className="font-bold text-slate-900 dark:text-white">{(currencyBreakdown.find((c) => c.code === 'EUR')?.weight ?? 0).toFixed(1)}%</strong> de tu patrimonio está protegido frente a fluctuaciones de divisas al cotizar directamente en Euros.
                </p>
                <p>
                  El <strong className="font-bold text-slate-900 dark:text-white">{(currencyBreakdown.find((c) => c.code === 'USD')?.weight ?? 0).toFixed(1)}%</strong> vinculado al Dólar USA aporta una cobertura natural: históricamente, en caídas bursátiles globales el Dólar actúa como divisa refugio, amortiguando las pérdidas netas en Euros para inversores europeos.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 font-medium mt-3">
              💡 Para carteras a largo plazo (&gt; 5 años), la teoría financiera moderna recomienda no cubrir la divisa en renta variable global para no pagar el coste del swap de cobertura.
            </div>
          </Card>
        </div>
      )}

      {/* ── 6. TAB 4: Clases de Activo & Perfil ───────────────────────────────── */}
      {activeTab === 'assets' && (
        <Card delay={0.15} className="p-4 sm:p-5">
          <div className="pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              Asignación por Clase de Activo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Distribución macro entre Renta Variable, Renta Fija y Monetarios.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {assetClassBreakdown.map((a) => (
              <div
                key={a.id}
                className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>{a.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                </div>
                <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                  {a.weight.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {fmt.currency(a.value)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── 7. TAB 5: Consejos de Rebalanceo ─────────────────────────────────── */}
      {activeTab === 'rebalance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rebalanceSuggestions.map((sug, i) => (
            <Card key={`sug-${i}`} className="p-4 sm:p-5 border-l-4 border-l-blue-500">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
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
      )}
    </div>
  )
}
