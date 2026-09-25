import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import type { Analytics } from '@/lib/mockData'

interface ReturnsChartProps {
  analytics?: Analytics | null
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length || payload[0]?.value == null) return null
  const v: number = payload[0].value
  return (
    <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#1a2035] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      <p className={v >= 0 ? 'text-emerald-500 dark:text-emerald-400 font-mono font-medium' : 'text-rose-500 dark:text-rose-400 font-mono font-medium'}>
        {v >= 0 ? '+' : ''}{v.toFixed(2)}%
      </p>
    </div>
  )
}

export function ReturnsChart({ analytics }: ReturnsChartProps) {
  if (!analytics) {
    return (
      <div className="flex h-[220px] items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        Sin datos de rentabilidad
      </div>
    )
  }

  const data = [
    { name: '1 Mes',   value: analytics.return_1m ?? 0 },
    { name: '3 Meses', value: analytics.return_3m ?? 0 },
    { name: '6 Meses', value: analytics.return_6m ?? 0 },
    { name: '1 Año',   value: analytics.return_ytd ?? 0 },
  ]

  return (
    <div className="w-full min-h-[220px]">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={v => `${v}%`}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={48}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.value >= 0 ? 'rgba(16,185,129,0.75)' : 'rgba(244,63,94,0.75)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
