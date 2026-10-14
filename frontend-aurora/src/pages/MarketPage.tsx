import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Globe,
  Search,
  LayoutGrid,
  List as ListIcon,
  Columns2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Zap,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Sparkles,
  Flame,
  Info,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useMarketIndices,
  useMarketQuotes,
  useSimulatedPortfolio,
  type MarketStock,
} from '@/api/queries'
import { fmt, cn } from '@/lib/utils'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import { AuroraCard } from '~/components/ui/AuroraCard'
import { AuroraBadge } from '~/components/ui/AuroraBadge'
import { CountUp } from '~/components/ui/CountUp'

const INDEX_TABS = [
  { id: 'TICKER', label: 'Ticker Principal' },
  { id: 'Todos', label: 'Todos los Mercados' },
  { id: 'ETFs', label: 'ETFs Cartera' },
  { id: 'SP500', label: 'S&P 500' },
  { id: 'NASDAQ100', label: 'NASDAQ 100' },
  { id: 'IBEX35', label: 'IBEX 35' },
  { id: 'DAX', label: 'DAX 40' },
]

export const TICKER_ORDER = [
  '^GSPC',      // S&P 500
  '^IXIC',      // NASDAQ
  'URTH',       // MSCI World
  'EEM',        // Emergentes
  '^IBEX',      // IBEX 35
  '^STOXX50E',  // Euro 50
  '^N225',      // Nikkei 225
  'GC=F',       // Oro
  'BZ=F',       // Petróleo
  'BTC-EUR',    // BTC/EUR
  'EURUSD=X',   // EUR/USD
]

// Global market sessions configuration (UTC hours)
interface MarketSession {
  id: string
  name: string
  region: string
  cities: string
  openUtcHour: number
  openUtcMin: number
  closeUtcHour: number
  closeUtcMin: number
  flag: string
}

const MARKET_SESSIONS: MarketSession[] = [
  {
    id: 'asia',
    name: 'Asia - Pacífico',
    region: 'Tokio / Hong Kong',
    cities: 'TSE · HKEX',
    openUtcHour: 0,
    openUtcMin: 0,
    closeUtcHour: 8,
    closeUtcMin: 0,
    flag: '🌏',
  },
  {
    id: 'europe',
    name: 'Europa Continental',
    region: 'Londres / Frankfurt / Madrid',
    cities: 'LSE · XETRA · BME',
    openUtcHour: 8,
    openUtcMin: 0,
    closeUtcHour: 16,
    closeUtcMin: 30,
    flag: '🌍',
  },
  {
    id: 'us',
    name: 'América del Norte',
    region: 'Nueva York',
    cities: 'NYSE · NASDAQ',
    openUtcHour: 13,
    openUtcMin: 30,
    closeUtcHour: 20,
    closeUtcMin: 0,
    flag: '🌎',
  },
]

type ViewMode = 'split' | 'heatmap' | 'grid' | 'table'

export function MarketPage() {
  const [selectedIndex, setSelectedIndex] = useState<string>('TICKER')
  const [selectedSector, setSelectedSector] = useState<string>('Todos')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Keep time ticking for live market session indicators
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000)
    return () => clearInterval(timer)
  }, [])

  // API Data
  const { data: quoteData, isLoading: quotesLoading, refetch: refetchQuotes } = useMarketQuotes(
    selectedIndex,
    selectedIndex !== 'TICKER'
  )
  const { data: tickerData, isLoading: tickerLoading, refetch: refetchTicker } = useMarketIndices()
  const { data: simulatedData, isLoading: simLoading, refetch: refetchSim } = useSimulatedPortfolio('1d')

  const isTickerUniverse = selectedIndex === 'TICKER'
  const tickerStocks = useMemo(() => (tickerData?.indices ?? []).map((stock) => {
    const rawName = stock.name || ''
    const cleanName =
      rawName === 'MSCI Emergentes' || rawName === 'Emegentes'
        ? 'Emergentes'
        : rawName === 'Euro Stoxx 50'
        ? 'Euro 50'
        : rawName.startsWith('Petróleo')
        ? 'Petróleo'
        : rawName

    return {
      ...stock,
      name: cleanName,
      sector: stock.sector?.startsWith('Materia') ? 'Materias primas' : stock.sector || 'Índices',
    }
  }), [tickerData?.indices])

  const stocks = isTickerUniverse ? tickerStocks : (quoteData?.stocks ?? [])
  const isLoading = isTickerUniverse ? tickerLoading : quotesLoading

  // Available sectors in the current universe
  const sectors = useMemo(() => {
    const set = new Set<string>()
    stocks.forEach((s) => {
      if (s.sector) set.add(s.sector)
    })
    return ['Todos', ...Array.from(set).sort()]
  }, [stocks])

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return stocks.filter((s) => {
      if (selectedSector !== 'Todos' && s.sector !== selectedSector) return false
      if (q) {
        const name = (s.name || '').toLowerCase()
        const ticker = (s.ticker || '').toLowerCase()
        return name.includes(q) || ticker.includes(q)
      }
      return true
    })
  }, [stocks, selectedSector, searchQuery])

  // Key Ticker items sorted for the top ribbon
  const ribbonStocks = useMemo(() => {
    const list = tickerStocks.length > 0 ? tickerStocks : (quoteData?.stocks ?? [])
    return [...list].sort((a, b) => {
      const idxA = TICKER_ORDER.indexOf(a.ticker)
      const idxB = TICKER_ORDER.indexOf(b.ticker)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return 0
    })
  }, [tickerStocks, quoteData?.stocks])

  // Calculate market session states
  const sessionStatuses = useMemo(() => {
    const utcHours = currentTime.getUTCHours()
    const utcMinutes = currentTime.getUTCMinutes()
    const currentMinutes = utcHours * 60 + utcMinutes

    return MARKET_SESSIONS.map((session) => {
      const openMinutes = session.openUtcHour * 60 + session.openUtcMin
      const closeMinutes = session.closeUtcHour * 60 + session.closeUtcMin

      let isOpen = false
      let isPre = false

      if (openMinutes < closeMinutes) {
        isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes
        isPre = currentMinutes >= openMinutes - 60 && currentMinutes < openMinutes
      } else {
        // Crosses midnight UTC
        isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes
        isPre = (currentMinutes >= openMinutes - 60 && currentMinutes < openMinutes)
      }

      return {
        ...session,
        isOpen,
        isPre,
      }
    })
  }, [currentTime])

  const handleRefreshAll = () => {
    refetchTicker()
    refetchQuotes()
    refetchSim()
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ─────────────────────────────────────────────────────────────
          HEADER & ACTIONS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="au-eyebrow text-teal-400">PULSO GLOBAL & SIMULADOR EN VIVO</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--au-text)] font-['Inter_Tight',sans-serif]">
            Mercados Financieros
          </h1>
          <p className="text-xs sm:text-sm text-[var(--au-muted)] mt-0.5">
            Cotizaciones mundiales en tiempo real, mapa de sesiones e impacto estimado en tu cartera.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--au-text)] bg-[var(--au-card)] border border-[var(--au-border)] hover:border-teal-500/40 hover:bg-[var(--au-card-hover)] transition-all shadow-sm active:scale-95"
            title="Refrescar cotizaciones"
          >
            <RefreshCw size={14} className={cn((tickerLoading || quotesLoading || simLoading) && 'animate-spin text-teal-400')} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TICKER CAROUSEL RIBBON
          ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2.5 min-w-max pb-1">
          {ribbonStocks.slice(0, 11).map((st) => {
            const isPos = (st.change_pct ?? 0) >= 0
            return (
              <button
                key={st.ticker}
                onClick={() => setSelectedStock(st)}
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl au-card au-card-hover text-left transition-all border-[var(--au-border)] hover:border-teal-500/40 active:scale-95 group"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[var(--au-text)] group-hover:text-teal-400 transition-colors">
                      {st.name || st.ticker}
                    </span>
                    <span className="text-[10px] text-[var(--au-muted)] font-mono">
                      {st.ticker}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-medium text-[var(--au-text-2)] tabular-nums">
                    {st.price !== undefined ? fmt.currency(st.price, st.currency || 'USD') : '—'}
                  </span>
                </div>

                <div
                  className={cn(
                    'flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-bold font-mono tabular-nums',
                    isPos
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  )}
                >
                  {isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  <span>{st.change_pct !== undefined ? fmt.pct(st.change_pct) : '0.00%'}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          DOUBLE HERO ROW: GLOBAL SESSIONS MAP + PORTFOLIO IMPACT
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* GLOBAL SESSIONS TIMELINE (5 cols) */}
        <AuroraCard
          className="lg:col-span-5"
          title="Mapa de Sesiones Mundiales"
          subtitle="Horarios de negociación global y estado en directo"
          eyebrow="RELOJ MUNDIAL 24H"
          action={
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--au-muted)]">
              <Clock size={12} />
              <span>{currentTime.toISOString().substring(11, 16)} UTC</span>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Session cards */}
            <div className="space-y-2.5">
              {sessionStatuses.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border transition-all',
                    session.isOpen
                      ? 'bg-teal-500/5 border-teal-500/30 shadow-[0_0_12px_rgba(45,212,191,0.08)]'
                      : session.isPre
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-[var(--au-chip)] border-[var(--au-border)] opacity-75'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{session.flag}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--au-text)]">
                          {session.name}
                        </span>
                        <span className="text-[10px] text-[var(--au-muted)]">
                          ({session.cities})
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--au-muted)] font-mono">
                        {String(session.openUtcHour).padStart(2, '0')}:{String(session.openUtcMin).padStart(2, '0')} -{' '}
                        {String(session.closeUtcHour).padStart(2, '0')}:{String(session.closeUtcMin).padStart(2, '0')} UTC
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {session.isOpen ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                        ABIERTO
                      </span>
                    ) : session.isPre ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        PRE-MERCADO
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--au-chip)] text-[var(--au-muted)] border border-[var(--au-border)]">
                        CERRADO
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 24-Hour continuous visual track */}
            <div className="pt-2">
              <div className="flex justify-between text-[10px] font-mono text-[var(--au-muted)] mb-1">
                <span>00:00</span>
                <span>06:00 (Asia)</span>
                <span>12:00 (Europa)</span>
                <span>18:00 (EE.UU.)</span>
                <span>24:00</span>
              </div>
              <div className="relative h-3 rounded-full bg-[var(--au-chip)] overflow-hidden border border-[var(--au-border)]">
                {/* Asia span */}
                <div
                  className="absolute top-0 bottom-0 bg-teal-500/20 border-r border-teal-500/40"
                  style={{ left: '0%', width: '33.3%' }}
                  title="Asia (00:00 - 08:00 UTC)"
                />
                {/* Europe span */}
                <div
                  className="absolute top-0 bottom-0 bg-violet-500/20 border-r border-violet-500/40"
                  style={{ left: '33.3%', width: '35.4%' }}
                  title="Europa (08:00 - 16:30 UTC)"
                />
                {/* US span */}
                <div
                  className="absolute top-0 bottom-0 bg-sky-500/20"
                  style={{ left: '56.25%', width: '27.1%' }}
                  title="EE.UU. (13:30 - 20:00 UTC)"
                />

                {/* Current UTC time pointer */}
                {(() => {
                  const pct = ((currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes()) / 1440) * 100
                  return (
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] z-10"
                      style={{ left: `${pct}%` }}
                      title={`Ahora: ${currentTime.toISOString().substring(11, 16)} UTC`}
                    />
                  )
                })()}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--au-muted)] mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Marcador amarillo: posición horaria actual</span>
                </span>
                <span className="font-mono text-amber-400">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Local
                </span>
              </div>
            </div>
          </div>
        </AuroraCard>

        {/* ESTIMATED PORTFOLIO INTRADAY IMPACT (7 cols) */}
        <AuroraCard
          className="lg:col-span-7"
          title="Impacto Estimado en Tu Cartera Hoy"
          subtitle="Simulación intradía impulsada por futuros y proxies de mercado"
          eyebrow="SIMULADOR EN DIRECTO"
          badge={
            simulatedData?.summary?.market_state ? (
              <AuroraBadge variant="accent" size="sm">
                {simulatedData.summary.market_state}
              </AuroraBadge>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {/* Big Impact Highlight Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-br from-teal-500/10 via-transparent to-violet-500/10 border border-teal-500/20">
              <div>
                <span className="text-[11px] font-semibold text-[var(--au-muted)] uppercase tracking-wider">
                  Variación Diaria Estimada
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span
                    className={cn(
                      'text-3xl sm:text-4xl font-extrabold tracking-tight font-mono tabular-nums',
                      (simulatedData?.summary?.simulated_daily_pct ?? 0) >= 0 ? 'text-teal-400' : 'text-rose-400'
                    )}
                  >
                    <CountUp
                      value={simulatedData?.summary?.simulated_daily_amount ?? 0}
                      formatter={(v) => fmt.currency(v)}
                    />
                  </span>
                  <AuroraBadge
                    variant={(simulatedData?.summary?.simulated_daily_pct ?? 0) >= 0 ? 'gain' : 'loss'}
                    size="md"
                  >
                    {fmt.pct(simulatedData?.summary?.simulated_daily_pct ?? 0)}
                  </AuroraBadge>
                </div>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--au-border)]">
                <span className="text-[11px] text-[var(--au-muted)] block">Valor estimado hoy</span>
                <span className="text-lg font-bold font-mono tabular-nums text-[var(--au-text)]">
                  {fmt.currency(simulatedData?.summary?.total_value ?? 0)}
                </span>
                <span className="text-[10px] text-[var(--au-muted)] block mt-0.5">
                  Sesión: {simulatedData?.summary?.session_display || 'En curso'}
                </span>
              </div>
            </div>

            {/* Proxy Movers Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--au-text)] flex items-center gap-1.5">
                  <Layers size={13} className="text-teal-400" />
                  Desglose de ETFs / Proxies de Cobertura
                </span>
                <span className="text-[10px] text-[var(--au-muted)]">
                  Peso e impacto en cartera
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {(simulatedData?.etfs_summary ?? []).slice(0, 6).map((etf) => {
                  const isPos = (etf.change_pct ?? 0) >= 0
                  const totalVal = simulatedData?.summary?.total_value ?? 0
                  const impactAmount = (totalVal * (etf.weight / 100) * ((etf.change_pct ?? 0) / 100))
                  return (
                    <div
                      key={etf.ticker}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] hover:border-teal-500/30 transition-all text-xs"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--au-text)] truncate">
                            {etf.name || etf.ticker}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--au-muted)]">
                            {etf.ticker}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--au-muted)]">
                          Peso en cartera: {fmt.pct(etf.weight, false)}
                        </span>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className={cn(
                            'font-mono font-bold tabular-nums',
                            isPos ? 'text-teal-400' : 'text-rose-400'
                          )}
                        >
                          {fmt.pct(etf.change_pct ?? 0)}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--au-muted)] tabular-nums">
                          {fmt.currency(impactAmount)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Context Note */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--au-card-solid)] border border-[var(--au-border)] text-xs text-[var(--au-muted)]">
              <Info size={14} className="text-teal-400 shrink-0 mt-0.5" />
              <span>
                Los fondos de inversión indexados actualizan su valor liquidativo (NAV) una vez al día con retardo.
                Esta tarjeta modela en tiempo real el comportamiento estimado basándose en los índices y futuros subyacentes.
              </span>
            </div>
          </div>
        </AuroraCard>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          EXPLORER: UNIVERSE TABS, SEARCH, FILTERS & VIEW MODES
          ───────────────────────────────────────────────────────────── */}
      <AuroraCard className="p-0 overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-5 border-b border-[var(--au-border)] space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Segmented Universe Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] overflow-x-auto no-scrollbar">
              {INDEX_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedIndex(tab.id)
                    setSelectedSector('Todos')
                  }}
                  className={cn(
                    'relative px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                    selectedIndex === tab.id
                      ? 'text-teal-400 font-bold bg-[var(--au-card-solid)] shadow-sm'
                      : 'text-[var(--au-muted)] hover:text-[var(--au-text)]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Mode Controls */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] self-start lg:self-auto">
              <button
                onClick={() => setViewMode('split')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  viewMode === 'split'
                    ? 'bg-[var(--au-card-solid)] text-teal-400 font-bold shadow-sm'
                    : 'text-[var(--au-muted)] hover:text-[var(--au-text)]'
                )}
                title="Vista Dividida (Heatmap + Lista)"
              >
                <Columns2 size={14} />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  viewMode === 'heatmap'
                    ? 'bg-[var(--au-card-solid)] text-teal-400 font-bold shadow-sm'
                    : 'text-[var(--au-muted)] hover:text-[var(--au-text)]'
                )}
                title="Treemap Mapa de Calor"
              >
                <Flame size={14} />
                <span className="hidden sm:inline">Heatmap</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  viewMode === 'grid'
                    ? 'bg-[var(--au-card-solid)] text-teal-400 font-bold shadow-sm'
                    : 'text-[var(--au-muted)] hover:text-[var(--au-text)]'
                )}
                title="Cuadrícula de Tarjetas"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  viewMode === 'table'
                    ? 'bg-[var(--au-card-solid)] text-teal-400 font-bold shadow-sm'
                    : 'text-[var(--au-muted)] hover:text-[var(--au-text)]'
                )}
                title="Tabla Detallada"
              >
                <ListIcon size={14} />
                <span className="hidden sm:inline">Tabla</span>
              </button>
            </div>
          </div>

          {/* Search and Sector filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--au-muted)]" />
              <input
                type="text"
                placeholder="Buscar activo por nombre o ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[var(--au-chip)] border border-[var(--au-border)] text-[var(--au-text)] placeholder-[var(--au-muted)] focus:outline-none focus:border-teal-500/50 transition-all"
              />
            </div>

            {/* Sector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {sectors.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSector(sec)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all border',
                    selectedSector === sec
                      ? 'bg-teal-500/15 text-teal-400 border-teal-500/30 font-bold'
                      : 'bg-[var(--au-chip)] text-[var(--au-muted)] border-[var(--au-border)] hover:text-[var(--au-text)]'
                  )}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Explorer Content */}
        <div className="p-4 sm:p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw size={24} className="animate-spin text-teal-400" />
              <p className="text-xs text-[var(--au-muted)]">Cargando cotizaciones y gráficos en tiempo real...</p>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="text-center py-16 text-xs text-[var(--au-muted)]">
              No se han encontrado activos que coincidan con la búsqueda.
            </div>
          ) : (
            <>
              {/* SPLIT VIEW (Heatmap left + List right) */}
              {viewMode === 'split' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                  <div className="xl:col-span-7 h-[580px] rounded-2xl overflow-hidden border border-[var(--au-border)] bg-[var(--au-card-solid)]">
                    <MarketHeatmap
                      stocks={filteredStocks}
                      onSelectStock={setSelectedStock}
                      selectedSector={selectedSector}
                      onSectorChange={setSelectedSector}
                      isIndices={isTickerUniverse}
                    />
                  </div>

                  <div className="xl:col-span-5 h-[580px] overflow-y-auto space-y-2 pr-1">
                    {filteredStocks.map((st) => (
                      <StockCardItem
                        key={st.ticker}
                        stock={st}
                        onClick={() => setSelectedStock(st)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* HEATMAP ONLY */}
              {viewMode === 'heatmap' && (
                <div className="h-[650px] rounded-2xl overflow-hidden border border-[var(--au-border)] bg-[var(--au-card-solid)]">
                  <MarketHeatmap
                    stocks={filteredStocks}
                    onSelectStock={setSelectedStock}
                    selectedSector={selectedSector}
                    onSectorChange={setSelectedSector}
                    isIndices={isTickerUniverse}
                  />
                </div>
              )}

              {/* GRID VIEW */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {filteredStocks.map((st) => (
                    <StockCardItem
                      key={st.ticker}
                      stock={st}
                      onClick={() => setSelectedStock(st)}
                    />
                  ))}
                </div>
              )}

              {/* TABLE VIEW */}
              {viewMode === 'table' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--au-border)] text-[var(--au-muted)]">
                        <th className="py-2.5 px-3 font-semibold">Activo</th>
                        <th className="py-2.5 px-3 font-semibold">Sector</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Precio</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Var. Diaria</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Cap. Mercado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--au-border)]">
                      {filteredStocks.map((st) => {
                        const isPos = (st.change_pct ?? 0) >= 0
                        return (
                          <tr
                            key={st.ticker}
                            onClick={() => setSelectedStock(st)}
                            className="hover:bg-[var(--au-chip)] cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <CompanyLogo
                                  ticker={st.ticker}
                                  name={st.name}
                                  className="w-7 h-7 rounded-lg"
                                />
                                <div>
                                  <div className="font-bold text-[var(--au-text)]">{st.name || st.ticker}</div>
                                  <div className="text-[10px] font-mono text-[var(--au-muted)]">{st.ticker}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[var(--au-muted)]">{st.sector || '—'}</td>
                            <td className="py-3 px-3 text-right font-mono font-medium text-[var(--au-text)] tabular-nums">
                              {st.price !== undefined ? fmt.currency(st.price, st.currency || 'USD') : '—'}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-mono font-bold text-xs tabular-nums',
                                  isPos
                                    ? 'bg-teal-500/10 text-teal-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                )}
                              >
                                {fmt.pct(st.change_pct ?? 0)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-[var(--au-muted)] tabular-nums">
                              {st.market_cap ? fmt.volume(st.market_cap) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </AuroraCard>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  )
}

function StockCardItem({ stock, onClick }: { stock: MarketStock; onClick: () => void }) {
  const isPos = (stock.change_pct ?? 0) >= 0

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3.5 rounded-xl au-card au-card-hover border-[var(--au-border)] hover:border-teal-500/40 cursor-pointer transition-all active:scale-98 group"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <CompanyLogo
          ticker={stock.ticker}
          name={stock.name}
          className="w-9 h-9 rounded-xl shadow-sm shrink-0"
        />
        <div className="min-w-0">
          <div className="font-bold text-xs text-[var(--au-text)] truncate group-hover:text-teal-400 transition-colors">
            {stock.name || stock.ticker}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono text-[var(--au-muted)]">{stock.ticker}</span>
            {stock.sector && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--au-chip)] text-[var(--au-muted)] truncate max-w-[100px]">
                {stock.sector}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <span className="text-xs font-mono font-bold text-[var(--au-text)] tabular-nums">
          {stock.price !== undefined ? fmt.currency(stock.price, stock.currency || 'USD') : '—'}
        </span>
        <div
          className={cn(
            'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono tabular-nums mt-1',
            isPos ? 'bg-teal-500/10 text-teal-400' : 'bg-rose-500/10 text-rose-400'
          )}
        >
          {isPos ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          <span>{fmt.pct(stock.change_pct ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}
