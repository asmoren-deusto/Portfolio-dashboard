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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 min-h-[38px]">
      {/* Left side: Page Title & Status Badges */}
      <div className="flex items-center gap-3 flex-wrap min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white leading-none">
          <motion.span
            key={title}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {title}
          </motion.span>
        </h1>

        {/* Account Status Badge: CUENTA PRINCIPAL / MODO DEMO */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-2xs shrink-0',
            useMock || currentUser?.isDemo
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>{useMock || currentUser?.isDemo ? 'MODO DEMO' : 'CUENTA PRINCIPAL'}</span>
        </span>

        {/* NAVs status badge */}
        {total > 0 && (
          <button
            onClick={openNavAlertHistory}
            type="button"
            title={
              navFresh
                ? 'Todos los NAVs están al día. Haz clic para ver el historial de actualizaciones.'
                : `${updated}/${total} NAVs actualizados. Haz clic para ver el historial.`
            }
            className="hidden lg:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer shrink-0"
          >
            <span className={cn('live-dot', !navFresh ? 'warn' : 'emerald')} />
            <span>NAVs {updated}/{total}</span>
            {consensusNavDate && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({fmt.dateShort(consensusNavDate)})</span>}
          </button>
        )}

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
      </div>

      {/* Right side controls: Cartera Dropdown, EUR Pill, Actions & User */}
      <div className="w-full md:w-auto flex items-center justify-end gap-2 shrink-0 ml-auto flex-wrap">
        {/* Extra page actions (e.g. Transactions actions) */}
        <div ref={setPortalNode} className="flex items-center gap-2 shrink-0 empty:hidden" />
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}

        {/* Cartera Selector Dropdown Pill (Matching Reference) */}
        {showBrokerSelector && (
          <div className="relative shrink-0">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center z-10 gap-1.5">
              {BROKER_CONFIG[selectedBroker]?.dot && (
                <span className={cn('w-1.5 h-1.5 rounded-full', BROKER_CONFIG[selectedBroker]?.dot)} />
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cartera:</span>
            </div>
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="appearance-none h-9 pl-[70px] pr-8 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] hover:bg-slate-100/90 dark:hover:bg-white/[0.08] text-xs font-bold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:border-blue-500/50 transition-all shadow-none"
              title="Filtrar por cartera o entidad"
            >
              {brokers.map((b) => (
                <option key={b.value} value={b.value} className="bg-white dark:bg-[#1f2937] text-slate-900 dark:text-white">
                  {b.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Currency Pill */}
        <div className="hidden sm:flex items-center px-2.5 h-9 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] text-xs font-bold text-slate-800 dark:text-slate-200 cursor-default select-none shrink-0" title="Moneda base">
          EUR (€)
        </div>

        {/* User profile, privacy mode, theme, period selector (1A), and refresh controls */}
        <div className="flex items-center shrink-0">
          <HeaderActions showPeriod={showPeriodSelector} />
        </div>
      </div>
    </div>
  )
}
