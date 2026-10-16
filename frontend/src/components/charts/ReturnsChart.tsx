import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
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

export function ReturnsChartSkeleton({ compact = false, height = 260 }: { compact?: boolean; height?: number }) {
  const bars = [35, 52, 44, 68, 80, 95]
  return (
    <div style={{ height }} className="w-full flex flex-col justify-between p-3 animate-pulse select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.05]">
        <div className="w-24 h-4 bg-slate-200/70 dark:bg-white/[0.06] rounded-md" />
        <div className="w-16 h-4 bg-slate-200/70 dark:bg-white/[0.06] rounded-md" />
      </div>
      <div className="flex-1 flex items-end justify-between px-3 pb-3 pt-6 gap-2.5 sm:gap-3">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div
              className="w-full max-w-[36px] bg-slate-200/70 dark:bg-white/[0.06] rounded-t-lg transition-all"
              style={{ height: `${h}%` }}
            />
            <div className="w-7 h-2.5 bg-slate-200/50 dark:bg-white/[0.04] rounded" />
          </div>
        ))}
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
  height = 260,
}: ReturnsChartProps) {
  const refreshAnimKey = useAppStore(s => s.refreshAnimKey)
  const selectedBroker = useAppStore(s => s.selectedBroker)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

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

  const data: ReturnBarItem[] = useMemo(() => {
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
  }, [mode, weeklyData, analytics, day1Pct, day1Amount, weekPct, weekAmount, totalPortfolioValue, compact])

  // Active item shown in the top HUD (default to last bar if nothing hovered/selected)
  const activeIndex = hoveredIdx !== null ? hoveredIdx : (selectedIdx !== null ? selectedIdx : data.length - 1)
  const activeItem = data[activeIndex] || data[0]

  // Proportional math for chart heights and collision-free bounds
  const values = data.map(d => d.value)
  const maxPos = Math.max(0, ...values)
  const minNeg = Math.min(0, ...values) // <= 0

  // Total available vertical canvas: height minus top HUD (~40px) and bottom labels (~32px)
  const canvasHeight = Math.max(120, height - 76)

  // Zero-line vertical split calculation (percentage from top of canvas)
  let zeroRatio = 0.5
  if (maxPos > 0 && minNeg < 0) {
    const totalSpan = maxPos + Math.abs(minNeg)
    zeroRatio = Math.max(0.30, Math.min(0.70, maxPos / totalSpan))
  } else if (maxPos > 0) {
    zeroRatio = 0.82 // All positive: zero line sits near bottom
  } else if (minNeg < 0) {
    zeroRatio = 0.18 // All negative: zero line sits near top
  }

  const zeroLineY = canvasHeight * zeroRatio
  // Reserve 24px above/below bars for percentage labels so they NEVER collide with boundaries
  const maxBarPosHeight = Math.max(18, zeroLineY - 26)
  const maxBarNegHeight = Math.max(18, canvasHeight - zeroLineY - 26)

  return (
    <motion.div
      key={`ret-chart-${mode}-${selectedBroker}-${refreshAnimKey}`}
      initial={{ opacity: 0.88, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      data-private
      style={{ height }}
      className="w-full flex flex-col justify-between select-none relative"
      onMouseLeave={() => setHoveredIdx(null)}
    >
      {/* ── 1. Interactive HUD Header (Zero-Jitter, Anchored at Top) ── */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-1 shrink-0 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-[12px] sm:text-[13px] text-slate-800 dark:text-slate-100 truncate">
            {activeItem.fullName}
          </span>
          <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 truncate hidden xs:inline">
            • {activeItem.subtitle}
          </span>
        </div>

        {/* Dynamic Metric Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`metric-pill-${activeItem.name}-${activeItem.value}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              className="flex items-center gap-1.5"
            >
              <div
                className={cn(
                  'px-2 py-0.5 rounded-lg font-mono font-bold text-[11.5px] sm:text-[12px] flex items-center gap-1 shadow-2xs',
                  activeItem.value >= 0
                    ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                    : 'bg-rose-500/12 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                )}
              >
                {activeItem.value >= 0 ? <TrendingUp size={12} className="shrink-0" /> : <TrendingDown size={12} className="shrink-0" />}
                <span>{activeItem.value >= 0 ? '+' : ''}{activeItem.value.toFixed(2)}%</span>
              </div>

              {activeItem.amount !== undefined && (
                <span
                  className={cn(
                    'font-mono font-bold text-[11.5px] hidden sm:inline',
                    activeItem.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  ({activeItem.amount >= 0 ? '+' : ''}{fmt.currency(activeItem.amount)})
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── 2. Canvas Visual Area (Pill Bars + Collision-Free Zero Baseline) ── */}
      <div
        className="w-full relative flex-1 min-h-0 my-1"
        style={{ height: `${canvasHeight}px` }}
      >
        {/* Subtle Horizontal Grid lines & 0.0% Axis */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-0 border-b border-dashed border-slate-200/90 dark:border-white/10"
          style={{ top: `${zeroLineY}px` }}
        />
        <div
          className="absolute right-0.5 pointer-events-none z-10 text-[9px] font-mono font-medium text-slate-400/80 dark:text-slate-500/80 select-none -translate-y-1/2 pr-0.5"
          style={{ top: `${zeroLineY}px` }}
        >
          0.0%
        </div>

        {/* Columns Grid */}
        <div className="w-full h-full grid grid-flow-col auto-cols-fr gap-1 sm:gap-2 relative z-10">
          {data.map((d, i) => {
            const isHovered = hoveredIdx === i
            const isSelected = selectedIdx === i && hoveredIdx === null
            const isFocused = isHovered || isSelected
            const anyHovered = hoveredIdx !== null || selectedIdx !== null

            const isPos = d.value >= 0
            const isZero = Math.abs(d.value) < 0.0005

            // Exact mathematical height
            let barH = 5
            if (isPos && maxPos > 0) {
              barH = Math.max(5, (d.value / maxPos) * maxBarPosHeight)
            } else if (!isPos && minNeg < 0) {
              barH = Math.max(5, (Math.abs(d.value) / Math.abs(minNeg)) * maxBarNegHeight)
            }

            // Clean formatted % text
            const pctLabel = isZero
              ? '+0.00%'
              : `${isPos ? '+' : ''}${Math.abs(d.value) < 1 ? d.value.toFixed(2) : d.value.toFixed(1)}%`

            return (
              <div
                key={`ret-bar-${mode}-${d.name}-${i}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
                className={cn(
                  'relative h-full flex flex-col items-center justify-center cursor-pointer rounded-xl transition-all duration-200',
                  isFocused && 'bg-slate-100/90 dark:bg-white/[0.04] shadow-xs',
                  anyHovered && !isFocused && 'opacity-40 hover:opacity-100'
                )}
              >
                {/* ── POSITIVE BAR (Grows upward from zeroLineY) ── */}
                {isPos && (
                  <>
                    {/* Value Label (Guaranteed room above bar cap) */}
                    <div
                      className={cn(
                        'absolute left-0 right-0 text-center font-mono font-bold pointer-events-none transition-all select-none',
                        isFocused
                          ? 'text-emerald-600 dark:text-emerald-400 text-[11px] scale-105'
                          : 'text-slate-500 dark:text-slate-400 text-[10px]'
                      )}
                      style={{
                        bottom: `${canvasHeight - zeroLineY + barH + 4}px`,
                      }}
                    >
                      {pctLabel}
                    </div>

                    {/* Capsule Bar */}
                    <div
                      className={cn(
                        'absolute w-full max-w-[34px] sm:max-w-[42px] rounded-t-lg rounded-b-xs transition-all duration-200',
                        'bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-600 dark:to-teal-400',
                        isFocused
                          ? 'shadow-[0_0_14px_rgba(16,185,129,0.45)] brightness-110 scale-x-105'
                          : 'hover:brightness-105'
                      )}
                      style={{
                        bottom: `${canvasHeight - zeroLineY}px`,
                        height: `${barH}px`,
                      }}
                    >
                      {/* Glossy top cap line */}
                      <div className="w-full h-1 bg-white/40 rounded-t-lg" />
                    </div>
                  </>
                )}

                {/* ── NEGATIVE BAR (Grows downward from zeroLineY) ── */}
                {!isPos && (
                  <>
                    {/* Capsule Bar */}
                    <div
                      className={cn(
                        'absolute w-full max-w-[34px] sm:max-w-[42px] rounded-b-lg rounded-t-xs transition-all duration-200',
                        'bg-gradient-to-b from-rose-600 to-rose-400 dark:from-rose-600 dark:to-red-500',
                        isFocused
                          ? 'shadow-[0_0_14px_rgba(244,63,94,0.45)] brightness-110 scale-x-105'
                          : 'hover:brightness-105'
                      )}
                      style={{
                        top: `${zeroLineY}px`,
                        height: `${barH}px`,
                      }}
                    >
                      {/* Glossy bottom cap line */}
                      <div className="w-full h-1 bg-white/30 rounded-b-lg mt-auto" />
                    </div>

                    {/* Value Label (Guaranteed room below bar cap) */}
                    <div
                      className={cn(
                        'absolute left-0 right-0 text-center font-mono font-bold pointer-events-none transition-all select-none',
                        isFocused
                          ? 'text-rose-600 dark:text-rose-400 text-[11px] scale-105'
                          : 'text-slate-500 dark:text-slate-400 text-[10px]'
                      )}
                      style={{
                        top: `${zeroLineY + barH + 4}px`,
                      }}
                    >
                      {pctLabel}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 3. Bottom Period Pills Row (Zero Collision with Negative Values) ── */}
      <div className="w-full grid grid-flow-col auto-cols-fr gap-1 sm:gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.04] shrink-0">
        {data.map((d, i) => {
          const isFocused = hoveredIdx === i || (selectedIdx === i && hoveredIdx === null)
          return (
            <button
              key={`tab-${mode}-${d.name}-${i}`}
              type="button"
              onMouseEnter={() => setHoveredIdx(i)}
              onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
              className={cn(
                'py-1 px-1 rounded-lg text-center font-bold transition-all text-xs tracking-tight',
                isFocused
                  ? 'bg-slate-200/90 dark:bg-white/10 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              {d.name}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
