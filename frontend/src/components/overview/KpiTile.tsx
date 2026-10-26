import React from 'react'
import { cn } from '@/lib/utils'

export interface KpiTileProps {
  label: string
  value: React.ReactNode
  context?: string
  subvalue?: string
  icon?: React.ReactNode
  accentColor?: 'emerald' | 'indigo' | 'blue' | 'amber' | 'rose' | 'purple'
  className?: string
  valueClassName?: string
  onClick?: () => void
}

const ACCENT_GLOWS = {
  emerald: 'from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-400',
  indigo: 'from-indigo-500/20 via-indigo-500/5 to-transparent border-indigo-500/20 text-indigo-400',
  blue: 'from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/20 text-blue-400',
  amber: 'from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/20 text-amber-400',
  rose: 'from-rose-500/20 via-rose-500/5 to-transparent border-rose-500/20 text-rose-400',
  purple: 'from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/20 text-purple-400',
}

const TOP_LINE_GLOWS = {
  emerald: 'via-emerald-500/40',
  indigo: 'via-indigo-500/40',
  blue: 'via-blue-500/40',
  amber: 'via-amber-500/40',
  rose: 'via-rose-500/40',
  purple: 'via-purple-500/40',
}

export function KpiTile({
  label,
  value,
  context,
  subvalue,
  icon,
  accentColor = 'indigo',
  className,
  valueClassName,
  onClick,
}: KpiTileProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3.5 sm:p-4 transition-all duration-300',
        'bg-slate-900/60 dark:bg-white/[0.03] border-slate-800/80 dark:border-white/[0.07]',
        'hover:border-slate-700 dark:hover:border-white/[0.15] hover:shadow-lg hover:-translate-y-0.5',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className
      )}
    >
      {/* Top subtle line glow */}
      <div
        className={cn(
          'pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent transition-opacity duration-300 group-hover:opacity-100',
          TOP_LINE_GLOWS[accentColor] || 'via-indigo-500/40'
        )}
      />

      {/* Line 1: Label in small uppercase / versalitas + icon */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
          {label}
        </span>
        {icon && (
          <span className={cn('p-1 rounded-md bg-white/[0.04]', ACCENT_GLOWS[accentColor]?.split(' ').pop())}>
            {icon}
          </span>
        )}
      </div>

      {/* Line 2: Giant primary figure */}
      <div
        data-private
        className={cn(
          'text-lg sm:text-[22px] font-bold font-mono tracking-tight text-white dark:text-white leading-tight',
          valueClassName
        )}
      >
        {value}
      </div>

      {/* Line 3: Human context / subtitle */}
      <div className="mt-1.5 flex items-baseline justify-between gap-1 min-w-0">
        {context && (
          <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-400 font-medium truncate" title={context}>
            {context}
          </span>
        )}
        {subvalue && (
          <span data-private className="text-[11px] font-mono font-semibold text-slate-300 dark:text-slate-200 shrink-0">
            {subvalue}
          </span>
        )}
      </div>
    </div>
  )
}
