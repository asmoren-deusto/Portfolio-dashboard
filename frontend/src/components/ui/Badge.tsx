import { cn, ASSET_TYPE_LABELS } from '@/lib/utils'

const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
  fund:   { label: 'Fondo',   bg: 'bg-blue-500/10 dark:bg-blue-500/15',   text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/20' },
  etf:    { label: 'ETF',     bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/20' },
  stock:  { label: 'Acción',  bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/20' },
  bond:   { label: 'Bono',    bg: 'bg-purple-500/10 dark:bg-purple-500/15', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/20' },
  crypto: { label: 'Cripto',  bg: 'bg-rose-500/10 dark:bg-rose-500/15',   text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-500/20' },
}

interface BadgeProps {
  type: string
  className?: string
}

export function AssetBadge({ type, className }: BadgeProps) {
  const cfg = configs[type] ?? configs.fund
  return (
    <span className={cn(
      'inline-block rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider',
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
    <span className={cn(
      'font-semibold text-xs tabular-nums',
      pos ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
      className
    )}>
      {pos ? '+' : ''}{value.toFixed(2)}{suffix}
    </span>
  )
}
