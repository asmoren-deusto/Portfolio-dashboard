import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, TrendingUp, TrendingDown, X, Sparkles, Calendar, Layers, ShieldCheck } from 'lucide-react'
import { useAppStore, type NavAlertItem } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'

export function NavUpdateAlertModal() {
  const { navAlertNotification, clearNavAlertNotification } = useAppStore()
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(100)

  const notif = navAlertNotification
  const AUTO_DISMISS_MS = 10000

  useEffect(() => {
    if (!notif) return

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
  }, [notif, isPaused, clearNavAlertNotification])

  const hasUpdates = (notif?.updatedCount ?? 0) > 0

  return (
    <AnimatePresence>
      {notif && (
        <div className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 sm:top-6 sm:right-6 z-[99999] pointer-events-none flex flex-col items-end">
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.94 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="pointer-events-auto w-[92vw] sm:w-[440px] max-w-full rounded-2xl overflow-hidden shadow-2xl border backdrop-blur-2xl transition-colors bg-white/95 dark:bg-[#1e1e1e]/98 border-slate-200/90 dark:border-white/10"
          >
          {/* Top subtle shine / accent gradient */}
          <div
            className={cn(
              'h-1 w-full',
              hasUpdates
                ? 'bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500'
                : 'bg-gradient-to-r from-slate-400 via-blue-400 to-slate-400'
            )}
          />

          {/* Modal Header */}
          <div className="p-4 sm:p-4.5 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 shadow-xs',
                  hasUpdates
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20'
                )}
              >
                {hasUpdates ? <Sparkles size={18} /> : <ShieldCheck size={18} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-white tracking-tight">
                    {hasUpdates
                      ? `${notif.updatedCount} NAV${notif.updatedCount > 1 ? 's' : ''} Actualizado${notif.updatedCount > 1 ? 's' : ''}`
                      : 'NAVs Verificados al Día'}
                  </h3>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]">
                    {notif.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {hasUpdates
                    ? 'Nuevos valores liquidativos oficiales publicados'
                    : `Comprobadas ${notif.totalCount} posiciones (sin cambios nuevos)`}
                </p>
              </div>
            </div>

            <button
              onClick={() => clearNavAlertNotification()}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
              title="Cerrar aviso"
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Content: List of Updated Funds */}
          <div className="p-3 sm:p-3.5 space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
            {hasUpdates ? (
              notif.items.map((item) => (
                <NavAlertCard key={item.isin} item={item} />
              ))
            ) : (
              <div className="py-2 px-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200/60 dark:border-white/[0.04]">
                <p className="font-medium">
                  Todas las gestoras ya contaban con su última valoración disponible en la cartera.
                </p>
                {notif.items && notif.items.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.04] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Últimos NAVs comprobados:
                    </span>
                    {notif.items.slice(0, 3).map((it) => (
                      <div key={it.isin} className="flex items-center justify-between text-[11px]">
                        <span className="truncate max-w-[220px] text-slate-700 dark:text-slate-300 font-medium">
                          {it.name}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono shrink-0">
                          <span className="font-bold text-slate-900 dark:text-white">{fmt.currency(it.price)}</span>
                          <span className="text-slate-400 text-[10px]">({it.price_date})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer with Actions and Countdown progress bar */}
          <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {hasUpdates
                ? 'Valores reflejados en tus gráficas y saldos'
                : 'Siguiente comprobación disponible en cualquier momento'}
            </span>
            <button
              onClick={() => clearNavAlertNotification()}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Entendido
            </button>
          </div>

          {/* Auto-dismiss progress bar */}
          <div className="h-0.5 w-full bg-slate-100 dark:bg-white/[0.04]">
            <div
              className="h-full bg-blue-500/70 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function NavAlertCard({ item }: { item: NavAlertItem }) {
  const isPositive = (item.diff ?? 0) >= 0
  const hasDiff = item.diff !== undefined && Math.abs(item.diff) > 0.00001

  return (
    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex flex-col gap-1.5">
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
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Nuevo NAV:</span>
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
          item.previous_price && (
            <span className="text-[11px] font-mono text-slate-400">
              Anterior: {fmt.currency(item.previous_price)}
            </span>
          )
        )}
      </div>
    </div>
  )
}
