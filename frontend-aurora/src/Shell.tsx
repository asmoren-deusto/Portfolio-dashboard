import { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  Layers3,
  LineChart,
  ArrowLeftRight,
  Globe2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  RefreshCw,
  LogOut,
  Search,
  Command,
  CornerDownLeft,
  ChevronDown,
  Check,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useRefreshPortfolio } from '@/hooks/useRefreshPortfolio'
import { useAnalytics, usePositions, useMarketIndices } from '@/api/queries'
import { BROKERS, DEMO_BROKERS } from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import { ease } from '~/ui'

export const NAV_ITEMS = [
  { to: '/', label: 'Resumen Global', icon: LayoutDashboard },
  { to: '/positions', label: 'Carteras & Fondos', icon: Layers3 },
  { to: '/analytics', label: 'Análisis & Rentabilidad', icon: LineChart },
  { to: '/transactions', label: 'Operaciones', icon: ArrowLeftRight },
  { to: '/market', label: 'Mercados', icon: Globe2 },
]

export function LiveMarketBar() {
  const { data: marketData } = useMarketIndices()
  const indices = marketData?.indices || []

  // Default institutional ticker benchmarks if live backend is loading
  const fallbackIndices = [
    { name: 'MSCI World', symbol: 'MSCI World', price: 3412.8, change_pct: 0.82 },
    { name: 'S&P 500', symbol: 'S&P 500', price: 5892.14, change_pct: 1.15 },
    { name: 'Nasdaq 100', symbol: 'NDX', price: 20485.3, change_pct: 1.42 },
    { name: 'Euro Stoxx 50', symbol: 'SX5E', price: 4980.1, change_pct: 0.45 },
    { name: 'Vanguard All-World', symbol: 'VWCE', price: 118.45, change_pct: 0.78, currency: '€' },
    { name: 'Vanguard Global Bond', symbol: 'VAGF', price: 149.52, change_pct: -0.12, currency: '€' },
    { name: 'EUR/USD', symbol: 'EURUSD', price: 1.0842, change_pct: -0.18 },
    { name: 'Oro (Gold)', symbol: 'XAU', price: 2735.4, change_pct: 0.65, currency: '$' },
    { name: 'BTC/EUR', symbol: 'BTCEUR', price: 62450.0, change_pct: 2.1, currency: '€' },
  ]

  const items = indices.length > 0 ? indices : fallbackIndices

  return (
    <div className="w-full bg-[#0B1C30] text-white border-b border-slate-800/60 overflow-hidden shadow-inner select-none">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center py-2 gap-4">
        <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-slate-700/80">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
            Mercados en Vivo
          </span>
        </div>
        <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap text-code-sm py-0.5 no-scrollbar">
          {items.map((item, idx) => {
            const it = item as any
            const chg = it.change_pct ?? it.change_p ?? 0
            const isPos = chg >= 0
            const curr = it.currency || (it.name?.includes('EUR') || it.name?.includes('Vanguard') ? '€' : '')
            const label = it.name || it.ticker || it.symbol || `Índice ${idx + 1}`
            return (
              <div key={it.ticker || it.symbol || idx} className="flex items-center gap-1.5 shrink-0 text-[12px]">
                <span className="text-slate-400 font-medium">{label}:</span>
                <span className="font-bold text-white num">
                  {typeof it.price === 'number'
                    ? it.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : it.price}
                  {curr ? ` ${curr}` : ''}
                </span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded font-semibold text-[10.5px] num',
                    isPos
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  )}
                >
                  {isPos ? '+' : ''}
                  {chg.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [brokerDropdownOpen, setBrokerDropdownOpen] = useState(false)

  const {
    theme,
    toggleTheme,
    privacyMode,
    togglePrivacyMode,
    selectedBroker,
    setSelectedBroker,
    currentUser,
    logout,
  } = useAppStore()

  const { handleRefresh, isRefreshingPrices } = useRefreshPortfolio()
  const { data: analytics } = useAnalytics()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!currentUser) return <Navigate to="/login" replace />

  const isDemo = currentUser.isDemo
  const brokers = isDemo ? DEMO_BROKERS : BROKERS
  const currentBrokerObj = brokers.find((b) => b.value === selectedBroker) || brokers[0]

  const updated = analytics?.updated_positions_count
  const total = analytics?.total_positions_count
  const navFresh = updated != null && total != null && total > 0 ? updated >= total : true

  const nowTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const userInitials = isDemo ? 'DM' : (currentUser.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AM')

  return (
    <div className={cn('min-h-screen bg-[var(--canvas-bg)] text-[var(--text)] flex flex-col', privacyMode && 'privacy')}>
      {/* ── Fixed Institutional Header (Stitch Specification) ── */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[var(--surface-card)]/95 backdrop-blur-md shadow-[0_1px_8px_rgba(15,23,42,0.04)] border-b border-[var(--border-subtle)]">
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-3">
          {/* Logo & Identity Pills */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity focus:outline-none"
              aria-label="PortfolioPro Home"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <span className="font-headline-sm text-on-surface font-extrabold tracking-tight hidden sm:inline">
                PortfolioPro
              </span>
            </button>

            {isDemo ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200/60 dark:border-blue-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="font-label-sm uppercase tracking-wider text-[10.5px]">Modo Demo</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span className="font-label-sm uppercase tracking-wider text-[10.5px]">Cuenta Principal</span>
              </div>
            )}

            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--yield-emerald-bg)] rounded-lg text-[var(--yield-emerald-text)]">
                <span className={cn('live-dot', !navFresh && 'warn')} />
                <span className="font-label-sm text-[11px] font-semibold">
                  {navFresh ? 'En vivo · Sincronizado' : `NAVs ${updated}/${total}`}
                </span>
                <span className="font-label-sm text-[10.5px] text-[var(--muted)] font-normal">
                  (Hoy, {nowTime})
                </span>
              </div>
            </div>
          </div>

          {/* Central Institutional Nav Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-label-md text-[12.5px] transition-all',
                    active
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-[var(--muted)] hover:bg-[var(--surface-container-low)] hover:text-[var(--text)]'
                  )}
                >
                  {label}
                </NavLink>
              )
            })}
          </nav>

          {/* Right Controls: Portfolio Selector, Currency, Actions, User Avatar */}
          <div className="flex items-center gap-2">
            {/* Broker / Portfolio Selector */}
            <div className="relative">
              <button
                onClick={() => setBrokerDropdownOpen((o) => !o)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--surface-container-low)] border border-[var(--border-subtle)] hover:border-[var(--line-strong)] text-[12px] transition-colors"
              >
                <span className="text-[var(--muted)] font-medium">Cartera:</span>
                <span className="font-semibold text-[var(--text)] truncate max-w-[120px]">
                  {currentBrokerObj.label}
                </span>
                <ChevronDown size={14} className="text-[var(--muted)]" />
              </button>

              <AnimatePresence>
                {brokerDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setBrokerDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1.5 w-52 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-1.5 z-40"
                    >
                      <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        Seleccionar Cartera
                      </div>
                      {brokers.map((b) => (
                        <button
                          key={b.value}
                          onClick={() => {
                            setSelectedBroker(b.value)
                            setBrokerDropdownOpen(false)
                          }}
                          className={cn(
                            'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[12.5px] transition-colors',
                            b.value === selectedBroker
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                              : 'hover:bg-[var(--surface-container-low)] text-[var(--text)]'
                          )}
                        >
                          <span>{b.label}</span>
                          {b.value === selectedBroker && <Check size={14} />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Currency Chip */}
            <div className="hidden sm:flex items-center px-2 py-1 rounded-lg bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-[12px] font-bold text-[var(--text)] num">
              EUR (€)
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 border-l border-[var(--border-subtle)] pl-2">
              <button
                onClick={togglePrivacyMode}
                title={privacyMode ? 'Mostrar cifras' : 'Ocultar cifras'}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-container-low)] transition"
              >
                {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>

              <button
                onClick={toggleTheme}
                title="Alternar tema"
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-container-low)] transition"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                onClick={handleRefresh}
                title="Actualizar datos y precios"
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-container-low)] transition"
              >
                <RefreshCw size={16} className={cn(isRefreshingPrices && 'animate-spin text-blue-600')} />
              </button>

              <button
                onClick={() => setPaletteOpen(true)}
                title="Buscar (Ctrl+K)"
                className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-container-low)] transition text-[12px]"
              >
                <Search size={14} />
                <kbd className="text-[10px] bg-[var(--surface-container-low)] border border-[var(--border-subtle)] px-1 rounded font-mono">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* User Profile Avatar & Menu */}
            <div className="relative pl-1">
              <button
                onClick={() => setUserDropdownOpen((o) => !o)}
                className="flex items-center gap-2 px-1.5 py-1 rounded-full bg-[var(--surface-container-low)] border border-[var(--border-subtle)] hover:border-blue-400 transition cursor-pointer"
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-[11px] shadow-sm',
                    isDemo ? 'bg-blue-600' : 'bg-emerald-600'
                  )}
                >
                  {userInitials}
                </div>
                <div className="hidden sm:flex flex-col text-left pr-1 leading-tight">
                  <span className="font-label-md text-[12px] text-[var(--text)] font-semibold truncate max-w-[100px]">
                    {currentUser.name}
                  </span>
                  <span className="font-label-sm text-[9.5px] text-[var(--muted)] uppercase tracking-wider">
                    {isDemo ? 'Modo Demo' : 'Acceso Total'}
                  </span>
                </div>
                <ChevronDown size={14} className="text-[var(--muted)] hidden sm:block" />
              </button>

              <AnimatePresence>
                {userDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setUserDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-2 z-40"
                    >
                      <div className="p-2 border-b border-[var(--border-subtle)] mb-1">
                        <div className="font-bold text-[13px] text-[var(--text)]">{currentUser.name}</div>
                        <div className="text-[11px] text-[var(--muted)]">{currentUser.email || (isDemo ? 'demo@portfoliopro.es' : 'asier@portfoliopro.es')}</div>
                      </div>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false)
                          navigate('/login')
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[12.5px] hover:bg-[var(--surface-container-low)] transition text-[var(--text)]"
                      >
                        <Layers3 size={15} className="text-blue-600" />
                        <span>Espacio de Inversión (Cambiar)</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false)
                          logout()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-[12.5px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition mt-1"
                      >
                        <LogOut size={15} />
                        <span>Cerrar Sesión</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="w-full pt-16 flex-1 flex flex-col">
        {/* Live Market Ticker Strip */}
        <LiveMarketBar />

        {/* Page Content View */}
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Mobile Tab Bar (Bottom) ── */}
      <nav
        className="lg:hidden fixed z-40 left-3 right-3 bg-[var(--surface-card)]/95 backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl px-2 py-1.5 flex justify-between shadow-xl"
        style={{ bottom: 'calc(8px + env(safe-area-inset-bottom))' }}
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'relative flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition-colors',
                active ? 'text-blue-600 font-bold' : 'text-[var(--muted)]'
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] leading-none">{label.split(' ')[0]}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* ── Quick Command Palette (Ctrl+K) ── */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { data: positions = [] } = usePositions()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  const items = useMemo(() => {
    const s = q.toLowerCase().trim()
    const pages = NAV_ITEMS.map((n) => ({ kind: 'Página', label: n.label, sub: n.to, go: () => navigate(n.to) }))
    const pos = positions.map((p) => ({
      kind: 'Posición',
      label: p.name,
      sub: p.isin,
      go: () => navigate(`/positions?q=${encodeURIComponent(p.isin)}`),
    }))
    return [...pages, ...pos].filter((i) => !s || i.label.toLowerCase().includes(s) || i.sub.toLowerCase().includes(s)).slice(0, 9)
  }, [q, positions, navigate])

  useEffect(() => {
    if (open) {
      setQ('')
      setIdx(0)
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-start justify-center pt-[14vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.25, ease }}
            className="relative w-full max-w-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b border-[var(--border-subtle)]">
              <Search size={16} className="text-[var(--muted)]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setIdx(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onClose()
                  if (e.key === 'ArrowDown') setIdx((i) => Math.min(i + 1, items.length - 1))
                  if (e.key === 'ArrowUp') setIdx((i) => Math.max(i - 1, 0))
                  if (e.key === 'Enter' && items[idx]) {
                    items[idx].go()
                    onClose()
                  }
                }}
                placeholder="Buscar páginas, fondos o ISIN…"
                className="flex-1 bg-transparent py-4 outline-none text-[15px] text-[var(--text)]"
              />
              <kbd className="text-[10px] text-[var(--muted)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {items.map((it, i) => (
                <li key={it.kind + it.sub}>
                  <button
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => {
                      it.go()
                      onClose()
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition',
                      i === idx && 'bg-[var(--surface-container-low)]'
                    )}
                  >
                    <span className="chip chip-muted !text-[10px]">{it.kind}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium truncate text-[var(--text)]">{it.label}</span>
                      <span className="block text-[11px] text-[var(--muted)] num">{it.sub}</span>
                    </span>
                    {i === idx && <CornerDownLeft size={14} className="text-[var(--muted)]" />}
                  </button>
                </li>
              ))}
              {items.length === 0 && <li className="p-6 text-center text-[13px] text-[var(--muted)]">Sin resultados</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
