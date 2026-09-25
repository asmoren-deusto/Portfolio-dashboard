import React, { useState } from 'react'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { ReturnsChart } from '@/components/charts/ReturnsChart'
import { AllocationChart } from '@/components/charts/AllocationChart'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { AssetBadge, PnlBadge } from '@/components/ui/Badge'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import { fmt } from '@/lib/utils'
import { useAnalytics, usePositions } from '@/api/queries'
import type { Position } from '@/lib/mockData'

export function AnalyticsPage() {
  const { data: analytics } = useAnalytics()
  const { data: positions = [] } = usePositions()
  const [allocMode, setAllocMode] = useState<'asset' | 'type'>('type')
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)

  const isSharpeGood = (analytics?.sharpe_ratio ?? 0) >= 1.0

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Unified Header */}
      <Header
        title="Analítica y Riesgo"
        subtitle="Métricas cuantitativas avanzadas, rentabilidad ponderada en el tiempo (TWR) y perfil de volatilidad."
        badge="Métricas Cuantitativas"
        badgeColor="violet"
        showPeriodSelector
      />

      {/* KPI grid with luxury styling */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <KpiCard
          label="TWR (Time-Weighted)"
          value={analytics ? fmt.pct(analytics.twr) : '—'}
          sub="Elimina efecto de aportaciones"
          changePositive={(analytics?.twr ?? 0) >= 0}
          delay={0}
          icon={<TrendingUp size={16} className="text-emerald-400" />}
        />
        <KpiCard
          label="CAGR Anualizado"
          value={analytics ? fmt.pct(analytics.cagr) : '—'}
          sub="Crecimiento compuesto anual"
          changePositive={(analytics?.cagr ?? 0) >= 0}
          delay={0.04}
          icon={<BarChart3 size={16} className="text-blue-400" />}
        />
        <KpiCard
          label="Volatilidad Anual"
          value={analytics ? fmt.pct(analytics.volatility, false) : '—'}
          sub="Desviación típica (σ)"
          delay={0.08}
          icon={<Activity size={16} className="text-amber-400" />}
        />
        <KpiCard
          label="Sharpe Ratio"
          value={analytics ? fmt.ratio(analytics.sharpe_ratio) : '—'}
          sub={isSharpeGood ? 'Excelente (> 1.0)' : 'Aceptable'}
          changePositive={isSharpeGood}
          delay={0.12}
          icon={<ShieldCheck size={16} className="text-indigo-400" />}
        />
        <KpiCard
          label="Max Drawdown"
          value={analytics ? fmt.pct(analytics.max_drawdown) : '—'}
          sub="Caída máxima histórica"
          changePositive={false}
          delay={0.16}
          icon={<TrendingDown size={16} className="text-rose-400" />}
        />
      </div>

      {/* Benchmark Comparison Card */}
      <Card delay={0.18}>
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.05]">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Comparativa de Rentabilidad vs Benchmarks</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">
              Rendimiento acumulado de tu cartera frente a los principales índices globales y tipo libre de riesgo.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 self-start md:self-auto">
            Alfa estimada: +3.2%
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/25">
            <span className="text-xs text-blue-700 dark:text-blue-300 font-bold block">Tu Cartera</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              {analytics ? fmt.pct(analytics.twr) : '+21.4%'}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">Gestión activa + DCA</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block">S&P 500 (EUR)</span>
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">+18.2%</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">Índice EE.UU.</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block">MSCI World</span>
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">+15.8%</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">Mercados Desarrollados</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05]">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold block">Tasa BCE / Depósito</span>
            <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-300 mt-1 block">+3.25%</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">Libre de riesgo</span>
          </div>
        </div>
      </Card>

      {/* Returns Chart + Allocation Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Returns bar chart */}
        <Card className="lg:col-span-3 flex flex-col justify-between" delay={0.22}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <CardTitle>Rentabilidad por Periodo</CardTitle>
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Retorno temporal continuo</span>
          </CardHeader>
          <div className="px-5 pb-5">
            {analytics ? (
              <ReturnsChart analytics={analytics} />
            ) : (
              <div className="flex h-[240px] items-center justify-center text-slate-500 text-sm">
                Sin datos de rentabilidad
              </div>
            )}
          </div>
        </Card>

        {/* Allocation Donut with Mode Toggle */}
        <Card className="lg:col-span-2 flex flex-col justify-between" delay={0.25}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <CardTitle>Distribución de Cartera</CardTitle>
            </div>
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-white/[0.05] p-0.5 border border-slate-200/80 dark:border-transparent">
              <button
                onClick={() => setAllocMode('type')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  allocMode === 'type' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Por Tipo
              </button>
              <button
                onClick={() => setAllocMode('asset')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  allocMode === 'asset' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Por Activo
              </button>
            </div>
          </CardHeader>
          <div className="px-5 pb-5">
            {positions.length > 0 ? (
              <AllocationChart positions={positions} mode={allocMode} />
            ) : (
              <div className="flex h-[240px] items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                Sin datos de posiciones
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Risk Metrics Detail */}
      <Card delay={0.3}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <CardTitle>Diagnóstico de Riesgo y Resiliencia</CardTitle>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Evaluación estadística del portfolio</span>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-white/[0.05] border-t border-slate-100 dark:border-white/[0.05]">
          {[
            {
              label: 'Volatilidad Anualizada',
              value: analytics ? fmt.pct(analytics.volatility, false) : '12.4%',
              desc: 'Desviación estándar anualizada de retornos. Un valor inferior al 15% indica una cartera equilibrada y defensiva.',
              color: 'text-amber-500 dark:text-amber-400',
              tag: 'Moderada',
            },
            {
              label: 'Máximo Drawdown Histórico',
              value: analytics ? fmt.pct(analytics.max_drawdown) : '-8.7%',
              desc: 'Mayor caída pico a valle registrada. Mide la resistencia patrimonial durante correcciones severas de mercado.',
              color: 'text-rose-500 dark:text-rose-400',
              tag: 'Bajo impacto',
            },
            {
              label: 'Ratio de Sharpe',
              value: analytics ? fmt.ratio(analytics.sharpe_ratio) : '1.38',
              desc: 'Rendimiento extra obtenido por unidad de riesgo asumido vs tasa libre de riesgo. > 1.0 se considera óptimo.',
              color: isSharpeGood ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400',
              tag: 'Excelente',
            },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.06 }}
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
      <Card delay={0.35} className="overflow-hidden">
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
              {positions
                .slice()
                .sort((a, b) => b.unrealized_pnl_pct - a.unrealized_pnl_pct)
                .map((p, i) => (
                  <motion.tr
                    key={p.isin}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38 + i * 0.03 }}
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
                          <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors truncate max-w-[300px] text-[14.3px]">
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
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Position Detail Modal */}
      <PositionDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}
