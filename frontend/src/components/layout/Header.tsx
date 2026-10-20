import React from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn, fmt, getConsensusNavDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { HeaderActions } from '@/components/layout/HeaderActions'
import { useHeaderContext } from '@/context/HeaderContext'
import { usePositions, useAnalytics } from '@/api/queries'

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y' },
  { label: '2A', value: '2y' },
  { label: 'Max', value: '5y' },
] as const

export const BROKERS = [
  { label: 'Consolidado', value: 'all' },
  { label: 'MyInvestor', value: 'myinvestor' },
  { label: 'BBVA', value: 'bbva' },
  { label: 'Indexa', value: 'indexa' },
]

export const DEMO_BROKERS = [
  { label: 'Consolidado', value: 'all' },
  { label: 'Kutxabank', value: 'kutxabank' },
  { label: 'Scalable', value: 'scalable' },
  { label: 'Trade Rep.', value: 'traderepublic' },
]

export const BROKER_CONFIG: Record<string, { dot: string; activeBg: string }> = {
  all: {
    dot: '',
    activeBg: 'bg-slate-800 dark:bg-slate-700',
  },
  myinvestor: {
    dot: 'bg-blue-500',
    activeBg: 'bg-blue-600',
  },
  bbva: {
    dot: 'bg-emerald-500',
    activeBg: 'bg-emerald-600',
  },
  indexa: {
    dot: 'bg-amber-500',
    activeBg: 'bg-amber-600 dark:bg-amber-500',
  },
  kutxabank: {
    dot: 'bg-rose-500',
    activeBg: 'bg-rose-600',
  },
  scalable: {
    dot: 'bg-cyan-500',
    activeBg: 'bg-cyan-600',
  },
  traderepublic: {
    dot: 'bg-violet-500',
    activeBg: 'bg-violet-600',
  },
}

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
  showPeriodSelector = true,
  showBrokerSelector = true,
  children,
}: HeaderProps) {
  const { period, setPeriod, selectedBroker, setSelectedBroker, useMock, openNavAlertHistory, currentUser } = useAppStore()
  const brokers = useMock ? DEMO_BROKERS : BROKERS
  const { data: positions = [] } = usePositions()
  const { data: analytics } = useAnalytics()

  const consensusNavDate = React.useMemo(() => {
    return getConsensusNavDate(positions, analytics?.latest_nav_date)
  }, [positions, analytics?.latest_nav_date])

  const total = analytics?.total_positions_count ?? positions.length
  const updated = analytics?.updated_positions_count ?? (
    consensusNavDate
      ? positions.filter((p) => {
          const d = (p.price_date || p.last_updated)?.slice(0, 10)
          return d && d >= consensusNavDate
        }).length
      : positions.length
  )

  const navFresh = updated != null && total != null && total > 0 ? updated >= total : true

  const navDate = React.useMemo(() => {
    return consensusNavDate ? fmt.dateShort(consensusNavDate) : null
  }, [consensusNavDate])

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

  const { portalNode, setPortalNode, hasExtra } = useHeaderContext()

  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-1">
      {/* Title & Subtitle */}
      <div>
        <div className="h-9 flex items-center gap-2.5 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white leading-none">
            <motion.span
              key={title}
              initial={{ opacity: 0.35 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {title}
            </motion.span>
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
              DEMO DATA
            </span>
          )}
        </div>

        {subtitle && (
          <motion.p
            key={subtitle}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-1"
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Right side controls: EXACT fixed position across all pages */}
      <div className="w-full md:w-auto h-9 flex items-center justify-end gap-2.5 shrink-0 ml-auto flex-wrap">
        {/* Extra page actions (e.g. Transactions actions) appear to the left of the fixed controls */}
        <div ref={setPortalNode} className="flex items-center gap-2 shrink-0 empty:hidden" />
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}

        {/* NAVs status badge (Aurora design) */}
        {total > 0 && (
          <button
            onClick={openNavAlertHistory}
            type="button"
            title={
              navFresh
                ? 'Todos los NAVs están al día. Haz clic para ver el historial de actualizaciones.'
                : `${updated}/${total} NAVs actualizados. Haz clic para ver el historial.`
            }
            className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#252526] text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-none cursor-pointer"
          >
            <span className={cn('live-dot', !navFresh ? 'warn' : 'emerald')} />
            <span>{navFresh ? 'NAVs al día' : `NAVs ${updated}/${total}`}</span>
            {navDate && <span className="font-mono text-slate-400 dark:text-slate-500">· {navDate}</span>}
          </button>
        )}

        {/* Broker / Entity Selector Pill */}
        {/* Global Broker Switcher with Matching Entity Color Dots */}
        {showBrokerSelector && (
          <div className="w-full sm:w-auto h-9 flex items-center rounded-xl border border-slate-200/90 bg-white p-1 shadow-none dark:border-white/10 dark:bg-[#252526]">
            {brokers.map((b) => {
              const cfg = BROKER_CONFIG[b.value] || {
                dot: '',
                activeBg: 'bg-slate-800 dark:bg-slate-700',
              }
              const isSelected = selectedBroker === b.value

              return (
                <motion.button
                  key={b.value}
                  onClick={() => setSelectedBroker(b.value)}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    'relative flex-1 sm:flex-initial text-center rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-1 text-xs font-semibold transition-colors duration-150',
                    isSelected
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="headerBrokerPill"
                      className={cn('absolute inset-0 rounded-lg shadow-sm', cfg.activeBg)}
                      transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    {cfg.dot && (
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0 transition-all',
                          cfg.dot,
                          isSelected ? 'ring-1.5 ring-white/90 shadow-2xs scale-105' : 'opacity-90'
                        )}
                      />
                    )}
                    <span>{b.label}</span>
                  </span>
                </motion.button>
              )
            })}
          </div>
        )}

        {/* User profile, privacy mode, theme, period selector (1A), and refresh controls */}
        <div className="hidden md:flex items-center shrink-0">
          <HeaderActions showPeriod={showPeriodSelector} />
        </div>
      </div>
    </div>
  )
}
