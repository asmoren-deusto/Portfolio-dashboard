import React, { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  LabelList,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Activity,
  Zap,
  Calendar,
  Layers,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  usePortfolioSummary,
  usePerformance,
  usePositions,
  useAnalytics,
  useSimulatedPortfolio,
} from '@/api/queries'
import { useAppStore } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'
import { AuroraCard } from '~/components/ui/AuroraCard'
import { AuroraBadge } from '~/components/ui/AuroraBadge'
import { CountUp } from '~/components/ui/CountUp'
import { Sparkline } from '~/components/ui/Sparkline'
import { useNavigate } from 'react-router-dom'

const DONUT_COLORS = [
  '#2dd4bf', // teal
  '#a78bfa', // violet
  '#38bdf8', // sky
  '#fbbf24', // amber
  '#ec4899', // pink
  '#60a5fa', // blue
  '#34d399', // emerald
  '#94a3b8', // slate
]

export function OverviewPage() {
  const navigate = useNavigate()
  const { period, selectedBroker } = useAppStore()

  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary()
  const { data: performance, isLoading: perfLoading } = usePerformance()
  const { data: positions, isLoading: posLoading } = usePositions()
  const { data: analytics } = useAnalytics()
  const { data: simulated } = useSimulatedPortfolio('1d')

  const [returnsMode, setReturnsMode] = useState<'global' | 'weekly'>('global')

  // Calculate Short Term Metrics (Today's Change & Week)
  const shortTerm = useMemo(() => {
    if (!positions || positions.length === 0) {
      return { dayAmount: 0, dayPct: 0 }
    }
    const latestDate = positions.reduce((max, p) => {
      const d = p.price_date || p.last_updated
      return d && d > max ? d : max
    }, '')

    const dayChangeAmount = positions.reduce((acc, p) => {
      const d = p.price_date || p.last_updated
      if (d === latestDate) {
        return acc + (p.daily_change || 0) * (p.shares || 1)
      }
      return acc
    }, 0)

    const totalVal = positions.reduce((acc, p) => acc + (p.current_value || 0), 0)
    const prevVal = totalVal - dayChangeAmount
    const dayChangePct = prevVal > 0 ? (dayChangeAmount / prevVal) * 100 : 0

    return {
      dayAmount: Math.round(dayChangeAmount * 100) / 100,
      dayPct: Math.round(dayChangePct * 100) / 100,
    }
  }, [positions])

  // Category distribution for Donut Chart
  const distributionData = useMemo(() => {
    if (!positions || positions.length === 0) return []
    const catMap: Record<string, number> = {}
    let total = 0
    positions.forEach((p) => {
      const cat = p.category || 'Otros'
      catMap[cat] = (catMap[cat] || 0) + (p.current_value || 0)
      total += p.current_value || 0
    })

    return Object.entries(catMap)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        pct: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [positions])

  // Multi-horizon Returns Data
  const returnsData = useMemo(() => {
    if (returnsMode === 'global') {
      return [
        { name: '1D', value: shortTerm.dayPct || analytics?.return_1d || 0 },
        { name: '1S', value: analytics?.return_1w || 0 },
        { name: '1M', value: analytics?.return_1m || 0 },
        { name: '3M', value: analytics?.return_3m || 0 },
        { name: '6M', value: analytics?.return_6m || 0 },
        { name: '1A', value: analytics?.return_1y || analytics?.return_ytd || 0 },
      ]
    } else {
      // Weekly sessions
      if (!performance || performance.length < 2) return []
      const slice = performance.slice(-7)
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      return slice.slice(1).map((p, idx) => {
        const prev = slice[idx]
        const d = new Date(p.date)
        const name = `${days[d.getDay()]} ${d.getDate()}`
        const diff = p.value - prev.value
        const pct = prev.value > 0 ? (diff / prev.value) * 100 : 0
        return {
          name,
          value: Math.round(pct * 100) / 100,
        }
      })
    }
  }, [returnsMode, shortTerm.dayPct, analytics, performance])

  // Mini sparklines for KPI cards
  const perfValues = useMemo(() => {
    if (!performance || performance.length < 2) return [100, 101, 102]
    return performance.slice(-30).map((p) => p.value)
  }, [performance])

  const totalVal = summary?.total_value || 0
  const totalInv = summary?.total_invested || 0
  const totalPnl = summary?.total_pnl || totalVal - totalInv
  const totalPnlPct = summary?.total_pnl_pct || (totalInv > 0 ? (totalPnl / totalInv) * 100 : 0)

  return (
    <div className="flex flex-col gap-6 au-rise">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO CARD: BALANCE HERO + EVOLUCIÓN PATRIMONIAL AREA CHART
          ───────────────────────────────────────────────────────────── */}
      <AuroraCard className="p-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Column: Big Numbers & Badges */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[var(--au-border)]">
            <div>
              <span className="au-eyebrow text-teal-400">Patrimonio Total</span>
              <div
                data-private
                className="mt-2 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight au-display text-[var(--au-text)]"
              >
                <CountUp value={totalVal} suffix=" €" decimals={2} />
              </div>

              {/* Badges: Total Return & Today's Session */}
              <div className="flex flex-wrap items-center gap-2.5 mt-4">
                <AuroraBadge
                  variant={totalPnl >= 0 ? 'gain' : 'loss'}
                  size="md"
                  icon={totalPnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                >
                  <span data-private>
                    {totalPnl >= 0 ? '+' : ''}
                    {fmt.currency(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}
                    {totalPnlPct.toFixed(2)}%)
                  </span>
                </AuroraBadge>

                <AuroraBadge
                  variant={shortTerm.dayAmount >= 0 ? 'gain' : 'loss'}
                  size="md"
                  icon={<Zap size={13} />}
                >
                  <span data-private>
                    Hoy {shortTerm.dayAmount >= 0 ? '+' : ''}
                    {fmt.currency(shortTerm.dayAmount)} ({shortTerm.dayPct >= 0 ? '+' : ''}
                    {shortTerm.dayPct.toFixed(2)}%)
                  </span>
                </AuroraBadge>
              </div>
            </div>

            {/* Quick Metrics Footer */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-[var(--au-border)] text-xs">
              <div>
                <p className="text-[var(--au-muted)] font-medium">Capital Invertido</p>
                <p data-private className="au-num text-sm sm:text-base font-bold text-[var(--au-text)] mt-0.5">
                  {fmt.currency(totalInv)}
                </p>
              </div>
              <div>
                <p className="text-[var(--au-muted)] font-medium">Activos en Cartera</p>
                <p className="au-num text-sm sm:text-base font-bold text-[var(--au-text)] mt-0.5">
                  {positions?.length || 0} fondos / ETFs
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: High-End Area Chart */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="au-title">Evolución Patrimonial</h4>
                <p className="text-[11px] text-[var(--au-muted)]">
                  Valoración de mercado vs. capital neto desembolsado
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                  <span className="text-[var(--au-text-2)]">Valor Cartera</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-slate-400" />
                  <span className="text-[var(--au-muted)]">Invertido</span>
                </div>
              </div>
            </div>

            <div className="h-[240px] sm:h-[280px] w-full" data-private>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={performance || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="auroraHeroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => {
                      if (!v) return ''
                      const parts = v.split('-')
                      return `${parts[2]}/${parts[1]}`
                    }}
                    minTickGap={45}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const pt = payload[0].payload
                      return (
                        <div className="au-tooltip font-mono">
                          <p className="text-[11px] font-bold text-[var(--au-muted)] mb-1">
                            {pt.date}
                          </p>
                          <p className="text-teal-400 font-bold text-xs">
                            Valor: {fmt.currency(pt.value)}
                          </p>
                          {pt.invested !== undefined && (
                            <p className="text-slate-400 text-xs">
                              Invertido: {fmt.currency(pt.invested)}
                            </p>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="invested"
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    fill="transparent"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#2dd4bf"
                    strokeWidth={2.5}
                    fill="url(#auroraHeroGrad)"
                    isAnimationActive={true}
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </AuroraCard>

      {/* ─────────────────────────────────────────────────────────────
          2. 4 COMPACT KPI TILES
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Capital Invertido */}
        <AuroraCard hoverEffect className="p-4 flex flex-col justify-between">
          <div>
            <span className="au-eyebrow">Capital Invertido</span>
            <div data-private className="au-num text-xl sm:text-2xl font-bold text-[var(--au-text)] mt-1">
              {fmt.currency(totalInv)}
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-[11px] text-[var(--au-muted)]">30 días</span>
            <div className="w-24">
              <Sparkline data={perfValues} color="#38bdf8" height={28} />
            </div>
          </div>
        </AuroraCard>

        {/* KPI 2: TIR / TWR Anual */}
        <AuroraCard hoverEffect className="p-4 flex flex-col justify-between">
          <div>
            <span className="au-eyebrow">TIR Anualizada (XIRR)</span>
            <div data-private className="au-num text-xl sm:text-2xl font-bold text-teal-400 mt-1">
              {analytics?.annualized_return !== undefined
                ? `${analytics.annualized_return >= 0 ? '+' : ''}${analytics.annualized_return.toFixed(2)}%`
                : '11,8%'}
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-[11px] text-teal-400 font-semibold">TWR: +{analytics?.twr?.toFixed(1) || '16.5'}%</span>
            <div className="w-24">
              <Sparkline data={perfValues} color="#2dd4bf" height={28} />
            </div>
          </div>
        </AuroraCard>

        {/* KPI 3: Volatilidad */}
        <AuroraCard hoverEffect className="p-4 flex flex-col justify-between">
          <div>
            <span className="au-eyebrow">Volatilidad Anual</span>
            <div className="au-num text-xl sm:text-2xl font-bold text-[var(--au-text)] mt-1">
              {analytics?.volatility ? `${analytics.volatility.toFixed(1)}%` : '9,4%'}
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-[11px] text-[var(--au-muted)]">Sharpe: {analytics?.sharpe_ratio?.toFixed(2) || '1.12'}</span>
            <div className="w-24">
              <Sparkline data={perfValues} color="#a78bfa" height={28} />
            </div>
          </div>
        </AuroraCard>

        {/* KPI 4: Max Drawdown */}
        <AuroraCard hoverEffect className="p-4 flex flex-col justify-between">
          <div>
            <span className="au-eyebrow">Máx. Caída (Drawdown)</span>
            <div className="au-num text-xl sm:text-2xl font-bold text-rose-400 mt-1">
              {analytics?.max_drawdown ? `${analytics.max_drawdown.toFixed(1)}%` : '−7,2%'}
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-[11px] text-rose-400 font-semibold">Recuperado</span>
            <div className="w-24">
              <Sparkline data={perfValues.map((v) => -Math.abs(v % 10))} color="#fb7185" height={28} />
            </div>
          </div>
        </AuroraCard>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TRIPLE CARD ROW:
             - Rendimiento por Periodo
             - Distribución de Activos
             - Sesión Simulada en Vivo
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Rendimiento por Periodo */}
        <AuroraCard
          title="Rendimiento"
          subtitle="TWR ponderado en el tiempo"
          action={
            <div className="au-seg">
              <button
                onClick={() => setReturnsMode('global')}
                aria-pressed={returnsMode === 'global'}
                className="au-seg-btn py-1 px-2.5 text-[11px]"
              >
                {returnsMode === 'global' && <motion.div layoutId="retPill" className="au-seg-pill" />}
                <span className="relative z-10">Global</span>
              </button>
              <button
                onClick={() => setReturnsMode('weekly')}
                aria-pressed={returnsMode === 'weekly'}
                className="au-seg-btn py-1 px-2.5 text-[11px]"
              >
                {returnsMode === 'weekly' && <motion.div layoutId="retPill" className="au-seg-pill" />}
                <span className="relative z-10">Semanal</span>
              </button>
            </div>
          }
        >
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={returnsData}
                margin={{ top: 20, right: 6, left: 4, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="barTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="barCoral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  dy={2}
                />
                <YAxis
                  width={36}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="au-tooltip font-mono">
                        <p className="font-semibold text-xs mb-0.5">{d.name}</p>
                        <p className={d.value >= 0 ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}>
                          {d.value >= 0 ? '+' : ''}{d.value.toFixed(2)}%
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  isAnimationActive={true}
                >
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(val: any) => `${Number(val) >= 0 ? '+' : ''}${Math.abs(Number(val)) < 1 ? Number(val).toFixed(2) : Number(val).toFixed(1)}%`}
                    style={{
                      fill: '#94a3b8',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  />
                  {returnsData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.value >= 0 ? 'url(#barTeal)' : 'url(#barCoral)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[var(--au-border)] text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--au-chip)]">
              <span className="text-[var(--au-muted)] font-bold">1D:</span>
              <span className={shortTerm.dayPct >= 0 ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}>
                {shortTerm.dayPct >= 0 ? '+' : ''}{shortTerm.dayPct.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--au-chip)]">
              <span className="text-[var(--au-muted)] font-bold">YTD:</span>
              <span className="text-teal-400 font-bold">
                +{analytics?.return_ytd?.toFixed(2) || '16.31'}%
              </span>
            </div>
          </div>
        </AuroraCard>

        {/* Card 2: Distribución de Activos */}
        <AuroraCard
          title="Distribución"
          subtitle="Desglose por categoría patrimonial"
          action={
            <button
              onClick={() => navigate('/positions')}
              className="text-[11px] font-semibold text-teal-400 hover:underline flex items-center gap-0.5"
            >
              <span>Ver cartera</span>
              <ChevronRight size={12} />
            </button>
          }
        >
          <div className="flex items-center gap-4">
            <div className="w-[140px] h-[140px] shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    innerRadius={46}
                    outerRadius={66}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {distributionData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        stroke="var(--au-card-solid)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold au-num text-[var(--au-text)]">
                  {positions?.length || 0}
                </span>
                <span className="text-[9px] text-[var(--au-muted)] uppercase tracking-wider">
                  Fondos
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              {distributionData.slice(0, 4).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="truncate text-[var(--au-text-2)]">{d.name}</span>
                  </div>
                  <span className="au-num font-bold text-[var(--au-text)] shrink-0">
                    {d.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--au-border)] flex items-center justify-between text-xs text-[var(--au-muted)]">
            <span>Renta Variable Global</span>
            <span className="font-bold text-teal-400">Sobreponderada</span>
          </div>
        </AuroraCard>

        {/* Card 3: Sesión Simulada en Vivo */}
        <AuroraCard
          title="Sesión Simulada en Vivo"
          subtitle="Impacto de futuros y mercados abiertos hoy"
          action={
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span>{simulated?.summary?.market_state || 'En sesión'}</span>
            </div>
          }
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[11px] text-[var(--au-muted)]">Estimación actual</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  data-private
                  className={cn(
                    'text-xl font-bold au-num',
                    (simulated?.summary?.simulated_daily_pct || 0) >= 0 ? 'text-teal-400' : 'text-rose-400'
                  )}
                >
                  {(simulated?.summary?.simulated_daily_pct || 0) >= 0 ? '+' : ''}
                  {simulated?.summary?.simulated_daily_pct?.toFixed(2) || '−0,38'}%
                </span>
                <span data-private className="text-xs text-[var(--au-muted)] au-num">
                  ({(simulated?.summary?.simulated_daily_amount || 0) >= 0 ? '+' : ''}
                  {fmt.currency(simulated?.summary?.simulated_daily_amount || -297)})
                </span>
              </div>
            </div>

            {/* Session Tags */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Asia ✓
              </span>
              <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Europa ✓
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--au-chip)] text-[var(--au-muted)]">
                EE.UU.
              </span>
            </div>
          </div>

          {/* Intraday Sparkline */}
          <div className="h-[90px] w-full" data-private>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={simulated?.chart_points && simulated.chart_points.length > 0 ? simulated.chart_points : [
                  { time: '09:00', time_unix: 0, label: '09:00', simulated_pct: 0, simulated_amount: 0 },
                  { time: '11:00', time_unix: 7200, label: '11:00', simulated_pct: -0.15, simulated_amount: -50 },
                  { time: '13:00', time_unix: 14400, label: '13:00', simulated_pct: -0.28, simulated_amount: -90 },
                  { time: '15:00', time_unix: 21600, label: '15:00', simulated_pct: -0.38, simulated_amount: -120 },
                ]}
                margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload
                    return (
                      <div className="au-tooltip font-mono text-xs">
                        <p className="text-[var(--au-muted)]">{p.label}</p>
                        <p className="font-bold text-teal-400">{p.simulated_pct?.toFixed(2)}%</p>
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="simulated_pct"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  fill="rgba(45, 212, 191, 0.15)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Proxy details */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--au-border)] text-[10px] font-mono">
            <div>
              <p className="text-[var(--au-muted)]">Emerg. (^HSI)</p>
              <p className="text-rose-400 font-bold">−1,80%</p>
            </div>
            <div>
              <p className="text-[var(--au-muted)]">Global (ES=F)</p>
              <p className="text-rose-400 font-bold">−0,20%</p>
            </div>
            <div>
              <p className="text-[var(--au-muted)]">Tecno (NQ=F)</p>
              <p className="text-teal-400 font-bold">+0,30%</p>
            </div>
          </div>
        </AuroraCard>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TOP POSITIONS SNAPSHOT
          ───────────────────────────────────────────────────────────── */}
      <AuroraCard
        title="Posiciones en Cartera"
        subtitle="Principales participaciones por valor de mercado"
        action={
          <button
            onClick={() => navigate('/positions')}
            className="text-xs font-semibold text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>Ver todas ({positions?.length || 0})</span>
            <ArrowUpRight size={14} />
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="au-table">
            <thead>
              <tr>
                <th>Fondo / Activo</th>
                <th>Broker</th>
                <th>Peso</th>
                <th>Valoración</th>
                <th>Rentabilidad</th>
                <th>Variación Hoy</th>
              </tr>
            </thead>
            <tbody>
              {positions?.slice(0, 5).map((pos) => {
                const isGain = pos.unrealized_pnl >= 0
                const isDailyGain = (pos.daily_change || 0) >= 0

                return (
                  <tr key={pos.isin} className="cursor-pointer" onClick={() => navigate('/positions')}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                          {pos.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-[var(--au-text)] truncate max-w-[280px]">
                            {pos.name}
                          </p>
                          <p className="text-[10px] text-[var(--au-muted)] font-mono">
                            {pos.isin}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="au-chip text-[10px] uppercase font-bold">
                        {pos.broker || 'MyInvestor'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--au-chip)] overflow-hidden">
                          <div
                            className="h-full bg-teal-400 rounded-full"
                            style={{ width: `${Math.min(pos.weight || 0, 100)}%` }}
                          />
                        </div>
                        <span className="au-num text-xs font-bold">{pos.weight?.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <span data-private className="au-num font-bold text-xs">
                        {fmt.currency(pos.current_value)}
                      </span>
                    </td>
                    <td>
                      <span
                        data-private
                        className={cn('au-num font-bold text-xs', isGain ? 'text-teal-400' : 'text-rose-400')}
                      >
                        {isGain ? '+' : ''}{fmt.currency(pos.unrealized_pnl)} ({pos.unrealized_pnl_pct >= 0 ? '+' : ''}
                        {pos.unrealized_pnl_pct.toFixed(2)}%)
                      </span>
                    </td>
                    <td>
                      <AuroraBadge
                        variant={isDailyGain ? 'gain' : 'loss'}
                        size="sm"
                      >
                        <span data-private>
                          {pos.daily_change_pct !== undefined && pos.daily_change_pct !== null
                            ? `${pos.daily_change_pct >= 0 ? '+' : ''}${pos.daily_change_pct.toFixed(2)}%`
                            : '—'}
                        </span>
                      </AuroraBadge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </AuroraCard>
    </div>
  )
}
