import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, TrendingUp, TrendingDown, X, Sparkles, Calendar, Layers, ShieldCheck, Pin, PinOff, RefreshCw } from 'lucide-react'
import { useAppStore, type NavAlertItem } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'
import { useRefreshPortfolio } from '@/hooks/useRefreshPortfolio'

export function NavUpdateAlertModal() {
  const { navAlertNotification, clearNavAlertNotification } = useAppStore()
  const { handleRefresh, isRefreshingPrices } = useRefreshPortfolio()
  const [isPaused, setIsPaused] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [progress, setProgress] = useState(100)
  const [activeTab, setActiveTab] = useState<'updated' | 'all'>('updated')

  const notif = navAlertNotification
  const AUTO_DISMISS_MS = 30000

  // Native Web notification when app is backgrounded or tab unfocused
  useEffect(() => {
    if (!notif || (notif.updatedCount ?? 0) === 0 || notif.isManual) return
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      } else if (Notification.permission === 'granted' && document.hidden) {
        try {
          new Notification('PortfolioPro - NAVs Actualizados', {
            body: `${notif.updatedCount} fondo${notif.updatedCount > 1 ? 's' : ''} con nuevo valor liquidativo oficial.`,
            icon: '/icon-192.png',
          })
        } catch {}
      }
    }
  }, [notif])

  // Close on Escape key
  useEffect(() => {
    if (!notif) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearNavAlertNotification()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [notif, clearNavAlertNotification])

  // Auto-dismiss countdown only for automatic background popups (NEVER when opened manually via bell or pinned)
  useEffect(() => {
    if (!notif || isPinned || notif.isManual) {
      setProgress(100)
      return
    }

    setProgress(100)
    const startTime = Date.now()
    const interval = setInterval(() => {
      if (isPaused) return
      const elapsed = Date.now() - startTime
      const remainingPct = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100)
      setProgress(remainingPct)
      if (remainingPct <= 0) {
        clearInterval(interval)
        clearNavAlertNotification()
      }
    }, 100)

    return () => clearInterval(interval)
  }, [notif, isPaused, isPinned, clearNavAlertNotification])

  const updatedItems = useMemo(() => notif?.items || [], [notif])
  const allCheckedItems = useMemo(() => {
    if (notif?.allCheckedItems && notif.allCheckedItems.length > 0) {
      return notif.allCheckedItems
    }
    return updatedItems
  }, [notif, updatedItems])

  // Determine initial tab when notif changes
  useEffect(() => {
    if (updatedItems.length > 0) {
      setActiveTab('updated')
    } else {
      setActiveTab('all')
    }
  }, [updatedItems.length])

  if (!notif) return null

  const hasUpdated = updatedItems.length > 0
  const hasAll = allCheckedItems.length > 0
  const showTabs = hasUpdated && hasAll && allCheckedItems.length > updatedItems.length

  const displayItems = activeTab === 'all' || updatedItems.length === 0 ? allCheckedItems : updatedItems
  const displayCount = hasUpdated ? updatedItems.length : allCheckedItems.length

  return (
    <AnimatePresence>
      {notif && (
        <>
          {/* Subtle backdrop when opened manually via bell so clicking outside dismisses cleanly */}
          {notif.isManual && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => clearNavAlertNotification()}
              className="fixed inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-[2px] z-[99998] pointer-events-auto"
            />
          )}

          <div className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 sm:top-6 sm:right-6 z-[99999] pointer-events-none flex flex-col items-end">
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.94 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              className="pointer-events-auto w-[92vw] sm:w-[460px] max-w-full rounded-2xl overflow-hidden shadow-2xl border backdrop-blur-2xl transition-colors bg-white/95 dark:bg-[#1e1e1e]/98 border-slate-200/90 dark:border-white/10 flex flex-col max-h-[85vh]"
            >
              {/* Top subtle shine / accent gradient */}
              <div
                className={cn(
                  'h-1 w-full shrink-0',
                  hasUpdated
                    ? 'bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500'
                    : 'bg-gradient-to-r from-slate-400 via-blue-400 to-slate-400'
                )}
              />

              {/* Modal Header */}
              <div className="p-4 sm:p-4.5 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 shadow-xs',
                      hasUpdated
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20'
                    )}
                  >
                    {hasUpdated ? <Sparkles size={18} /> : <ShieldCheck size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-white tracking-tight">
                        {notif.isManual
                          ? 'Última Actualización de NAVs'
                          : hasUpdated
                          ? `${displayCount} NAV${displayCount > 1 ? 's' : ''} Actualizado${displayCount > 1 ? 's' : ''}`
                          : 'NAVs Verificados al Día'}
                      </h3>
                      {notif.timestamp && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]">
                          {notif.timestamp}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {hasUpdated
                        ? `${updatedItems.length} fondo${updatedItems.length > 1 ? 's' : ''} con nuevo valor liquidativo publicado`
                        : `Comprobadas ${allCheckedItems.length || notif.totalCount || 0} posiciones (todas al día)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!notif.isManual && (
                    <button
                      onClick={() => setIsPinned(!isPinned)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors cursor-pointer',
                        isPinned
                          ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                      )}
                      title={isPinned ? 'Desfijar auto-cierre' : 'Fijar ventana (no cerrar automáticamente)'}
                    >
                      {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                    </button>
                  )}
                  <button
                    onClick={() => clearNavAlertNotification()}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Cerrar aviso"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Optional Segmented Tabs: Actualizados vs Todas las posiciones */}
              {showTabs && (
                <div className="px-3.5 pt-2.5 pb-1 flex items-center gap-1.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] shrink-0">
                  <button
                    onClick={() => setActiveTab('updated')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      activeTab === 'updated'
                        ? 'bg-blue-600 text-white shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/[0.06]'
                    )}
                  >
                    Actualizados ({updatedItems.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      activeTab === 'all'
                        ? 'bg-blue-600 text-white shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/[0.06]'
                    )}
                  >
                    Todas las posiciones ({allCheckedItems.length})
                  </button>
                </div>
              )}

              {/* Modal Content: List of Updated Funds */}
              <div className="p-3 sm:p-3.5 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                {displayItems.length > 0 ? (
                  displayItems.map((item) => (
                    <NavAlertCard key={item.isin} item={item} />
                  ))
                ) : (
                  <div className="py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200/60 dark:border-white/[0.04]">
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      Todas las valoraciones están al día
                    </p>
                    <p className="mt-1">
                      Las gestoras y depositarias tienen reflejados sus precios oficiales más recientes en tu cartera.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer with Actions and Countdown progress bar */}
              <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {notif.isManual
                      ? '📋 Valores oficiales reflejados en tu cartera'
                      : isPinned
                      ? '📌 Fijado (no se cerrará automáticamente)'
                      : isPaused
                      ? '⏸️ Pausado'
                      : hasUpdated
                      ? 'Valores reflejados en tus gráficas y saldos'
                      : 'Siguiente comprobación disponible'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notif.isManual && (
                    <button
                      onClick={() => handleRefresh()}
                      disabled={isRefreshingPrices}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Forzar actualización de NAVs ahora"
                    >
                      <RefreshCw size={11} className={isRefreshingPrices ? 'animate-spin text-blue-500' : ''} />
                      <span>{isRefreshingPrices ? 'Actualizando...' : 'Actualizar'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => clearNavAlertNotification()}
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </div>

              {/* Auto-dismiss progress bar (only for automatic popups when not pinned) */}
              {!isPinned && !notif.isManual && (
                <div className="h-0.5 w-full bg-slate-100 dark:bg-white/[0.04] shrink-0">
                  <div
                    className="h-full bg-blue-500/70 transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

function NavAlertCard({ item }: { item: NavAlertItem }) {
  const isPositive = (item.diff ?? 0) >= 0
  const hasDiff = item.diff !== undefined && Math.abs(item.diff) > 0.00001

  return (
    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex flex-col gap-1.5 transition-colors hover:border-slate-300 dark:hover:border-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-xs text-slate-900 dark:text-white truncate" title={item.name}>
            {item.name}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="font-mono">{item.isin}</span>
            {item.broker && (
              <>
                <span>•</span>
                <span className="uppercase font-semibold tracking-wider">{item.broker}</span>
              </>
            )}
          </div>
        </div>

        {/* Date badge */}
        {item.price_date && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shrink-0">
            <Calendar size={10} />
            {item.price_date}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60 dark:border-white/[0.04]">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">NAV:</span>
          <span className="text-sm font-bold font-mono text-slate-950 dark:text-white">
            {fmt.currency(item.price)}
          </span>
        </div>

        {hasDiff ? (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold',
              isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            )}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>
              {isPositive ? '+' : ''}{item.diff_pct?.toFixed(2)}%
            </span>
            <span className="text-[10px] opacity-80">
              ({isPositive ? '+' : ''}{fmt.currency(item.diff)})
            </span>
          </div>
        ) : (
          item.previous_price ? (
            <span className="text-[11px] font-mono text-slate-400">
              Anterior: {fmt.currency(item.previous_price)}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded">
              Confirmado
            </span>
          )
        )}
      </div>
    </div>
  )
}
