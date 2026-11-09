import React, { useState, useMemo } from 'react'
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  Zap,
  Coins,
  ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { type MarketStock } from '@/api/queries'
import { fmt, cn } from '@/lib/utils'

export type RegionFilter = 'ALL' | 'EUROPE' | 'AMERICA' | 'ASIA_GLOBAL' | 'COMMODITIES_FX'

interface RegionDefinition {
  id: RegionFilter
  name: string
  flag: string
  label: string
  tickers: string[]
}

const REGIONS: RegionDefinition[] = [
  {
    id: 'EUROPE',
    name: 'Europa',
    flag: 'https://flagcdn.com/w40/eu.png',
    label: 'Bolsas Europeas',
    tickers: ['^IBEX', '^STOXX50E', '^GDAXI', '^FCHI', '^FTSE'],
  },
  {
    id: 'AMERICA',
    name: 'América',
    flag: 'https://flagcdn.com/w40/us.png',
    label: 'Wall Street & Norteamérica',
    tickers: ['^GSPC', '^IXIC', '^DJI'],
  },
  {
    id: 'ASIA_GLOBAL',
    name: 'Asia & Global',
    flag: 'https://flagcdn.com/w40/un.png',
    label: 'Asia, Pacífico e Índices Mundiales',
    tickers: ['^N225', '^HSI', 'URTH', 'EEM'],
  },
  {
    id: 'COMMODITIES_FX',
    name: 'Materias Primas & FX',
    flag: 'https://flagcdn.com/w40/eu.png',
    label: 'Metales, Energía y Divisas',
    tickers: ['GC=F', 'BZ=F', 'EURUSD=X', 'EURJPY=X', 'BTC-EUR'],
  },
]

const TICKER_FLAG_MAP: Record<string, { flag?: string; iconText?: string; country: string }> = {
  '^IBEX':     { flag: 'https://flagcdn.com/w40/es.png', country: 'España' },
  '^STOXX50E': { flag: 'https://flagcdn.com/w40/eu.png', country: 'Eurozona' },
  '^GDAXI':    { flag: 'https://flagcdn.com/w40/de.png', country: 'Alemania' },
  '^FCHI':     { flag: 'https://flagcdn.com/w40/fr.png', country: 'Francia' },
  '^FTSE':     { flag: 'https://flagcdn.com/w40/gb.png', country: 'Reino Unido' },
  '^GSPC':     { flag: 'https://flagcdn.com/w40/us.png', country: 'EE. UU.' },
  '^IXIC':     { flag: 'https://flagcdn.com/w40/us.png', country: 'EE. UU.' },
  '^DJI':      { flag: 'https://flagcdn.com/w40/us.png', country: 'EE. UU.' },
  '^N225':     { flag: 'https://flagcdn.com/w40/jp.png', country: 'Japón' },
  '^HSI':      { flag: 'https://flagcdn.com/w40/hk.png', country: 'Hong Kong' },
  'URTH':      { flag: 'https://flagcdn.com/w40/un.png', country: 'Mundo Desarrollado' },
  'EEM':       { flag: 'https://flagcdn.com/w40/un.png', country: 'Emergentes' },
  'GC=F':      { iconText: '🪙', country: 'Commodity' },
  'BZ=F':      { iconText: '🛢️', country: 'Commodity' },
  'EURUSD=X':  { iconText: '💶', country: 'Forex' },
  'EURJPY=X':  { iconText: '💴', country: 'Forex' },
  'BTC-EUR':   { iconText: '₿', country: 'Cripto' },
}

interface WorldMarketsRegionalCardProps {
  indices: MarketStock[]
  isLoading?: boolean
  onSelectIndex?: (index: MarketStock) => void
  onFilterUniverse?: (indexTabId: string) => void
  className?: string
}

export const WorldMarketsRegionalCard: React.FC<WorldMarketsRegionalCardProps> = ({
  indices,
  isLoading,
  onSelectIndex,
  onFilterUniverse,
  className,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('ALL')

  // Map indices by ticker for rapid regional access
  const indexMap = useMemo(() => {
    const map = new Map<string, MarketStock>()
    indices.forEach((idx) => {
      map.set(idx.ticker, idx)
    })
    return map
  }, [indices])

  // Count advancers vs decliners
  const stats = useMemo(() => {
    let up = 0
    let down = 0
    indices.forEach((idx) => {
      if ((idx.change_pct ?? 0) >= 0) up++
      else down++
    })
    return { up, down, total: indices.length }
  }, [indices])

  const regionsToDisplay = useMemo(() => {
    if (selectedRegion === 'ALL') return REGIONS
    return REGIONS.filter((r) => r.id === selectedRegion)
  }, [selectedRegion])

  return (
    <Card className={cn('w-full overflow-hidden', className)}>
      <CardHeader className="py-3 px-3.5 sm:px-4 border-b border-slate-200/80 dark:border-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Bolsas del Mundo & Cotizaciones Regionales
              </CardTitle>
              {stats.total > 0 && (
                <div className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20">
                    ▲ {stats.up} suben
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-500/20">
                    ▼ {stats.down} bajan
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Evolución comparativa por regiones, estado de sesión en tiempo real y cotizaciones directas
            </p>
          </div>
        </div>

        {/* Regional Filter Selector Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedRegion('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
              selectedRegion === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            )}
          >
            Todas
          </button>

          {REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRegion(r.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                selectedRegion === r.id
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              )}
            >
              <span>{r.name}</span>
            </button>
          ))}
        </div>
      </CardHeader>

      {/* Regional Content Sections */}
      <div className="p-3.5 sm:p-4 space-y-4">
        {regionsToDisplay.map((region) => {
          const regionStocks = region.tickers
            .map((t) => indexMap.get(t))
            .filter((s): s is MarketStock => s !== undefined)

          if (regionStocks.length === 0 && !isLoading) return null

          return (
            <div key={region.id} className="space-y-2.5">
              {/* Region Sub-header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  {region.flag && (
                    <img
                      src={region.flag}
                      alt={region.name}
                      className="w-4 h-3 rounded-2xs object-cover shadow-2xs border border-black/10 dark:border-white/10"
                    />
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {region.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    • {region.label}
                  </span>
                </div>
              </div>

              {/* Grid of Index Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                {regionStocks.map((stock) => {
                  const isPositive = (stock.change_pct ?? 0) >= 0
                  const meta = TICKER_FLAG_MAP[stock.ticker] || { country: '' }
                  const session = stock.market_state || 'CLOSED'
                  const isOpen = session === 'REGULAR'
                  const isFutures = session === 'FUTURES'
                  const isPrePost = session === 'PRE' || session === 'POST'

                  // Compute Day Range progress
                  const rangePct =
                    stock.day_high != null && stock.day_low != null && stock.day_high !== stock.day_low && stock.price != null
                      ? Math.max(0, Math.min(1, (stock.price - stock.day_low) / (stock.day_high - stock.day_low)))
                      : null

                  return (
                    <div
                      key={stock.ticker}
                      onClick={() => onSelectIndex?.(stock)}
                      className="group/idx p-3 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] hover:border-blue-500/50 dark:hover:border-blue-400/40 hover:bg-white dark:hover:bg-white/[0.04] transition-all cursor-pointer shadow-xs hover:shadow-md relative flex flex-col justify-between"
                    >
                      {/* Top: Flag + Name + Session Pill */}
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {meta.flag ? (
                              <img
                                src={meta.flag}
                                alt={meta.country}
                                className="w-3.5 h-2.5 rounded-2xs object-cover shrink-0 shadow-2xs"
                              />
                            ) : (
                              <span className="text-xs shrink-0">{meta.iconText}</span>
                            )}
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover/idx:text-blue-600 dark:group-hover/idx:text-blue-400 transition-colors">
                              {stock.name}
                            </span>
                          </div>

                          {/* Session status pill */}
                          <span
                            className={cn(
                              'text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-full border shrink-0',
                              isOpen
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                                : isFutures
                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 border-purple-300 dark:border-purple-500/30'
                                : isPrePost
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-300 dark:border-amber-500/30'
                                : 'bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400 border-slate-200 dark:border-white/[0.08]'
                            )}
                          >
                            {isOpen ? 'ABIERTO' : isFutures ? 'FUTUROS' : isPrePost ? 'PRE/POST' : 'CERRADO'}
                          </span>
                        </div>

                        {/* Ticker & Country subtitle */}
                        <div className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <span>{stock.ticker}</span>
                          {meta.country && <span>• {meta.country}</span>}
                        </div>
                      </div>

                      {/* Middle: Price + Variation */}
                      <div className="my-2.5 flex items-baseline justify-between gap-1">
                        <span className="font-mono font-extrabold text-base sm:text-lg text-slate-950 dark:text-white tracking-tight">
                          {stock.price ? fmt.num(stock.price, 2) : '—'}
                          <span className="text-[11px] font-normal text-slate-400 ml-1">
                            {stock.currency || 'EUR'}
                          </span>
                        </span>

                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 font-mono text-xs font-bold px-2 py-0.5 rounded-lg border tabular-nums shrink-0',
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-300/80 dark:border-emerald-500/30'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-300/80 dark:border-rose-500/30'
                          )}
                        >
                          {isPositive ? <TrendingUp className="w-3 h-3 stroke-[2.5]" /> : <TrendingDown className="w-3 h-3 stroke-[2.5]" />}
                          <span>{fmt.pct(stock.change_pct)}</span>
                        </span>
                      </div>

                      {/* Bottom: Day Range Visual Bar */}
                      {rangePct !== null && stock.day_low != null && stock.day_high != null ? (
                        <div className="pt-1.5 border-t border-slate-200/60 dark:border-white/[0.04]">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                            <span>{fmt.num(stock.day_low, 1)}</span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Rango Día</span>
                            <span>{fmt.num(stock.day_high, 1)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden relative">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-300',
                                isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                              )}
                              style={{ width: `${Math.round(rangePct * 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center justify-between text-[10.5px] text-slate-400 dark:text-slate-500 font-mono">
                          <span>Var. pts:</span>
                          <span className={cn('font-bold', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                            {stock.change ? `${stock.change > 0 ? '+' : ''}${fmt.num(stock.change, 2)}` : '—'}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
