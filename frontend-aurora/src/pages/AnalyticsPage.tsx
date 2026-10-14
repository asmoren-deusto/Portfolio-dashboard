import React, { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  ShieldAlert,
  Percent,
  Activity,
  Layers,
  Award,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import {
  useAnalytics,
  useBenchmarkComparison,
  usePositions,
  usePortfolioSummary,
} from '@/api/queries'
import { fmt, cn } from '@/lib/utils'
import { AuroraCard } from '~/components/ui/AuroraCard'
import { AuroraBadge } from '~/components/ui/AuroraBadge'

export function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics()
  const { data: benchmarks } = useBenchmarkComparison()
  const { data: positions } = usePositions()
  const { data: summary } = usePortfolioSummary()

  // State for toggling benchmark lines
  const [showSp500, setShowSp500] = useState(true)
  const [showMsci, setShowMsci] = useState(true)
  const [showEuroStoxx, setShowEuroStoxx] = useState(true)

  // Relative Asset Return (Diverging bars)
  const assetReturns = useMemo(() => {
    if (!positions) return []
    return positions
      .map((p) => ({
        name: p.name.replace('Index Fund', '').replace('EUR Acc', '').trim(),
        pnlPct: p.unrealized_pnl_pct || 0,
        isin: p.isin,
      }))
      .sort((a, b) => b.pnlPct - a.pnlPct)
  }, [positions])

  // Heatmap Mock Data (Monthly Returns Matrix)
  const monthlyMatrix = [
    {
      year: 2024,
      months: [-2.8, -3.1, 1.2, 2.5, 1.3, 1.3, 2.7, 2.3, 1.3, 2.3, 3.1, 1.8],
    },
    {
      year: 2025,
      months: [-3.3, -2.1, -3.2, 0.3, 3.3, 1.2, 2.3, 3.6, -3.3, -2.3, 2.8, 2.1],
    },
    {
      year: 2026,
      months: [2.4, -1.2, 1.6, -0.8, 1.9, 0.7, 1.4, -0.4, 2.3, 0.8, null, null],
    },
  ]

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  return (
    <div className="flex flex-col gap-6 au-rise">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP BENCHMARK COMPARISON & RISK DIAGNOSIS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Evolución vs Índices Multi-Line Chart */}
        <AuroraCard
          className="lg:col-span-8 p-6"
          title="Evolución vs Índices"
          subtitle="Rentabilidad TWR de la cartera ponderada frente a los principales benchmarks"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowMsci((v) => !v)}
                className={cn(
                  'au-chip text-[11px] font-bold transition-all',
                  showMsci ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'opacity-40'
                )}
              >
                MSCI World {benchmarks?.summary?.alpha_msci !== undefined && `(${benchmarks.summary.alpha_msci >= 0 ? '+' : ''}${benchmarks.summary.alpha_msci}%)`}
              </button>
              <button
                onClick={() => setShowSp500((v) => !v)}
                className={cn(
                  'au-chip text-[11px] font-bold transition-all',
                  showSp500 ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30' : 'opacity-40'
                )}
              >
                S&P 500 {benchmarks?.summary?.alpha_sp500 !== undefined && `(${benchmarks.summary.alpha_sp500 >= 0 ? '+' : ''}${benchmarks.summary.alpha_sp500}%)`}
              </button>
              <button
                onClick={() => setShowEuroStoxx((v) => !v)}
                className={cn(
                  'au-chip text-[11px] font-bold transition-all',
                  showEuroStoxx ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'opacity-40'
                )}
              >
                Euro Stoxx 50
              </button>
            </div>
          }
        >
          <div className="h-[280px] w-full" data-private>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={benchmarks?.points || []}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  minTickGap={40}
                  tickFormatter={(v) => v ? v.slice(5) : ''}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload
                    return (
                      <div className="au-tooltip font-mono text-xs">
                        <p className="text-[var(--au-muted)] mb-1 font-bold">{p.date}</p>
                        <p className="text-teal-400 font-bold">Cartera: +{p.portfolio_twr?.toFixed(2)}%</p>
                        {showMsci && <p className="text-amber-400">MSCI World: +{p.msci_world?.toFixed(2)}%</p>}
                        {showSp500 && <p className="text-violet-400">S&P 500: +{p.sp500?.toFixed(2)}%</p>}
                        {showEuroStoxx && <p className="text-sky-400">Euro Stoxx: +{p.eurostoxx50?.toFixed(2)}%</p>}
                      </div>
                    )
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />

                {/* Benchmark Lines */}
                {showEuroStoxx && (
                  <Line
                    type="monotone"
                    dataKey="eurostoxx50"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {showMsci && (
                  <Line
                    type="monotone"
                    dataKey="msci_world"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                {showSp500 && (
                  <Line
                    type="monotone"
                    dataKey="sp500"
                    stroke="#a78bfa"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}

                {/* Portfolio Line (Hero) */}
                <Line
                  type="monotone"
                  dataKey="portfolio_twr"
                  stroke="#2dd4bf"
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-[var(--au-border)] text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-400" />
              <span className="font-bold text-[var(--au-text)]">Cartera Inversora</span>
              <span className="au-chip text-[11px] text-teal-400 font-bold">
                TWR +{analytics?.twr?.toFixed(2) || '16.50'}%
              </span>
            </div>

            <div className="flex items-center gap-2 text-[var(--au-muted)] font-mono">
              <span>Alfa vs Mercado:</span>
              <span className="text-teal-400 font-bold">
                +{benchmarks?.summary?.alpha_msci?.toFixed(2) || '3.20'}%
              </span>
            </div>
          </div>
        </AuroraCard>

        {/* Right: Diagnóstico de Riesgo y Resiliencia */}
        <AuroraCard
          className="lg:col-span-4 p-6 flex flex-col justify-between"
          title="Diagnóstico de Riesgo"
          subtitle="Métricas avanzadas de preservación de capital"
        >
          {/* Semicircular Gauge Mockup */}
          <div className="flex flex-col items-center justify-center my-3 relative">
            <div className="w-40 h-20 overflow-hidden relative">
              <div className="w-40 h-40 rounded-full border-[12px] border-[var(--au-chip)] border-t-teal-400 border-r-teal-400 rotate-[-45deg] transition-transform" />
            </div>
            <div className="text-center mt-2">
              <p className="text-xs font-bold text-[var(--au-muted)] uppercase tracking-wider">
                Perfil de Riesgo
              </p>
              <p className="text-xl font-extrabold text-[var(--au-text)] font-mono">
                Moderado 6/10
              </p>
            </div>
          </div>

          {/* Metric Rows */}
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--au-chip)]">
              <span className="text-[var(--au-muted)]">Ratio Sharpe</span>
              <span className="font-bold text-[var(--au-text)]">
                {analytics?.sharpe_ratio?.toFixed(2) || '1.12'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--au-chip)]">
              <span className="text-[var(--au-muted)]">Ratio Sortino</span>
              <span className="font-bold text-teal-400">1.58</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--au-chip)]">
              <span className="text-[var(--au-muted)]">Volatilidad Anual</span>
              <span className="font-bold text-[var(--au-text)]">
                {analytics?.volatility?.toFixed(1) || '9.4'}%
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--au-chip)]">
              <span className="text-[var(--au-muted)]">Máximo Drawdown</span>
              <span className="font-bold text-rose-400">
                {analytics?.max_drawdown?.toFixed(1) || '−7.2'}%
              </span>
            </div>
          </div>
        </AuroraCard>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MONTHLY RETURNS MATRIX & RELATIVE ASSET RETURNS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap Matrix: Matriz de Rendimientos Mensuales */}
        <AuroraCard
          className="lg:col-span-7 p-6"
          title="Matriz de Rendimientos Mensuales"
          subtitle="Mapa térmico de rendimiento por año y mes"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 text-[var(--au-muted)] font-bold">Año</th>
                  {monthNames.map((m) => (
                    <th key={m} className="py-2 px-1 text-center text-[var(--au-muted)] font-semibold text-[11px]">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyMatrix.map((row) => (
                  <tr key={row.year} className="border-t border-[var(--au-border)]">
                    <td className="py-2.5 px-2 font-bold text-[var(--au-text)]">
                      {row.year}
                    </td>
                    {row.months.map((val, idx) => {
                      if (val === null) {
                        return (
                          <td key={idx} className="py-2.5 px-1 text-center text-[var(--au-faint)]">
                            —
                          </td>
                        )
                      }
                      const isGain = val >= 0
                      const bgIntensity = Math.min(Math.abs(val) / 4, 1)

                      return (
                        <td
                          key={idx}
                          className="py-2.5 px-1 text-center rounded-md font-bold text-[10px]"
                          style={{
                            backgroundColor: isGain
                              ? `rgba(45, 212, 191, ${0.12 + bgIntensity * 0.3})`
                              : `rgba(251, 113, 133, ${0.12 + bgIntensity * 0.3})`,
                            color: isGain ? '#2dd4bf' : '#fb7185',
                          }}
                        >
                          {isGain ? '+' : ''}{val.toFixed(1)}%
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AuroraCard>

        {/* Diverging Bar Chart: Rendimiento Relativo por Activo */}
        <AuroraCard
          className="lg:col-span-5 p-6"
          title="Rendimiento Relativo por Activo"
          subtitle="Ganancia acumulada generada por cada fondo"
        >
          <div className="h-[210px] w-full" data-private>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={assetReturns.slice(0, 6)}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="au-tooltip font-mono text-xs">
                        <p className="font-bold text-[var(--au-text)]">{d.name}</p>
                        <p className={d.pnlPct >= 0 ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}>
                          Rentabilidad: {d.pnlPct >= 0 ? '+' : ''}{d.pnlPct.toFixed(2)}%
                        </p>
                      </div>
                    )
                  }}
                />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" />
                <Bar dataKey="pnlPct" radius={[0, 4, 4, 0]}>
                  {assetReturns.slice(0, 6).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnlPct >= 0 ? '#2dd4bf' : '#fb7185'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AuroraCard>
      </div>
    </div>
  )
}
