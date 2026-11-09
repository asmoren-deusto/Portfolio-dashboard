import React, { useState, useMemo, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Landmark,
  Wallet,
  Coins,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Filter,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn, fmt } from '@/lib/utils'

export type EventCategory = 'all' | 'portfolio' | 'macro' | 'dividends'

export interface AgendaEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time?: string // HH:mm or 'Todo el día'
  category: 'portfolio' | 'macro' | 'dividends'
  impact: 'high' | 'medium' | 'portfolio'
  impactLabel: string
  description: string
  assetTag?: string
  assetIsin?: string
  badgeColor?: string
  isCustom?: boolean
}

// Eventos predefinidos de alto valor para la cartera del usuario y el contexto macroeconómico 2026/2027
const BASE_EVENTS: AgendaEvent[] = [
  {
    id: 'cpi-us-nov-26',
    date: '2026-11-10',
    time: '14:30 CET',
    title: 'EE. UU. · Inflación IPC Subyacente (Core CPI MoM & YoY)',
    category: 'macro',
    impact: 'high',
    impactLabel: 'Alto Impacto',
    description: 'Dato clave para calibrar el ritmo de tipos de la Fed. Afecta directamente al S&P 500, Nasdaq 100 y DNB Technology.',
    assetTag: 'S&P 500 / DNB Tech',
  },
  {
    id: 'ine-ipc-es-nov-26',
    date: '2026-11-12',
    time: '09:00 CET',
    title: 'España · IPC Armonizado Definitivo INE',
    category: 'macro',
    impact: 'medium',
    impactLabel: 'Impacto Medio',
    description: 'Confirmación de la tasa de inflación en España y su repercusión en la rentabilidad real de las inversiones locales.',
    assetTag: 'IBEX 35 / Bonos España',
  },
  {
    id: 'fomc-minutes-nov-26',
    date: '2026-11-19',
    time: '20:00 CET',
    title: 'Reserva Federal · Actas de la Reunión del FOMC',
    category: 'macro',
    impact: 'high',
    impactLabel: 'Alto Impacto',
    description: 'Publicación de los debates internos de la Fed sobre tipos de interés, balance y crecimiento económico estadounidense.',
    assetTag: 'Renta Variable USA',
  },
  {
    id: 'cpi-eurozone-prelim-26',
    date: '2026-11-27',
    time: '11:00 CET',
    title: 'Eurozona · IPC Preliminar de Noviembre (Eurostat)',
    category: 'macro',
    impact: 'high',
    impactLabel: 'Alto Impacto',
    description: 'Lectura adelantada de la inflación en la zona euro, crucial para la decisión de política monetaria del BCE de diciembre.',
    assetTag: 'Euro 50 / Groupama',
  },
  {
    id: 'month-close-nov-26',
    date: '2026-11-30',
    time: '20:00 CET',
    title: 'Cierre Contable y Valoración Mensual de Fondos',
    category: 'portfolio',
    impact: 'portfolio',
    impactLabel: 'Mi Cartera',
    description: 'Último cálculo de valor liquidativo de noviembre para los fondos internacionales (Vanguard, Azvalor, DNB, Groupama).',
    assetTag: 'Todos los Fondos',
  },
  {
    id: 'us-nfp-dec-26',
    date: '2026-12-04',
    time: '14:30 CET',
    title: 'EE. UU. · Informe de Empleo No Agrícola (NFP) y Tasa de Paro',
    category: 'macro',
    impact: 'high',
    impactLabel: 'Alto Impacto',
    description: 'El termómetro laboral oficial de Estados Unidos que guía las decisiones del FOMC sobre la economía y el dólar.',
    assetTag: 'Global / EUR-USD',
  },
  {
    id: 'dca-indexa-dec-26',
    date: '2026-12-07',
    time: '08:30 CET',
    title: 'Aportación Periódica DCA · Indexa Más Rentabilidad EPSV',
    category: 'portfolio',
    impact: 'portfolio',
    impactLabel: 'Aportación Cartera',
    description: 'Ejecución automática de la aportación mensual programada de 416,66 € en la cuenta EPSV (Indexa Capital).',
    assetTag: 'Indexa EPSV (0192#0011)',
    assetIsin: '0192#0011',
  },
  {
    id: 'ecb-rate-dec-26',
    date: '2026-12-10',
    time: '14:15 CET',
    title: 'BCE · Decisión de Tipos de Interés y Rueda de Prensa',
    category: 'macro',
    impact: 'high',
    impactLabel: 'Alto Impacto',
    description: 'El Banco Central Europeo anuncia tipos de interés de la facilidad de depósito. Afecta directamente al rendimiento del monetario Groupama Trésorerie y curva de bonos.',
    assetTag: 'Groupama / Bonos Estado',
    assetIsin: 'FR0000989626',
  },
  {
    id: 'fed-rate-dec-26',
    date: '2026-12-16',
    time: '20:00 CET',
    title: 'Reserva Federal · Decisión de Tipos, Dot Plot y Conferencia de Powell',
    category: 'macro',
    impact: 'high',
    impactLabel: 'Alto Impacto',
    description: 'Reunión de fin de año de la Fed con actualización de proyecciones macroeconómicas. Impacto directo en Vanguard S&P 500, Oro y divisas.',
    assetTag: 'S&P 500 / Oro / Dólar',
    assetIsin: 'IE0032126645',
  },
  {
    id: 'fiscal-limit-epsv-26',
    date: '2026-12-31',
    time: '23:59 CET',
    title: 'Límite Fiscal Anual IRPF · Aportaciones EPSV (País Vasco)',
    category: 'portfolio',
    impact: 'portfolio',
    impactLabel: 'Plazo Fiscal',
    description: 'Último día hábil para computar aportaciones deducibles en el IRPF del ejercicio 2026 (límite foral máximo de 5.000 € anuales a planes de previsión).',
    assetTag: 'Fiscalidad / EPSV',
    assetIsin: '0192#0011',
  },
  {
    id: 'dca-indexa-jan-27',
    date: '2027-01-07',
    time: '08:30 CET',
    title: 'Aportación Periódica DCA · Indexa Más Rentabilidad EPSV',
    category: 'portfolio',
    impact: 'portfolio',
    impactLabel: 'Aportación Cartera',
    description: 'Aportación mensual automática de 416,66 € para iniciar el ejercicio fiscal 2027.',
    assetTag: 'Indexa EPSV (0192#0011)',
    assetIsin: '0192#0011',
  },
  {
    id: 'coupon-bono-jul-27',
    date: '2027-07-30',
    time: '09:00 CET',
    title: 'Cobro Cupón Anual 5,75% · Bonos del Estado Español 2032',
    category: 'dividends',
    impact: 'portfolio',
    impactLabel: 'Cobro de Cupón',
    description: 'Abono anual del cupón del 5,75% sobre 4.000,99 € nominales (~230,06 € brutos en cuenta de efectivo).',
    assetTag: 'Bonos Gobierno (ES0000012411)',
    assetIsin: 'ES0000012411',
  },
]

function getDaysRemaining(targetDateStr: string): { days: number; label: string; isPast: boolean } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const [y, m, d] = targetDateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)

  const diffMs = target.getTime() - today.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (days < 0) return { days, label: `Hace ${Math.abs(days)}d`, isPast: true }
  if (days === 0) return { days, label: 'HOY', isPast: false }
  if (days === 1) return { days, label: 'Mañana', isPast: false }
  if (days <= 6) return { days, label: `En ${days}d`, isPast: false }
  if (days <= 28) {
    const weeks = Math.round(days / 7)
    return { days, label: weeks === 1 ? 'En 1 sem' : `En ${weeks} sem`, isPast: false }
  }
  const months = Math.max(1, Math.round(days / 30.4))
  return { days, label: months === 1 ? 'En 1 mes' : `En ${months} meses`, isPast: false }
}

interface ParsedEventDate {
  day: number
  weekday: string
  month: string
  year: number
  isDifferentYear: boolean
  formattedFull: string
}

function parseEventDate(dateStr: string): ParsedEventDate {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const now = new Date()
  const isDifferentYear = y !== now.getFullYear()

  const rawWeekday = date.toLocaleDateString('es-ES', { weekday: 'short' })
  const weekday = rawWeekday.replace(/\./g, '').trim().toUpperCase()

  const rawMonth = date.toLocaleDateString('es-ES', { month: 'short' })
  const month = rawMonth.replace(/\./g, '').trim().toUpperCase()

  const formattedFull = date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: isDifferentYear ? 'numeric' : undefined,
  })

  return { day: d, weekday, month, year: y, isDifferentYear, formattedFull }
}

export const PortfolioAgendaCard: React.FC<{
  className?: string
  defaultCollapsed?: boolean
}> = ({ className, defaultCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('portfolio_agenda_collapsed')
      return saved !== null ? JSON.parse(saved) : defaultCollapsed
    } catch {
      return defaultCollapsed
    }
  })

  const [activeCategory, setActiveCategory] = useState<EventCategory>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [customEvents, setCustomEvents] = useState<AgendaEvent[]>(() => {
    try {
      const raw = localStorage.getItem('portfolio_custom_agenda_events')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // New Event Form State
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('09:00 CET')
  const [newCategory, setNewCategory] = useState<'portfolio' | 'macro' | 'dividends'>('portfolio')
  const [newDescription, setNewDescription] = useState('')
  const [newAssetTag, setNewAssetTag] = useState('')

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('portfolio_agenda_collapsed', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const handleAddCustomEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newDate) return

    const event: AgendaEvent = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      time: newTime.trim() || 'Todo el día',
      category: newCategory,
      impact: newCategory === 'portfolio' ? 'portfolio' : 'medium',
      impactLabel: newCategory === 'portfolio' ? 'Mi Cartera' : 'Personal',
      description: newDescription.trim() || 'Recordatorio personalizado de cartera.',
      assetTag: newAssetTag.trim() || 'Cartera Personal',
      isCustom: true,
    }

    const updated = [...customEvents, event]
    setCustomEvents(updated)
    try {
      localStorage.setItem('portfolio_custom_agenda_events', JSON.stringify(updated))
    } catch {}

    setNewTitle('')
    setNewDate('')
    setNewDescription('')
    setNewAssetTag('')
    setShowAddModal(false)
  }

  const handleDeleteCustomEvent = (id: string) => {
    const updated = customEvents.filter((ev) => ev.id !== id)
    setCustomEvents(updated)
    try {
      localStorage.setItem('portfolio_custom_agenda_events', JSON.stringify(updated))
    } catch {}
  }

  // Combine and sort events chronologically
  const allEvents = useMemo(() => {
    const combined = [...BASE_EVENTS, ...customEvents]
    return combined.sort((a, b) => a.date.localeCompare(b.date))
  }, [customEvents])

  // Filter out expired events past 7 days ago to keep view fresh
  const activeEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const { days } = getDaysRemaining(ev.date)
      return days >= -1 // Keep yesterday and future
    })
  }, [allEvents])

  const filteredEvents = useMemo(() => {
    if (activeCategory === 'all') return activeEvents
    if (activeCategory === 'portfolio') return activeEvents.filter((e) => e.category === 'portfolio')
    if (activeCategory === 'macro') return activeEvents.filter((e) => e.category === 'macro')
    if (activeCategory === 'dividends') return activeEvents.filter((e) => e.category === 'dividends')
    return activeEvents
  }, [activeEvents, activeCategory])

  // Count by category
  const portfolioCount = useMemo(() => activeEvents.filter((e) => e.category === 'portfolio').length, [activeEvents])
  const macroCount = useMemo(() => activeEvents.filter((e) => e.category === 'macro').length, [activeEvents])
  const dividendCount = useMemo(() => activeEvents.filter((e) => e.category === 'dividends').length, [activeEvents])

  // Nearest event summary for collapsed header
  const nextEvent = activeEvents[0]

  return (
    <Card className={cn('w-full overflow-hidden transition-all duration-300', className)}>
      <CardHeader className="py-3 px-3.5 sm:px-4 border-b border-slate-200/80 dark:border-white/[0.05] flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Agenda Financiera & Próximos Eventos
              </CardTitle>
              <span className="text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/20">
                {activeEvents.length} citas
              </span>
              {portfolioCount > 0 && (
                <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20">
                  {portfolioCount} en tu cartera
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Aportaciones DCA programadas, cupones de bonos y citas clave de política monetaria (BCE / Fed)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            title="Añadir recordatorio o evento personalizado"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir</span>
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Desplegar agenda' : 'Colapsar agenda'}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>

      {/* Collapsed State Summary Pill */}
      {isCollapsed && nextEvent && (
        <div
          onClick={toggleCollapse}
          className="px-4 py-2.5 bg-slate-50/60 dark:bg-white/[0.01] hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors cursor-pointer flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
              Próximo hito:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white truncate">
              {nextEvent.title}
            </span>
            <span className="text-slate-500 dark:text-slate-400 shrink-0">
              ({parseEventDate(nextEvent.date).formattedFull})
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 shrink-0">
            Ver agenda completa <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            {/* Filter Tabs Header */}
            <div className="p-3 bg-slate-50/70 dark:bg-white/[0.015] border-b border-slate-200/70 dark:border-white/[0.04] flex flex-wrap items-center justify-between gap-2.5">
              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                    activeCategory === 'all'
                      ? 'bg-white dark:bg-[#2e2e30] text-slate-950 dark:text-white shadow-xs border border-slate-200/90 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  Todos ({activeEvents.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory('portfolio')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                    activeCategory === 'portfolio'
                      ? 'bg-emerald-500 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Mi Cartera ({portfolioCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory('macro')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                    activeCategory === 'macro'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Macro & Tipos ({macroCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCategory('dividends')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                    activeCategory === 'dividends'
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Cupones ({dividendCount})</span>
                </button>
              </div>

              {/* Time reference note */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-400/80 font-mono">
                <Clock className="w-3 h-3" />
                <span>Hora peninsular (CET / Madrid)</span>
              </div>
            </div>

            {/* Event List Timeline */}
            <div className="divide-y divide-slate-100 dark:divide-white/[0.03] max-h-[460px] overflow-y-auto scrollbar-thin">
              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No hay eventos en esta categoría para las próximas semanas.</p>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const { days, label: countdownLabel, isPast } = getDaysRemaining(event.date)
                  const { day, weekday, month, year, isDifferentYear } = parseEventDate(event.date)
                  const isPortfolio = event.category === 'portfolio'
                  const isDividend = event.category === 'dividends'

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group relative',
                        isPortfolio
                          ? 'bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] dark:bg-emerald-500/[0.03] dark:hover:bg-emerald-500/[0.06]'
                          : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                      )}
                    >
                      {/* Left accent stripe for Portfolio events */}
                      {isPortfolio && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500"
                        />
                      )}

                      {/* Left: Date & Countdown badge */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={cn(
                            'w-14 sm:w-16 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all text-center select-none shadow-xs',
                            days === 0
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                              : days === 1
                              ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                              : isPortfolio
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                              : isDividend
                              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300'
                              : 'bg-slate-100/80 dark:bg-white/[0.04] border-slate-200/90 dark:border-white/[0.08] text-slate-800 dark:text-slate-200'
                          )}
                        >
                          <span className="text-[10px] uppercase font-bold tracking-wider leading-none opacity-75">
                            {weekday}
                          </span>
                          <span className="text-base sm:text-lg font-black font-mono leading-tight my-0.5">
                            {day}
                          </span>
                          <span className="text-[9px] uppercase font-extrabold tracking-wider leading-none opacity-85">
                            {month}{isDifferentYear ? ` '${String(year).slice(2)}` : ''}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                              {event.title}
                            </h4>

                            {/* Impact / Category Badges */}
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                                isPortfolio
                                  ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                                  : isDividend
                                  ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                                  : event.impact === 'high'
                                  ? 'bg-rose-100/80 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                                  : 'bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300 border-slate-200 dark:border-white/[0.08]'
                              )}
                            >
                              {event.impactLabel}
                            </span>

                            {event.assetTag && (
                              <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-slate-200/80 dark:border-white/[0.05]">
                                {event.assetTag}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
                            {event.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: Time & Countdown pill */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 pl-14 sm:pl-0">
                        <span
                          className={cn(
                            'text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border',
                            days === 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                              : days === 1
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-500/40'
                              : 'bg-slate-100/80 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08]'
                          )}
                        >
                          {countdownLabel}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400/80 mt-1">
                          {event.time}
                        </span>

                        {event.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomEvent(event.id)}
                            title="Eliminar evento personalizado"
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1 mt-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Custom Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md p-5 rounded-2xl bg-white dark:bg-[#202022] border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>Nuevo Evento o Recordatorio</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomEvent} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título del evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aportación extraordinaria MyInvestor"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hora
                  </label>
                  <input
                    type="text"
                    placeholder="09:00 CET"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="portfolio">💼 Mi Cartera</option>
                    <option value="macro">🏛️ Macro & Tipos</option>
                    <option value="dividends">💰 Cupones / Dividendos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Etiqueta / Activo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Vanguard S&P 500"
                    value={newAssetTag}
                    onChange={(e) => setNewAssetTag(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descripción o notas
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el rebalanceo, aportación o importe previsto..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition-colors"
                >
                  Guardar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}

