import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, LogOut, ShieldCheck, Sun, Moon, Eye, EyeOff, Landmark, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { APP_VERSION } from '@/version'
import { cn } from '@/lib/utils'
import { BROKERS, DEMO_BROKERS, BROKER_CONFIG } from '@/components/layout/Header'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const {
    currentUser,
    users,
    login,
    logout,
    theme,
    toggleTheme,
    privacyMode,
    togglePrivacyMode,
    selectedBroker,
    setSelectedBroker,
    useMock,
  } = useAppStore()
  const navigate = useNavigate()
  const brokers = useMock ? DEMO_BROKERS : BROKERS

  if (!currentUser) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-2xl',
              'bg-white dark:bg-[#202020] text-slate-900 dark:text-slate-100',
              'border-t sm:border border-slate-200/80 dark:border-white/10',
              'shadow-2xl overflow-hidden p-5',
              'pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]'
            )}
          >
            {/* Header with Title and Close button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  Cuenta de Inversor
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Active User Card */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0 ring-2 ring-black/10 dark:ring-white/10"
                  style={{
                    background: currentUser.bgGradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    backgroundColor: '#059669',
                  }}
                >
                  {currentUser.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {currentUser.badge}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Estrategia:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {currentUser.strategy}
                </span>
              </div>
            </div>

            {/* Quick action preferences (Modo discreto & Tema) */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={togglePrivacyMode}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all active:scale-95',
                  privacyMode
                    ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-white/20 dark:bg-white/[0.08] dark:text-white'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-[#282828] dark:text-slate-200'
                )}
              >
                {privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{privacyMode ? 'Discreto ON' : 'Discreto OFF'}</span>
              </button>

              <button
                onClick={toggleTheme}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-[#282828] dark:text-slate-200 text-xs font-semibold transition-all active:scale-95"
              >
                {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-700" />}
                <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
              </button>
            </div>

            {/* Entity / Broker Selector */}
            <div className="mt-4">
              <div className="flex items-center justify-between px-1 mb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <Landmark size={12} />
                  <span>Entidad / Broker</span>
                </div>
                <span className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400">
                  {brokers.find((b) => b.value === selectedBroker)?.label || 'Consolidado'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {brokers.map((b) => {
                  const isSelected = selectedBroker === b.value
                  const dot = BROKER_CONFIG[b.value]?.dot
                  return (
                    <button
                      key={b.value}
                      onClick={() => setSelectedBroker(b.value)}
                      className={cn(
                        'flex items-center gap-2 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all border text-left active:scale-95',
                        isSelected
                          ? 'border-blue-500/50 bg-blue-50/90 text-blue-900 dark:bg-white/[0.1] dark:text-white dark:border-white/20 shadow-2xs font-bold'
                          : 'border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06] dark:text-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          dot || 'bg-slate-400 dark:bg-slate-500'
                        )}
                      />
                      <span className="truncate flex-1">{b.label}</span>
                      {isSelected && <Check size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Switch Profile Section */}
            <div className="mt-4">
              <div className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Cambiar de Inversor
              </div>
              <div className="space-y-1">
                {users.map((u) => {
                  const isSelected = u.id === currentUser.id
                  return (
                    <button
                      key={u.id}
                      onClick={async () => {
                        if (isSelected) {
                          onClose()
                          return
                        }
                        onClose()
                        if (u.id === 'demo' || u.isDemo) {
                          login('demo')
                        } else {
                          const success = await login(u.id)
                          if (!success) {
                            logout()
                            navigate('/login', { state: { selectedUserId: u.id } })
                          }
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors active:scale-98',
                        isSelected
                          ? 'bg-blue-50 text-blue-900 dark:bg-white/[0.08] dark:text-white font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-2xs"
                          style={{
                            background: u.bgGradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                            backgroundColor: '#059669',
                          }}
                        >
                          {u.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs truncate font-medium">{u.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{u.badge}</div>
                        </div>
                      </div>
                      {isSelected && <Check size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Logout Button */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                onClick={() => {
                  onClose()
                  logout()
                  navigate('/login')
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-semibold transition-colors active:scale-98 border border-rose-200/60 dark:border-rose-500/20"
              >
                <LogOut size={14} />
                <span>Cerrar sesión / Salir</span>
              </button>
            </div>

            {/* Version Badge & Quick Reload */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
              <span className="font-mono">v{APP_VERSION}</span>
              <button
                type="button"
                onClick={() => {
                  window.location.reload()
                }}
                className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-blue-600 dark:text-blue-400 font-semibold active:scale-95 transition-all cursor-pointer"
                title="Recargar la aplicación para obtener la última versión"
              >
                <RefreshCw size={12} />
                <span>Recargar app</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
