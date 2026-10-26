import React from 'react'
import { useAppStore } from '@/store/appStore'
import { cn, fmt, getConsensusNavDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { HeaderActions } from '@/components/layout/HeaderActions'
import { useHeaderContext } from '@/context/HeaderContext'
import { usePositions, useAnalytics, usePortfolioSummary } from '@/api/queries'

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
  { label: 'MyInves', value: 'myinvestor' },
  { label: 'BBVA', value: 'bbva' },
  { label: 'Indexa', value: 'indexa' },
  { label: 'Trade', value: 'traderepublic' },
]

export const DEMO_BROKERS = [
  { label: 'Consolidado', value: 'all' },
  { label: 'Kutxabank', value: 'kutxabank' },
  { label: 'Scalable', value: 'scalable' },
  { label: 'Trade', value: 'traderepublic' },
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
  const { data: summary } = usePortfolioSummary()

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

  const syncTimeStr = React.useMemo(() => {
    const raw = summary?.last_updated || positions.find((p) => p.last_updated)?.last_updated
    if (raw) {
      try {
        const d = new Date(raw)
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        }
      } catch {
        // fallback
      }
    }
    return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }, [summary?.last_updated, positions])

  const dateLabel = React.useMemo(() => {
    if (!consensusNavDate) return 'Hoy'
    const today = new Date().toISOString().slice(0, 10)
    return consensusNavDate >= today ? 'Hoy' : fmt.dateShort(consensusNavDate)
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
    <div className="flex items-center justify-between gap-3 w-full min-w-0 flex-nowrap">
      {/* Title, NAV Indicator, Font Switcher & Badges */}
      <div className="flex items-center gap-2.5 min-w-0 flex-nowrap shrink-0">
        <h1 className="text-lg sm:text-[20px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-none truncate">
          {title}
        </h1>

        {/* NAVs status badge immediately to the right of Visión General / Title */}
        {total > 0 && (
          <button
            onClick={openNavAlertHistory}
            type="button"
            title={
              navFresh
                ? 'Todos los NAVs están al día. Haz clic para ver el historial de actualizaciones.'
                : `${updated}/${total} NAVs actualizados. Haz clic para ver el historial.`
            }
            className={cn(
              "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border text-[11px] transition-all cursor-pointer shrink-0 shadow-2xs hover:opacity-95 active:scale-97",
              navFresh
                ? "bg-[#ecfdf5] border-emerald-300/70 dark:bg-emerald-950/40 dark:border-emerald-700/40"
                : "bg-amber-50/90 border-amber-300/70 dark:bg-amber-950/40 dark:border-amber-700/40"
            )}
          >
            {/* Vertical capsule dot */}
            <span
              className={cn(
                "w-1.5 h-2.5 rounded-full shrink-0",
                navFresh ? "bg-emerald-600 dark:bg-emerald-400" : "bg-amber-500 animate-pulse"
              )}
            />
            {/* Green label */}
            <span
              className={cn(
                "font-bold leading-none shrink-0",
                navFresh ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"
              )}
            >
              NAVs {updated}/{total}
            </span>
            {/* Muted date & time - only shown on large screens to preserve horizontal space */}
            <span className="hidden 2xl:inline text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
              ({dateLabel}, {syncTimeStr})
            </span>
          </button>
        )}

        {badge && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs shrink-0',
              badgeColorStyles
            )}
          >
            <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
            {badge}
          </span>
        )}

        {useMock && !badge && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 shrink-0">
            DEMO
          </span>
        )}
      </div>

      {/* Right side controls: EXACT fixed position across all pages */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 ml-auto flex-nowrap">
        {/* Extra page actions (e.g. Transactions actions) appear to the left of the fixed controls */}
        <div ref={setPortalNode} className="flex items-center gap-2 shrink-0 empty:hidden" />
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}

        {/* Broker / Entity Selector Pill: Segmented tabs on xl (>= 1280px), compact dropdown on < xl */}
        {showBrokerSelector && (
          <div className="hidden xl:flex items-center h-8.5 rounded-lg bg-slate-100/80 dark:bg-white/[0.05] p-0.5 shadow-none shrink-0">
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
                    'relative flex-initial text-center rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-150',
                    isSelected
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="headerBrokerPill"
                      className={cn('absolute inset-0 rounded-md shadow-2xs', cfg.activeBg)}
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
        <div className="flex items-center shrink-0">
          <HeaderActions
            showPeriod={showPeriodSelector}
            showBroker={showBrokerSelector}
            brokerClassName="xl:hidden"
          />
        </div>
      </div>
    </div>
  )
}
