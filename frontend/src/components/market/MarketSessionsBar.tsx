import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Info, CheckCircle2, Moon, Sun, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionConfig {
  id: string
  name: string
  city: string
  flagUrl: string
  flagAlt: string
  tz: string
  openHour: number
  closeHour: number
  preHour?: number
  postHour?: number
  exchanges: string
  indices: string
}

const SESSIONS: SessionConfig[] = [
  {
    id: 'tokyo',
    name: 'Tokio',
    city: 'Asia / Pacífico',
    flagUrl: 'https://flagcdn.com/w80/jp.png',
    flagAlt: 'Japón',
    tz: 'Asia/Tokyo',
    openHour: 9.0,
    closeHour: 15.5,
    preHour: 8.5,
    exchanges: 'TSE (Tokyo Stock Exchange)',
    indices: 'Nikkei 225, TOPIX',
  },
  {
    id: 'europe',
    name: 'Europa',
    city: 'Madrid / Frankfurt',
    flagUrl: 'https://flagcdn.com/w80/eu.png',
    flagAlt: 'Unión Europea',
    tz: 'Europe/Madrid',
    openHour: 9.0,
    closeHour: 17.5,
    preHour: 8.0,
    postHour: 18.5,
    exchanges: 'BME, XETRA, Euronext',
    indices: 'IBEX 35, DAX 40, Euro Stoxx 50',
  },
  {
    id: 'ny',
    name: 'Nueva York',
    city: 'Wall Street',
    flagUrl: 'https://flagcdn.com/w80/us.png',
    flagAlt: 'Estados Unidos',
    tz: 'America/New_York',
    openHour: 9.5,
    closeHour: 16.0,
    preHour: 4.0,
    postHour: 20.0,
    exchanges: 'NYSE, NASDAQ',
    indices: 'S&P 500, NASDAQ 100, Dow Jones',
  },
]

function getSessionStatus(now: Date, config: SessionConfig) {
  // Format local components in target timezone (DST-safe)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.tz,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short',
  })

  const parts = formatter.formatToParts(now)
  const h = Number(parts.find((p) => p.type === 'hour')?.value || 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value || 0)
  const s = Number(parts.find((p) => p.type === 'second')?.value || 0)
  const weekday = parts.find((p) => p.type === 'weekday')?.value || ''
  const isWeekend = weekday === 'Sat' || weekday === 'Sun'

  const totalHours = h + m / 60 + s / 3600
  const localTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  let status: 'open' | 'pre' | 'post' | 'closed' = 'closed'
  let label = 'CERRADO'
  let progressPct = 0

  if (isWeekend) {
    status = 'closed'
    label = 'CERRADO'
  } else if (totalHours >= config.openHour && totalHours < config.closeHour) {
    status = 'open'
    label = 'SESIÓN ABIERTA'
    const totalSessionDuration = config.closeHour - config.openHour
    progressPct = Math.min(100, Math.max(0, ((totalHours - config.openHour) / totalSessionDuration) * 100))
  } else if (config.preHour !== undefined && totalHours >= config.preHour && totalHours < config.openHour) {
    status = 'pre'
    label = 'PRE-MERCADO'
  } else if (config.postHour !== undefined && totalHours >= config.closeHour && totalHours < config.postHour) {
    status = 'post'
    label = 'POST-MERCADO'
  } else {
    status = 'closed'
    label = 'CERRADO'
  }

  return {
    ...config,
    status,
    label,
    localTimeStr,
    progressPct: Math.round(progressPct),
    isWeekend,
  }
}

interface MarketSessionsBarProps {
  className?: string
  compact?: boolean
  onSelectSession?: (sessionId: string) => void
}

export const MarketSessionsBar: React.FC<MarketSessionsBarProps> = ({
  className,
  compact = false,
  onSelectSession,
}) => {
  const [now, setNow] = useState<Date>(() => new Date())
  const [hoveredSession, setHoveredSession] = useState<string | null>(null)

  useEffect(() => {
    // Update every 5 seconds for smooth precision without excessive re-renders
    const interval = setInterval(() => {
      setNow(new Date())
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const sessionsData = useMemo(() => {
    return SESSIONS.map((s) => getSessionStatus(now, s))
  }, [now])

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
        {sessionsData.map((s) => {
          const isOpen = s.status === 'open'
          const isPreOrPost = s.status === 'pre' || s.status === 'post'
          const isHovered = hoveredSession === s.id

          return (
            <motion.div
              key={s.id}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15 }}
              onMouseEnter={() => setHoveredSession(s.id)}
              onMouseLeave={() => setHoveredSession(null)}
              onClick={() => onSelectSession?.(s.id)}
              className={cn(
                'relative overflow-hidden rounded-2xl p-3 sm:p-3.5 transition-all select-none',
                'bg-white/95 dark:bg-[#1e1e1e]/96 border backdrop-blur-md',
                isOpen
                  ? 'border-emerald-500/30 dark:border-emerald-500/25 shadow-xs hover:shadow-md'
                  : isPreOrPost
                  ? 'border-amber-500/30 dark:border-amber-500/25 shadow-xs hover:shadow-md'
                  : 'border-slate-200/90 dark:border-white/[0.08] shadow-xs hover:shadow-sm',
                onSelectSession && 'cursor-pointer'
              )}
            >
              {/* Subtle top ambient glow for active sessions */}
              {isOpen && (
                <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-16 bg-emerald-500/10 dark:bg-emerald-500/15 blur-xl" />
              )}
              {isPreOrPost && (
                <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-16 bg-amber-500/10 dark:bg-amber-500/15 blur-xl" />
              )}

              <div className="flex items-center justify-between gap-3 relative z-10">
                {/* Left: Flag & Hub Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-5.5 sm:w-9 sm:h-6 rounded-[5px] overflow-hidden shrink-0 border border-slate-200/80 dark:border-white/10 shadow-2xs bg-slate-100 dark:bg-white/[0.04]">
                    <img
                      src={s.flagUrl}
                      alt={s.flagAlt}
                      className="w-full h-full object-cover select-none"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {s.name}
                      </span>
                      {/* Live Glowing Dot */}
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0 transition-all',
                          isOpen
                            ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                            : isPreOrPost
                            ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                            : 'bg-slate-300 dark:bg-slate-600'
                        )}
                        title={s.label}
                      />
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {s.city}
                    </div>
                  </div>
                </div>

                {/* Right: Local Clock & Status Badge */}
                <div className="text-right shrink-0">
                  <div className="text-xs sm:text-[13px] font-mono font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    {s.localTimeStr}
                  </div>
                  <div
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider mt-0.5',
                      isOpen
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isPreOrPost
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {s.label}
                  </div>
                </div>
              </div>

              {/* Progress Bar during active trading session */}
              {isOpen && !compact && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.05] relative z-10">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                    <span className="font-medium text-emerald-600/80 dark:text-emerald-400/80">
                      Jornada en curso
                    </span>
                    <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {s.progressPct}% transcurrido
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.progressPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* Detailed Tooltip on Hover */}
              {isHovered && !compact && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="mt-2 pt-1.5 border-t border-slate-100 dark:border-white/[0.05] text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between relative z-10"
                >
                  <span className="truncate">{s.exchanges}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 ml-2 shrink-0">
                    {s.indices}
                  </span>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
