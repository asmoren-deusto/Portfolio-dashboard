import React from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { HeaderActions } from '@/components/layout/HeaderActions'

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y' },
  { label: '2A', value: '2y' },
  { label: 'Max', value: '5y' },
] as const

const BROKERS = [
  { label: 'Consolidado', value: 'all' },
  { label: 'MyInvestor', value: 'myinvestor' },
  { label: 'BBVA', value: 'bbva' },
  { label: 'Indexa', value: 'indexa' },
]

const DEMO_BROKERS = [
  { label: 'Consolidado', value: 'all' },
  { label: 'Kutxabank', value: 'kutxabank' },
  { label: 'Scalable', value: 'scalable' },
  { label: 'Trade Rep.', value: 'traderepublic' },
]

interface HeaderProps {
  title: string
  subtitle?: string
  badge?: string
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'violet'
  showPeriodSelector?: boolean
  showBrokerSelector?: boolean
  children?: React.ReactNode
}

export function Header({
  title,
  subtitle,
  badge,
  badgeColor = 'blue',
  showPeriodSelector = false,
  showBrokerSelector = true,
  children,
}: HeaderProps) {
  const { period, setPeriod, selectedBroker, setSelectedBroker, useMock } = useAppStore()
  const brokers = useMock ? DEMO_BROKERS : BROKERS

  // Reset the filter when it doesn't exist for the active profile (e.g. after switching user)
  React.useEffect(() => {
    if (!brokers.some((b) => b.value === selectedBroker)) setSelectedBroker('all')
  }, [brokers, selectedBroker, setSelectedBroker])

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            {title}
          </h1>

          {badge && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full border shadow-sm',
                badgeColorStyles
              )}
            >
              <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
              {badge}
            </span>
          )}

          {useMock && !badge && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-px rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
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
      <div className="w-full md:w-auto flex items-center gap-3 flex-wrap">
        {children}

        {/* Broker / Entity Selector Pill */}
        {showBrokerSelector && (
          <div className="w-full md:w-auto flex items-center rounded-xl border border-slate-200/90 bg-white p-1 shadow-none dark:border-white/[0.08] dark:bg-[#111625]/90">
            {brokers.map((b) => (
              <button
                key={b.value}
                onClick={() => setSelectedBroker(b.value)}
                className={cn(
                  'relative flex-1 md:flex-initial text-center rounded-lg px-2 sm:px-2.5 py-1.5 md:py-1 text-xs font-semibold transition-colors duration-150',
                  selectedBroker === b.value
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                {selectedBroker === b.value && (
                  <motion.div
                    layoutId="headerBrokerPill"
                    className={cn(
                      'absolute inset-0 rounded-lg',
                      b.value === 'bbva'
                        ? 'bg-blue-600'
                        : b.value === 'myinvestor'
                        ? 'bg-emerald-600'
                        : b.value === 'indexa'
                        ? 'bg-orange-600 dark:bg-orange-500'
                        : b.value === 'kutxabank'
                        ? 'bg-rose-600'
                        : b.value === 'scalable'
                        ? 'bg-cyan-600'
                        : b.value === 'traderepublic'
                        ? 'bg-slate-700 dark:bg-slate-600'
                        : 'bg-slate-800 dark:bg-slate-700'
                    )}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">{b.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Period selector if requested (desktop only; on mobile it is in the sticky top navbar) */}
        {showPeriodSelector && (
          <div className="hidden md:block relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200/90 bg-white shadow-none text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-blue-500/50 dark:border-white/[0.08] dark:bg-[#111625]/90 dark:text-slate-300"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* User profile, privacy mode, theme, and refresh controls (on desktop; on mobile they are in the top sticky navbar) */}
        <div className="hidden md:flex items-center">
          <HeaderActions />
        </div>
      </div>
    </div>
  )
}
