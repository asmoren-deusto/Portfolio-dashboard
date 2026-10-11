import { cn, ASSET_TYPE_LABELS } from '@/lib/utils'

const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
  fund:   { label: 'Fondo',   bg: 'bg-blue-500/10 dark:bg-blue-500/15',     text: 'text-blue-700 dark:text-blue-300',     border: 'border-blue-500/20' },
  epsv:   { label: 'EPSV',    bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/20' },
  etf:    { label: 'ETF',     bg: 'bg-amber-500/10 dark:bg-amber-500/15',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-500/20' },
  stock:  { label: 'Acción',  bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/20' },
  bond:   { label: 'Bono',    bg: 'bg-zinc-500/10 dark:bg-zinc-500/15',     text: 'text-zinc-700 dark:text-zinc-300',     border: 'border-zinc-500/20' },
  crypto: { label: 'Cripto',  bg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-500/20' },
}

const brokerConfigs: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  myinvestor: {
    label: 'MyInvestor',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/20',
    dot: 'bg-blue-500',
  },
  indexa: {
    label: 'Indexa',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  },
  bbva: {
    label: 'BBVA',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  kutxabank: {
    label: 'Kutxabank',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500',
  },
  traderepublic: {
    label: 'Trade Rep.',
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-500/20',
    dot: 'bg-violet-500',
  },
  scalable: {
    label: 'Scalable',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-500',
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
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/20',
    dot: 'bg-blue-500',
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide leading-none shadow-2xs',
      cfg.bg, cfg.text, cfg.border, className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      <span>{cfg.label}</span>
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
