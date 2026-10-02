import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, LabelList
} from 'recharts'
import type { Analytics } from '@/lib/mockData'

interface ReturnsChartProps {
  analytics?: Analytics | null
  compact?: boolean
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length || payload[0]?.value == null) return null
  const v: number = payload[0].value
  const fullName = payload[0]?.payload?.fullName || label
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#1a2035]/95 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-xl">
      <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">{fullName}</p>
      <div className="flex items-center gap-1.5 font-mono">
        <span className="text-slate-500 dark:text-slate-400">Rendimiento:</span>
        <span className={v >= 0 ? 'text-emerald-500 dark:text-emerald-400 font-bold' : 'text-rose-500 dark:text-rose-400 font-bold'}>
          {v >= 0 ? '+' : ''}{v.toFixed(2)}%
        </span>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
        TWR ponderado en el tiempo
      </p>
    </div>
  )
}

export function ReturnsChart({ analytics, compact = false, height = 240 }: ReturnsChartProps) {
  if (!analytics) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        Sin datos de rentabilidad
      </div>
    )
  }

  const data = compact
    ? [
        { name: '1M', fullName: '1 Mes', value: analytics.return_1m ?? 0 },
        { name: '3M', fullName: '3 Meses', value: analytics.return_3m ?? 0 },
        { name: '6M', fullName: '6 Meses', value: analytics.return_6m ?? 0 },
        { name: 'YTD', fullName: 'Año Actual (YTD)', value: analytics.return_ytd ?? 0 },
        { name: '1A', fullName: '1 Año', value: analytics.return_1y ?? analytics.return_ytd ?? 0 },
      ]
    : [
        { name: '1 Mes', fullName: '1 Mes', value: analytics.return_1m ?? 0 },
        { name: '3 Meses', fullName: '3 Meses', value: analytics.return_3m ?? 0 },
        { name: '6 Meses', fullName: '6 Meses', value: analytics.return_6m ?? 0 },
        { name: 'Año Actual (YTD)', fullName: 'Año Actual (YTD)', value: analytics.return_ytd ?? 0 },
        { name: '1 Año', fullName: '1 Año', value: analytics.return_1y ?? analytics.return_ytd ?? 0 },
      ]

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={compact ? { top: 16, right: 4, left: -22, bottom: 0 } : { top: 16, right: 12, left: -10, bottom: 0 }}
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
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: compact ? 10.5 : 11, fontWeight: 600 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: compact ? 9.5 : 11 }}
            tickFormatter={v => `${v}%`}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={compact ? 34 : 44}>
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
    </div>
  )
}
