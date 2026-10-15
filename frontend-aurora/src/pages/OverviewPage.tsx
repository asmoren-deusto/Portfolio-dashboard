import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, Bar, BarChart, Cell, LabelList, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, Sparkles, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAnalytics, usePerformance, usePortfolioSummary, usePositions, useSimulatedPortfolio } from '@/api/queries'
import { AnimatedNumber, CardHeader, Delta, Glass, Monogram, PALETTE, Skeleton, Sparkline, eur, pct, rise, signedEur, stagger, tone } from '~/ui'
import { cn } from '@/lib/utils'

export function ChartTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass !bg-[var(--surface-solid)] !rounded-xl px-3 py-2 text-[12px] shadow-2xl min-w-[150px]">
      <div className="text-[var(--muted)] mb-1">{fmt?.label ? fmt.label(label) : label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[var(--text-2)]">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.stroke }} />
            {p.name}
          </span>
          <span className="num font-semibold">{fmt?.value ? fmt.value(p.value, p.dataKey) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

const shortDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

export function OverviewPage() {
  const { data: summary } = usePortfolioSummary()
  const { data: positions = [] } = usePositions()
  const { data: analytics } = useAnalytics()
  const { data: perf = [], isLoading: perfLoading } = usePerformance()
  const { data: sim } = useSimulatedPortfolio('1d')

  const today = useMemo(() => {
    const amt = positions.reduce((a, p) => a + (p.daily_change ?? 0), 0)
    const base = positions.reduce((a, p) => a + (p.current_value - (p.daily_change ?? 0)), 0)
    return { amt, pct: base > 0 ? (amt / base) * 100 : 0 }
  }, [positions])

  const series = useMemo(() => perf.map((p) => ({ date: p.date, value: p.value, invested: p.invested ?? null })), [perf])

  const derived = useMemo(() => {
    const vals = perf.map((p) => p.value)
    const inv = perf.map((p) => p.invested ?? p.value)
    const ratio = perf.map((p) => ((p.value - (p.invested ?? p.value)) / Math.max(p.invested ?? p.value, 1)) * 100)
    let peak = -Infinity
    const dd = vals.map((v) => {
      peak = Math.max(peak, v)
      return ((v - peak) / peak) * 100
    })
    const vol = vals.slice(1).map((v, i) => Math.abs((v - vals[i] - (inv[i + 1] - inv[i])) / Math.max(vals[i], 1)) * 100)
    const step = Math.max(1, Math.floor(vals.length / 40))
    const thin = (a: number[]) => a.filter((_, i) => i % step === 0)
    return { inv: thin(inv), ratio: thin(ratio), dd: thin(dd), vol: thin(vol) }
  }, [perf])

  const returns = useMemo(
    () =>
      [
        { k: '1D', v: analytics?.return_1d },
        { k: '1S', v: analytics?.return_1w },
        { k: '1M', v: analytics?.return_1m },
        { k: '3M', v: analytics?.return_3m },
        { k: '6M', v: analytics?.return_6m },
        { k: 'YTD', v: analytics?.return_ytd },
        { k: '1A', v: analytics?.return_1y },
      ].filter((r) => r.v != null) as { k: string; v: number }[],
    [analytics]
  )

  const distribution = useMemo(() => {
    const m = new Map<string, number>()
    positions.forEach((p) => {
      const key = (p.category || p.asset_type || 'Otros').replace(/Renta Variable/i, 'RV')
      m.set(key, (m.get(key) ?? 0) + p.current_value)
    })
    const total = [...m.values()].reduce((a, b) => a + b, 0) || 1
    return [...m.entries()].map(([name, value]) => ({ name, value, w: (value / total) * 100 })).sort((a, b) => b.value - a.value)
  }, [positions])

  const movers = useMemo(() => [...positions].filter((p) => p.daily_change_pct != null).sort((a, b) => Math.abs(b.daily_change_pct!) - Math.abs(a.daily_change_pct!)).slice(0, 5), [positions])

  const pnl = summary?.total_pnl ?? 0

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-12 gap-4 md:gap-5">
      {/* ── HERO ───────────────────────────────────────────── */}
      <Glass className="col-span-12 p-5 md:p-7 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[var(--gain)] opacity-[0.08] blur-3xl pointer-events-none" />
        <div className="grid lg:grid-cols-[minmax(320px,0.9fr)_1.6fr] gap-6 lg:gap-10 items-center">
          <div className="relative">
            <div className="eyebrow flex items-center gap-2">
              <Sparkles size={12} className="text-[var(--accent)]" /> Patrimonio total
            </div>
            <div data-private className="display font-bold leading-[0.95] mt-3 text-[44px] sm:text-[58px] xl:text-[68px]">
              {summary ? <AnimatedNumber value={summary.total_value} className="!font-[var(--font-display)] text-gradient" suffix=" €" /> : <Skeleton className="h-16 w-80" />}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4" data-private>
              <span className={cn('chip !text-[13px] !px-3 !py-1', `chip-${tone(pnl)}`)}>
                {signedEur(pnl)} · {pct(summary?.total_pnl_pct)}
              </span>
              <span className="text-[13px] text-[var(--muted)]">
                Hoy{' '}
                <span className={cn('num font-semibold', today.amt >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]')}>
                  {signedEur(today.amt)} ({pct(today.pct)})
                </span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-7 pt-5 border-t border-[var(--line)]" data-private>
              <MiniStat label="Invertido" value={eur(summary?.total_invested, 0)} />
              <MiniStat label="Posiciones" value={String(summary?.num_positions ?? positions.length)} />
              <MiniStat label="CAGR" value={pct(analytics?.cagr, 1)} tone={tone(analytics?.cagr)} />
            </div>
          </div>

          <div className="relative h-[230px] md:h-[280px] -mx-2" data-private>
            <div className="absolute right-2 -top-1 z-10 flex gap-4 text-[11px] text-[var(--muted)]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--gain)]" />Valor</span>
              <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-[var(--muted)]" />Invertido</span>
            </div>
            {perfLoading && !series.length ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ top: 22, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gain)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--gain)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="heroStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="60%" stopColor="var(--gain)" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                    <filter id="glow" x="-10%" y="-50%" width="120%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={shortDate} axisLine={false} tickLine={false} tick={{ fill: 'var(--faint)', fontSize: 10 }} minTickGap={50} />
                  <YAxis hide domain={['dataMin * 0.97', 'dataMax * 1.01']} />
                  <Tooltip content={<ChartTooltip fmt={{ label: (d: string) => new Date(d).toLocaleDateString('es-ES', { dateStyle: 'medium' }), value: (v: number) => eur(v) }} />} cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="value" name="Valor" stroke="url(#heroStroke)" strokeWidth={2.5} fill="url(#heroFill)" filter="url(#glow)" animationDuration={1400} activeDot={{ r: 5, fill: 'var(--gain)', stroke: 'var(--bg)', strokeWidth: 3 }} />
                  <Line type="stepAfter" dataKey="invested" name="Invertido" stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1.2} dot={false} animationDuration={1400} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </Glass>

      {/* ── KPI tiles ──────────────────────────────────────── */}
      <Kpi className="col-span-6 xl:col-span-3" label="Capital invertido" value={eur(summary?.total_invested, 0)} data={derived.inv} color="var(--sky)" />
      <Kpi className="col-span-6 xl:col-span-3" label="Rentabilidad TWR" value={pct(analytics?.twr, 1)} data={derived.ratio} sub={`Anualizada ${pct(analytics?.annualized_return ?? analytics?.cagr, 1)}`} />
      <Kpi className="col-span-6 xl:col-span-3" label="Volatilidad" value={pct(analytics?.volatility, 1, false)} data={derived.vol} color="var(--accent)" sub={`Sharpe ${analytics?.sharpe_ratio?.toFixed(2) ?? '—'}`} />
      <Kpi className="col-span-6 xl:col-span-3" label="Máx. drawdown" value={pct(analytics?.max_drawdown, 1)} data={derived.dd} color="var(--loss)" />

      {/* ── Returns by period ──────────────────────────────── */}
      <Glass className="col-span-12 lg:col-span-5 p-5">
        <CardHeader eyebrow="TWR" title="Rendimiento por periodo" />
        <div className="h-[230px]" data-private>
          <ResponsiveContainer>
            <BarChart data={returns} margin={{ top: 24, right: 4, left: 4, bottom: 22 }}>
              <defs>
                <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--gain)" /><stop offset="100%" stopColor="var(--gain)" stopOpacity={0.25} /></linearGradient>
                <linearGradient id="barL" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="var(--loss)" /><stop offset="100%" stopColor="var(--loss)" stopOpacity={0.25} /></linearGradient>
              </defs>
              <XAxis dataKey="k" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} dy={18} />
              <YAxis hide domain={[(min: number) => Math.min(0, min * 1.3), (max: number) => Math.max(0, max * 1.2)]} />
              <ReferenceLine y={0} stroke="var(--line-strong)" />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<ChartTooltip fmt={{ value: (v: number) => pct(v) }} />} />
              <Bar dataKey="v" name="Rentabilidad" radius={[8, 8, 8, 8]} maxBarSize={38} animationDuration={1100}>
                {returns.map((r) => <Cell key={r.k} fill={r.v >= 0 ? 'url(#barG)' : 'url(#barL)'} />)}
                <LabelList
                  dataKey="v"
                  content={(p: any) => {
                    const v = Number(p.value)
                    const neg = v < 0
                    // positive → above the bar top · negative → below the bar bottom
                    const y = neg ? p.y + p.height + 14 : p.y - 8
                    return (
                      <text x={p.x + p.width / 2} y={y} textAnchor="middle" fontSize={11} fontWeight={600} fontFamily="JetBrains Mono" fill={neg ? 'var(--loss)' : 'var(--gain)'}>
                        {pct(v, 1)}
                      </text>
                    )
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Glass>

      {/* ── Distribution ──────────────────────────────────── */}
      <DistributionCard data={distribution} />

      {/* ── Live session ──────────────────────────────────── */}
      <Glass className="col-span-12 md:col-span-6 lg:col-span-3 p-5 flex flex-col">
        <CardHeader
          eyebrow={<span className="flex items-center gap-1.5"><span className="live-dot" /> En directo</span>}
          title="Sesión simulada"
          right={<Link to="/market" className="text-[var(--muted)] hover:text-[var(--text)]"><ArrowUpRight size={16} /></Link>}
        />
        <div data-private>
          <div className={cn('display text-3xl font-bold num', (sim?.summary.simulated_daily_pct ?? 0) >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]')}>
            <AnimatedNumber value={sim?.summary.simulated_daily_pct ?? 0} signed suffix="%" />
          </div>
          <div className="text-[12px] text-[var(--muted)] num">{signedEur(sim?.summary.simulated_daily_amount)} estimado</div>
        </div>
        <div className="flex-1 min-h-[110px] mt-3 -mx-1" data-private>
          <ResponsiveContainer>
            <AreaChart data={sim?.chart_points ?? []} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="simFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={(sim?.summary.simulated_daily_pct ?? 0) >= 0 ? 'var(--gain)' : 'var(--loss)'} stopOpacity={0.35} />
                  <stop offset="100%" stopColor="transparent" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <ReferenceLine y={0} stroke="var(--line-strong)" strokeDasharray="3 3" />
              <Tooltip content={<ChartTooltip fmt={{ value: (v: number) => pct(v) }} />} labelFormatter={(_: any, p: any) => p?.[0]?.payload?.label} />
              <Area type="monotone" dataKey="simulated_pct" name="Simulado" stroke={(sim?.summary.simulated_daily_pct ?? 0) >= 0 ? 'var(--gain)' : 'var(--loss)'} strokeWidth={2} fill="url(#simFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] mt-2">
          <Zap size={12} className="text-[var(--warn)]" /> {sim?.summary.session_display ?? sim?.summary.market_state ?? 'Cargando…'}
        </div>
      </Glass>

      {/* ── Movers ────────────────────────────────────────── */}
      <Glass className="col-span-12 p-5">
        <CardHeader eyebrow="Último NAV" title="Lo que más se ha movido" right={<Link to="/positions" className="btn !py-1.5 text-[12px]">Ver cartera <ArrowUpRight size={13} /></Link>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {movers.map((p, i) => (
            <motion.div key={p.isin} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }} className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--line-strong)] transition">
              <Monogram name={p.name} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium truncate">{p.name}</div>
                <div className="text-[11px] text-[var(--muted)] num" data-private>{eur(p.current_value, 0)}</div>
              </div>
              <Delta value={p.daily_change_pct} />
            </motion.div>
          ))}
          {!movers.length && <div className="text-[13px] text-[var(--muted)]">Sin variaciones registradas todavía.</div>}
        </div>
      </Glass>
    </motion.div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'gain' | 'loss' }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className={cn('num text-[15px] font-semibold mt-0.5', tone === 'gain' && 'text-[var(--gain)]', tone === 'loss' && 'text-[var(--loss)]')}>{value}</div>
    </div>
  )
}

function Kpi({ label, value, sub, data, color, className }: { label: string; value: string; sub?: string; data: number[]; color?: string; className?: string }) {
  return (
    <Glass lift className={cn('p-4 md:p-5 overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12px] text-[var(--muted)]">{label}</div>
          <div className="num text-xl md:text-2xl font-semibold mt-1" data-private>{value}</div>
          {sub && <div className="text-[11px] text-[var(--faint)] mt-0.5 num">{sub}</div>}
        </div>
      </div>
      <div className="mt-3 -mx-1" data-private>
        <Sparkline data={data} color={color} height={38} />
      </div>
    </Glass>
  )
}

function DistributionCard({ data }: { data: { name: string; value: number; w: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const focus = hover != null ? data[hover] : null
  return (
    <Glass className="col-span-12 md:col-span-6 lg:col-span-4 p-5">
      <CardHeader eyebrow="Asignación" title="Distribución" />
      <div className="flex items-center gap-4">
        <div className="relative w-[150px] h-[150px] shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={2.5} cornerRadius={6} stroke="none" onMouseEnter={(_, i) => setHover(i)} onMouseLeave={() => setHover(null)} animationDuration={1100}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} opacity={hover == null || hover === i ? 1 : 0.3} style={{ transition: 'opacity .25s', filter: hover === i ? `drop-shadow(0 0 8px ${PALETTE[i % PALETTE.length]})` : undefined }} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
            <div>
              <div className="num text-lg font-bold">{focus ? pct(focus.w, 1, false) : data.length}</div>
              <div className="text-[10px] text-[var(--muted)] max-w-[80px] truncate">{focus ? focus.name : 'categorías'}</div>
            </div>
          </div>
        </div>
        <ul className="flex-1 min-w-0 space-y-1.5">
          {data.slice(0, 6).map((d, i) => (
            <li key={d.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={cn('flex items-center gap-2 text-[12px] px-2 py-1 rounded-lg transition cursor-default', hover === i && 'bg-[var(--surface-2)]')}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate flex-1 text-[var(--text-2)]">{d.name}</span>
              <span className="num font-semibold">{pct(d.w, 1, false)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Glass>
  )
}
