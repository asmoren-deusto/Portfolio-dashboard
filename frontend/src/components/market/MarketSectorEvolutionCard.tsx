import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Layers,
  BarChart3,
  Sparkles,
  Eye,
  RotateCcw,
  Filter,
  Cpu,
  ShoppingBag,
  Landmark,
  HeartPulse,
  Factory,
  Radio,
  Flame,
  Coins,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, LoadingDot } from '@/components/ui/Card'
import { useMarketSectorHistory, type MarketStock, type SectorHistoryMeta } from '@/api/queries'
import { cn } from '@/lib/utils'

interface MarketSectorEvolutionCardProps {
  stocks?: MarketStock[]
  selectedSector?: string
  onSelectSector?: (sector: string) => void
}

const PERIOD_OPTIONS = [
  { id: '5d', label: '1S', title: 'Últimos 5 días de mercado (intradía horario)' },
  { id: '1mo', label: '1M', title: 'Último mes' },
  { id: '3mo', label: '3M', title: 'Últimos 3 meses' },
  { id: '6mo', label: '6M', title: 'Últimos 6 meses' },
  { id: '1y', label: '1A', title: 'Último año completo' },
] as const

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  Tecnología: <Cpu className="w-3.5 h-3.5" />,
  Consumo: <ShoppingBag className="w-3.5 h-3.5" />,
  Financiero: <Landmark className="w-3.5 h-3.5" />,
  Salud: <HeartPulse className="w-3.5 h-3.5" />,
  Industrial: <Factory className="w-3.5 h-3.5" />,
  Comunicación: <Radio className="w-3.5 h-3.5" />,
  Energía: <Flame className="w-3.5 h-3.5" />,
  'Materias Primas': <Coins className="w-3.5 h-3.5" />,
}

const DEFAULT_SECTORS: SectorHistoryMeta[] = [
  { key: 'tecnologia', sector: 'Tecnología', ticker: 'XLK', color: '#3b82f6', return_pct: 14.8, step_change_pct: 0.65, high_pct: 16.2, low_pct: -1.4 },
  { key: 'financiero', sector: 'Financiero', ticker: 'XLF', color: '#10b981', return_pct: 11.2, step_change_pct: 0.42, high_pct: 12.0, low_pct: -0.8 },
  { key: 'comunicacion', sector: 'Comunicación', ticker: 'XLC', color: '#06b6d4', return_pct: 9.6, step_change_pct: 0.31, high_pct: 10.5, low_pct: -1.1 },
  { key: 'industrial', sector: 'Industrial', ticker: 'XLI', color: '#8b5cf6', return_pct: 7.4, step_change_pct: 0.18, high_pct: 8.1, low_pct: -1.5 },
  { key: 'materias', sector: 'Materias Primas', ticker: 'GLD', color: '#eab308', return_pct: 6.8, step_change_pct: -0.22, high_pct: 8.4, low_pct: 0.0 },
  { key: 'consumo', sector: 'Consumo', ticker: 'XLY', color: '#f59e0b', return_pct: 5.1, step_change_pct: -0.15, high_pct: 6.9, low_pct: -2.3 },
  { key: 'salud', sector: 'Salud', ticker: 'XLV', color: '#ec4899', return_pct: 2.9, step_change_pct: 0.12, high_pct: 4.8, low_pct: -1.9 },
  { key: 'energia', sector: 'Energía', ticker: 'XLE', color: '#ef4444', return_pct: -1.8, step_change_pct: -0.48, high_pct: 3.2, low_pct: -4.1 },
]

export const MarketSectorEvolutionCard: React.FC<MarketSectorEvolutionCardProps> = ({
  stocks = [],
  selectedSector = 'Todos',
  onSelectSector,
}) => {
  const [period, setPeriod] = useState<string>('3mo')
  const [chartMode, setChartMode] = useState<'lines' | 'bars'>('lines')
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())

  const { data, isFetching } = useMarketSectorHistory(period)

  // Live 1D sector performance computed from current MarketPage stocks
  const liveSectorDayMap = useMemo(() => {
    const map: Record<string, { sumWeighted: number; totalCap: number; count: number; simpleSum: number }> = {}
    for (const s of stocks) {
      if (!s.sector || s.change_pct === null || s.change_pct === undefined) continue
      const sec = s.sector
      if (!map[sec]) map[sec] = { sumWeighted: 0, totalCap: 0, count: 0, simpleSum: 0 }
      const cap = s.market_cap && s.market_cap > 0 ? s.market_cap : 50_000_000_000
      map[sec].sumWeighted += s.change_pct * cap
      map[sec].totalCap += cap
      map[sec].count += 1
      map[sec].simpleSum += s.change_pct
    }
    const res: Record<string, number> = {}
    for (const [sec, v] of Object.entries(map)) {
      res[sec] = v.totalCap > 0 ? +(v.sumWeighted / v.totalCap).toFixed(2) : +(v.simpleSum / Math.max(1, v.count)).toFixed(2)
    }
    return res
  }, [stocks])

  // Fallback synthetic series if API is still loading on first mount
  const { sectors, points } = useMemo(() => {
    if (data?.sectors && data.sectors.length > 0 && data?.points && data.points.length > 1) {
      const enriched = data.sectors.map((s) => ({
        ...s,
        day_change_pct: liveSectorDayMap[s.sector] ?? s.step_change_pct,
      }))
      return { sectors: enriched, points: data.points }
    }

    const mult = period === '5d' ? 0.22 : period === '1mo' ? 0.55 : period === '3mo' ? 1 : period === '6mo' ? 1.55 : 2.2
    const steps = 24
    const fallbackPoints: Array<Record<string, number | string>> = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const pt: Record<string, number | string> = {
        date: `Paso ${i + 1}`,
        label: i === 0 ? 'Inicio' : i === steps ? 'Hoy' : `S${i}`,
      }
      DEFAULT_SECTORS.forEach((sec, idx) => {
        const wave = Math.sin(t * Math.PI * (1.8 + idx * 0.25) + idx) * 1.4 * mult
        pt[sec.key] = +(sec.return_pct * mult * t + (i === 0 || i === steps ? 0 : wave)).toFixed(2)
      })
      fallbackPoints.push(pt)
    }
    const fallbackSectors = DEFAULT_SECTORS.map((s) => ({
      ...s,
      return_pct: +(s.return_pct * mult).toFixed(2),
      high_pct: +(s.high_pct * mult).toFixed(2),
      low_pct: +(s.low_pct * mult).toFixed(2),
      day_change_pct: liveSectorDayMap[s.sector] ?? s.step_change_pct,
    })).sort((a, b) => b.return_pct - a.return_pct)

    return { sectors: fallbackSectors, points: fallbackPoints }
  }, [data, period, liveSectorDayMap])

  const summaryMetrics = useMemo(() => {
    if (!sectors.length) return null
    const best = sectors[0]
    const worst = sectors[sectors.length - 1]
    const spread = +(best.return_pct - worst.return_pct).toFixed(2)
    const positiveCount = sectors.filter((s) => s.return_pct >= 0).length
    const avgReturn = +(sectors.reduce((acc, s) => acc + s.return_pct, 0) / sectors.length).toFixed(2)
    return { best, worst, spread, positiveCount, total: sectors.length, avgReturn }
  }, [sectors])

  const toggleSectorVisibility = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else if (next.size < sectors.length - 1) next.add(key)
      return next
    })
  }

  const isolateSector = (key: string) => {
    const others = sectors.filter((s) => s.key !== key).map((s) => s.key)
    const isAlreadyIsolated = hiddenKeys.size === others.length && !hiddenKeys.has(key)
    if (isAlreadyIsolated) {
      setHiddenKeys(new Set())
    } else {
      setHiddenKeys(new Set(others))
    }
  }

  const maxAbsReturn = useMemo(() => {
    if (!sectors.length) return 10
    return Math.max(5, ...sectors.map((s) => Math.abs(s.return_pct)))
  }, [sectors])

  return (
    <Card className="w-full overflow-hidden" delay={0.12}>
      <CardHeader className="flex-col lg:flex-row items-start lg:items-center justify-between gap-3 py-3 px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-emerald-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm sm:text-base font-bold">
                Evolución y Rotación del Mercado por Sectores
              </CardTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                SPDR Sector Benchmarks
              </span>
              {isFetching && <LoadingDot />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Comparativa histórica de fuerza relativa por sector (Base 0%), dispersión líder vs rezagado y tracción diaria
            </p>
          </div>
        </div>

        {/* Controls: View Mode + Period Selector + Reset */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          {/* Chart View Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#202022] p-0.5">
            <button
              onClick={() => setChartMode('lines')}
              className={cn(
                'relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5',
                chartMode === 'lines'
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {chartMode === 'lines' && (
                <motion.div
                  layoutId="sectorEvoModePill"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-[#323235] dark:border dark:border-white/10 shadow-xs"
                  transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                />
              )}
              <TrendingUp className="w-3.5 h-3.5 relative z-10 text-blue-500" />
              <span className="relative z-10">Curvas</span>
            </button>
            <button
              onClick={() => setChartMode('bars')}
              className={cn(
                'relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5',
                chartMode === 'bars'
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {chartMode === 'bars' && (
                <motion.div
                  layoutId="sectorEvoModePill"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-[#323235] dark:border dark:border-white/10 shadow-xs"
                  transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                />
              )}
              <BarChart3 className="w-3.5 h-3.5 relative z-10 text-emerald-500" />
              <span className="relative z-10">Ranking</span>
            </button>
          </div>

          {/* Period Selector Pills */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#202022] p-0.5">
            {PERIOD_OPTIONS.map((p) => {
              const active = period === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  title={p.title}
                  className={cn(
                    'relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                    active
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sectorEvoPeriodPill"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-[#323235] dark:border dark:border-white/10 shadow-xs"
                      transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                    />
                  )}
                  <span className="relative z-10">{p.label}</span>
                </button>
              )
            })}
          </div>

          {hiddenKeys.size > 0 && (
            <button
              onClick={() => setHiddenKeys(new Set())}
              title="Mostrar todos los sectores"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ver todos</span>
            </button>
          )}
        </div>
      </CardHeader>

      <div className="p-3.5 sm:p-4 pt-2 space-y-3.5">
        {/* Top 4 Sector Rotation Highlights */}
        {summaryMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Best Sector */}
            <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.03] to-transparent border border-emerald-500/25 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  <span>Sector Líder ({PERIOD_OPTIONS.find((p) => p.id === period)?.label})</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: summaryMetrics.best.color }}
                  />
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {summaryMetrics.best.sector}
                  </span>
                  <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                    ({summaryMetrics.best.ticker})
                  </span>
                </div>
              </div>
              <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 shrink-0">
                {summaryMetrics.best.return_pct >= 0 ? '+' : ''}
                {summaryMetrics.best.return_pct.toFixed(2)}%
              </span>
            </div>

            {/* 2. Worst Sector */}
            <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-br from-rose-500/[0.08] via-rose-500/[0.03] to-transparent border border-rose-500/25 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                  <span>Sector Rezagado ({PERIOD_OPTIONS.find((p) => p.id === period)?.label})</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: summaryMetrics.worst.color }}
                  />
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {summaryMetrics.worst.sector}
                  </span>
                  <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                    ({summaryMetrics.worst.ticker})
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  'font-mono font-extrabold text-sm sm:text-base shrink-0',
                  summaryMetrics.worst.return_pct >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {summaryMetrics.worst.return_pct >= 0 ? '+' : ''}
                {summaryMetrics.worst.return_pct.toFixed(2)}%
              </span>
            </div>

            {/* 3. Sector Dispersion (Spread) */}
            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50/90 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Dispersión Sectorial</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Diferencial Líder vs Rezagado
                </div>
              </div>
              <span className="font-mono font-extrabold text-sm sm:text-base text-indigo-600 dark:text-indigo-400 shrink-0">
                {summaryMetrics.spread.toFixed(2)} pp
              </span>
            </div>

            {/* 4. Sector Breadth */}
            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50/90 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Amplitud Sectorial</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Media equiponderada:{' '}
                  <strong
                    className={cn(
                      'font-mono',
                      summaryMetrics.avgReturn >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {summaryMetrics.avgReturn >= 0 ? '+' : ''}
                    {summaryMetrics.avgReturn.toFixed(2)}%
                  </strong>
                </div>
              </div>
              <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white shrink-0">
                {summaryMetrics.positiveCount}/{summaryMetrics.total}{' '}
                <span className="text-xs font-sans font-semibold text-emerald-600 dark:text-emerald-400">
                  ▲
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Main 2-Column Content: Evolution Chart (Left ~65%) + Interactive Ranking & Filter (Right ~35%) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch">
          {/* Left Chart Area */}
          <div className="xl:col-span-8 rounded-2xl bg-slate-50/70 dark:bg-[#18181b] border border-slate-200/80 dark:border-white/[0.06] p-3.5 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {chartMode === 'lines'
                    ? 'Trayectoria Comparativa de Rentabilidad Acumulada (%)'
                    : 'Ranking de Rentabilidad Acumulada por Sector (%)'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Pasa el cursor o haz clic en un sector a la derecha para aislar su curva
              </span>
            </div>

            <div className="h-[285px] w-full">
              {chartMode === 'lines' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 8, right: 12, left: -6, bottom: 2 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(148, 163, 184, 0.12)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                      tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="rgba(148, 163, 184, 0.35)"
                      strokeDasharray="4 4"
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const pt = payload[0].payload as Record<string, any>
                        const sortedItems = [...payload]
                          .filter((item) => typeof item.value === 'number')
                          .sort((a, b) => Number(b.value) - Number(a.value))

                        return (
                          <div className="px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-[#1e1e24]/95 border border-slate-200 dark:border-white/10 shadow-xl text-xs font-mono space-y-1 min-w-[210px]">
                            <div className="font-sans font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-1 mb-1 flex items-center justify-between">
                              <span>{pt.date || pt.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Base 0%</span>
                            </div>
                            {sortedItems.map((item) => {
                              const secMeta = sectors.find((s) => s.key === item.dataKey)
                              const val = Number(item.value)
                              return (
                                <div
                                  key={String(item.dataKey)}
                                  className="flex items-center justify-between gap-4 py-0.5"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: secMeta?.color || item.color }}
                                    />
                                    <span className="font-sans font-semibold text-slate-700 dark:text-slate-200 truncate">
                                      {secMeta?.sector || String(item.name)}
                                    </span>
                                  </div>
                                  <span
                                    className={cn(
                                      'font-bold',
                                      val >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    )}
                                  >
                                    {val >= 0 ? '+' : ''}
                                    {val.toFixed(2)}%
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      }}
                    />
                    {sectors.map((sec) => {
                      if (hiddenKeys.has(sec.key)) return null
                      const isHovered = hoveredKey === sec.key
                      const isDimmed = hoveredKey !== null && hoveredKey !== sec.key
                      return (
                        <Line
                          key={sec.key}
                          type="monotone"
                          dataKey={sec.key}
                          name={sec.sector}
                          stroke={sec.color}
                          strokeWidth={isHovered ? 3.4 : 2.1}
                          strokeOpacity={isDimmed ? 0.2 : 0.95}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0, fill: sec.color }}
                          isAnimationActive={false}
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sectors}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="rgba(148, 163, 184, 0.12)"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="sector"
                      tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <ReferenceLine x={0} stroke="rgba(148, 163, 184, 0.35)" />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const s = payload[0].payload as SectorHistoryMeta & { day_change_pct?: number }
                        return (
                          <div className="px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-[#1e1e24]/95 border border-slate-200 dark:border-white/10 shadow-xl text-xs font-mono space-y-1">
                            <div className="font-sans font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-1 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                              <span>{s.sector} ({s.ticker})</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">Retorno Periodo:</span>
                              <span className={s.return_pct >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                                {s.return_pct >= 0 ? '+' : ''}{s.return_pct.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">Máximo / Mínimo:</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                +{s.high_pct.toFixed(1)}% / {s.low_pct.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="return_pct" radius={[0, 6, 6, 0]} barSize={20}>
                      {sectors.map((s) => (
                        <Cell key={s.key} fill={s.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right Sector Ranking & Interactive Filter Panel */}
          <div className="xl:col-span-4 rounded-2xl bg-slate-50/70 dark:bg-[#18181b] border border-slate-200/80 dark:border-white/[0.06] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-200/70 dark:border-white/[0.06]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Ranking de Fuerza Sectorial
              </span>
              <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                Periodo / Hoy 1D
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-between divide-y divide-slate-200/50 dark:divide-white/[0.04] my-1">
              {sectors.map((sec, idx) => {
                const isHidden = hiddenKeys.has(sec.key)
                const isHovered = hoveredKey === sec.key
                const isSectorFiltered = selectedSector === sec.sector
                const barWidthPct = Math.min(100, Math.max(6, (Math.abs(sec.return_pct) / maxAbsReturn) * 100))
                const dayChg = (sec as any).day_change_pct ?? sec.step_change_pct

                return (
                  <div
                    key={sec.key}
                    onMouseEnter={() => setHoveredKey(sec.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onClick={() => isolateSector(sec.key)}
                    className={cn(
                      'group flex items-center justify-between gap-2 py-1.5 px-2 rounded-xl cursor-pointer transition-all',
                      isHovered
                        ? 'bg-white dark:bg-white/[0.06] shadow-2xs'
                        : 'hover:bg-white/70 dark:hover:bg-white/[0.04]',
                      isHidden && 'opacity-40'
                    )}
                    title={`Clic para aislar la curva de ${sec.sector} (${sec.ticker})`}
                  >
                    {/* Left: Rank + Color + Icon + Name */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={cn(
                          'w-5 h-5 rounded-md font-mono text-[10.5px] font-bold flex items-center justify-center shrink-0',
                          idx === 0
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : idx === 1
                            ? 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                            : idx === 2
                            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            : 'text-slate-400 dark:text-slate-500'
                        )}
                      >
                        {idx + 1}º
                      </span>

                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sec.color }}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {sec.sector}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                            {sec.ticker}
                          </span>
                        </div>
                        {/* Relative strength progress bar */}
                        <div className="w-full h-1 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${barWidthPct}%`,
                              backgroundColor: sec.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Period Return + 1D Return + Optional Filter Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right font-mono">
                        <div
                          className={cn(
                            'text-xs font-extrabold leading-tight',
                            sec.return_pct >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {sec.return_pct >= 0 ? '+' : ''}
                          {sec.return_pct.toFixed(2)}%
                        </div>
                        <div
                          className={cn(
                            'text-[10px] font-semibold leading-tight',
                            dayChg >= 0
                              ? 'text-emerald-600/80 dark:text-emerald-400/80'
                              : 'text-rose-600/80 dark:text-rose-400/80'
                          )}
                        >
                          Hoy: {dayChg >= 0 ? '+' : ''}
                          {dayChg.toFixed(2)}%
                        </div>
                      </div>

                      {onSelectSector && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectSector(isSectorFiltered ? 'Todos' : sec.sector)
                          }}
                          title={
                            isSectorFiltered
                              ? 'Quitar filtro de sector en tabla/heatmap'
                              : `Filtrar listado y mapa de calor por ${sec.sector}`
                          }
                          className={cn(
                            'p-1.5 rounded-lg border transition-colors',
                            isSectorFiltered
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-slate-100/80 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                          )}
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-1.5 border-t border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 px-1">
              <span>Clic en fila: aislar curva en gráfica</span>
              <span>Icono embudo: filtrar valores abajo</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

