import React, { useState, useEffect, useMemo } from 'react'
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
  onSelectSession,
}) => {
  const [now, setNow] = useState<Date>(() => new Date())

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

          return (
            <div
              key={s.id}
              onClick={() => onSelectSession?.(s.id)}
              title={`${s.name} (${s.city}) • ${s.exchanges} • ${s.indices}`}
              className={cn(
                'relative overflow-hidden rounded-xl px-3 py-2 sm:px-3.5 sm:py-2 select-none transition-colors',
                'bg-white/95 dark:bg-[#1e1e1e]/96 border backdrop-blur-md',
                isOpen
                  ? 'border-emerald-500/30 dark:border-emerald-500/25 shadow-xs'
                  : isPreOrPost
                  ? 'border-amber-500/30 dark:border-amber-500/25 shadow-xs'
                  : 'border-slate-200/90 dark:border-white/[0.08] shadow-xs',
                onSelectSession && 'cursor-pointer'
              )}
            >
              {/* Subtle top ambient glow for active sessions */}
              {isOpen && (
                <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-40 h-10 bg-emerald-500/10 dark:bg-emerald-500/15 blur-lg" />
              )}
              {isPreOrPost && (
                <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-40 h-10 bg-amber-500/10 dark:bg-amber-500/15 blur-lg" />
              )}

              <div className="flex items-center justify-between gap-2.5 relative z-10">
                {/* Left: Flag & Hub Details */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-5 sm:w-7.5 sm:h-5 rounded-[4px] overflow-hidden shrink-0 border border-slate-200/80 dark:border-white/10 shadow-2xs bg-slate-100 dark:bg-white/[0.04]">
                    <img
                      src={s.flagUrl}
                      alt={s.flagAlt}
                      className="w-full h-full object-cover select-none"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
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
                    <div className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                      {s.city}
                    </div>
                  </div>
                </div>

                {/* Right: Local Clock & Status Badge */}
                <div className="text-right shrink-0">
                  <div className="text-xs sm:text-[12.5px] font-mono font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                    {s.localTimeStr}
                  </div>
                  <div
                    className={cn(
                      'text-[9.5px] font-bold uppercase tracking-wider mt-0.5 leading-tight',
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

              {/* Barra de progreso de la sesión a todo el ancho */}
              {isOpen ? (
                <div
                  className="w-full flex items-center gap-2 mt-2 pt-0.5 relative z-10"
                  title={`Jornada: ${s.progressPct}% transcurrido`}
                >
                  <div className="flex-1 h-1.5 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${s.progressPct}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {s.progressPct}%
                  </span>
                </div>
              ) : isPreOrPost && s.progressPct > 0 ? (
                <div
                  className="w-full flex items-center gap-2 mt-2 pt-0.5 relative z-10"
                  title={`Fase: ${s.label} • ${s.progressPct}%`}
                >
                  <div className="flex-1 h-1.5 bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${s.progressPct}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    {s.progressPct}%
                  </span>
                </div>
              ) : (
                <div className="w-full flex items-center gap-2 mt-2 pt-0.5 relative z-10 invisible select-none pointer-events-none">
                  <div className="flex-1 h-1.5" />
                  <span className="text-[10px] font-mono">0%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
