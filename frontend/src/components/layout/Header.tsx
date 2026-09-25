import React, { useState } from 'react'
import { RefreshCw, Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y' },
  { label: '2A', value: '2y' },
  { label: 'Max', value: '5y' },
] as const

interface HeaderProps {
  title: string
  subtitle?: string
  badge?: string
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'violet'
  showPeriodSelector?: boolean
  children?: React.ReactNode
}

export function Header({
  title,
  subtitle,
  badge,
  badgeColor = 'blue',
  showPeriodSelector = false,
  children,
}: HeaderProps) {
  const { period, setPeriod, useMock, theme, toggleTheme } = useAppStore()
  const queryClient = useQueryClient()
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = async () => {
    setSpinning(true)
    await queryClient.invalidateQueries()
    setTimeout(() => setSpinning(false), 800)
  }

  const badgeColorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 dark:shadow-blue-500/10',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:shadow-emerald-500/10',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:shadow-amber-500/10',
    violet: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20 dark:shadow-violet-500/10',
  }[badgeColor]

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
          >
            {title}
          </motion.h1>

          {badge && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm',
                badgeColorStyles
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {badge}
            </span>
          )}

          {useMock && !badge && (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
              Demo Data
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {children}

        {/* Period selector if requested */}
        {showPeriodSelector && (
          <div className="flex items-center rounded-xl border border-slate-200/90 bg-white p-1 shadow-sm dark:border-white/[0.08] dark:bg-[#111625]/90">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'relative rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors duration-150',
                  period === p.value
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                {period === p.value && (
                  <motion.div
                    layoutId="headerPeriodPill"
                    className="absolute inset-0 rounded-lg bg-blue-600 shadow-sm shadow-blue-600/30"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{p.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Theme Toggle Button in Header */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition-all active:scale-95 dark:border-white/10 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-300"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-sm text-xs font-semibold transition-all active:scale-95 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-white/10 dark:hover:border-white/20"
        >
          <motion.div animate={{ rotate: spinning ? 360 : 0 }} transition={{ duration: 0.6 }}>
            <RefreshCw className={cn('w-3.5 h-3.5', spinning && 'text-blue-500')} />
          </motion.div>
          <span>Actualizar</span>
        </button>
      </div>
    </div>
  )
}
