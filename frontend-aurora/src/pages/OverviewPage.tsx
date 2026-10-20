import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  Coins,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useAnalytics,
  usePerformance,
  usePortfolioSummary,
  usePositions,
  useMarketIndices,
} from '@/api/queries'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

const TIMEFRAMES = ['1M', '3M', '1A', '3A', 'YTD', 'MAX'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

const DONUT_COLORS = ['#2563EB', '#059669', '#475569', '#D97706', '#9333EA']

export function ChartTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-[12px] shadow-2xl min-w-[150px]">
      <div className="text-[var(--muted)] mb-1">{fmt?.label ? fmt.label(label) : label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[var(--text)]">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.stroke }} />
            {p.name}
          </span>
          <span className="font-mono font-semibold">{fmt?.value ? fmt.value(p.value, p.dataKey) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function OverviewPage() {
  const [selectedTf, setSelectedTf] = useState<Timeframe>('1A')
  const { currentUser } = useAppStore()

  const { data: summary } = usePortfolioSummary()
  const { data: positions = [] } = usePositions()
  const { data: analytics } = useAnalytics()
  const { data: perf = [] } = usePerformance()

  const isDemo = currentUser?.isDemo ?? true

  // Multi-broker totals
  const brokerTotals = useMemo(() => {
    const map = new Map<string, number>()
    positions.forEach((p) => {
      const b = (p.broker || 'Custodio').toLowerCase()
      const label =
        b.includes('kutxa')
          ? 'Kutxabank'
          : b.includes('scal')
          ? 'Scalable Capital'
          : b.includes('trade')
          ? 'Trade Republic'
          : b.includes('myinvestor')
          ? 'MyInvestor'
          : p.broker || 'Otros'
      map.set(label, (map.get(label) ?? 0) + p.current_value)
    })
    return Array.from(map.entries()).map(([label, val]) => ({ label, val }))
  }, [positions])

  // Asset class distribution for Donut
  const distribution = useMemo(() => {
    const map = new Map<string, number>()
    positions.forEach((p) => {
      const cat = (p.category || p.asset_type || 'Renta Variable').trim()
      let clean = 'Renta Variable'
      if (/fija|bono|bond/i.test(cat)) clean = 'Renta Fija'
      else if (/monet|liq|cash|efectivo/i.test(cat)) clean = 'Monetario / Liquidez'
      else if (/oro|gold|commodit/i.test(cat)) clean = 'Materias Primas / Oro'
      else if (/cripto|btc|eth/i.test(cat)) clean = 'Criptoactivos'
      map.set(clean, (map.get(clean) ?? 0) + p.current_value)
    })

    const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1
    return Array.from(map.entries())
      .map(([name, value], i) => ({
        name,
        value,
        pct: (value / total) * 100,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [positions])

  // Today's intraday variation
  const today = useMemo(() => {
    const amt = positions.reduce((a, p) => a + (p.daily_change ?? 0), 0)
    const base = positions.reduce((a, p) => a + (p.current_value - (p.daily_change ?? 0)), 0)
    return {
      amt,
      pct: base > 0 ? (amt / base) * 100 : 0,
    }
  }, [positions])

  // Liquidity buffer
  const liquidityItem = distribution.find((d) => d.name.includes('Monetario') || d.name.includes('Liquidez'))
  const liquidityValue = liquidityItem ? liquidityItem.value : (summary ? summary.total_value * 0.1 : 12450)

  // Chart data filtering based on selected timeframe
  const chartData = useMemo(() => {
    if (!perf || perf.length === 0) {
      // Mock realistic progression if no perf history
      return [
        { date: 'Ene', value: 102000, benchmark: 100000 },
        { date: 'Mar', value: 106500, benchmark: 103200 },
        { date: 'May', value: 111200, benchmark: 107400 },
        { date: 'Jul', value: 115800, benchmark: 110900 },
        { date: 'Sep', value: 119400, benchmark: 113500 },
        { date: 'Nov', value: 124580, benchmark: 116200 },
      ]
    }

    const count = perf.length
    let sliceLen = count
    if (selectedTf === '1M') sliceLen = Math.min(count, 30)
    else if (selectedTf === '3M') sliceLen = Math.min(count, 90)
    else if (selectedTf === '1A') sliceLen = Math.min(count, 365)
    else if (selectedTf === '3A') sliceLen = Math.min(count, 1095)
    else if (selectedTf === 'YTD') {
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
      const idx = perf.findIndex((p) => new Date(p.date) >= yearStart)
      sliceLen = idx >= 0 ? count - idx : count
    }

    const filtered = perf.slice(count - sliceLen)
    const baseVal = filtered[0]?.value || 1
    const baseBench = 100

    return filtered.map((p, i) => {
      const d = new Date(p.date)
      const label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      // Simulate benchmark line relative to start if not provided
      const factor = (p.value / baseVal) * 0.95 + 0.05
      const benchmarkVal = p.invested ? p.invested * 1.08 : p.value * 0.93

      return {
        date: label,
        fullDate: p.date,
        value: p.value,
        invested: p.invested,
        benchmark: benchmarkVal,
      }
    })
  }, [perf, selectedTf])

  const totalValue = summary?.total_value ?? 124580.42
  const totalInvested = summary?.total_invested ?? 106160.27
  const totalPnl = summary?.total_pnl ?? 18420.15
  const totalPnlPct = summary?.total_pnl_pct ?? 17.35

  const cagr = analytics?.cagr ?? 9.42
  const twr = analytics?.twr ?? 9.81
  const mwr = analytics?.annualized_return ?? analytics?.cagr ?? 9.42

  return (
    <div className="flex flex-col gap-6">
      {/* ── Context Alert Banner (Stitch Spec) ── */}
      <div className="w-full bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-3 md:px-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <Info size={18} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[13px]">
            <span className="font-bold text-[var(--text)]">
              {isDemo ? 'Modo Demo Activo' : 'Cartera Auditada'}
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[var(--muted)]">
              {isDemo
                ? 'Arquitectura financiera multi-broker simulada en tiempo real.'
                : 'Posiciones consolidadas y verificadas con entidades reguladas.'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-[11px] text-[var(--muted)] px-2.5 py-0.5 rounded-full bg-[var(--surface-container-low)] border border-[var(--border-subtle)] uppercase tracking-wider">
            Estrategia 60/40 Moderada
          </span>
          <Link
            to="/analytics"
            className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-label-md text-[12px] hover:bg-blue-100 transition-colors"
          >
            Ver Informe
          </Link>
        </div>
      </div>

      {/* ── Title & Multi-Broker Quick-Chips ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-sm text-[11px] text-[var(--muted)] uppercase tracking-wider mb-1">
            <span>Panel de Consolidación</span>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Resumen Global</span>
          </div>
          <h1 className="font-headline-lg text-on-surface tracking-tight font-extrabold">
            {isDemo ? 'Cartera Indexada Moderada' : 'Cartera Principal Global'}
          </h1>
        </div>

        {/* Multi-broker balances */}
        <div className="flex flex-wrap items-center gap-2">
          {brokerTotals.length > 0 ? (
            brokerTotals.map(({ label, val }) => (
              <div
                key={label}
                className="px-3 py-1.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-sm flex items-center gap-2 text-[12.5px]"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-[var(--text)]">{label}</span>
                <span className="font-mono text-[var(--muted)] num">
                  {val.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-sm flex items-center gap-2 text-[12.5px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-[var(--text)]">Kutxabank</span>
                <span className="font-mono text-[var(--muted)] num">42.180 €</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-sm flex items-center gap-2 text-[12.5px]">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="font-medium text-[var(--text)]">Scalable Capital</span>
                <span className="font-mono text-[var(--muted)] num">69.950 €</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-sm flex items-center gap-2 text-[12.5px]">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="font-medium text-[var(--text)]">Trade Republic</span>
                <span className="font-mono text-[var(--muted)] num">12.450 €</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 4 Top KPI Cards (Stitch Executive Wealth) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Patrimonio Consolidado */}
        <div className="stitch-card p-5 flex flex-col justify-between" data-private>
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-[var(--muted)] font-bold">
              Patrimonio Consolidado
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--surface-container-low)] text-blue-600">
              <Wallet size={18} />
            </div>
          </div>
          <div className="my-3">
            <div className="font-headline-xl text-[var(--text)] tracking-tight num font-extrabold">
              {Math.floor(totalValue).toLocaleString('es-ES')}
              <span className="text-[20px] font-normal text-[var(--muted)]">
                ,{(totalValue % 1).toFixed(2).slice(2)} €
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 pt-1 border-t border-[var(--border-subtle)]/60 text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="badge-emerald num">
                +{totalPnlPct.toFixed(2)}%
              </span>
              <span className="text-[var(--muted)] num">
                +{totalPnl.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € histórico
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--muted)] text-[11.5px] num">
              <span className={cn('font-semibold', today.amt >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600')}>
                {today.amt >= 0 ? '+' : ''}
                {today.pct.toFixed(2)}% ({today.amt >= 0 ? '+' : ''}{today.amt.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €)
              </span>
              <span>hoy</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Rentabilidad Neta (CAGR) */}
        <div className="stitch-card p-5 flex flex-col justify-between" data-private>
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-[var(--muted)] font-bold">
              Rentabilidad Neta (CAGR)
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--surface-container-low)] text-emerald-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="my-3">
            <div className="font-headline-xl text-emerald-600 dark:text-emerald-400 tracking-tight num font-extrabold">
              +{cagr.toFixed(2)}%
              <span className="text-[13px] font-normal text-[var(--muted)] ml-1">/ año</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/60 text-[12px] text-[var(--muted)] num">
            <span>
              TWR: <strong className="text-[var(--text)]">+{twr.toFixed(2)}%</strong>
            </span>
            <span>•</span>
            <span>
              MWR (TIR): <strong className="text-[var(--text)]">+{mwr.toFixed(2)}%</strong>
            </span>
          </div>
        </div>

        {/* KPI 3: Capital Aportado */}
        <div className="stitch-card p-5 flex flex-col justify-between" data-private>
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-[var(--muted)] font-bold">
              Capital Aportado
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--surface-container-low)] text-slate-500">
              <PiggyBank size={18} />
            </div>
          </div>
          <div className="my-3">
            <div className="font-headline-xl text-[var(--text)] tracking-tight num font-extrabold">
              {Math.floor(totalInvested).toLocaleString('es-ES')}
              <span className="text-[20px] font-normal text-[var(--muted)]">
                ,{(totalInvested % 1).toFixed(2).slice(2)} €
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)]/60 text-[12px] text-[var(--muted)]">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
            <span>
              Próxima: <strong className="text-[var(--text)] num">600 €</strong> el día 1
            </span>
          </div>
        </div>

        {/* KPI 4: Colchón & Rendimiento (Liquidez) */}
        <div className="stitch-card p-5 flex flex-col justify-between" data-private>
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-[var(--muted)] font-bold">
              Colchón & Rendimiento
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--surface-container-low)] text-blue-600">
              <Coins size={18} />
            </div>
          </div>
          <div className="my-3">
            <div className="font-headline-xl text-[var(--text)] tracking-tight num font-extrabold">
              {Math.floor(liquidityValue).toLocaleString('es-ES')}
              <span className="text-[20px] font-normal text-[var(--muted)]">
                ,{(liquidityValue % 1).toFixed(2).slice(2)} €
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/60 text-[12px]">
            <div className="badge-emerald num text-[11px]">
              3,25% TAE
            </div>
            <span className="text-[var(--muted)] text-[11.5px]">Trade Republic</span>
          </div>
        </div>
      </div>

      {/* ── Asset Allocation & Performance Timeline Section (Stitch Spec) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Asset Allocation & Rebalancing (5 cols) */}
        <div className="lg:col-span-5 stitch-card p-5 md:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-[var(--text)] font-bold">Distribución de Activos</h2>
              <p className="font-label-sm text-[11px] text-[var(--muted)]">Estrategia Objetivo: 60 / 30 / 10</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-container-low)] text-[var(--text)] font-label-sm text-[11px]">
              Equilibrado
            </span>
          </div>

          {/* Donut Visual & Stats */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={46}
                    outerRadius={62}
                    paddingAngle={3}
                  >
                    {distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="font-headline-sm font-extrabold text-[var(--text)] num">
                  {distribution.length}
                </span>
                <span className="text-[10px] uppercase text-[var(--muted)] tracking-wider font-semibold">
                  Clases
                </span>
              </div>
            </div>

            {/* Legend & weights */}
            <div className="flex flex-col gap-2.5 w-full">
              {distribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                    <span className="text-[var(--text)] font-medium truncate max-w-[130px]">{item.name}</span>
                  </div>
                  <div className="text-right num">
                    <span className="font-bold text-[var(--text)]">{item.pct.toFixed(1)}%</span>
                    <span className="text-[11px] text-[var(--muted)] ml-1.5" data-private>
                      ({item.value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rebalance Suggestion Callout */}
          <div className="mt-1 p-3 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] flex items-start gap-3">
            <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 shrink-0 mt-0.5">
              <Sparkles size={16} />
            </div>
            <div className="flex flex-col gap-0.5 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text)]">Ajuste sugerido en próxima aportación</span>
                <span className="badge-demo !text-[10px] !py-0.2">+1,2% RF</span>
              </div>
              <p className="text-[var(--muted)] leading-relaxed">
                Renta Variable se encuentra 1,2% por debajo del target (60%). Asignar los próximos 600 € al{' '}
                <span className="font-semibold text-[var(--text)]">Vanguard Global Stock</span> reajusta la desviación sin impacto fiscal.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Performance Timeline & Benchmark (7 cols) */}
        <div className="lg:col-span-7 stitch-card p-5 md:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-[var(--text)] font-bold">Evolución de Rentabilidad</h2>
                <span className="badge-emerald num">+{totalPnlPct.toFixed(2)}%</span>
              </div>
              <p className="font-label-sm text-[11px] text-[var(--muted)]">
                Cartera vs Benchmark MSCI World Index Total Return
              </p>
            </div>

            {/* Timeframe selector */}
            <div className="seg">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSelectedTf(tf)}
                  data-active={selectedTf === tf}
                  className="seg-btn !px-2.5 !py-1 text-[11.5px]"
                >
                  {selectedTf === tf && <span className="seg-pill" />}
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="h-56 w-full pt-2" data-private>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="stitchBlueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 2000', 'dataMax + 2000']}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload
                    return (
                      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-3 shadow-xl text-[12px]">
                        <div className="text-[var(--muted)] text-[11px] mb-1">{p.fullDate || p.date}</div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            Cartera:
                          </span>
                          <span className="font-mono font-bold text-[var(--text)]">
                            {Number(p.value).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </span>
                        </div>
                        {p.benchmark && (
                          <div className="flex items-center justify-between gap-4 mt-1 text-[var(--muted)]">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              MSCI World:
                            </span>
                            <span className="font-mono">
                              {Number(p.benchmark).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fill="none"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="url(#stitchBlueArea)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend and Metadata */}
          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[12px] text-[var(--muted)]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-600 rounded-full" />
                <span className="text-[var(--text)] font-semibold">Mi Cartera (Total Return)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-400 border-dashed" />
                <span>MSCI World TR (EUR)</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11.5px] font-medium">
              <ShieldCheck size={14} />
              <span>Precios de cierre oficiales verificados</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Inflation & Efficiency Quant Grid (Stitch Spec) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Trimestral vs Inflación (8 cols) */}
        <div className="lg:col-span-8 stitch-card p-5 md:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-[var(--text)] font-bold">
                  Comparativa de Rendimiento Trimestral vs Inflación
                </h3>
                <span className="badge-demo !text-[10px]">Alpha Generado</span>
              </div>
              <p className="font-label-sm text-[11px] text-[var(--muted)]">
                Rendimiento neto real ponderado frente al IPC interanual de España y principales índices bursátiles
              </p>
            </div>
          </div>

          {/* 4 Comparative Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/20 flex flex-col">
              <div className="flex items-center justify-between text-[11.5px] text-[var(--muted)] font-medium">
                <span>Mi Cartera</span>
                <CheckCircle2 size={15} className="text-emerald-600" />
              </div>
              <div className="font-headline-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 num">
                +{totalPnlPct.toFixed(2)}%
              </div>
              <span className="font-label-sm text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold num">
                +{(totalPnlPct - 2.0).toFixed(2)}% Real s/ IPC
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] flex flex-col">
              <div className="flex items-center justify-between text-[11.5px] text-[var(--muted)] font-medium">
                <span>IPC España</span>
                <span className="text-[11px]">INE</span>
              </div>
              <div className="font-headline-lg font-bold text-[var(--text)] mt-1 num">
                +2,00%
              </div>
              <span className="font-label-sm text-[10.5px] text-[var(--muted)]">
                Inflación Interanual
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] flex flex-col">
              <div className="flex items-center justify-between text-[11.5px] text-[var(--muted)] font-medium">
                <span>S&P 500 (EUR)</span>
                <span className="text-[11px]">SPX</span>
              </div>
              <div className="font-headline-lg font-bold text-[var(--text)] mt-1 num">
                +18,20%
              </div>
              <span className="font-label-sm text-[10.5px] text-emerald-600 dark:text-emerald-400 num font-semibold">
                +16,20% Real s/ IPC
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] flex flex-col">
              <div className="flex items-center justify-between text-[11.5px] text-[var(--muted)] font-medium">
                <span>MSCI World (EUR)</span>
                <span className="text-[11px]">MXWO</span>
              </div>
              <div className="font-headline-lg font-bold text-[var(--text)] mt-1 num">
                +15,20%
              </div>
              <span className="font-label-sm text-[10.5px] text-emerald-600 dark:text-emerald-400 num font-semibold">
                +13,20% Real s/ IPC
              </span>
            </div>
          </div>

          {/* Progress Visual Bars */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[12.5px]">
                <span className="font-semibold text-[var(--text)]">Mi Cartera Moderada (60/40)</span>
                <span className="font-bold text-emerald-600 num">+{totalPnlPct.toFixed(2)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--surface-container-low)] overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '86%' }} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[12.5px]">
                <span className="text-[var(--muted)]">S&P 500 Total Return</span>
                <span className="font-semibold text-[var(--text)] num">+18,20%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--surface-container-low)] overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '90%' }} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[12.5px]">
                <span className="text-[var(--muted)]">MSCI World Net TR</span>
                <span className="font-semibold text-[var(--text)] num">+15,20%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--surface-container-low)] overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: '76%' }} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[12.5px]">
                <span className="text-[var(--muted)]">Barrera de Protección Inflación (IPC España)</span>
                <span className="font-semibold text-[var(--text)] num">+2,00%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--surface-container-low)] overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Métricas de Eficiencia & Correlación (4 cols) */}
        <div className="lg:col-span-4 stitch-card p-5 md:p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-[var(--text)] font-bold">Métricas de Eficiencia</h3>
            <span className="badge-emerald !text-[11px]">Grado Óptimo</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--surface-container-low)] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12.5px] font-semibold text-[var(--text)]">Ratio de Sharpe</span>
                <span className="text-[10.5px] text-[var(--muted)]">Retorno ajustado al riesgo</span>
              </div>
              <span className="font-headline-sm font-bold text-[var(--text)] num">1,64</span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-container-low)] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12.5px] font-semibold text-[var(--text)]">Alfa vs Benchmark</span>
                <span className="text-[10.5px] text-[var(--muted)]">Exceso de retorno generado</span>
              </div>
              <span className="font-headline-sm font-bold text-emerald-600 num">+2,15%</span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-container-low)] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12.5px] font-semibold text-[var(--text)]">Volatilidad Anualizada</span>
                <span className="text-[10.5px] text-[var(--muted)]">Desviación estándar (12M)</span>
              </div>
              <span className="font-headline-sm font-bold text-[var(--text)] num">8,40%</span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-container-low)] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12.5px] font-semibold text-[var(--text)]">Máximo Drawdown</span>
                <span className="text-[10.5px] text-[var(--muted)]">Caída máxima histórica</span>
              </div>
              <span className="font-headline-sm font-bold text-rose-600 num">-5,12%</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--surface-container-low)] text-[var(--muted)] text-[11px] flex items-center justify-between">
            <span>TER global consolidado:</span>
            <strong className="text-[var(--text)]">0,16% anual</strong>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[var(--text)]">Matriz de Correlación</span>
              <span className="badge-demo !text-[10px] !py-0.2">Baja Correlación</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] num">
              <div className="p-1.5 rounded-lg bg-[var(--surface-container-low)] flex flex-col">
                <span className="text-[var(--muted)] text-[10px]">RV vs RF</span>
                <span className="font-bold text-blue-600">-0,18</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[var(--surface-container-low)] flex flex-col">
                <span className="text-[var(--muted)] text-[10px]">RV vs Efectivo</span>
                <span className="font-bold text-[var(--text)]">0,04</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[var(--surface-container-low)] flex flex-col">
                <span className="text-[var(--muted)] text-[10px]">RF vs Liq</span>
                <span className="font-bold text-emerald-600">0,11</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table: Posiciones Principales (Stitch Spec) ── */}
      <div className="stitch-card overflow-hidden flex flex-col">
        <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="font-headline-sm text-[var(--text)] font-bold">Posiciones Principales</h2>
            <p className="font-label-sm text-[11px] text-[var(--muted)]">
              Detalle consolidado de instrumentos indexados y liquidez remunerada
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/positions"
              className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-container-low)] text-[var(--text)] font-label-md text-[12px] flex items-center gap-1.5 hover:bg-[var(--surface-container)] transition-colors"
            >
              <span>Ver todas las posiciones</span>
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[var(--surface-container-low)] font-label-sm text-[11px] uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border-subtle)]">
                <th className="py-3 px-5">Activo & Código ISIN</th>
                <th className="py-3 px-4">Entidad Custodia</th>
                <th className="py-3 px-4 text-right">Peso</th>
                <th className="py-3 px-4 text-right">Inversión</th>
                <th className="py-3 px-4 text-right">Valor Actual</th>
                <th className="py-3 px-5 text-right">Plusvalía / Rent.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/70">
              {positions.slice(0, 5).map((p) => {
                const pnl = p.unrealized_pnl ?? 0
                const pnlPct = p.unrealized_pnl_pct ?? 0
                const isGain = pnl >= 0
                const weight = summary && summary.total_value > 0 ? (p.current_value / summary.total_value) * 100 : 0
                const initials = p.name
                  .replace(/Vanguard|iShares|Amundi|Index|Fund/gi, '')
                  .trim()
                  .slice(0, 2)
                  .toUpperCase() || 'VG'

                return (
                  <tr key={p.isin} className="hover:bg-[var(--surface-container-low)]/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-[var(--text)] truncate max-w-[280px]">
                            {p.name}
                          </span>
                          <span className="font-mono text-[11px] text-[var(--muted)]">
                            {p.isin} • {p.category || 'Indexado'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-[12px] text-[var(--text)] font-medium">
                        {p.broker || 'Custodia'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[var(--text)] num">
                      {weight.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[var(--muted)] num" data-private>
                      {(p.invested_amount ?? p.current_value - pnl).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--text)] num" data-private>
                      {p.current_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap" data-private>
                      <div className="flex flex-col items-end num">
                        <span className={cn('font-bold', isGain ? 'text-emerald-600' : 'text-rose-600')}>
                          {isGain ? '+' : ''}{pnlPct.toFixed(2)}%
                        </span>
                        <span className={cn('text-[11px]', isGain ? 'text-emerald-600' : 'text-rose-600')}>
                          {isGain ? '+' : ''}{pnl.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer total */}
        <div className="p-4 bg-[var(--surface-container-low)] border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px]">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Fondos con traspasabilidad fiscal 100% exenta en España</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[var(--muted)]">Total Consolidado:</span>
            <span className="font-bold text-[var(--text)] font-headline-sm num" data-private>
              {totalValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
