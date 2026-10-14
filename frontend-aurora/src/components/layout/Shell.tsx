import React, { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Globe,
  Layers,
  TrendingUp,
  List,
  Eye,
  EyeOff,
  Sun,
  Moon,
  RefreshCw,
  LogOut,
  ChevronDown,
  User,
  ShieldCheck,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type Period, type Theme } from '@/store/appStore'
import { useRefreshPortfolio } from '@/hooks/useRefreshPortfolio'
import { usePortfolioSummary, usePositions } from '@/api/queries'
import { BROKERS, DEMO_BROKERS } from '@/components/layout/Header'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Visión General', icon: LayoutDashboard },
  { to: '/market', label: 'Mercado', icon: Globe },
  { to: '/positions', label: 'Posiciones', icon: Layers },
  { to: '/analytics', label: 'Analítica', icon: TrendingUp },
  { to: '/transactions', label: 'Operaciones', icon: List },
]

const PERIODS: { label: string; value: Period }[] = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y' },
  { label: '2A', value: '2y' },
  { label: 'Max', value: '5y' },
]

export function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const {
    theme,
    toggleTheme,
    privacyMode,
    togglePrivacyMode,
    period,
    setPeriod,
    selectedBroker,
    setSelectedBroker,
    currentUser,
    logout,
  } = useAppStore()

  const { handleRefresh, isRefreshingPrices } = useRefreshPortfolio()
  const { data: summary } = usePortfolioSummary()
  const { data: positions } = usePositions()

  const activeBrokers = currentUser?.isDemo ? DEMO_BROKERS : BROKERS

  const greeting = (() => {
    const hour = new Date().getHours()
    const name = currentUser?.name?.split(' ')[0] || 'Inversor'
    if (hour < 12) return `Buenos días, ${name}`
    if (hour < 20) return `Buenas tardes, ${name}`
    return `Buenas noches, ${name}`
  })()

  // Calculate NAV freshness
  const latestNavDate = positions?.reduce((max, p) => {
    const d = p.price_date || p.last_updated
    return d && d > max ? d : max
  }, '')

  return (
    <div
      className={cn(
        'relative min-h-screen text-[var(--au-text)] transition-colors duration-300',
        privacyMode && 'au-privacy'
      )}
    >
      {/* Background ambient lighting and fine grain */}
      <div className="au-aurora" aria-hidden="true" />
      <div className="au-grain" aria-hidden="true" />

      {/* ─────────────────────────────────────────────────────────────
          DESKTOP FLOATING ICON RAIL (72px)
          ───────────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex fixed top-4 left-4 bottom-4 w-[68px] z-40 flex-col items-center justify-between py-4 au-card rounded-2xl border-[var(--au-border)] shadow-2xl backdrop-blur-2xl">
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="group relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400/20 via-teal-500/10 to-violet-500/20 border border-teal-500/30 hover:border-teal-400/60 active:scale-95 transition-all shadow-lg"
            title="PortfolioPro Aurora"
          >
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-teal-400 to-violet-400 opacity-90 group-hover:scale-105 transition-transform" />
            <div className="absolute inset-0 rounded-xl bg-teal-400/10 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive: active }) =>
                  cn(
                    'relative flex items-center justify-center w-11 h-11 rounded-xl transition-all group',
                    active
                      ? 'text-teal-400 font-bold'
                      : 'text-[var(--au-muted)] hover:text-[var(--au-text)] hover:bg-[var(--au-chip)]'
                  )
                }
              >
                {isActive && (
                  <motion.div
                    layoutId="activeRailPill"
                    className="absolute inset-0 rounded-xl bg-teal-500/15 border border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
                  />
                )}
                <Icon size={20} className="relative z-10 transition-transform group-hover:scale-110" />

                {/* Floating tooltip */}
                <span className="absolute left-[78px] px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--au-card-solid)] text-[var(--au-text)] border border-[var(--au-border)] shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom utility controls */}
        <div className="flex flex-col items-center gap-2">
          {/* Privacy mode toggle */}
          <button
            onClick={togglePrivacyMode}
            className={cn(
              'au-icon-btn',
              privacyMode && 'text-amber-400 bg-amber-400/10 border-amber-400/30'
            )}
            title={privacyMode ? 'Desactivar modo privacidad' : 'Activar modo privacidad'}
          >
            {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="au-icon-btn"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* User Avatar Button & Menu */}
          <div className="relative mt-1">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all border border-white/20"
              title="Cuenta de inversor"
            >
              {currentUser?.avatar || 'AS'}
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-0 left-[76px] w-56 au-card p-2 rounded-xl shadow-2xl z-50 border-[var(--au-border-strong)] bg-[var(--au-card-solid)]"
                >
                  <div className="px-3 py-2 border-b border-[var(--au-border)] mb-1">
                    <p className="text-xs font-bold text-[var(--au-text)] truncate">
                      {currentUser?.name || 'Inversor'}
                    </p>
                    <p className="text-[11px] text-[var(--au-muted)] truncate">
                      {currentUser?.strategy || 'Cartera'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      logout()
                      navigate('/login')
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Cerrar sesión</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT CONTAINER
          ───────────────────────────────────────────────────────────── */}
      <div className="md:pl-[88px] flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl bg-[var(--au-bg)]/80 border-b border-[var(--au-border)]">
          {/* Left: Greeting + Live Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-[var(--au-text)] tracking-tight truncate">
                  {greeting}
                </h1>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--au-chip)] border border-[var(--au-border)]"
                  title={latestNavDate ? `Última sesión de NAVs: ${latestNavDate}` : 'Actualizaciones en vivo'}
                >
                  <span className={cn('au-live-dot', isRefreshingPrices && 'animate-spin')} />
                  <span className="text-[var(--au-muted)] hidden sm:inline">
                    {isRefreshingPrices
                      ? 'Actualizando...'
                      : latestNavDate
                      ? `NAVs ${latestNavDate}`
                      : 'En vivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Broker selector + Period Selector + Refresh */}
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Broker Segmented Control */}
            <div className="au-seg hidden sm:flex">
              {activeBrokers.map((b) => {
                const isSelected = selectedBroker === b.value
                return (
                  <button
                    key={b.value}
                    onClick={() => setSelectedBroker(b.value)}
                    aria-pressed={isSelected}
                    className="au-seg-btn"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="brokerPill"
                        className="au-seg-pill"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                      />
                    )}
                    <span className="relative z-10">{b.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Period Segmented Control */}
            <div className="au-seg">
              {PERIODS.map((p) => {
                const isSelected = period === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    aria-pressed={isSelected}
                    className="au-seg-btn px-2.5"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="periodPill"
                        className="au-seg-pill"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                      />
                    )}
                    <span className="relative z-10">{p.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Refresh Live Prices Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshingPrices}
              className={cn(
                'au-icon-btn shrink-0',
                isRefreshingPrices && 'text-teal-400 border-teal-500/40 bg-teal-500/10'
              )}
              title="Actualizar cotizaciones y NAVs en directo"
            >
              <RefreshCw
                size={15}
                className={cn(isRefreshingPrices && 'animate-spin')}
              />
            </button>
          </div>
        </header>

        {/* Page Main View */}
        <main className="flex-1 px-4 md:px-8 py-5 pb-24 md:pb-12 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE FLOATING TAB BAR
          ───────────────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-3 left-4 right-4 z-40 au-card py-2 px-3 rounded-2xl border-[var(--au-border-strong)] shadow-2xl flex items-center justify-around bg-[var(--au-card-solid)]/90 backdrop-blur-2xl">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition-all',
                isActive ? 'text-teal-400 font-bold' : 'text-[var(--au-muted)]'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute inset-0 rounded-xl bg-teal-500/15"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                />
              )}
              <Icon size={19} className="relative z-10" />
              <span className="relative z-10 text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
