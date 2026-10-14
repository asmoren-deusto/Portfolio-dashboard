import React from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'gain' | 'loss' | 'accent' | 'warn' | 'warning' | 'neutral'

interface AuroraBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  icon?: React.ReactNode
  children: React.ReactNode
  size?: 'sm' | 'md'
  pill?: boolean
}

export function AuroraBadge({
  variant = 'neutral',
  icon,
  children,
  size = 'md',
  pill = true,
  className,
  ...props
}: AuroraBadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    gain: 'au-chip-gain',
    loss: 'au-chip-loss',
    accent: 'au-chip-accent',
    warn: 'au-chip-warn',
    warning: 'au-chip-warn',
    neutral: 'bg-[var(--au-chip)] text-[var(--au-text-2)] border border-[var(--au-border)]',
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold',
    md: 'text-[11px] sm:text-xs px-2.5 py-1 gap-1.5 font-bold',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center shrink-0 leading-none select-none transition-colors font-mono',
        pill ? 'rounded-full' : 'rounded-lg',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
