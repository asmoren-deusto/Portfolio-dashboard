import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ComposedChart,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import type { PricePoint } from '@/lib/mockData'
import { fmt, cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Sparkles,
  Layers,
  Building2,
  PieChart as PieIcon,
  Check,
} from 'lucide-react'

// Entity branding palette
export const BROKER_PALETTE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  myinvestor: {
    label: 'MyInvestor',
    color: '#3b82f6', // Electric Blue
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  indexa: {
    label: 'Indexa Capital',
    color: '#f59e0b', // Amber
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  traderepublic: {
    label: 'Trade Republic',
    color: '#8b5cf6', // Neon Violet
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
  },
  bbva: {
    label: 'BBVA',
    color: '#10b981', // Emerald
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  kutxabank: {
    label: 'Kutxabank',
    color: '#f43f5e', // Rose
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.35)',
  },
}

// Asset class branding palette
export const ASSET_CLASS_PALETTE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  equity: {
    label: 'Renta Variable',
    color: '#3b82f6', // Blue
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  fixed_income: {
    label: 'Renta Fija / Bonos',
    color: '#10b981', // Emerald
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  commodity: {
    label: 'Oro / Materias Primas',
    color: '#f59e0b', // Amber / Gold
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  cash: {
    label: 'Efectivo / Traspaso',
    color: '#06b6d4', // Cyan
    bg: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.35)',
  },
}

function formatDateShort(dateStr: string): string {
  try {
    const parts = dateStr.split('-')
    if (parts.length < 3) return dateStr
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${d} ${months[m]}`
  } catch {
    return dateStr
  }
}

function formatDateFull(dateStr: string): string {
  try {
    const parts = dateStr.split('-')
    if (parts.length < 3) return dateStr
    const y = parts[0]
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    return `${d} de ${months[m]} de ${y}`
  } catch {
    return dateStr
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GLOW SPLINE CHART (Curva Neta con Halo y Plusvalía Sombreada)
// ─────────────────────────────────────────────────────────────────────────────
export function GlowSplineChart({
  data,
  height = 260,
  chartMode = 'currency',
  showInvested = true,
}: {
  data: PricePoint[]
  height?: number
  chartMode?: 'currency' | 'percent'
  showInvested?: boolean
}) {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  const chartData = useMemo(() => {
    if (!data || !data.length) return []
    const firstVal = data[0].value || 1
    const firstInv = data[0].invested || firstVal

    return data.map((pt) => {
      const val = pt.value || 0
      const inv = pt.invested ?? val
      const pnl = val - inv
      const pnlPct = inv > 0 ? (pnl / inv) * 100 : 0
      const returnPct = ((val - firstVal) / firstVal) * 100

      return {
        date: pt.date,
        value: val,
        invested: inv,
        pnl,
        pnlPct,
        returnPct,
        displayVal: chartMode === 'percent' ? returnPct : val,
        displayInv: chartMode === 'percent' ? 0 : inv,
      }
    })
  }, [data, chartMode])

  const latest = chartData[chartData.length - 1]
  const first = chartData[0]
  const isPositive = (latest?.pnl ?? 0) >= 0

  return (
    <div className="w-full flex flex-col">
      <div style={{ height }} className="w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
            <defs>
              {/* Vibrant glowing gradient for market value */}
              <linearGradient id="glowAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={isDark ? 0.38 : 0.28} />
                <stop offset="45%" stopColor="#06b6d4" stopOpacity={isDark ? 0.16 : 0.12} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>

              {/* Subtle fill for invested baseline */}
              <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.08} />
                <stop offset="100%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0} />
              </linearGradient>

              {/* Filter for subtle neon line glow */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.3" />
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tickLine={false}
              axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              minTickGap={40}
            />

            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v) => (chartMode === 'percent' ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : fmt.currency(v))}
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              orientation="right"
              width={70}
            />

            <Tooltip
              content={<GlowChartTooltip chartMode={chartMode} isDark={isDark} />}
              cursor={{
                stroke: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {/* Invested Capital Line & Area (Only in currency mode when enabled) */}
            {chartMode === 'currency' && showInvested && (
              <Area
                type="monotone"
                dataKey="displayInv"
                stroke={isDark ? '#818cf8' : '#6366f1'}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#investedGradient)"
                isAnimationActive={false}
              />
            )}

            {/* Master Value Glow Line & Area */}
            <Area
              type="monotone"
              dataKey="displayVal"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#glowAreaGradient)"
              filter="url(#neonGlow)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function GlowChartTooltip({ active, payload, label, chartMode, isDark }: any) {
  if (!active || !payload?.length || !payload[0]?.payload) return null
  const pt = payload[0].payload
  const isPos = pt.pnl >= 0

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1c1c1f]/95 backdrop-blur-md p-3 shadow-xl text-xs min-w-[210px] space-y-2 pointer-events-none">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-1.5">
        <span className="font-semibold text-slate-900 dark:text-white capitalize">
          {formatDateFull(label)}
        </span>
        <span
          className={cn(
            'px-1.5 py-0.5 rounded font-bold text-[10px]',
            isPos ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          )}
        >
          {isPos ? '+' : ''}
          {pt.pnlPct.toFixed(2)}%
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Patrimonio:
          </span>
          <span className="font-bold text-slate-900 dark:text-white">{fmt.currency(pt.value)}</span>
        </div>

        {chartMode === 'currency' && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-0.5 border-t border-dashed border-indigo-500" />
              Capital Aportado:
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt.currency(pt.invested)}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.06]">
          <span className="text-slate-500 dark:text-slate-400">Ganancia neta:</span>
          <span className={cn('font-bold', isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {isPos ? '+' : ''}
            {fmt.currency(pt.pnl)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MULTI-LINE COMPARISON CHART (Líneas Independientes Nítidas sin Apilar)
// ─────────────────────────────────────────────────────────────────────────────
export function MultiLineComparisonChart({
  data,
  height = 260,
  breakdown = 'broker',
  chartMode = 'currency',
}: {
  data: PricePoint[]
  height?: number
  breakdown?: 'broker' | 'asset_class'
  chartMode?: 'currency' | 'percent'
}) {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  // Discover active series keys
  const seriesKeys = useMemo(() => {
    if (!data || !data.length) return []
    const found = new Set<string>()
    data.forEach((pt) => {
      const source = breakdown === 'broker' ? pt.brokers : pt.asset_classes
      if (source) {
        Object.entries(source).forEach(([k, v]) => {
          if (v && v.value > 0.01) {
            found.add(k.toLowerCase())
          }
        })
      }
    })
    const last = data[data.length - 1]
    const lastSource = breakdown === 'broker' ? last?.brokers : last?.asset_classes
    const arr = Array.from(found)
    arr.sort((a, b) => {
      const vA = (lastSource as any)?.[a]?.value || 0
      const vB = (lastSource as any)?.[b]?.value || 0
      return vB - vA
    })
    return arr
  }, [data, breakdown])

  // Track user-toggled active visibility
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({})
  const toggleSeries = (k: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [k]: prev[k] === false ? true : false,
    }))
  }

  // Pre-calculate baseline values for percentage mode
  const baseValues = useMemo(() => {
    const bases: Record<string, number> = {}
    if (!data || !data.length) return bases
    for (const k of seriesKeys) {
      for (const pt of data) {
        const source = breakdown === 'broker' ? pt.brokers : pt.asset_classes
        const val = (source as any)?.[k]?.value || 0
        if (val > 0) {
          bases[k] = val
          break
        }
      }
    }
    return bases
  }, [data, seriesKeys, breakdown])

  const chartData = useMemo(() => {
    if (!data || !data.length) return []
    return data.map((pt) => {
      const row: any = { date: pt.date }
      const source = breakdown === 'broker' ? pt.brokers : pt.asset_classes

      seriesKeys.forEach((k) => {
        const rawVal = (source as any)?.[k]?.value || 0
        if (chartMode === 'percent') {
          const base = baseValues[k] || 1
          row[k] = base > 0 && rawVal > 0 ? Number((((rawVal - base) / base) * 100).toFixed(2)) : 0
        } else {
          row[k] = rawVal
        }
      })
      return row
    })
  }, [data, seriesKeys, breakdown, chartMode, baseValues])

  const palette = breakdown === 'broker' ? BROKER_PALETTE : ASSET_CLASS_PALETTE

  return (
    <div className="w-full flex flex-col">
      <div style={{ height }} className="w-full relative">
        {/* Floating Interactive Legend Pills on Top */}
        <div className="absolute top-1 left-2 z-10 flex flex-wrap items-center gap-1.5 pointer-events-auto max-w-[85%]">
          {seriesKeys.map((k) => {
            const cfg = (palette as any)[k] || { label: k, color: '#3b82f6' }
            const isVis = visibleSeries[k] !== false
            const lastVal = chartData[chartData.length - 1]?.[k] || 0

            return (
              <motion.button
                key={k}
                whileTap={{ scale: 0.96 }}
                onClick={() => toggleSeries(k)}
                className={cn(
                  'px-2 py-0.5 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-2xs',
                  isVis
                    ? 'bg-white/90 dark:bg-[#202022]/90 backdrop-blur-xs border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100'
                    : 'bg-slate-100/60 dark:bg-white/[0.03] border-slate-200/40 dark:border-white/[0.05] text-slate-400 line-through opacity-50'
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span>{cfg.label}</span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {chartMode === 'percent' ? `${lastVal > 0 ? '+' : ''}${lastVal}%` : fmt.currency(lastVal)}
                </span>
              </motion.button>
            )
          })}
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 28, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tickLine={false}
              axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              minTickGap={40}
            />

            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v) => (chartMode === 'percent' ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : fmt.currency(v))}
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              orientation="right"
              width={70}
            />

            <Tooltip
              content={<MultiLineTooltip palette={palette} chartMode={chartMode} isDark={isDark} />}
              cursor={{
                stroke: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {seriesKeys.map((k) => {
              const isVis = visibleSeries[k] !== false
              if (!isVis) return null
              const cfg = (palette as any)[k] || { label: k, color: '#3b82f6' }

              return (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={cfg.label}
                  stroke={cfg.color}
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: cfg.color }}
                  isAnimationActive={false}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MultiLineTooltip({ active, payload, label, palette, chartMode, isDark }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1c1c1f]/95 backdrop-blur-md p-3 shadow-xl text-xs min-w-[210px] space-y-2 pointer-events-none">
      <div className="font-semibold text-slate-900 dark:text-white capitalize border-b border-slate-100 dark:border-white/[0.08] pb-1.5">
        {formatDateFull(label)}
      </div>

      <div className="space-y-1.5">
        {payload.map((item: any) => {
          const k = item.dataKey
          const cfg = (palette as any)[k] || { label: item.name, color: item.color }
          const val = item.value

          return (
            <div key={k} className="flex items-center justify-between gap-4">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.label}:
              </span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {chartMode === 'percent' ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : fmt.currency(val)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WATERFALL GROWTH CHART (Barras de Aporte de Ahorro vs Rentabilidad Neta)
// ─────────────────────────────────────────────────────────────────────────────
export function WaterfallGrowthChart({
  data,
  height = 260,
}: {
  data: PricePoint[]
  height?: number
}) {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  // Aggregate data by calendar month
  const monthlyData = useMemo(() => {
    if (!data || !data.length) return []

    const monthsMap = new Map<string, { startVal: number; endVal: number; startInv: number; endInv: number; inflows: number }>()

    data.forEach((pt) => {
      const mKey = pt.date.slice(0, 7) // YYYY-MM
      const val = pt.value || 0
      const inv = pt.invested ?? val
      const inflow = pt.net_inflow || 0

      if (!monthsMap.has(mKey)) {
        monthsMap.set(mKey, {
          startVal: val,
          endVal: val,
          startInv: inv,
          endInv: inv,
          inflows: inflow,
        })
      } else {
        const entry = monthsMap.get(mKey)!
        entry.endVal = val
        entry.endInv = inv
        entry.inflows += inflow
      }
    })

    const result = Array.from(monthsMap.entries()).map(([mKey, v]) => {
      const netSavings = v.endInv - v.startInv
      const totalGrowth = v.endVal - v.startVal
      const marketGain = totalGrowth - netSavings

      const parts = mKey.split('-')
      const m = parseInt(parts[1], 10) - 1
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      const label = `${months[m]} ${parts[0].slice(2)}`

      return {
        monthKey: mKey,
        label,
        savings: Math.round(netSavings),
        marketGain: Math.round(marketGain),
        portfolioValue: Math.round(v.endVal),
      }
    })

    return result.slice(-12) // Show last 12 months for optimal spacing
  }, [data])

  const totals = useMemo(() => {
    let totSavings = 0
    let totGains = 0
    monthlyData.forEach((d) => {
      totSavings += d.savings
      totGains += d.marketGain
    })
    return { totSavings, totGains }
  }, [monthlyData])

  return (
    <div className="w-full flex flex-col">
      <div style={{ height }} className="w-full relative">
        {/* Floating Top Summary Badge */}
        <div className="absolute top-1 left-2 z-10 flex items-center gap-3 text-[11px] font-semibold bg-white/90 dark:bg-[#202022]/90 backdrop-blur-xs px-2.5 py-0.5 rounded-md border border-slate-200/80 dark:border-white/10 shadow-2xs">
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="w-2 h-2 rounded bg-blue-500" /> Aportado: {fmt.currency(totals.totSavings)}
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className={cn("flex items-center gap-1.5", totals.totGains >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            <span className={cn("w-2 h-2 rounded", totals.totGains >= 0 ? "bg-emerald-500" : "bg-rose-500")} /> Mercado: {totals.totGains >= 0 ? '+' : ''}{fmt.currency(totals.totGains)}
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={monthlyData} margin={{ top: 28, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
            />

            <YAxis
              yAxisId="barAxis"
              domain={['auto', 'auto']}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              orientation="right"
              width={50}
            />

            <Tooltip
              content={<WaterfallTooltip isDark={isDark} />}
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
            />

            {/* Aportaciones netas (Ahorro del usuario) */}
            <Bar
              yAxisId="barAxis"
              dataKey="savings"
              name="Aportación Neta"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />

            {/* Rentabilidad del Mercado (Verde si positivo, rojo si negativo) */}
            <Bar
              yAxisId="barAxis"
              dataKey="marketGain"
              name="Rendimiento Mercado"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            >
              {monthlyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.marketGain >= 0 ? '#10b981' : '#f43f5e'} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function WaterfallTooltip({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length || !payload[0]?.payload) return null
  const pt = payload[0].payload
  const isPos = pt.marketGain >= 0

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1c1c1f]/95 backdrop-blur-md p-3 shadow-xl text-xs min-w-[210px] space-y-2 pointer-events-none">
      <div className="font-semibold text-slate-900 dark:text-white capitalize border-b border-slate-100 dark:border-white/[0.08] pb-1.5">
        Mes: {pt.label}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-blue-500" />
            Aportación de Ahorro:
          </span>
          <span className="font-bold text-slate-900 dark:text-white font-mono">{fmt.currency(pt.savings)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded', isPos ? 'bg-emerald-500' : 'bg-rose-500')} />
            Rentabilidad Mercado:
          </span>
          <span className={cn('font-bold font-mono', isPos ? 'text-emerald-500' : 'text-rose-500')}>
            {isPos ? '+' : ''}
            {fmt.currency(pt.marketGain)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.06]">
          <span className="text-slate-500 dark:text-slate-400">Patrimonio al Cierre:</span>
          <span className="font-bold text-slate-900 dark:text-white font-mono">{fmt.currency(pt.portfolioValue)}</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ALLOCATION STREAM CHART (Evolución de Pesos 100% Relativa)
// ─────────────────────────────────────────────────────────────────────────────
export function AllocationStreamChart({
  data,
  height = 260,
  breakdown = 'broker',
}: {
  data: PricePoint[]
  height?: number
  breakdown?: 'broker' | 'asset_class'
}) {
  const { theme } = useAppStore()
  const isDark = theme === 'dark'

  const seriesKeys = useMemo(() => {
    if (!data || !data.length) return []
    const found = new Set<string>()
    data.forEach((pt) => {
      const source = breakdown === 'broker' ? pt.brokers : pt.asset_classes
      if (source) {
        Object.entries(source).forEach(([k, v]) => {
          if (v && v.value > 0.01) {
            found.add(k.toLowerCase())
          }
        })
      }
    })
    const last = data[data.length - 1]
    const lastSource = breakdown === 'broker' ? last?.brokers : last?.asset_classes
    const arr = Array.from(found)
    arr.sort((a, b) => {
      const vA = (lastSource as any)?.[a]?.value || 0
      const vB = (lastSource as any)?.[b]?.value || 0
      return vB - vA
    })
    return arr
  }, [data, breakdown])

  const chartData = useMemo(() => {
    if (!data || !data.length) return []
    return data.map((pt) => {
      const row: any = { date: pt.date }
      const source = breakdown === 'broker' ? pt.brokers : pt.asset_classes
      let total = 0
      seriesKeys.forEach((k) => {
        const val = (source as any)?.[k]?.value || 0
        total += val
      })
      seriesKeys.forEach((k) => {
        const val = (source as any)?.[k]?.value || 0
        row[k] = total > 0 ? (val / total) * 100 : 0
        row[`${k}_eur`] = val
      })
      return row
    })
  }, [data, seriesKeys, breakdown])

  const palette = breakdown === 'broker' ? BROKER_PALETTE : ASSET_CLASS_PALETTE

  return (
    <div className="w-full flex flex-col">
      <div style={{ height }} className="w-full relative">
        {/* Floating Interactive Pills on Top */}
        <div className="absolute top-1 left-2 z-10 flex flex-wrap items-center gap-1.5 pointer-events-auto max-w-[85%]">
          {seriesKeys.map((k) => {
            const cfg = (palette as any)[k] || { label: k, color: '#3b82f6' }
            const lastPoint = chartData[chartData.length - 1]
            const pct = lastPoint?.[k] || 0
            const eur = lastPoint?.[`${k}_eur`] || 0

            return (
              <div
                key={k}
                className="px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#202022]/90 backdrop-blur-xs text-[11px] flex items-center gap-1.5 shadow-2xs"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="font-semibold text-slate-800 dark:text-slate-100">{cfg.label}:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{pct.toFixed(1)}%</span>
                <span className="text-[10px] text-slate-400 font-mono">({fmt.currency(eur)})</span>
              </div>
            )
          })}
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 28, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tickLine={false}
              axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              minTickGap={40}
            />

            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              orientation="right"
              width={45}
            />

            <Tooltip
              content={<AllocationStreamTooltip palette={palette} seriesKeys={seriesKeys} isDark={isDark} />}
              cursor={{
                stroke: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {seriesKeys.map((k) => {
              const cfg = (palette as any)[k] || { label: k, color: '#3b82f6' }
              return (
                <Area
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={cfg.label}
                  stackId="1"
                  stroke={cfg.color}
                  fill={cfg.color}
                  fillOpacity={isDark ? 0.65 : 0.75}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AllocationStreamTooltip({ active, payload, label, palette, seriesKeys, isDark }: any) {
  if (!active || !payload?.length || !payload[0]?.payload) return null
  const pt = payload[0].payload

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1c1c1f]/95 backdrop-blur-md p-3 shadow-xl text-xs min-w-[220px] space-y-2 pointer-events-none">
      <div className="font-semibold text-slate-900 dark:text-white capitalize border-b border-slate-100 dark:border-white/[0.08] pb-1.5">
        {formatDateFull(label)}
      </div>

      <div className="space-y-1.5">
        {seriesKeys.map((k: string) => {
          const cfg = (palette as any)[k] || { label: k, color: '#3b82f6' }
          const pct = pt[k] || 0
          const eur = pt[`${k}_eur`] || 0

          return (
            <div key={k} className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.label}:
              </span>
              <div className="text-right font-mono">
                <span className="font-bold text-slate-900 dark:text-white mr-1.5">{pct.toFixed(1)}%</span>
                <span className="text-[11px] text-slate-400">({fmt.currency(eur)})</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
