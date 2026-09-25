import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  change?: string
  changePositive?: boolean
  hero?: boolean
  delay?: number
  className?: string
  icon?: React.ReactNode
}

export function KpiCard({
  label,
  value,
  sub,
  change,
  changePositive,
  hero,
  className,
  icon,
}: KpiCardProps) {
  const changeClass =
    changePositive === undefined
      ? 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08]'
      : changePositive
      ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/25'
      : 'text-rose-700 bg-rose-500/10 border-rose-500/20 dark:text-rose-400 dark:bg-rose-500/15 dark:border-rose-500/25'

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5',
        'bg-white/95 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300 hover:shadow-md',
        'dark:bg-[#111625]/85 dark:border-white/[0.08] dark:shadow-lg dark:shadow-black/20 dark:hover:border-white/[0.16] dark:hover:shadow-xl',
        hero &&
          'bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 border-blue-200 shadow-blue-500/5 dark:bg-gradient-to-br dark:from-[#111625]/95 dark:via-[#161d36]/90 dark:to-[#12182b]/95 dark:border-blue-500/30 dark:shadow-blue-500/10 dark:shadow-2xl',
        className
      )}
    >
      {/* Top subtle light reflection line */}
      <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent dark:via-white/15" />

      {/* Hero ambient glow */}
      {hero && (
        <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl dark:bg-blue-500/15" />
      )}

      {/* Label and Icon Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate pr-2">
          {label}
        </p>
        {icon && (
          <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 border border-slate-200/90 text-slate-700 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-200 transition-all dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-slate-300 dark:group-hover:text-blue-400 dark:group-hover:bg-blue-500/10 dark:group-hover:border-blue-500/20">
            {icon}
          </div>
        )}
      </div>

      {hero ? (
        /* Hero Mode: Value, Badge and Subtitle arranged horizontally */
        <div className="flex items-baseline justify-between gap-3 min-w-0">
          <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap min-w-0">
            <div className="text-2xl sm:text-[26px] font-bold font-mono tracking-tight text-slate-950 dark:text-white leading-tight shrink-0">
              {value}
            </div>

            {change && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 sm:px-3 sm:py-1 font-mono text-xs sm:text-[13px] font-bold border shadow-xs transition-all shrink-0',
                  changeClass
                )}
              >
                {changePositive !== undefined && (
                  changePositive ? (
                    <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                  )
                )}
                <span>{change}</span>
              </span>
            )}
          </div>

          {sub && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono shrink-0">
              {sub}
            </span>
          )}
        </div>
      ) : (
        /* Regular KPI Card: Value and Subtitle placed side-by-side to minimize height */
        <div className="flex items-baseline gap-2 min-w-0">
          <div className="text-lg sm:text-[21px] font-bold font-mono tracking-tight text-slate-950 dark:text-white leading-tight shrink-0">
            {value}
          </div>

          {change && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold border shrink-0',
                changeClass
              )}
            >
              {changePositive !== undefined && (
                changePositive ? (
                  <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                )
              )}
              <span>{change}</span>
            </span>
          )}

          {sub && (
            <span
              className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex-1 min-w-0"
              title={sub}
            >
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
