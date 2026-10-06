import { cn, ASSET_TYPE_LABELS } from '@/lib/utils'

const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
  fund:   { label: 'Fondo',   bg: 'bg-blue-500/10 dark:bg-blue-500/15',     text: 'text-blue-700 dark:text-blue-300',     border: 'border-blue-500/20' },
  epsv:   { label: 'EPSV',    bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/20' },
  etf:    { label: 'ETF',     bg: 'bg-amber-500/10 dark:bg-amber-500/15',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-500/20' },
  stock:  { label: 'Acción',  bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/20' },
  bond:   { label: 'Bono',    bg: 'bg-zinc-500/10 dark:bg-zinc-500/15',     text: 'text-zinc-700 dark:text-zinc-300',     border: 'border-zinc-500/20' },
  crypto: { label: 'Cripto',  bg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-500/20' },
}

const brokerConfigs: Record<string, { label: string; bg: string; text: string; border: string }> = {
  myinvestor: {
    label: 'Myinves',
    bg: 'bg-teal-500/10 dark:bg-teal-500/15',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500/20',
  },
  indexa: {
    label: 'Indexa',
    bg: 'bg-orange-500/10 dark:bg-orange-500/15',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-500/20',
  },
  bbva: {
    label: 'BBVA',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/20',
  },
  kutxabank: {
    label: 'Kutxabank',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/20',
  },
  traderepublic: {
    label: 'Trade Rep.',
    bg: 'bg-slate-500/10 dark:bg-slate-400/15',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/20',
  },
  scalable: {
    label: 'Scalable',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-500/20',
  },
}

interface BadgeProps {
  type: string
  className?: string
}

export function AssetBadge({ type, className }: BadgeProps) {
  const cfg = configs[type] ?? configs.fund
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide leading-none shadow-2xs',
      cfg.bg, cfg.text, cfg.border, className
    )}>
      {cfg.label}
    </span>
  )
}

interface BrokerBadgeProps {
  broker?: string | null
  className?: string
}

export function BrokerBadge({ broker, className }: BrokerBadgeProps) {
  const raw = (broker || '').trim()
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '')
  const cfg = brokerConfigs[key] || {
    label: raw || 'MyInvestor',
    bg: 'bg-teal-500/10 dark:bg-teal-500/15',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500/20',
  }

  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide leading-none shadow-2xs',
      cfg.bg, cfg.text, cfg.border, className
    )}>
      {cfg.label}
    </span>
  )
}

interface PnlBadgeProps {
  value: number | null | undefined
  suffix?: string
  className?: string
}

export function PnlBadge({ value, suffix = '', className }: PnlBadgeProps) {
  if (value == null) return <span className="text-slate-500">—</span>
  const pos = value >= 0
  return (
    <span data-private className={cn(
      'font-mono font-bold text-[13px] tabular-nums',
      pos ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
      className
    )}>
      {pos ? '+' : ''}{value.toFixed(2)}{suffix}
    </span>
  )
}
