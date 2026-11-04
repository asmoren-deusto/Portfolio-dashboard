import React, { useCallback } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoadingDot } from '@/components/ui/LoadingDot'

interface KpiCardProps {
  label: string
  value: React.ReactNode
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
  extra?: React.ReactNode
  svgDecoration?: React.ReactNode
  hideTagOnMobile?: boolean
  hideChangeOnMobile?: boolean
  hoverGlow?: boolean
  onClick?: () => void
  title?: string
}

const TAG_STYLES = {
  emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300',
  rose: 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300',
  blue: 'bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-300',
  indigo: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-700 dark:text-indigo-300',
  slate: 'bg-slate-100 dark:bg-white/[0.05] border-slate-200/90 dark:border-white/[0.12] text-slate-700 dark:text-slate-300',
}

const ACCENT_BORDERS = {
  emerald: 'hover:border-emerald-500/45 dark:hover:border-emerald-500/45',
  amber: 'hover:border-amber-500/45 dark:hover:border-amber-500/45',
  rose: 'hover:border-rose-500/45 dark:hover:border-rose-500/45',
  blue: 'hover:border-blue-500/45 dark:hover:border-blue-500/45',
  indigo: 'hover:border-indigo-500/45 dark:hover:border-indigo-500/45',
}

const ACCENT_GLOWS = {
  emerald: 'via-emerald-500/35',
  amber: 'via-amber-500/35',
  rose: 'via-rose-500/35',
  blue: 'via-blue-500/35',
  indigo: 'via-indigo-500/35',
}

const SPOTLIGHT_COLORS = {
  emerald: '16, 185, 129',
  amber: '245, 158, 11',
  rose: '244, 63, 94',
  blue: '59, 130, 246',
  indigo: '99, 102, 241',
}

function KpiCardComponent({
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
  extra,
  svgDecoration,
  hideTagOnMobile = false,
  hideChangeOnMobile = false,
  hoverGlow = false,
  onClick,
  title,
}: KpiCardProps) {
  const changeClass =
    changePositive === undefined
      ? 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.12]'
      : changePositive
      ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/25'
      : 'text-rose-700 bg-rose-500/10 border-rose-500/20 dark:text-rose-400 dark:bg-rose-500/15 dark:border-rose-500/25'
  const spotlightColor = borderAccent ? SPOTLIGHT_COLORS[borderAccent] : '59, 130, 246'

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }, [])

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
      className={cn(
        'group relative overflow-hidden rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 transition-[border-color,box-shadow,background-color] duration-200 ease-out',
        onClick ? 'cursor-pointer active:scale-[0.99]' : 'cursor-card',
        'bg-white/85 dark:bg-[#1e1e1e]/85 border border-slate-300/80 dark:border-white/[0.12] shadow-2xs hover:shadow-xs hover:border-slate-400/80 dark:hover:border-white/[0.20]',
        borderAccent && ACCENT_BORDERS[borderAccent],
        hero &&
          'bg-gradient-to-br from-blue-50/50 via-white/90 to-indigo-50/30 dark:bg-gradient-to-br dark:from-[#222226]/90 dark:via-[#1e1e1e]/85 dark:to-[#1a1a1d]/90 border-blue-200/75 dark:border-blue-500/20 shadow-2xs hover:shadow-xs',
        className
      )}
    >
      {/* Top subtle light reflection line */}
      <div
        className={cn(
          'pointer-events-none absolute -top-px inset-x-4 h-px bg-gradient-to-r from-transparent via-slate-900/[0.08] dark:via-white/[0.16] to-transparent z-10',
          borderAccent && `via-${borderAccent}-500/35 dark:${ACCENT_GLOWS[borderAccent]}`
        )}
      />
      {/* Dynamic cursor-tracking radial spotlight */}
      {hoverGlow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            backgroundImage: `radial-gradient(240px circle at var(--mouse-x, 25%) var(--mouse-y, 25%), rgba(${spotlightColor}, 0.085), transparent 70%), linear-gradient(90deg, rgba(${spotlightColor}, 0.02), transparent 80%)`,
          }}
        />
      )}
      <div className="relative z-10">
        {/* Hero ambient glow */}
        {hero && (
          <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl dark:bg-blue-500/15" />
        )}

        {/* Icon, Label, and Tag Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {icon && (
              <div
                className={cn(
                  'flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-105',
                  iconBg ||
                    'bg-slate-100 border-slate-200/90 text-slate-700 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-200 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-slate-300 dark:group-hover:text-white dark:group-hover:bg-white/[0.08] dark:group-hover:border-white/[0.12]'
                )}
              >
                {icon}
              </div>
            )}
            <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
              {label}
            </p>
            {loading && <LoadingDot />}
          </div>
          {tag && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                data-private={/\d/.test(tag) ? true : undefined}
                className={cn(
                  'items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors',
                  hideTagOnMobile ? 'hidden sm:inline-flex' : 'inline-flex',
                  TAG_STYLES[tagColor]
                )}
              >
                {tag}
              </span>
            </div>
          )}
        </div>

        {hero ? (
          /* Hero Mode: Value, Badge, Dynamic SVG Sparkline and Subtitle arranged horizontally */
          <div className={cn("flex items-center justify-between gap-3 min-w-0 transition-opacity duration-300", loading ? "opacity-65" : "opacity-100")}>
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
                <span
                  data-private
                  className={cn(
                    'items-center gap-1.5 rounded-xl px-2.5 py-0.5 sm:px-3 sm:py-1 font-mono text-xs sm:text-[13px] font-bold border transition-all shrink-0',
                    hideChangeOnMobile ? 'hidden sm:inline-flex' : 'inline-flex',
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

              {extra}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {svgDecoration}
              {sub && (
                <span data-private className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono shrink-0">
                  {sub}
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Regular KPI Card: Value, Subtitle and optional Dynamic SVG micro-indicator */
          <div className={cn("flex items-center justify-between gap-2 min-w-0 transition-opacity duration-300", loading ? "opacity-65" : "opacity-100")}>
            <div className="flex items-baseline gap-2 min-w-0 flex-1">
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
                <span
                  data-private
                  className={cn(
                    'items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold border shrink-0',
                    hideChangeOnMobile ? 'hidden sm:inline-flex' : 'inline-flex',
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
                  data-private
                  className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex-1 min-w-0"
                  title={sub}
                >
                  {sub}
                </span>
              )}
            </div>

            {svgDecoration && (
              <div className="shrink-0 flex items-center">
                {svgDecoration}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const KpiCard = React.memo(KpiCardComponent)
