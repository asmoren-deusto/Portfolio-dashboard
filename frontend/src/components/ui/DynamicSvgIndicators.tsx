import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn, fmt } from '@/lib/utils'
import type { Position } from '@/api/queries'

/* ── 1. Dynamic Hero SVG Sparkline with Area Gradient & Pulsing Endpoint ── */
interface HeroSparklineProps {
  points: Array<{ date: string; value: number }>
  positive?: boolean
  className?: string
}

export const HeroSparklineSvg = React.memo(function HeroSparklineSvg({
  points,
  positive = true,
  className,
}: HeroSparklineProps) {
  const uid = React.useId().replace(/:/g, '')

  const geometry = useMemo(() => {
    const valid = (points || []).filter((p) => typeof p?.value === 'number' && !isNaN(p.value))
    if (valid.length < 2) return null

    // Sample up to 24 points for a crisp, fast micro-curve
    const step = Math.max(1, Math.floor(valid.length / 24))
    const sampled: number[] = []
    for (let i = 0; i < valid.length; i += step) {
      sampled.push(valid[i].value)
    }
    if (sampled[sampled.length - 1] !== valid[valid.length - 1].value) {
      sampled.push(valid[valid.length - 1].value)
    }

    const min = Math.min(...sampled)
    const max = Math.max(...sampled)
    const range = max - min || 1

    const width = 94
    const height = 28
    const padX = 3
    const padY = 4
    const innerW = width - padX * 2
    const innerH = height - padY * 2

    const coords = sampled.map((v, idx) => {
      const x = padX + (idx / (sampled.length - 1)) * innerW
      const y = padY + innerH - ((v - min) / range) * innerH
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
    })

    // Build smooth quadratic bezier path
    let d = `M ${coords[0].x} ${coords[0].y}`
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1]
      const cur = coords[i]
      const midX = Number(((prev.x + cur.x) / 2).toFixed(1))
      const midY = Number(((prev.y + cur.y) / 2).toFixed(1))
      if (i === 1) {
        d += ` L ${midX} ${midY}`
      } else {
        d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`
      }
    }
    const last = coords[coords.length - 1]
    d += ` L ${last.x} ${last.y}`

    const areaD = `${d} L ${last.x} ${height} L ${coords[0].x} ${height} Z`

    return { d, areaD, last, width, height }
  }, [points])

  if (!geometry) return null

  const strokeColor = positive ? '#2563eb' : '#f43f5e'
  const glowColor = positive ? '#60a5fa' : '#fb7185'

  return (
    <div
      className={cn(
        'hidden sm:inline-flex items-center justify-center shrink-0 select-none pointer-events-none',
        className
      )}
      aria-hidden="true"
    >
      <svg
        width={geometry.width}
        height={geometry.height}
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        fill="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`heroSparkArea-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={geometry.areaD} fill={`url(#heroSparkArea-${uid})`} />
        <path
          d={geometry.d}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={geometry.last.x}
          cy={geometry.last.y}
          r="3.6"
          fill={glowColor}
          opacity="0.35"
          className="svg-pulse-ring"
        />
        <circle
          cx={geometry.last.x}
          cy={geometry.last.y}
          r="2.1"
          fill={strokeColor}
        />
      </svg>
    </div>
  )
})

/* ── 2. Dynamic Semicircle Arc Gauge for Risk Metrics (Volatilidad / Drawdown) ── */
interface RiskArcGaugeProps {
  /** Normalized ratio from 0 to 100 */
  ratio: number
  tone: 'amber' | 'rose' | 'emerald' | 'blue'
  title?: string
}

const TONE_STROKES = {
  amber: { stroke: '#f59e0b', track: 'stroke-amber-500/15 dark:stroke-amber-400/15' },
  rose: { stroke: '#f43f5e', track: 'stroke-rose-500/15 dark:stroke-rose-400/15' },
  emerald: { stroke: '#10b981', track: 'stroke-emerald-500/15 dark:stroke-emerald-400/15' },
  blue: { stroke: '#3b82f6', track: 'stroke-blue-500/15 dark:stroke-blue-400/15' },
}

export const RiskArcGaugeSvg = React.memo(function RiskArcGaugeSvg({
  ratio,
  tone,
  title,
}: RiskArcGaugeProps) {
  const clamped = Math.max(4, Math.min(100, ratio || 0))
  const r = 13
  const arcLength = Math.PI * r // semicircle circumference
  const dashOffset = arcLength - (clamped / 100) * arcLength
  const cfg = TONE_STROKES[tone]

  // Calculate endpoint on semicircle from (-r, 0) to (+r, 0) centered at (16, 16)
  const angleRad = Math.PI * (1 - clamped / 100)
  const tipX = 16 + r * Math.cos(angleRad)
  const tipY = 16 - r * Math.sin(angleRad)

  return (
    <div className="inline-flex items-center justify-center shrink-0" title={title}>
      <svg width="32" height="19" viewBox="0 0 32 19" fill="none" className="overflow-visible">
        {/* Background Semicircle Track */}
        <path
          d="M 3 16 A 13 13 0 0 1 29 16"
          fill="none"
          strokeWidth="3.2"
          strokeLinecap="round"
          className={cfg.track}
        />
        {/* Active Value Arc */}
        <path
          d="M 3 16 A 13 13 0 0 1 29 16"
          fill="none"
          stroke={cfg.stroke}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.65s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        {/* Indicator Tip Dot */}
        <circle
          cx={tipX.toFixed(1)}
          cy={tipY.toFixed(1)}
          r="2.2"
          fill={cfg.stroke}
          style={{ transition: 'cx 0.65s cubic-bezier(0.16, 1, 0.3, 1), cy 0.65s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
    </div>
  )
})

/* ── 3. Dynamic DCA Monthly Cycle Ring SVG ── */
interface DcaCycleRingProps {
  targetDay?: number
}

export const DcaCycleRingSvg = React.memo(function DcaCycleRingSvg({
  targetDay = 7,
}: DcaCycleRingProps) {
  const { progressPct, daysLeft } = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    let nextDate = new Date(currentYear, currentMonth, targetDay)
    let prevDate = new Date(currentYear, currentMonth - 1, targetDay)

    if (now.getDate() >= targetDay) {
      prevDate = new Date(currentYear, currentMonth, targetDay)
      nextDate = new Date(currentYear, currentMonth + 1, targetDay)
    }

    const totalMs = Math.max(1, nextDate.getTime() - prevDate.getTime())
    const elapsedMs = Math.max(0, now.getTime() - prevDate.getTime())
    const pct = Math.min(100, Math.max(8, Math.round((elapsedMs / totalMs) * 100)))
    const remainingDays = Math.max(1, Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    return { progressPct: pct, daysLeft: remainingDays }
  }, [targetDay])

  const size = 24
  const strokeWidth = 2.8
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (progressPct / 100) * circ

  return (
    <div
      className="inline-flex items-center gap-1.5 shrink-0"
      title={`Ciclo mensual DCA al ${progressPct}% • Faltan ${daysLeft} días para la próxima aportación automática (día ${targetDay})`}
    >
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-indigo-500/15 dark:stroke-indigo-400/15"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#6366f1"
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.65s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <span className="absolute text-[8.5px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
          {daysLeft}d
        </span>
      </div>
    </div>
  )
})

/* ── 4. Interactive Entity Allocation Pulse Bar ── */
const ENTITY_META: Record<
  string,
  { label: string; color: string; dotClass: string; badgeClass: string }
> = {
  myinvestor: {
    label: 'MyInvestor',
    color: '#3b82f6',
    dotClass: 'bg-blue-500',
    badgeClass: 'border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  indexa: {
    label: 'Indexa Capital',
    color: '#f59e0b',
    dotClass: 'bg-amber-500',
    badgeClass: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  bbva: {
    label: 'BBVA',
    color: '#10b981',
    dotClass: 'bg-emerald-500',
    badgeClass: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  traderepublic: {
    label: 'Trade Republic',
    color: '#8b5cf6',
    dotClass: 'bg-violet-500',
    badgeClass: 'border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  kutxabank: {
    label: 'Kutxabank',
    color: '#f43f5e',
    dotClass: 'bg-rose-500',
    badgeClass: 'border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
  scalable: {
    label: 'Scalable',
    color: '#06b6d4',
    dotClass: 'bg-cyan-500',
    badgeClass: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
}

interface InteractiveEntityBarProps {
  positions: Position[]
  selectedBroker: string
  onSelectBroker: (broker: string) => void
}

export const InteractiveEntityBar = React.memo(function InteractiveEntityBar({
  positions,
  selectedBroker,
  onSelectBroker,
}: InteractiveEntityBarProps) {
  const segments = useMemo(() => {
    const valid = positions.filter(
      (p) => p.isin !== 'TR_TRANSFER' && !p.isin.startsWith('TR_') && p.name !== 'Cartera Trade Republic'
    )
    const total = valid.reduce((acc, p) => acc + (p.current_value || 0), 0)
    if (total <= 0) return []

    const byBroker: Record<string, { value: number; count: number }> = {}
    for (const p of valid) {
      const raw = (p.broker || 'otros').toLowerCase().replace(/[^a-z0-9]/g, '')
      const key = raw.includes('myinvestor')
        ? 'myinvestor'
        : raw.includes('indexa')
          ? 'indexa'
          : raw.includes('bbva')
            ? 'bbva'
            : raw.includes('traderepublic')
              ? 'traderepublic'
              : raw.includes('kutxabank')
                ? 'kutxabank'
                : raw.includes('scalable')
                  ? 'scalable'
                  : raw
      if (!byBroker[key]) byBroker[key] = { value: 0, count: 0 }
      byBroker[key].value += p.current_value || 0
      byBroker[key].count += 1
    }

    return Object.entries(byBroker)
      .map(([key, item]) => {
        const meta = ENTITY_META[key] || {
          label: key.toUpperCase(),
          color: '#64748b',
          dotClass: 'bg-slate-500',
          badgeClass: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
        }
        return {
          key,
          label: meta.label,
          color: meta.color,
          dotClass: meta.dotClass,
          badgeClass: meta.badgeClass,
          value: item.value,
          count: item.count,
          pct: (item.value / total) * 100,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [positions])

  if (segments.length <= 1 && selectedBroker === 'all') return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 dark:bg-[#1e1e1e]/85 border border-slate-200/75 dark:border-white/[0.07] shadow-2xs">
      {/* Interactive Segmented SVG/CSS Progress Bar */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 mr-1.5 hidden md:inline">
          Entidades
        </span>
        <div className="flex items-center gap-1 w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-white/[0.05] p-[1px]">
          {segments.map((seg) => {
            const isSelected = selectedBroker === seg.key
            const isDimmed = selectedBroker !== 'all' && !isSelected
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => onSelectBroker(isSelected ? 'all' : seg.key)}
                title={`${seg.label}: ${fmt.currency(seg.value)} (${seg.pct.toFixed(1)}%) • Clic para ${isSelected ? 'volver a Consolidado' : `filtrar por ${seg.label}`}`}
                style={{
                  width: `${Math.max(seg.pct, 4)}%`,
                  backgroundColor: seg.color,
                }}
                className={cn(
                  'h-full rounded-full transition-all duration-200 cursor-pointer hover:brightness-110',
                  isDimmed ? 'opacity-30' : 'opacity-95'
                )}
              />
            )
          })}
        </div>
      </div>

      {/* Interactive Quick-Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        {segments.map((seg) => {
          const isSelected = selectedBroker === seg.key
          return (
            <motion.button
              key={seg.key}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectBroker(isSelected ? 'all' : seg.key)}
              title={`Clic para ${isSelected ? 'mostrar todas las entidades' : `filtrar dashboard por ${seg.label}`}`}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer',
                isSelected
                  ? seg.badgeClass + ' font-bold shadow-2xs'
                  : 'border-transparent hover:border-slate-200 dark:hover:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', seg.dotClass)} />
              <span className="truncate max-w-[90px]">{seg.label}</span>
              <span data-private className="font-mono font-bold text-[10.5px] opacity-85">
                {seg.pct.toFixed(0)}%
              </span>
            </motion.button>
          )
        })}
        {selectedBroker !== 'all' && (
          <button
            type="button"
            onClick={() => onSelectBroker('all')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/15 transition-colors cursor-pointer"
            title="Restablecer filtro y ver Cartera Consolidada"
          >
            <span>Ver Todo</span>
          </button>
        )}
      </div>
    </div>
  )
})

