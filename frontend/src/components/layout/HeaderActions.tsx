import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Sun, Moon, Eye, EyeOff, ChevronDown, Check, LogOut } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { refreshPortfolioPrices } from '@/api/queries'

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
  hideUser?: boolean
}

export function HeaderActions({
  className,
  compact = false,
  showPeriod = false,
  hideUser = false,
}: HeaderActionsProps) {
  const { theme, toggleTheme, privacyMode, togglePrivacyMode, currentUser, users, login, logout, period, setPeriod } = useAppStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [spinning, setSpinning] = useState(false)
  const [refreshSuccess, setRefreshSuccess] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleRefresh = async () => {
    if (spinning) return
    setSpinning(true)
    setRefreshSuccess(false)
    try {
      const userId = currentUser?.id || 'asier'
      if (!currentUser?.isDemo) {
        await refreshPortfolioPrices(userId)
      }
      await queryClient.invalidateQueries()
      setRefreshSuccess(true)
      setTimeout(() => setRefreshSuccess(false), 3000)
    } catch (err) {
      console.warn('Error fetching live NAVs:', err)
      await queryClient.invalidateQueries()
    } finally {
      setSpinning(false)
    }
  }

  const btnSize = compact ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 rounded-xl'

  return (
    <div className={cn('flex items-center gap-1 sm:gap-2', className)}>
      {/* Period selector if enabled */}
      {showPeriod && (
        <div className="relative shrink-0">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className={cn(
              "appearance-none rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 shadow-none font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-blue-500/50 dark:border-white/10 dark:bg-[#181922]/90 dark:hover:bg-[#20222d] dark:text-slate-200 transition-all active:scale-95",
              compact ? "pl-2 pr-5 py-1 text-xs rounded-lg h-8 leading-none" : "h-9 pl-3 pr-7 text-xs flex items-center"
            )}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none", compact ? "right-1.5 w-3 h-3" : "right-2.5 w-3 h-3")} />
        </div>
      )}

      {/* User Account / Profile Dropdown Menu */}
      {!hideUser && currentUser && (
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 shadow-none text-xs font-semibold transition-all dark:bg-[#181922]/90 dark:hover:bg-[#20222d] dark:border-white/10 dark:text-slate-200 active:scale-95",
              compact ? "p-1 sm:pl-2 sm:pr-2.5 sm:py-1.5" : "h-9 pl-2 pr-2.5"
            )}
            title="Perfil activo y cambio de usuario"
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shadow-xs shrink-0 ring-1 ring-black/10 dark:ring-white/10"
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
              <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium">
                {currentUser.badge}
              </span>
            </div>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#181922] border border-slate-200/90 dark:border-white/[0.08] shadow-2xl z-50 p-2 text-xs">
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
                            ? 'bg-blue-50 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-700 dark:text-slate-300'
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
              </div>
            </>
          )}
        </div>
      )}

      {/* Privacy Mode Toggle */}
      <button
        onClick={togglePrivacyMode}
        aria-label={privacyMode ? 'Desactivar modo discreto' : 'Activar modo discreto'}
        aria-pressed={privacyMode}
        className={cn(
          'flex items-center justify-center border transition-all active:scale-95',
          btnSize,
          privacyMode
            ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
            : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-[#181922]/90 dark:hover:bg-[#20222d] dark:text-slate-300'
        )}
        title={privacyMode ? 'Desactivar modo discreto' : 'Activar modo discreto'}
      >
        {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* Quick Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={cn(
          'flex items-center justify-center border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 transition-all active:scale-95 dark:border-white/10 dark:bg-[#181922]/90 dark:hover:bg-[#20222d] dark:text-slate-300',
          btnSize
        )}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700" />
        )}
      </button>

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={spinning}
        className={cn(
          'flex items-center justify-center border border-slate-200/90 transition-all active:scale-95 dark:bg-[#181922]/90 dark:hover:bg-[#20222d] dark:text-slate-200 dark:border-white/10 dark:hover:border-white/20',
          btnSize,
          'bg-white hover:bg-slate-50 text-slate-700',
          spinning && 'opacity-80 cursor-wait bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800/30',
          refreshSuccess && 'border-emerald-300 text-emerald-600 bg-emerald-50/40 dark:border-emerald-500/30 dark:text-emerald-400 dark:bg-emerald-950/20'
        )}
        title="Buscar y actualizar los NAVs oficiales en tiempo real desde las gestoras"
      >
        {refreshSuccess ? (
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <motion.div
            animate={{ rotate: spinning ? 360 : 0 }}
            transition={{ duration: 0.8, repeat: spinning ? Infinity : 0, ease: 'linear' }}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', spinning ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400')} />
          </motion.div>
        )}
      </button>
    </div>
  )
}
