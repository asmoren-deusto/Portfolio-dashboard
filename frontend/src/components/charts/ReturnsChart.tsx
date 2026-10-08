import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, LabelList
} from 'recharts'
import { motion } from 'framer-motion'
import type { Analytics } from '@/lib/mockData'

export interface ReturnBarItem {
  name: string
  fullName: string
  value: number
  subtitle?: string
}

interface ReturnsChartProps {
  analytics?: Analytics | null
  weeklyData?: ReturnBarItem[]
  mode?: 'global' | 'weekly'
  compact?: boolean
  height?: number
}

export function ReturnsChartSkeleton({ compact = false, height = 240 }: { compact?: boolean; height?: number }) {
  const bars = [35, 52, 44, 68, 80, 95]
  return (
    <div style={{ height }} className="w-full flex items-end justify-between px-5 pb-6 pt-6 gap-2.5 sm:gap-3 animate-pulse">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <div
            className="w-full max-w-[36px] bg-slate-200/70 dark:bg-white/[0.06] rounded-t-lg transition-all"
            style={{ height: `${h}%` }}
          />
          <div className="w-6 h-2.5 bg-slate-200/50 dark:bg-white/[0.04] rounded" />
        </div>
      ))}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length || payload[0]?.value == null) return null
  const v: number = payload[0].value
  const fullName = payload[0]?.payload?.fullName || label
  const subtitle = payload[0]?.payload?.subtitle || 'TWR ponderado en el tiempo'
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#181922]/95 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-xl">
      <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">{fullName}</p>
      <div className="flex items-center gap-1.5 font-mono">
        <span className="text-slate-500 dark:text-slate-400">Rendimiento:</span>
        <span className={v >= 0 ? 'text-emerald-500 dark:text-emerald-400 font-bold' : 'text-rose-500 dark:text-rose-400 font-bold'}>
          {v >= 0 ? '+' : ''}{v.toFixed(2)}%
        </span>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
        {subtitle}
      </p>
    </div>
  )
}

export function ReturnsChart({
  analytics,
  weeklyData,
  mode = 'global',
  compact = false,
  height = 240
}: ReturnsChartProps) {
  if (mode === 'global' && !analytics) {
    return <ReturnsChartSkeleton compact={compact} height={height} />
  }

  if (mode === 'weekly' && (!weeklyData || weeklyData.length === 0)) {
    return (
      <div style={{ height }} className="flex h-full items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
        Sin datos de rendimiento en los últimos 7 días
      </div>
    )
  }

  let data: ReturnBarItem[] = []

  if (mode === 'weekly' && weeklyData && weeklyData.length > 0) {
    data = weeklyData.map(d => ({
      ...d,
      subtitle: d.subtitle || 'Rendimiento de la sesión',
    }))
  } else {
    data = compact
      ? [
          { name: '1D', fullName: '1 Día (Hoy)', value: analytics?.return_1d ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '1S', fullName: '1 Semana (7D)', value: analytics?.return_1w ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '1M', fullName: '1 Mes', value: analytics?.return_1m ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '3M', fullName: '3 Meses', value: analytics?.return_3m ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '6M', fullName: '6 Meses', value: analytics?.return_6m ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '1A', fullName: '1 Año', value: analytics?.return_1y ?? analytics?.return_ytd ?? 0, subtitle: 'TWR ponderado en el tiempo' },
        ]
      : [
          { name: '1 Día', fullName: '1 Día (Hoy)', value: analytics?.return_1d ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '1 Semana', fullName: '1 Semana (7D)', value: analytics?.return_1w ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '1 Mes', fullName: '1 Mes', value: analytics?.return_1m ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '3 Meses', fullName: '3 Meses', value: analytics?.return_3m ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '6 Meses', fullName: '6 Meses', value: analytics?.return_6m ?? 0, subtitle: 'TWR ponderado en el tiempo' },
          { name: '1 Año', fullName: '1 Año', value: analytics?.return_1y ?? analytics?.return_ytd ?? 0, subtitle: 'TWR ponderado en el tiempo' },
        ]
  }

  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      data-private
      style={{ height }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={compact ? { top: 18, right: 6, left: -8, bottom: 0 } : { top: 18, right: 12, left: -6, bottom: 0 }}
        >
          <defs>
            <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.65} />
            </linearGradient>
            <linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#e11d48" stopOpacity={0.65} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="name"
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: compact ? 9.5 : 11, fontWeight: 600 }}
          />
          <YAxis
            width={compact ? 28 : 36}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: compact ? 9 : 11 }}
            tickFormatter={v => `${v}%`}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            maxBarSize={compact ? (mode === 'weekly' ? 30 : 34) : 44}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="top"
              formatter={(val: any) => `${Number(val) >= 0 ? '+' : ''}${Number(val).toFixed(1)}%`}
              style={{
                fill: '#94a3b8',
                fontSize: compact ? '9.5px' : '10.5px',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            />
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.value >= 0 ? 'url(#barGreen)' : 'url(#barRed)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
