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
  const { theme, setTheme, mobileSidebarOpen, setMobileSidebarOpen, currentUser, logout } = useAppStore()
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
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[230px] flex-col border-r border-slate-200/90 bg-white dark:border-white/[0.06] dark:bg-[#0f1420] transition-transform duration-300 ease-in-out shadow-lg md:shadow-none',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo & Mobile Close Button */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/25">
              <TrendingUp size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-bold tracking-tight text-slate-950 dark:bg-gradient-to-r dark:from-white dark:to-slate-300 dark:bg-clip-text dark:text-transparent">
                Mi Portfolio
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                Dashboard
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] md:hidden transition-colors"
            aria-label="Cerrar menú lateral"
          >
            <X size={18} />
          </button>
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
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14.8px] font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/5 dark:bg-blue-500/15 dark:text-blue-400 dark:shadow-none relative'
                      : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-1/2 h-5 w-[3.5px] -translate-y-1/2 rounded-r-full bg-blue-600 dark:bg-blue-500"
                      />
                    )}
                    <Icon size={17} strokeWidth={isActive ? 2.3 : 1.8} />
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
            <div className="p-2 rounded-xl bg-slate-100/90 dark:bg-[#141928] border border-slate-200/90 dark:border-white/[0.06] flex items-center justify-between gap-2 shadow-2xs">
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
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#141928] border border-slate-200/90 dark:border-white/[0.06]">
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

          {/* Sync Status */}
          <p className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-slate-400 px-1 font-medium">
            <span className="flex items-center gap-1">
              <RefreshCw size={12} className="text-slate-600 dark:text-slate-400" />
              <span>Sincronizado</span>
            </span>
            <span>{syncTime ?? 'En vivo'}</span>
          </p>
        </div>
      </aside>
    </>
  )
}
