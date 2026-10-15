import { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  Globe2,
  Layers3,
  LineChart,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  RefreshCw,
  LogOut,
  Search,
  Command,
  CornerDownLeft,
} from 'lucide-react'
import { useAppStore, type Period } from '@/store/appStore'
import { useRefreshPortfolio } from '@/hooks/useRefreshPortfolio'
import { useAnalytics, usePositions } from '@/api/queries'
import { BROKERS, DEMO_BROKERS } from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import { Segmented, ease, Monogram } from '~/ui'

export const NAV = [
  { to: '/', label: 'Visión general', short: 'Inicio', icon: LayoutDashboard },
  { to: '/market', label: 'Mercado', short: 'Mercado', icon: Globe2 },
  { to: '/positions', label: 'Posiciones', short: 'Cartera', icon: Layers3 },
  { to: '/analytics', label: 'Analítica', short: 'Análisis', icon: LineChart },
  { to: '/transactions', label: 'Operaciones', short: 'Movim.', icon: ArrowLeftRight },
]

const PERIODS: { label: string; value: Period }[] = [
  { label: '1M', value: '1mo' as Period },
  { label: '3M', value: '3mo' as Period },
  { label: '6M', value: '6mo' as Period },
  { label: '1A', value: '1y' as Period },
  { label: '2A', value: '2y' as Period },
  { label: 'Máx', value: '5y' as Period },
]

export function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden>
      <div className="aurora-blob a" />
      <div className="aurora-blob b" />
      <div className="aurora-blob c" />
      <div className="aurora-grid" />
      <div className="aurora-grain" />
    </div>
  )
}

function isActive(path: string, to: string) {
  return to === '/' ? path === '/' : path.startsWith(to)
}

export function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { theme, toggleTheme, privacyMode, togglePrivacyMode, period, setPeriod, selectedBroker, setSelectedBroker, currentUser, logout } =
    useAppStore()
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

  const brokers = currentUser.isDemo ? DEMO_BROKERS : BROKERS
  const hour = new Date().getHours()
  const first = currentUser.name?.split(' ')[0] ?? 'Inversor'
  const greeting = `${hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches'}, ${first}`

  const updated = analytics?.updated_positions_count
  const total = analytics?.total_positions_count
  const navFresh = updated != null && total != null && total > 0 ? updated >= total : true
  const navDate = analytics?.latest_nav_date
    ? new Date(analytics.latest_nav_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    : null

  return (
    <div className={cn('relative min-h-dvh', privacyMode && 'privacy')}>
      <AuroraBackground />

      {/* ── Rail (desktop) ─────────────────────────────────────── */}
      <aside className="hidden md:flex fixed z-40 left-4 top-4 bottom-4 w-[72px] flex-col items-center justify-between py-5 glass !rounded-[26px]">
        <button onClick={() => navigate('/')} className="relative w-11 h-11 rounded-2xl grid place-items-center group" aria-label="Inicio">
          <span className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_180deg,#2dd4bf,#a78bfa,#38bdf8,#2dd4bf)] opacity-90 animate-[spin_8s_linear_infinite] blur-[1px]" />
          <span className="absolute inset-[2px] rounded-[14px] bg-[var(--surface-solid)]" />
          <span className="relative w-4 h-4 rounded-md bg-gradient-to-br from-teal-300 to-violet-400 group-hover:scale-110 transition-transform" />
        </button>

        <nav className="flex flex-col gap-2">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = isActive(location.pathname, to)
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'relative w-12 h-12 grid place-items-center rounded-2xl transition-colors group',
                  active ? 'text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="rail-active"
                    className="absolute inset-0 rounded-2xl bg-[color-mix(in_oklab,var(--gain)_14%,transparent)] border border-[color-mix(in_oklab,var(--gain)_30%,transparent)] shadow-[0_0_24px_-4px_var(--gain)]"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.55 }}
                  />
                )}
                {active && (
                  <motion.span layoutId="rail-tick" className="absolute -left-[14px] w-[3px] h-6 rounded-full bg-[var(--gain)] shadow-[0_0_12px_var(--gain)]" />
                )}
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} className="relative transition-transform group-hover:scale-110" />
                <span className="pointer-events-none absolute left-[60px] px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-[var(--surface-solid)] border border-[var(--line-strong)] shadow-xl opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  {label}
                </span>
              </NavLink>
            )
          })}
        </nav>

        <div className="flex flex-col items-center gap-2">
          <RailButton onClick={togglePrivacyMode} label={privacyMode ? 'Mostrar cifras' : 'Ocultar cifras'}>
            {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
          </RailButton>
          <RailButton onClick={toggleTheme} label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </motion.span>
            </AnimatePresence>
          </RailButton>
          <button onClick={logout} title="Cerrar sesión" className="mt-1 rounded-xl ring-2 ring-transparent hover:ring-[var(--loss)] transition group relative">
            <Monogram name={currentUser.name} size={38} />
            <span className="absolute inset-0 rounded-xl grid place-items-center bg-black/60 opacity-0 group-hover:opacity-100 transition">
              <LogOut size={14} className="text-white" />
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────── */}
      <div className="relative z-10 md:pl-[104px]">
        <header className="sticky top-0 z-30 px-4 md:px-6 pt-4 pb-3 backdrop-blur-xl bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] [mask-image:linear-gradient(#000_80%,transparent)]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="mr-auto min-w-0">
              <div className="text-[11px] text-[var(--muted)] font-medium capitalize">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div className="display text-lg md:text-xl font-semibold truncate">{greeting}</div>
            </div>

            <div className="hidden lg:block">
              <Segmented id="broker" size="sm" options={brokers.map((b) => ({ label: b.label, value: b.value }))} value={selectedBroker} onChange={setSelectedBroker} />
            </div>
            <div className="hidden sm:block">
              <Segmented id="period" size="sm" options={PERIODS} value={period} onChange={setPeriod} />
            </div>

            <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[11.5px] text-[var(--text-2)]">
              <span className={cn('live-dot', !navFresh && 'warn')} />
              {navFresh ? 'NAVs al día' : `NAVs ${updated}/${total}`}
              {navDate && <span className="num text-[var(--muted)]">· {navDate}</span>}
            </div>

            <button onClick={() => setPaletteOpen(true)} className="btn !py-2 hidden md:inline-flex text-[var(--muted)]">
              <Search size={14} /> Buscar
              <kbd className="num text-[10px] px-1.5 py-0.5 rounded-md border border-[var(--line-strong)] flex items-center gap-0.5">
                <Command size={10} />K
              </kbd>
            </button>
            <button onClick={handleRefresh} className="btn !p-2.5" title="Actualizar precios" aria-label="Actualizar precios">
              <RefreshCw size={15} className={cn(isRefreshingPrices && 'animate-spin text-[var(--gain)]')} />
            </button>
            <button onClick={toggleTheme} className="btn !p-2.5 md:hidden" aria-label="Tema">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* mobile filters */}
          <div className="lg:hidden mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            <Segmented id="broker-m" size="sm" options={brokers.map((b) => ({ label: b.label, value: b.value }))} value={selectedBroker} onChange={setSelectedBroker} />
            <div className="sm:hidden">
              <Segmented id="period-m" size="sm" options={PERIODS} value={period} onChange={setPeriod} />
            </div>
          </div>
        </header>

        <main className="px-4 md:px-6 pb-32 md:pb-12 pt-2 max-w-[1600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
              transition={{ duration: 0.4, ease }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile tab bar ─────────────────────────────────────── */}
      <nav className="md:hidden fixed z-40 left-3 right-3 glass !rounded-[24px] px-2 py-2 flex justify-between" style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        {NAV.map(({ to, short, icon: Icon }) => {
          const active = isActive(location.pathname, to)
          return (
            <NavLink key={to} to={to} className="relative flex-1 flex flex-col items-center gap-1 py-1.5">
              {active && (
                <motion.span layoutId="tab-active" className="absolute inset-0 rounded-2xl bg-[color-mix(in_oklab,var(--gain)_14%,transparent)]" transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }} />
              )}
              <Icon size={19} className={cn('relative', active ? 'text-[var(--gain)]' : 'text-[var(--muted)]')} />
              <span className={cn('relative text-[10px] font-semibold', active ? 'text-[var(--text)]' : 'text-[var(--muted)]')}>{short}</span>
            </NavLink>
          )
        })}
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

function RailButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="w-10 h-10 grid place-items-center rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition">
      {children}
    </button>
  )
}

/* ── ⌘K command palette ───────────────────────────────────── */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { data: positions = [] } = usePositions()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  const items = useMemo(() => {
    const s = q.toLowerCase().trim()
    const pages = NAV.map((n) => ({ kind: 'Página', label: n.label, sub: n.to, go: () => navigate(n.to) }))
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
        <motion.div className="fixed inset-0 z-[100] grid place-items-start justify-center pt-[14vh] px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.25, ease }}
            className="relative w-full max-w-xl glass !bg-[var(--surface-solid)] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b border-[var(--line)]">
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
                className="flex-1 bg-transparent py-4 outline-none text-[15px]"
              />
              <kbd className="text-[10px] text-[var(--muted)] border border-[var(--line-strong)] rounded px-1.5 py-0.5">ESC</kbd>
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
                    className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition', i === idx && 'bg-[var(--surface-2)]')}
                  >
                    <span className="chip chip-muted !text-[10px]">{it.kind}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium truncate">{it.label}</span>
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
