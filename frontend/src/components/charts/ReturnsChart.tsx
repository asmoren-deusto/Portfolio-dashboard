import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, LabelList
} from 'recharts'
import { motion } from 'framer-motion'
import type { Analytics } from '@/lib/mockData'
import { fmt, cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

export interface ReturnBarItem {
  name: string
  fullName: string
  value: number
  amount?: number
  subtitle?: string
  posVal?: number
  negVal?: number
}

interface ReturnsChartProps {
  analytics?: Analytics | null
  weeklyData?: ReturnBarItem[]
  mode?: 'global' | 'weekly'
  day1Pct?: number
  day1Amount?: number
  weekPct?: number
  weekAmount?: number
  totalPortfolioValue?: number
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
  const rawVal = payload[0]?.payload?.value ?? payload[0].value
  const v: number = typeof rawVal === 'number' ? (Math.abs(rawVal) < 0.0005 ? 0 : rawVal) : 0
  const amount: number | undefined = payload[0]?.payload?.amount
  const fullName = payload[0]?.payload?.fullName || label
  const subtitle = payload[0]?.payload?.subtitle || 'TWR ponderado en el tiempo'
  const isPositive = v >= 0

  return (
    <div className="pointer-events-none min-w-[170px] max-w-[240px] px-3.5 py-2.5 rounded-2xl bg-white/98 dark:bg-[#1a1f2b]/98 border border-slate-200/90 dark:border-white/10 shadow-2xl text-xs select-none">
      {/* Date / Period Header */}
      <div className="text-[11.5px] font-medium text-slate-400 dark:text-slate-400 mb-1.5 capitalize flex items-center justify-between">
        <span>{fullName}</span>
      </div>

      {/* Metric Rows */}
      <div className="flex flex-col gap-1.5">
        {/* Rendimiento */}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium text-[11.5px]">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                isPositive ? 'bg-emerald-500' : 'bg-rose-500'
              )}
            />
            Rendimiento
          </span>
          <span
            className={cn(
              'font-mono font-bold text-[12.5px]',
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {isPositive ? '+' : ''}{v.toFixed(2)}%
          </span>
        </div>

        {/* Ganancia / Importe Neto (si está disponible) */}
        {amount !== undefined && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-white/[0.08] text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Ganancia neta</span>
            <span
              className={cn(
                'font-mono font-bold text-[12px]',
                amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {amount >= 0 ? '+' : ''}{fmt.currency(amount)}
            </span>
          </div>
        )}

        {/* Subtitle / Context Note */}
        {subtitle && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-white/[0.06] mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

export function ReturnsChart({
  analytics,
  weeklyData,
  mode = 'global',
  day1Pct,
  day1Amount,
  weekPct,
  weekAmount,
  totalPortfolioValue,
  compact = false,
  height = 240
}: ReturnsChartProps) {
  const refreshAnimKey = useAppStore(s => s.refreshAnimKey)
  const selectedBroker = useAppStore(s => s.selectedBroker)

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

  const data = useMemo<ReturnBarItem[]>(() => {
    if (mode === 'weekly' && weeklyData && weeklyData.length > 0) {
      return weeklyData.map(d => ({
        ...d,
        subtitle: d.subtitle || 'Rendimiento de la sesión',
      }))
    }
    const calcAmt = (pct: number) =>
      totalPortfolioValue ? Math.round(totalPortfolioValue * (pct / 100) * 100) / 100 : undefined

    const val1d = day1Pct !== undefined ? day1Pct : (analytics?.return_1d ?? 0)
    const amt1d = day1Amount !== undefined ? day1Amount : calcAmt(val1d)

    const val1w = weekPct !== undefined ? weekPct : (analytics?.return_1w ?? 0)
    const amt1w = weekAmount !== undefined ? weekAmount : calcAmt(val1w)

    const val1m = analytics?.return_1m ?? 0
    const val3m = analytics?.return_3m ?? 0
    const val6m = analytics?.return_6m ?? 0
    const val1y = analytics?.return_1y ?? analytics?.return_ytd ?? 0

    return compact
      ? [
        { name: '1D', fullName: '1 Día', value: val1d, amount: amt1d, subtitle: 'Rendimiento diario ponderado' },
        { name: '1S', fullName: '1 Semana (7D)', value: val1w, amount: amt1w, subtitle: 'TWR ponderado en el tiempo' },
        { name: '1M', fullName: '1 Mes', value: val1m, amount: calcAmt(val1m), subtitle: 'TWR ponderado en el tiempo' },
        { name: '3M', fullName: '3 Meses', value: val3m, amount: calcAmt(val3m), subtitle: 'TWR ponderado en el tiempo' },
        { name: '6M', fullName: '6 Meses', value: val6m, amount: calcAmt(val6m), subtitle: 'TWR ponderado en el tiempo' },
        { name: '1A', fullName: '1 Año', value: val1y, amount: calcAmt(val1y), subtitle: 'TWR ponderado en el tiempo' },
      ]
      : [
        { name: '1 Día', fullName: '1 Día', value: val1d, amount: amt1d, subtitle: 'Rendimiento diario ponderado' },
        { name: '1 Semana', fullName: '1 Semana (7D)', value: val1w, amount: amt1w, subtitle: 'TWR ponderado en el tiempo' },
        { name: '1 Mes', fullName: '1 Mes', value: val1m, amount: calcAmt(val1m), subtitle: 'TWR ponderado en el tiempo' },
        { name: '3 Meses', fullName: '3 Meses', value: val3m, amount: calcAmt(val3m), subtitle: 'TWR ponderado en el tiempo' },
        { name: '6 Meses', fullName: '6 Meses', value: val6m, amount: calcAmt(val6m), subtitle: 'TWR ponderado en el tiempo' },
        { name: '1 Año', fullName: '1 Año', value: val1y, amount: calcAmt(val1y), subtitle: 'TWR ponderado en el tiempo' },
      ]
  }, [mode, weeklyData, totalPortfolioValue, day1Pct, day1Amount, weekPct, weekAmount, analytics, compact])

  const chartData = useMemo(() => {
    return data.map(d => {
      const isZero = d.value === 0
      const plotVal = isZero ? 0.0001 : d.value
      return {
        ...d,
        plotVal,
      }
    })
  }, [data])

  const renderBarLabel = (props: any) => {
    const { x, y, width, height, index } = props
    if (index == null || !data[index]) return null
    const origVal = data[index].value
    if (origVal == null || isNaN(origVal)) return null
    const isNeg = origVal < 0
    const labelText = Math.abs(origVal) < 0.0001
      ? '+0.00%'
      : `${origVal >= 0 ? '+' : ''}${origVal.toFixed(2)}%`

    const barTop = Math.min(y, y + height)
    const barBottom = Math.max(y, y + height)
    const textY = isNeg ? (barBottom + (compact ? 12 : 14)) : (barTop - 5)
    const textX = x + width / 2

    return (
      <text
        x={textX}
        y={textY}
        fill="#94a3b8"
        textAnchor="middle"
        fontSize={compact ? 9.5 : 10.5}
        fontFamily="monospace"
        fontWeight={700}
        pointerEvents="none"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {labelText}
      </text>
    )
  }

  return (
    <div
      key={`ret-wrap-${mode}-${selectedBroker}-${refreshAnimKey}`}
      data-private
      style={{ height }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          key={`returns-bar-chart-${mode}-${selectedBroker}-${refreshAnimKey}`}
          data={chartData}
          margin={compact ? { top: 22, right: 8, left: 4, bottom: 20 } : { top: 24, right: 14, left: 8, bottom: 22 }}
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
            dy={12}
          />
          <YAxis
            width={compact ? 36 : 42}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: compact ? 9.5 : 11 }}
            domain={[
              (dataMin: number) => {
                const min = Number.isFinite(dataMin) ? dataMin : 0
                return min < 0 ? min * 1.45 : 0
              },
              (dataMax: number) => {
                const max = Number.isFinite(dataMax) ? dataMax : 0
                return max > 0 ? max * 1.45 : 0
              }
            ]}
            tickFormatter={v => `${Number(Number(v).toFixed(1))}%`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(148, 163, 184, 0.08)', radius: 6 }}
            animationDuration={150}
            wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
          />
          <Bar
            dataKey="plotVal"
            radius={[6, 6, 0, 0]}
            maxBarSize={compact ? (mode === 'weekly' ? 30 : 34) : 44}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={380}
            animationEasing="ease-out"
          >
            {data.map((d, i) => (
              <Cell
                key={`cell-${mode}-${selectedBroker}-${d.name}-${i}`}
                fill={d.value >= 0 ? 'url(#barGreen)' : 'url(#barRed)'}
                className="returns-chart-bar"
              />
            ))}
            <LabelList
              dataKey="plotVal"
              content={renderBarLabel}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
