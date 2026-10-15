import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAnalytics, useBenchmarkComparison, usePerformance, usePositions } from '@/api/queries'
import { cn } from '@/lib/utils'
import { CardHeader, Glass, PageHeader, Skeleton, ease, pct, stagger } from '~/ui'
import { ChartTooltip } from './OverviewPage'

const SERIES = [
  { key: 'portfolio_twr', label: 'Mi cartera', color: 'var(--gain)', fixed: true },
  { key: 'msci_world', label: 'MSCI World', color: '#a78bfa' },
  { key: 'sp500', label: 'S&P 500', color: '#38bdf8' },
  { key: 'nasdaq100', label: 'Nasdaq 100', color: '#f472b6' },
  { key: 'eurostoxx50', label: 'Euro Stoxx 50', color: '#fbbf24' },
  { key: 'bce_rate', label: 'Tipo BCE', color: '#94a3b8' },
] as const

const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export function AnalyticsPage() {
  const { data: analytics } = useAnalytics()
  const { data: bench, isLoading } = useBenchmarkComparison()
  const { data: longPerf = [] } = usePerformance('5y')
  const { data: positions = [] } = usePositions()
  const [on, setOn] = useState<Record<string, boolean>>({ portfolio_twr: true, msci_world: true, sp500: true })

  const s = bench?.summary
  const points = bench?.points ?? []

  // Monthly TWR matrix (cash-flow neutral) from daily value/invested
  const matrix = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (let i = 1; i < longPerf.length; i++) {
      const a = longPerf[i - 1], b = longPerf[i]
      const flow = (b.invested ?? b.value) - (a.invested ?? a.value)
      const r = a.value > 0 ? (b.value - a.value - flow) / a.value : 0
      const k = b.date.slice(0, 7)
      byMonth.set(k, (1 + (byMonth.get(k) ?? 0)) * (1 + r) - 1)
    }
    const years = [...new Set([...byMonth.keys()].map((k) => k.slice(0, 4)))].sort().reverse()
    return years.map((y) => {
      const months = MONTHS.map((_, m) => {
        const v = byMonth.get(`${y}-${String(m + 1).padStart(2, '0')}`)
        return v == null ? null : v * 100
      })
      const total = months.reduce<number>((acc, v) => (v == null ? acc : (1 + acc) * (1 + v / 100) - 1), 0) * 100
      return { y, months, total }
    })
  }, [longPerf])

  const underwater = useMemo(() => {
    let nav = 100, peak = 100
    return longPerf.map((b, i) => {
      if (i > 0) {
        const a = longPerf[i - 1]
        const flow = (b.invested ?? b.value) - (a.invested ?? a.value)
        nav *= 1 + (a.value > 0 ? (b.value - a.value - flow) / a.value : 0)
      }
      peak = Math.max(peak, nav)
      return { date: b.date, dd: (nav / peak - 1) * 100 }
    })
  }, [longPerf])

  const assets = useMemo(() => [...positions].sort((a, b) => b.unrealized_pnl_pct - a.unrealized_pnl_pct), [positions])
  const maxAbs = Math.max(1, ...assets.map((a) => Math.abs(a.unrealized_pnl_pct)))

  // Risk score 0..100 from volatility
  const vol = analytics?.volatility ?? 0
  const risk = Math.max(0, Math.min(100, (vol / 25) * 100))
  const riskLabel = vol < 6 ? 'Conservador' : vol < 12 ? 'Moderado' : vol < 18 ? 'Dinámico' : 'Agresivo'

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-12 gap-4 md:gap-5">
      <div className="col-span-12">
        <PageHeader eyebrow="Rentabilidad y riesgo" title="Analítica" subtitle="Rentabilidad ponderada por tiempo frente a los grandes índices, perfil de riesgo y estacionalidad." />
      </div>

      {/* ── Benchmarks ─────────────────────────────────────── */}
      <Glass className="col-span-12 xl:col-span-8 p-5">
        <CardHeader
          eyebrow="TWR comparado"
          title="Cartera vs. índices"
          right={
            s && (
              <div className="flex gap-2">
                <span className={cn('chip', s.alpha_msci >= 0 ? 'chip-gain' : 'chip-loss')}>α MSCI {pct(s.alpha_msci)}</span>
                <span className={cn('chip hidden sm:inline-flex', s.alpha_sp500 >= 0 ? 'chip-gain' : 'chip-loss')}>α S&P {pct(s.alpha_sp500)}</span>
              </div>
            )
          }
        />
        <div className="flex flex-wrap gap-2 mb-4">
          {SERIES.map((x) => {
            const active = on[x.key]
            const v = s?.[x.key as keyof typeof s] as number | undefined
            return (
              <button
                key={x.key}
                disabled={'fixed' in x}
                onClick={() => setOn((o) => ({ ...o, [x.key]: !o[x.key] }))}
                className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px] transition', active ? 'border-[var(--line-strong)] bg-[var(--surface-2)] text-[var(--text)]' : 'border-[var(--line)] text-[var(--muted)] opacity-60 hover:opacity-100')}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: x.color, boxShadow: active ? `0 0 10px ${x.color}` : undefined }} />
                {x.label}
                {v != null && <span className="num font-semibold">{pct(v, 1)}</span>}
              </button>
            )
          })}
        </div>
        <div className="h-[300px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer>
              <LineChart data={points} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })} axisLine={false} tickLine={false} tick={{ fill: 'var(--faint)', fontSize: 10 }} minTickGap={40} />
                <YAxis tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} tick={{ fill: 'var(--faint)', fontSize: 10 }} width={46} />
                <ReferenceLine y={0} stroke="var(--line-strong)" />
                <Tooltip content={<ChartTooltip fmt={{ label: (d: string) => new Date(d).toLocaleDateString('es-ES', { dateStyle: 'medium' }), value: (v: number) => pct(v) }} />} cursor={{ stroke: 'var(--line-strong)' }} />
                {SERIES.filter((x) => on[x.key]).map((x) => (
                  <Line key={x.key} type="monotone" dataKey={x.key} name={x.label} stroke={x.color} strokeWidth={x.key === 'portfolio_twr' ? 2.6 : 1.4} strokeOpacity={x.key === 'portfolio_twr' ? 1 : 0.85} dot={false} animationDuration={1200} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Glass>

      {/* ── Risk gauge ─────────────────────────────────────── */}
      <Glass className="col-span-12 md:col-span-6 xl:col-span-4 p-5">
        <CardHeader eyebrow="Diagnóstico" title="Perfil de riesgo" />
        <Gauge value={risk} />
        <div className="text-center -mt-10">
          <div className="display text-2xl font-bold">{riskLabel}</div>
          <div className="text-[12px] text-[var(--muted)]">Volatilidad anual {pct(vol, 1, false)}</div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mt-6">
          {[
            ['Sharpe', analytics?.sharpe_ratio?.toFixed(2) ?? '—', (analytics?.sharpe_ratio ?? 0) >= 1 ? 'gain' : undefined],
            ['CAGR', pct(analytics?.cagr, 1), (analytics?.cagr ?? 0) >= 0 ? 'gain' : 'loss'],
            ['Máx. drawdown', pct(analytics?.max_drawdown, 1), 'loss'],
            ['TWR total', pct(analytics?.twr, 1), (analytics?.twr ?? 0) >= 0 ? 'gain' : 'loss'],
          ].map(([k, v, t]) => (
            <div key={k} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
              <div className="text-[11px] text-[var(--muted)]">{k}</div>
              <div className={cn('num text-lg font-semibold', t === 'gain' && 'text-[var(--gain)]', t === 'loss' && 'text-[var(--loss)]')}>{v}</div>
            </div>
          ))}
        </div>
      </Glass>

      {/* ── Monthly heatmap ────────────────────────────────── */}
      <Glass className="col-span-12 md:col-span-6 xl:col-span-7 p-5 overflow-x-auto">
        <CardHeader eyebrow="Estacionalidad" title="Rentabilidad mensual" />
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[48px_repeat(12,1fr)_64px] gap-1.5 mb-1.5 text-[10.5px] text-[var(--muted)] text-center">
            <span />
            {MONTHS.map((m, i) => <span key={i}>{m}</span>)}
            <span className="text-right pr-1">Año</span>
          </div>
          {matrix.map((row, ri) => (
            <div key={row.y} className="grid grid-cols-[48px_repeat(12,1fr)_64px] gap-1.5 mb-1.5 items-center">
              <span className="num text-[12px] text-[var(--text-2)]">{row.y}</span>
              {row.months.map((v, mi) => (
                <motion.div
                  key={mi}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: ri * 0.08 + mi * 0.025, duration: 0.4, ease }}
                  title={v == null ? '' : pct(v)}
                  className="h-9 rounded-lg grid place-items-center num text-[10.5px] font-semibold hover:scale-110 hover:z-10 transition-transform cursor-default"
                  style={heat(v)}
                >
                  {v == null ? '' : v.toFixed(1)}
                </motion.div>
              ))}
              <span className={cn('num text-[12px] font-bold text-right pr-1', row.total >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]')}>{pct(row.total, 1)}</span>
            </div>
          ))}
          {!matrix.length && <Skeleton className="h-40 w-full" />}
        </div>
      </Glass>

      {/* ── Underwater ─────────────────────────────────────── */}
      <Glass className="col-span-12 xl:col-span-5 p-5">
        <CardHeader eyebrow="Caídas desde máximos" title="Drawdown" right={<span className="chip chip-loss">{pct(Math.min(0, ...underwater.map((u) => u.dd)), 1)}</span>} />
        <div className="h-[230px]">
          <ResponsiveContainer>
            <AreaChart data={underwater} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--loss)" stopOpacity={0.05} />
                  <stop offset="100%" stopColor="var(--loss)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })} axisLine={false} tickLine={false} tick={{ fill: 'var(--faint)', fontSize: 10 }} minTickGap={40} />
              <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} axisLine={false} tickLine={false} tick={{ fill: 'var(--faint)', fontSize: 10 }} width={42} />
              <Tooltip content={<ChartTooltip fmt={{ label: (d: string) => new Date(d).toLocaleDateString('es-ES', { dateStyle: 'medium' }), value: (v: number) => pct(v) }} />} />
              <Area type="monotone" dataKey="dd" name="Drawdown" stroke="var(--loss)" strokeWidth={1.5} fill="url(#ddFill)" animationDuration={1200} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Glass>

      {/* ── Asset diverging bars ───────────────────────────── */}
      <Glass className="col-span-12 p-5">
        <CardHeader eyebrow="Plusvalía latente" title="Rentabilidad por activo" />
        <div className="space-y-2">
          {assets.map((a, i) => {
            const w = (Math.abs(a.unrealized_pnl_pct) / maxAbs) * 50
            const pos = a.unrealized_pnl_pct >= 0
            return (
              <div key={a.isin} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_70px] items-center gap-3 group">
                <span className="text-[12px] text-[var(--text-2)] truncate group-hover:text-[var(--text)] transition">{a.name}</span>
                <div className="relative h-6">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--line-strong)]" />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.9, delay: i * 0.04, ease }}
                    className={cn('absolute top-1 bottom-1 rounded-md', pos ? 'left-1/2' : 'right-1/2')}
                    style={{
                      background: pos ? 'linear-gradient(90deg, color-mix(in oklab, var(--gain) 35%, transparent), var(--gain))' : 'linear-gradient(270deg, color-mix(in oklab, var(--loss) 35%, transparent), var(--loss))',
                    }}
                  />
                </div>
                <span className={cn('num text-[12px] font-semibold text-right', pos ? 'text-[var(--gain)]' : 'text-[var(--loss)]')}>{pct(a.unrealized_pnl_pct, 1)}</span>
              </div>
            )
          })}
        </div>
      </Glass>
    </motion.div>
  )
}

function heat(v: number | null): React.CSSProperties {
  if (v == null) return { background: 'var(--surface-2)', color: 'transparent' }
  const k = Math.min(Math.abs(v) / 5, 1)
  const c = v >= 0 ? 'var(--gain)' : 'var(--loss)'
  return {
    background: `color-mix(in oklab, ${c} ${Math.round(12 + k * 70)}%, transparent)`,
    color: k > 0.55 ? '#04111a' : 'var(--text)',
  }
}

function Gauge({ value }: { value: number }) {
  const r = 90
  const c = Math.PI * r
  return (
    <svg viewBox="0 0 220 130" className="w-full max-w-[280px] mx-auto block">
      <defs>
        <linearGradient id="gaugeG" x1="0" x2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <path d="M20 115 A90 90 0 0 1 200 115" fill="none" stroke="var(--surface-2)" strokeWidth="14" strokeLinecap="round" />
      <motion.path
        d="M20 115 A90 90 0 0 1 200 115"
        fill="none"
        stroke="url(#gaugeG)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - value / 100) }}
        transition={{ duration: 1.6, ease }}
        style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,.5))' }}
      />
      {[0, 25, 50, 75, 100].map((t) => {
        const a = Math.PI * (1 - t / 100)
        return <circle key={t} cx={110 + Math.cos(a) * 72} cy={115 - Math.sin(a) * 72} r="1.6" fill="var(--faint)" />
      })}
    </svg>
  )
}
