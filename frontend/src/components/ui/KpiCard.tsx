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
  loading?: boolean
  tag?: string
  tagColor?: 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'slate'
  valueColor?: string
  iconBg?: string
  borderAccent?: 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo'
}

const TAG_STYLES = {
  emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300',
  rose: 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300',
  blue: 'bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-300',
  indigo: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-700 dark:text-indigo-300',
  slate: 'bg-slate-100 dark:bg-white/[0.05] border-slate-200/90 dark:border-white/[0.08] text-slate-700 dark:text-slate-300',
}

const ACCENT_BORDERS = {
  emerald: 'hover:border-emerald-500/40 dark:hover:border-emerald-500/40',
  amber: 'hover:border-amber-500/40 dark:hover:border-amber-500/40',
  rose: 'hover:border-rose-500/40 dark:hover:border-rose-500/40',
  blue: 'hover:border-blue-500/40 dark:hover:border-blue-500/40',
  indigo: 'hover:border-indigo-500/40 dark:hover:border-indigo-500/40',
}

const ACCENT_GLOWS = {
  emerald: 'via-emerald-500/35',
  amber: 'via-amber-500/35',
  rose: 'via-rose-500/35',
  blue: 'via-blue-500/35',
  indigo: 'via-indigo-500/35',
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
  loading = false,
  tag,
  tagColor = 'slate',
  valueColor,
  iconBg,
  borderAccent,
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
        borderAccent && ACCENT_BORDERS[borderAccent],
        hero &&
          'bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 border-blue-200 shadow-blue-500/5 dark:bg-gradient-to-br dark:from-[#111625]/95 dark:via-[#161d36]/90 dark:to-[#12182b]/95 dark:border-blue-500/30 dark:shadow-blue-500/10 dark:shadow-2xl',
        className
      )}
    >
      {/* Top subtle light reflection line or active loading shimmer integrated seamlessly without layout shift */}
      {loading ? (
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 animate-pulse z-10" />
      ) : (
        <div
          className={cn(
            'pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/15 to-transparent dark:via-white/10',
            borderAccent && `via-${borderAccent}-500/30 dark:${ACCENT_GLOWS[borderAccent]}`
          )}
        />
      )}

      {/* Hero ambient glow */}
      {hero && (
        <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl dark:bg-blue-500/15" />
      )}

      {/* Label, Tag, and Icon Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
            {label}
          </p>
          {loading && (
            <span className="relative flex h-2 w-2 shrink-0" title="Actualizando...">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {tag && (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors',
                TAG_STYLES[tagColor]
              )}
            >
              {tag}
            </span>
          )}
          {icon && (
            <div
              className={cn(
                'flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg border transition-all',
                iconBg ||
                  'bg-slate-100 border-slate-200/90 text-slate-700 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-200 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-slate-300 dark:group-hover:text-blue-400 dark:group-hover:bg-blue-500/10 dark:group-hover:border-blue-500/20'
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </div>

      {hero ? (
        /* Hero Mode: Value, Badge and Subtitle arranged horizontally */
        <div className={cn("flex items-baseline justify-between gap-3 min-w-0 transition-opacity duration-300", loading ? "opacity-65" : "opacity-100")}>
          <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap min-w-0">
            <div
              data-private
              className={cn(
                "text-2xl sm:text-[26px] font-bold font-mono tracking-tight leading-tight shrink-0",
                valueColor || "text-slate-950 dark:text-white"
              )}
            >
              {value}
            </div>

            {change && (
              <span data-private
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
            <span data-private className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono shrink-0">
              {sub}
            </span>
          )}
        </div>
      ) : (
        /* Regular KPI Card: Value and Subtitle placed side-by-side to minimize height */
        <div className={cn("flex items-baseline gap-2 min-w-0 transition-opacity duration-300", loading ? "opacity-65" : "opacity-100")}>
          <div
            data-private
            className={cn(
              "text-lg sm:text-[21px] font-bold font-mono tracking-tight leading-tight shrink-0",
              valueColor || "text-slate-950 dark:text-white"
            )}
          >
            {value}
          </div>

          {change && (
            <span data-private
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
            <span data-private
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
