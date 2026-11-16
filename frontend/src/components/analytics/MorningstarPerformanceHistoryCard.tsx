import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts'
import { TrendingUp, BarChart3, ShieldCheck, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { fmt, cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import type { XRayPerformanceData } from '@/lib/xrayEngine'

interface MorningstarPerformanceHistoryCardProps {
  performance: XRayPerformanceData
  className?: string
}

export function MorningstarPerformanceHistoryCard({
  performance,
  className,
}: MorningstarPerformanceHistoryCardProps) {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  const last10k = performance.growth10k[performance.growth10k.length - 1]
  const portfolioGrowth = last10k ? last10k.portfolio : 40850
  const benchmarkGrowth = last10k ? last10k.benchmark : 22300
  const portfolioMultiple = (portfolioGrowth / 10000).toFixed(2)
  const benchmarkMultiple = (benchmarkGrowth / 10000).toFixed(2)

  return (
    <Card className={cn('p-4 sm:p-6 flex flex-col gap-6 sm:gap-7', className)}>
      {/* ── HEADER PRINCIPAL DE RENTABILIDAD & BENCHMARK ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-3.5 border-b border-slate-200/70 dark:border-white/[0.08] gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 text-[#C8102E] dark:text-red-400 border border-red-500/20 shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Histórico de Rentabilidad & Crecimiento de 10.000 €
              </h3>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono">
                +{portfolioMultiple}x Cartera vs +{benchmarkMultiple}x Ref
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multiplicación de capital histórico e impacto de exceso trimestral vs{' '}
              <strong className="text-slate-700 dark:text-slate-300">{performance.benchmarkName}</strong>
            </p>
          </div>
        </div>

        {/* Cifras Resumen a la derecha */}
        <div className="flex items-center gap-3 sm:text-right self-start sm:self-auto bg-slate-50/80 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/[0.05]">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Patrimonio Base 10k
            </span>
            <span className="font-mono font-extrabold text-base sm:text-lg text-[#C8102E] dark:text-rose-400">
              {fmt.currency(portfolioGrowth)}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Benchmark (80/20)
            </span>
            <span className="font-mono font-bold text-base sm:text-lg text-slate-600 dark:text-slate-300">
              {fmt.currency(benchmarkGrowth)}
            </span>
          </div>
        </div>
      </div>

      {/* ── 1. GRÁFICO: CRECIMIENTO DE 10.000 EUR ──────────────────────── */}
      <div className="rounded-xl border border-slate-200/85 dark:border-white/[0.08] bg-white dark:bg-[#18181b] overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 sm:py-3 bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Rentabilidad · Crecim. de EUR 10000
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C8102E]" /> Cartera
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Benchmark (80/20)
            </span>
          </div>
        </div>

        <div className="p-3.5 sm:p-4">
          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={performance.growth10k}
                margin={{ top: 12, right: 16, left: -10, bottom: 6 }}
              >
                <defs>
                  <linearGradient id="growthPortfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8102E" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#C8102E" stopOpacity={0.0} />
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
                />
                <YAxis
                  domain={[8000, 44000]}
                  ticks={[10000, 20000, 30000, 40000]}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null
                    const portVal = payload.find((p: any) => p.dataKey === 'portfolio')?.value as number
                    const benchVal = payload.find((p: any) => p.dataKey === 'benchmark')?.value as number
                    const excess = portVal && benchVal ? portVal - benchVal : 0
                    return (
                      <div className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md p-3.5 shadow-xl text-xs font-mono min-w-[210px]">
                        <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-1.5 mb-2 flex items-center justify-between">
                          <span>Año {label}</span>
                          <span className="text-[10px] text-slate-400 font-sans">Base 10.000 €</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-sans">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#C8102E]" />
                              Cartera:
                            </span>
                            <span className="font-bold text-[#C8102E]">
                              {fmt.currency(portVal)} ({(portVal / 10000).toFixed(2)}x)
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-sans">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                              Benchmark:
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {fmt.currency(benchVal)} ({(benchVal / 10000).toFixed(2)}x)
                            </span>
                          </div>
                          {excess !== 0 && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3">
                              <span className="text-slate-500 font-sans">Ventaja vs Ref:</span>
                              <span
                                className={cn(
                                  'font-bold',
                                  excess > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                                )}
                              >
                                {excess > 0 ? '+' : ''}
                                {fmt.currency(excess)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="portfolio"
                  name="Cartera"
                  stroke="#C8102E"
                  strokeWidth={2.4}
                  fill="url(#growthPortfolioGrad)"
                  dot={{ r: 3, fill: '#C8102E' }}
                  activeDot={{ r: 5, fill: '#C8102E', stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name="Benchmark (80/20)"
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                  strokeWidth={1.8}
                  dot={{ r: 2.5, fill: isDark ? '#94a3b8' : '#64748b' }}
                  activeDot={{ r: 4.5, fill: isDark ? '#94a3b8' : '#64748b' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 2. GRÁFICO: RENTABILIDAD TRIMESTRAL RESPECTO A BENCHMARK ─────── */}
      <div className="rounded-xl border border-slate-200/85 dark:border-white/[0.08] bg-white dark:bg-[#18181b] overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 sm:py-3 bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Rentabilidad trimestral respecto benchmark
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#C8102E]" /> Exceso positivo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#1e3a8a] dark:bg-blue-600" /> Exceso negativo
            </span>
          </div>
        </div>

        <div className="p-3.5 sm:p-4">
          <div className="h-36 sm:h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={performance.quarterlyExcess}
                margin={{ top: 8, right: 16, left: -20, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                />
                <XAxis
                  dataKey="quarter"
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9.5 }}
                  tickLine={false}
                  axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  interval={1}
                />
                <YAxis
                  domain={[-24, 20]}
                  ticks={[-16, 0, 16]}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val >= 0 ? '+' : ''}${val}`}
                />
                <ReferenceLine y={0} stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth={1} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const item = payload[0].payload as { quarter: string; excess: number; isPositive: boolean }
                    return (
                      <div className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md p-2.5 shadow-xl text-xs font-mono">
                        <div className="text-slate-500 dark:text-slate-400 font-sans font-medium mb-1">
                          Trimestre {item.quarter}
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-600 dark:text-slate-300 font-sans">Alfa vs Ref:</span>
                          <span
                            className={cn(
                              'font-bold',
                              item.isPositive ? 'text-[#C8102E]' : 'text-blue-600 dark:text-blue-400'
                            )}
                          >
                            {item.excess >= 0 ? '+' : ''}
                            {item.excess.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="excess" radius={[2, 2, 2, 2]}>
                  {performance.quarterlyExcess.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isPositive ? '#C8102E' : isDark ? '#3b82f6' : '#1e3a8a'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 3. TABLAS DE RENTABILIDAD ACUMULADA Y EXTREMOS POR PERIODOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Tabla 1 (5 cols): Rentabilidad Acumulada % */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden bg-white dark:bg-[#18181b] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="px-4 py-3 bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Rentab. acum. %
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Port vs Benchmark</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-white/[0.05] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="text-left py-2 px-4">Periodo</th>
                    <th className="text-right py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      Port
                    </th>
                    <th className="text-right py-2 px-3 font-mono text-slate-400">Ref.</th>
                    <th className="text-right py-2 px-4 font-mono">Alfa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {performance.accumulatedReturns.map((r, i) => {
                    const diff = r.portfolio - r.reference
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{r.period}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-950 dark:text-white">
                          {r.portfolio.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {r.reference.toFixed(2).replace('.', ',')}
                        </td>
                        <td
                          className={cn(
                            'py-2.5 px-4 text-right font-mono font-bold',
                            diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                          )}
                        >
                          {diff >= 0 ? '+' : ''}
                          {diff.toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tabla 2 (7 cols): Rentabilidad por Periodos % (Mejor y Peor) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden bg-white dark:bg-[#18181b] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="px-4 py-3 bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Rentab. por periodos %
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Mejor vs Peor Registro</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-white/[0.05] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="text-left py-2 px-4">Periodo</th>
                    <th className="text-right py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                      Mejor
                    </th>
                    <th className="text-right py-2 px-4 font-mono text-rose-600 dark:text-rose-400">
                      Peor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {performance.periodExtremes.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{p.period}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                        +{p.bestReturn.toFixed(2).replace('.', ',')}%{' '}
                        <span className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400">
                          ({p.bestDates})
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">
                        {p.worstReturn > 0 ? '+' : ''}
                        {p.worstReturn.toFixed(2).replace('.', ',')}%{' '}
                        <span className="text-[10px] font-sans font-normal text-slate-500 dark:text-slate-400">
                          ({p.worstDates})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
