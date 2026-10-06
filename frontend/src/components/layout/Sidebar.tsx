import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  List,
  Layers,
  Globe,
  RefreshCw,
  Sun,
  Moon,
  X,
  LogOut,
  PanelLeftClose,
  Pin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { useMarketIndices } from '@/api/queries'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Visión General' },
  { to: '/market', icon: Globe, label: 'Mercado' },
  { to: '/positions', icon: Layers, label: 'Posiciones' },
  { to: '/analytics', icon: TrendingUp, label: 'Analítica' },
  { to: '/transactions', icon: List, label: 'Operaciones' },
]

interface SidebarProps {}

export function Sidebar({}: SidebarProps) {
  const {
    theme,
    setTheme,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
    currentUser,
    logout,
  } = useAppStore()
  const { data: indicesData, dataUpdatedAt } = useMarketIndices()

  // Live timestamp: prefer server's cache_timestamp, fall back to React Query's dataUpdatedAt
  const syncTime = (() => {
    const ts = indicesData?.cache_timestamp
    if (ts) {
      return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
    if (dataUpdatedAt) {
      return new Date(dataUpdatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
    return null
  })()

  return (
    <>
      {/* Drawer Backdrop (on mobile or when sidebar is collapsed on desktop) */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs cursor-pointer"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[230px] flex-col border-r border-slate-200/90 bg-white dark:border-white/[0.08] dark:bg-[#181922] transition-transform duration-300 ease-in-out shadow-lg',
          sidebarCollapsed
            ? mobileSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
            : mobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0 md:shadow-none'
        )}
      >
        {/* Logo & Close / Collapse Button (v2.5 removed to eliminate collision with X and redundancy) */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] px-4 py-3.5">
          <div className="flex flex-1 min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-500/20">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[17px] tracking-tight text-slate-950 dark:text-white truncate">
              Portfolio<span className="text-blue-600 dark:text-blue-400">Pro</span>
            </span>
          </div>

          {/* Action buttons (Pin on desktop drawer / Collapse / Close) */}
          <div className="flex items-center gap-1 shrink-0">
            {sidebarCollapsed && (
              <button
                onClick={() => {
                  setSidebarCollapsed(false)
                  setMobileSidebarOpen(false)
                }}
                className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-500/10 transition-colors"
                title="Fijar panel lateral"
                aria-label="Fijar panel lateral"
              >
                <Pin size={16} />
              </button>
            )}
            <button
              onClick={() => {
                if (sidebarCollapsed || mobileSidebarOpen) {
                  setMobileSidebarOpen(false)
                } else {
                  setSidebarCollapsed(true)
                }
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors"
              title={sidebarCollapsed || mobileSidebarOpen ? "Cerrar menú lateral" : "Ocultar panel lateral"}
              aria-label="Cerrar o colapsar menú lateral"
            >
              {sidebarCollapsed || mobileSidebarOpen ? <X size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 + 0.05 }}
            >
              <NavLink
                to={to}
                end={to === '/'}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition-all duration-150',
                    isActive
                      ? 'bg-blue-50/90 text-blue-700 font-bold dark:bg-blue-500/[0.12] dark:text-blue-300 shadow-xs relative'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-600 dark:bg-blue-400"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <Icon size={16.5} strokeWidth={isActive ? 2.3 : 1.8} className={isActive ? 'text-blue-600 dark:text-blue-400' : ''} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* Footer with User Card & Permanent Theme Selector */}
        <div className="border-t border-slate-100 dark:border-white/[0.06] p-3 space-y-2.5">
          {/* Active User Card */}
          {currentUser && (
            <div className="p-2 rounded-xl bg-slate-100/90 dark:bg-[#13141b] border border-slate-200/90 dark:border-white/[0.08] flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-xs ring-1 ring-black/10 dark:ring-white/10"
                  style={{
                    background: currentUser.bgGradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    backgroundColor: '#059669',
                  }}
                >
                  {currentUser.avatar}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[9.5px] text-slate-600 dark:text-slate-400 font-medium truncate">
                    {currentUser.badge}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-white/[0.06] transition-colors shrink-0"
                title="Cerrar sesión / Salir"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}

          {/* Theme Segmented Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#13141b] border border-slate-200/90 dark:border-white/[0.08]">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                theme === 'light'
                  ? 'text-slate-950 font-bold'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              )}
            >
              {theme === 'light' && (
                <motion.div
                  layoutId="sidebarThemePill"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-blue-600"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
                />
              )}
              <Sun className={cn('w-3.5 h-3.5 relative z-10', theme === 'light' ? 'text-amber-500' : '')} />
              <span className="relative z-10">Claro</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                theme === 'dark'
                  ? 'text-white font-bold'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              )}
            >
              {theme === 'dark' && (
                <motion.div
                  layoutId="sidebarThemePill"
                  className="absolute inset-0 rounded-lg bg-blue-600 shadow-sm"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
                />
              )}
              <Moon className={cn('w-3.5 h-3.5 relative z-10', theme === 'dark' ? 'text-blue-300' : '')} />
              <span className="relative z-10">Oscuro</span>
            </button>
          </div>

          {/* Sync Status & Discreet App Version */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 px-1 pt-0.5">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              <RefreshCw size={11} className="text-slate-400 dark:text-slate-500" />
              <span>{syncTime ?? 'En vivo'}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500/80 tracking-wider">
              v2.6
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
