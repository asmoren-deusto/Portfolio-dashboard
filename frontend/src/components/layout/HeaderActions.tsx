import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Sun, Moon, Eye, EyeOff, ChevronDown, Check, LogOut, Bell } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { BROKERS, DEMO_BROKERS, BROKER_CONFIG } from '@/components/layout/Header'
import { useRefreshPortfolio } from '@/hooks/useRefreshPortfolio'

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y' },
  { label: '2A', value: '2y' },
  { label: 'Max', value: '5y' },
] as const

interface HeaderActionsProps {
  className?: string
  compact?: boolean
  showPeriod?: boolean
  showBroker?: boolean
  hideUser?: boolean
  hideRefresh?: boolean
}

export function HeaderActions({
  className,
  compact = false,
  showPeriod = false,
  showBroker = false,
  hideUser = false,
  hideRefresh = false,
}: HeaderActionsProps) {
  const {
    theme, toggleTheme, privacyMode, togglePrivacyMode, currentUser, users, login, logout, period, setPeriod,
    selectedBroker, setSelectedBroker, useMock,
    lastNavAlertHistory, openNavAlertHistory
  } = useAppStore()
  const brokers = useMock ? DEMO_BROKERS : BROKERS
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { handleRefresh, isRefreshingPrices, refreshSuccess } = useRefreshPortfolio()

  const btnSize = compact ? 'w-8 h-8 rounded-lg' : 'w-8.5 h-8.5 rounded-lg'

  return (
    <div className={cn('flex items-center gap-1 sm:gap-2', className)}>
      {/* Broker / Entity selector if enabled */}
      {showBroker && (
        <div className="relative shrink-0">
          <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 flex items-center z-10">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                BROKER_CONFIG[selectedBroker]?.dot || 'bg-slate-400'
              )}
            />
          </div>
          <select
            value={selectedBroker}
            onChange={(e) => setSelectedBroker(e.target.value)}
            className={cn(
              "appearance-none rounded-lg bg-slate-100/80 hover:bg-slate-200/70 border-0 font-semibold text-slate-700 cursor-pointer focus:outline-none dark:bg-white/[0.05] dark:hover:bg-white/[0.09] dark:text-slate-200 transition-all active:scale-95",
              compact ? "pl-4.5 pr-5 py-1 text-xs rounded-lg h-7.5 leading-none max-w-[92px] sm:max-w-[110px] truncate" : "h-8.5 pl-5 pr-7 text-xs flex items-center"
            )}
            title="Filtrar por entidad bancaria / broker"
          >
            {brokers.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none",
              compact ? "right-1.5 w-3 h-3" : "right-2.5 w-3 h-3"
            )}
          />
        </div>
      )}

      {/* Period selector if enabled */}
      {showPeriod && (
        <div className="relative shrink-0">
          <select
            data-small="true"
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            style={compact ? { fontSize: '10px' } : undefined}
            className={cn(
              "appearance-none rounded-lg bg-slate-100/80 hover:bg-slate-200/70 border-0 font-bold text-slate-700 cursor-pointer focus:outline-none dark:bg-white/[0.05] dark:hover:bg-white/[0.09] dark:text-slate-200 transition-all active:scale-95 no-forced-size",
              compact ? "pl-2 pr-3.5 py-0.5 text-[10px] rounded-lg h-7.5 leading-none w-[46px] sm:w-[50px]" : "h-8.5 pl-3 pr-7 text-xs flex items-center"
            )}
            title="Seleccionar horizonte temporal"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value} style={{ fontSize: '13px' }}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none", compact ? "right-1 w-2.5 h-2.5" : "right-2.5 w-3 h-3")} />
        </div>
      )}

      {/* User Account / Profile Dropdown Menu */}
      {!hideUser && currentUser && (
        <div className="relative z-30">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-slate-200/80 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20 bg-slate-100/70 hover:bg-slate-200/60 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs",
              compact ? "p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1" : "h-8.5 pl-1.5 pr-2.5"
            )}
            title="Perfil activo y cambio de usuario"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow-xs shrink-0 ring-1 ring-black/10 dark:ring-white/10"
              style={{
                background: currentUser.bgGradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                backgroundColor: '#059669',
              }}
            >
              {currentUser.avatar}
            </div>
            <div className="flex flex-col text-left leading-tight hidden sm:flex">
              <span className="font-bold text-[11px] text-slate-900 dark:text-white max-w-[110px] truncate">
                {currentUser.name}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                {currentUser.badge}
              </span>
            </div>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {userMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="fixed inset-0 z-[90]"
                  onClick={() => setUserMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/98 dark:bg-[#252526]/98 backdrop-blur-xl border border-slate-200/90 dark:border-white/[0.08] shadow-2xl z-[100] p-2 text-xs origin-top-right"
                >
                {/* Active user header */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04] mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ring-1 ring-black/10 dark:ring-white/10"
                      style={{
                        background: currentUser.bgGradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                        backgroundColor: '#059669',
                      }}
                    >
                      {currentUser.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.04] text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                    Estrategia: <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.strategy}</span>
                  </div>
                </div>

                {/* Switch Profile Section */}
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Cambiar de Inversor
                </div>

                <div className="space-y-0.5">
                  {users.map((u) => {
                    const isSelected = u.id === currentUser.id
                    return (
                      <button
                        key={u.id}
                        onClick={async () => {
                          if (isSelected) {
                            setUserMenuOpen(false)
                            return
                          }
                          setUserMenuOpen(false)
                          if (u.id === 'demo' || u.isDemo) {
                            login('demo')
                          } else {
                            // Try to restore session via stored token first
                            const success = await login(u.id)
                            if (!success) {
                              // No valid session — go to login with the profile preselected
                              logout()
                              navigate('/login', { state: { selectedUserId: u.id } })
                            }
                          }
                        }}
                        className={cn(
                          'w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors',
                          isSelected
                            ? 'bg-blue-50 text-blue-900 dark:bg-white/[0.08] dark:text-white font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[9px] text-white shrink-0"
                            style={{
                              background: u.bgGradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                              backgroundColor: '#059669',
                            }}
                          >
                            {u.avatar}
                          </div>
                          <span className="truncate">{u.name}</span>
                        </div>
                        {isSelected && <Check size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                {/* Logout Button */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      logout()
                      navigate('/login')
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-semibold transition-colors"
                  >
                    <LogOut size={13} />
                    <span>Cerrar sesión / Salir</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )}

      {/* Privacy Mode Toggle */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={togglePrivacyMode}
        aria-label={privacyMode ? 'Desactivar modo discreto' : 'Activar modo discreto'}
        aria-pressed={privacyMode}
        className={cn(
          'flex items-center justify-center rounded-lg transition-colors cursor-pointer',
          btnSize,
          privacyMode
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06]'
        )}
        title={privacyMode ? 'Desactivar modo discreto' : 'Activar modo discreto'}
      >
        {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </motion.button>

      {/* Quick Theme Toggle Button */}
      <motion.button
        whileTap={{ scale: 0.92, rotate: 12 }}
        onClick={toggleTheme}
        className={cn(
          'flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors cursor-pointer',
          btnSize
        )}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        )}
      </motion.button>

      {/* NAV Updates History / Bell */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={openNavAlertHistory}
        aria-label="Ver informe de actualizaciones de NAVs"
        className={cn(
          'relative flex items-center justify-center rounded-lg transition-colors cursor-pointer',
          btnSize,
          (lastNavAlertHistory?.updatedCount ?? 0) > 0
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06]'
        )}
        title={
          lastNavAlertHistory
            ? `Ver informe de NAVs (${lastNavAlertHistory.updatedCount} actualizados a las ${lastNavAlertHistory.timestamp})`
            : 'Ver informe de actualizaciones de NAVs'
        }
      >
        <Bell className="w-4 h-4" />
        {(lastNavAlertHistory?.updatedCount ?? 0) > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-xs">
            {lastNavAlertHistory?.updatedCount}
          </span>
        )}
      </motion.button>

      {/* Refresh button */}
      {!hideRefresh && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleRefresh}
          disabled={isRefreshingPrices}
          className={cn(
            'flex items-center justify-center rounded-lg transition-colors cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed',
            btnSize,
            refreshSuccess
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06]'
          )}
          title={isRefreshingPrices ? 'Buscando y actualizando NAVs oficiales en directo...' : 'Buscar y actualizar los NAVs oficiales en tiempo real desde las gestoras'}
        >
          {refreshSuccess ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <motion.div
              animate={{ rotate: isRefreshingPrices ? 360 : 0 }}
              transition={{ duration: 0.8, repeat: isRefreshingPrices ? Infinity : 0, ease: 'linear' }}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshingPrices ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400')} />
            </motion.div>
          )}
        </motion.button>
      )}
    </div>
  )
}
