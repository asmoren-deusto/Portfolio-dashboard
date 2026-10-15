import React, { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ───────────────────────── Motion presets ───────────────────────── */
export const ease = [0.16, 1, 0.3, 1] as const
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
export const rise = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease } },
}

/* ───────────────────────── Glass card ───────────────────────── */
interface GlassProps extends HTMLMotionProps<'div'> {
  lift?: boolean
}
export function Glass({ className, lift, children, onMouseMove, ...rest }: GlassProps) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <motion.div
      ref={ref}
      variants={rise}
      onMouseMove={(e) => {
        const el = ref.current
        if (el) {
          const r = el.getBoundingClientRect()
          el.style.setProperty('--mx', `${e.clientX - r.left}px`)
          el.style.setProperty('--my', `${e.clientY - r.top}px`)
        }
        onMouseMove?.(e)
      }}
      className={cn('glass', lift && 'glass-lift', className)}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function CardHeader({
  title,
  eyebrow,
  right,
  className,
}: {
  title: React.ReactNode
  eyebrow?: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text)] truncate">{title}</h3>
      </div>
      {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
    </div>
  )
}

/* ───────────────────────── Animated number ───────────────────────── */
const nf = (d: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })

export function AnimatedNumber({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  signed = false,
  className,
}: {
  value: number | null | undefined
  decimals?: number
  prefix?: string
  suffix?: string
  signed?: boolean
  className?: string
}) {
  const v = Number.isFinite(value) ? (value as number) : 0
  const spring = useSpring(v, { stiffness: 70, damping: 20, mass: 0.8 })
  const fmt = nf(decimals)
  const text = useTransform(spring, (x) => `${signed && x > 0 ? '+' : ''}${prefix}${fmt.format(x)}${suffix}`)
  useEffect(() => {
    spring.set(v)
  }, [v, spring])
  return <motion.span className={cn('num', className)}>{text}</motion.span>
}

export const eur = (v: number | null | undefined, d = 2) =>
  v == null || !Number.isFinite(v) ? '—' : `${nf(d).format(v)} €`
export const pct = (v: number | null | undefined, d = 2, signed = true) =>
  v == null || !Number.isFinite(v) ? '—' : `${signed && v > 0 ? '+' : ''}${nf(d).format(v)}%`
export const signedEur = (v: number | null | undefined, d = 2) =>
  v == null || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${nf(d).format(v)} €`
export const tone = (v: number | null | undefined) => ((v ?? 0) >= 0 ? 'gain' : 'loss')

/* ───────────────────────── Delta chip ───────────────────────── */
export function Delta({ value, kind = 'pct', className }: { value: number | null | undefined; kind?: 'pct' | 'eur'; className?: string }) {
  const t = tone(value)
  return (
    <span className={cn('chip', `chip-${t}`, className)}>
      <svg width="8" height="8" viewBox="0 0 8 8" className={cn('transition-transform', t === 'loss' && 'rotate-180')}>
        <path d="M4 1 L7 6 H1 Z" fill="currentColor" />
      </svg>
      {kind === 'pct' ? pct(value) : signedEur(value)}
    </span>
  )
}

/* ───────────────────────── Segmented control ───────────────────────── */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
  size = 'md',
}: {
  options: { label: React.ReactNode; value: T }[]
  value: T
  onChange: (v: T) => void
  id: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className="seg relative isolate">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            data-active={active}
            onClick={() => onChange(o.value)}
            className={cn('seg-btn', size === 'sm' && '!px-2.5 !py-1 !text-[11px]')}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Sparkline ───────────────────────── */
export function Sparkline({
  data,
  color,
  height = 36,
  className,
}: {
  data: number[]
  color?: string
  height?: number
  className?: string
}) {
  const id = useRef(`sp${Math.random().toString(36).slice(2, 8)}`).current
  if (!data || data.length < 2) return <div style={{ height }} className={className} />
  const w = 120
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, height - 3 - ((d - min) / span) * (height - 6)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const c = color ?? (data[data.length - 1] >= data[0] ? 'var(--gain)' : 'var(--loss)')
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn('w-full overflow-visible', className)} style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.35" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <motion.path
        d={line}
        fill="none"
        stroke={c}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease }}
      />
    </svg>
  )
}

/* ───────────────────────── Misc ───────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function PageHeader({ eyebrow, title, subtitle, right }: { eyebrow: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <motion.div variants={rise} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <div className="eyebrow mb-2 flex items-center gap-2">
          <span className="h-px w-6 bg-gradient-to-r from-[var(--gain)] to-transparent" />
          {eyebrow}
        </div>
        <h1 className="display text-3xl md:text-[40px] leading-none font-bold">{title}</h1>
        {subtitle && <p className="text-[13px] text-[var(--muted)] mt-2 max-w-xl">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </motion.div>
  )
}

/** Short broker label + accent colour */
export const BROKER_STYLE: Record<string, { label: string; color: string }> = {
  myinvestor: { label: 'MyInvestor', color: '#2dd4bf' },
  bbva: { label: 'BBVA', color: '#38bdf8' },
  indexa: { label: 'Indexa', color: '#a78bfa' },
  kutxabank: { label: 'Kutxabank', color: '#f472b6' },
  scalable: { label: 'Scalable', color: '#fbbf24' },
  traderepublic: { label: 'Trade Rep.', color: '#e2e8f0' },
}
export function BrokerTag({ broker }: { broker?: string | null }) {
  if (!broker) return null
  const s = BROKER_STYLE[broker.toLowerCase()] ?? { label: broker, color: 'var(--muted)' }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-2)]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
      {s.label}
    </span>
  )
}

/** Initials avatar with a deterministic aurora gradient */
export function Monogram({ name, size = 36 }: { name: string; size?: number }) {
  const clean = name.replace(/(Index|Fund|EUR|Acc|Class|FI|Fondo|de|the)\b/gi, '').trim()
  const initials = clean.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·'
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return (
    <div
      className="shrink-0 grid place-items-center rounded-xl text-[11px] font-bold text-white/95 ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 60) % 360} 70% 35%))`,
      }}
    >
      {initials}
    </div>
  )
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export const PALETTE = ['#2dd4bf', '#a78bfa', '#38bdf8', '#fbbf24', '#f472b6', '#34d399', '#818cf8', '#fb923c', '#94a3b8']
