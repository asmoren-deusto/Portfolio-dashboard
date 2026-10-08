import React, { useState } from 'react'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { useMarketIndices, type MarketStock } from '@/api/queries'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { CompanyLogo } from '@/components/ui/CompanyLogo'

interface MarketTickerProps {
  onSelectStock?: (stock: MarketStock) => void
}

function formatTickerName(name: string): string {
  if (name === 'MSCI Emergentes' || name === 'Emegentes') return 'Emergentes'
  if (name === 'Euro Stoxx 50') return 'Euro 50'
  if (name === 'Petróleo Brent' || name.startsWith('Petróleo')) return 'Petróleo'
  return name
}

function getAssetDomain(name: string, ticker: string): string {
  if (name.includes('S&P') || ticker === '^GSPC') return 'spglobal.com'
  if (name.includes('NASDAQ') || ticker === '^IXIC') return 'nasdaq.com'
  if (name.includes('MSCI') || name.includes('Emergentes') || ticker === 'URTH' || ticker === 'EEM') return 'msci.com'
  if (name.includes('IBEX') || ticker === '^IBEX') return 'bolsasymercados.es'
  if (name === 'Euro 50' || name.includes('Stoxx') || ticker === '^STOXX50E') return 'stoxx.com'
  if (name.includes('Nikkei') || ticker === '^N225') return 'nikkei.com'
  if (name.includes('Oro') || ticker === 'GC=F') return 'gold.org'
  if (name.includes('Brent') || name.includes('Petróleo') || ticker === 'BZ=F') return 'theice.com'
  if (name.includes('BTC') || ticker.includes('BTC')) return 'bitcoin.org'
  if (name.includes('EUR/USD') || ticker === 'EURUSD=X') return 'ecb.europa.eu'
  if (name.includes('EUR/JPY') || ticker === 'EURJPY=X') return 'boj.or.jp'
  return 'finance.yahoo.com'
}

function getAssetLogo(name: string, ticker: string): string | undefined {
  // Crypto (preserved as requested)
  if (name.includes('BTC') || ticker.includes('BTC'))
    return 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'

  // Commodities: classic gold bars & clean petroleum
  if (name.includes('Oro') || ticker === 'GC=F')
    return 'https://img.icons8.com/color/48/gold-bars.png'
  if (name.includes('Brent') || name.includes('Petróleo') || ticker === 'BZ=F')
    return 'https://img.icons8.com/color/48/oil-industry.png'

  // US Indices:
  // NASDAQ (preserved as requested)
  if (name.includes('NASDAQ') || ticker === '^IXIC')
    return 'https://logo.clearbit.com/nasdaq.com'
  // S&P 500: clean official S&P Global logo
  if (name.includes('S&P') || ticker === '^GSPC')
    return 'https://logo.clearbit.com/spglobal.com'

  // Global / MSCI World & Emergentes: World / UN international emblem
  if (name.includes('MSCI') || name.includes('Emergentes') || ticker === 'URTH' || ticker === 'EEM')
    return 'https://flagcdn.com/w80/un.png'

  // European Indices:
  // IBEX 35: Flag of Spain 🇪🇸 (crisp high-res, matching forex currency style)
  if (name.includes('IBEX') || ticker === '^IBEX')
    return 'https://flagcdn.com/w80/es.png'
  // Euro 50 / Euro Stoxx 50: Flag of the European Union 🇪🇺
  if (name === 'Euro 50' || name.includes('Stoxx') || ticker === '^STOXX50E')
    return 'https://flagcdn.com/w80/eu.png'

  // Asian Indices:
  // Nikkei 225: Flag of Japan 🇯🇵 (crisp high-res)
  if (name.includes('Nikkei') || ticker === '^N225')
    return 'https://flagcdn.com/w80/jp.png'

  // Forex currencies (preserved as requested)
  if (name.includes('EUR/USD') || ticker === 'EURUSD=X')
    return 'https://flagcdn.com/w80/us.png'
  if (name.includes('EUR/JPY') || ticker === 'EURJPY=X')
    return 'https://flagcdn.com/w80/jp.png'

  return undefined
}

function normalizeStock(idx: any): MarketStock {
  const cleanName = formatTickerName(idx.name)
  const sectorMap: Record<string, string> = {
    'S&P 500': 'Índice Bursátil USA',
    'NASDAQ': 'Índice Tecnológico',
    'MSCI World': 'Índice Global Desarrollado',
    'Emergentes': 'Índice Mercados Emergentes',
    'MSCI Emergentes': 'Índice Mercados Emergentes',
    'IBEX 35': 'Índice Bursátil España',
    'Euro 50': 'Índice Bursátil Europeo',
    'Euro Stoxx 50': 'Índice Bursátil Europeo',
    'Nikkei 225': 'Índice Bursátil Japón',
    'Oro': 'Materia Prima (Metales)',
    'Petróleo': 'Materia Prima (Energía)',
    'Petróleo Brent': 'Materia Prima (Energía)',
    'BTC/EUR': 'Criptoactivo',
    'EUR/USD': 'Mercado de Divisas (Forex)',
    'EUR/JPY': 'Mercado de Divisas (Forex)',
  }
  const price = typeof idx.price === 'number' ? idx.price : 0
  const chgPct = typeof idx.change_pct === 'number' ? idx.change_pct : 0
  const prevClose =
    typeof idx.prev_close === 'number'
      ? idx.prev_close
      : price > 0
      ? price / (1 + chgPct / 100)
      : 0
  const chg = typeof idx.change === 'number' ? idx.change : price - prevClose

  const domain = idx.domain || getAssetDomain(cleanName, idx.ticker || '')
  const logo = idx.logo_url || getAssetLogo(cleanName, idx.ticker || '') || ''

  return {
    name: cleanName,
    ticker: idx.ticker,
    domain: domain,
    sector: idx.sector || sectorMap[cleanName] || sectorMap[idx.name] || 'Índice de Mercado',
    index: idx.index || [cleanName],
    price: price,
    regular_price: idx.regular_price ?? null,
    pre_market_price: idx.pre_market_price ?? null,
    post_market_price: idx.post_market_price ?? null,
    market_state: idx.market_state || 'REGULAR',
    pre_market_change_pct: idx.pre_market_change_pct ?? null,
    post_market_change_pct: idx.post_market_change_pct ?? null,
    change: chg,
    change_pct: chgPct,
    prev_close: prevClose,
    day_high: typeof idx.day_high === 'number' ? idx.day_high : price > 0 ? price * 1.008 : 0,
    day_low: typeof idx.day_low === 'number' ? idx.day_low : price > 0 ? price * 0.992 : 0,
    volume: typeof idx.volume === 'number' ? idx.volume : 2400000000,
    currency: idx.currency || (['^IBEX', '^GDAXI', '^STOXX50E', 'BTC-EUR'].includes(idx.ticker) || idx.name === 'BTC/EUR' || cleanName === 'Euro 50' || idx.name.includes('Euro Stoxx') || idx.name === 'IBEX 35' ? 'EUR' : ['^N225', 'EURJPY=X'].includes(idx.ticker) || idx.name.includes('JPY') || idx.name.includes('Nikkei') ? 'JPY' : 'USD'),
    market_cap: idx.market_cap || null,
    logo_url: idx.logo_url || '',
    last_updated: idx.last_updated || null,
  }
}

function fmtPrice(price: number, ticker?: string): string {
  if (ticker === 'EURUSD=X') {
    return price.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }
  return price >= 1000
    ? price.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    : price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function fmtUpdated(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Badge for extended-hours state */
function MarketStateBadge({ state, name }: { state: string; name?: string }) {
  if (state === 'REGULAR') return null
  const isForeign =
    name?.includes('IBEX') ||
    name?.includes('Stoxx') ||
    name === 'Euro 50' ||
    name?.includes('DAX')
  const effectiveState = isForeign && (state === 'POST' || state === 'POSTPOST') ? 'CLOSED' : state

  const labels: Record<string, string> = {
    PRE: 'Pre',
    POST: 'Post',
    POSTPOST: 'Post',
    FUTURES: 'FUTURES',
    OVERNIGHT: 'FUTURES',
    CLOSED: 'Closed',
  }
  const tooltips: Record<string, string> = {
    PRE: 'Pre-mercado',
    POST: 'Post-mercado',
    POSTPOST: 'Post-mercado',
    FUTURES: 'Mercado de Futuros en Tiempo Real',
    OVERNIGHT: 'Mercado de Futuros (Overnight)',
    CLOSED: 'Mercado Cerrado',
  }
  const colors: Record<string, string> = {
    PRE: 'bg-amber-100/95 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    POST: 'bg-purple-100/95 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
    POSTPOST: 'bg-purple-100/95 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
    FUTURES: 'bg-sky-50/90 text-sky-700 border-sky-200/90 dark:bg-sky-500/10 dark:text-sky-300/90 dark:border-sky-500/20',
    OVERNIGHT: 'bg-sky-50/90 text-sky-700 border-sky-200/90 dark:bg-sky-500/10 dark:text-sky-300/90 dark:border-sky-500/20',
    CLOSED: 'bg-slate-200/95 text-slate-700 border-slate-300 dark:bg-slate-800/95 dark:text-slate-300 dark:border-slate-600',
  }
  const cls = colors[effectiveState] || colors.CLOSED
  return (
    <span
      title={tooltips[effectiveState] || effectiveState}
      className={`absolute -top-1.5 right-1 z-10 inline-flex items-center text-[7px] font-bold uppercase tracking-tight px-1 py-[1.5px] rounded-full border shadow-2xs leading-none backdrop-blur-xs select-none ${cls}`}
    >
      {labels[effectiveState] || effectiveState}
    </span>
  )
}

export const MarketTicker: React.FC<MarketTickerProps> = ({ onSelectStock }) => {
  const { data, isLoading, dataUpdatedAt } = useMarketIndices()
  const [internalSelectedStock, setInternalSelectedStock] = useState<MarketStock | null>(null)

  const defaultIndices = [
    { name: 'S&P 500', ticker: '^GSPC', price: 7722.62, change_pct: 0.24, market_state: 'CLOSED' },
    { name: 'NASDAQ', ticker: '^IXIC', price: 27049.82, change_pct: 0.41, market_state: 'CLOSED' },
    { name: 'MSCI World', ticker: 'URTH', price: 208.39, change_pct: 0.15, market_state: 'CLOSED' },
    { name: 'Emergentes', ticker: 'EEM', price: 67.79, change_pct: 0.80, market_state: 'CLOSED' },
    { name: 'IBEX 35', ticker: '^IBEX', price: 19750.20, change_pct: 0.90, market_state: 'CLOSED' },
    { name: 'Euro 50', ticker: '^STOXX50E', price: 6308.78, change_pct: 0.55, market_state: 'CLOSED' },
    { name: 'Nikkei 225', ticker: '^N225', price: 66364.20, change_pct: 0.77, market_state: 'CLOSED' },
    { name: 'Oro', ticker: 'GC=F', price: 4331.20, change_pct: 0.77, market_state: 'CLOSED' },
    { name: 'Petróleo', ticker: 'BZ=F', price: 98.43, change_pct: -1.79, market_state: 'CLOSED' },
    { name: 'BTC/EUR', ticker: 'BTC-EUR', price: 74066.85, change_pct: -0.16, market_state: 'REGULAR' },
    { name: 'EUR/USD', ticker: 'EURUSD=X', price: 1.1406, change_pct: 0.23, market_state: 'CLOSED' },
    { name: 'EUR/JPY', ticker: 'EURJPY=X', price: 179.05, change_pct: -0.87, market_state: 'CLOSED' },
  ]

  // Market hours in UTC:
  // Saturday all day = CLOSED
  // Sunday before 22:00 UTC (18:00 ET when Globex futures open) = CLOSED
  // Friday night after 21:00 UTC (post-market close) = CLOSED
  const nowUTC = new Date()
  const utcDay = nowUTC.getUTCDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const utcHour = nowUTC.getUTCHours() + nowUTC.getUTCMinutes() / 60
  const isWeekend = utcDay === 6 || (utcDay === 0 && utcHour < 22) || (utcDay === 5 && utcHour >= 21)

  const rawList = data?.indices && data.indices.length > 0 ? data.indices : defaultIndices
  const rawIndices = rawList.map((idx: any) => {
    const isCrypto = idx.ticker?.includes('BTC') || idx.name?.includes('BTC')
    let state = idx.market_state
    if (isWeekend && !isCrypto) {
      state = 'CLOSED'
    } else if (state === 'PRE' && idx.pre_market_price == null && idx.price == null) {
      state = 'CLOSED'
    }
    return {
      ...idx,
      name: formatTickerName(idx.name),
      market_state: state,
    }
  })

  // Status determined by active US and European equity session
  const sp500 = rawIndices.find((i: any) => i.name === 'S&P 500' || i.ticker === '^GSPC')
  const usState = isWeekend ? 'CLOSED' : (sp500?.market_state || 'REGULAR')

  const mainStatusLabel =
    isWeekend ? 'Cerrado' :
    usState === 'REGULAR' ? 'En Vivo' :
    usState === 'PRE' ? 'Pre-mercado' :
    (usState === 'POST' || usState === 'POSTPOST') ? 'Post-mercado' :
    (usState === 'FUTURES' || usState === 'OVERNIGHT') ? 'FUTURES' :
    'Cerrado'

  // Last updated = from cache_timestamp if available, else most recent per-ticker timestamp
  const lastUpdated: string | null = data?.cache_timestamp ??
    (rawIndices as any[]).reduce((latest: string | null, i: any) => {
      if (!i.last_updated) return latest
      if (!latest) return i.last_updated
      return i.last_updated > latest ? i.last_updated : latest
    }, null)

  const handleCardClick = (idx: any) => {
    const stockObj = normalizeStock(idx)
    if (onSelectStock) {
      onSelectStock(stockObj)
    } else {
      setInternalSelectedStock(stockObj)
    }
  }

  const isMarketClosed = mainStatusLabel === 'Cerrado'

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-white/95 border border-slate-200/80 shadow-card hover:shadow-card-hover backdrop-blur-md px-3.5 py-1.5 dark:bg-[#1e1e1e]/96 dark:border-white/[0.08] dark:hover:border-white/[0.14] transition-all duration-200">
        <div className="flex items-center">
          {/* Live Indicator (Fixed on left) */}
          <div className="flex items-center gap-2 pl-0.5 pr-3 border-r border-slate-200/80 dark:border-white/10 shrink-0 z-20 bg-white/95 dark:bg-[#1e1e1e]/96">
            {mainStatusLabel === 'Cerrado' ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="inline-flex rounded-full h-2 w-2 bg-slate-400 dark:bg-slate-500" />
              </span>
            ) : mainStatusLabel === 'Pre-mercado' ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute -inset-0.5 rounded-full bg-amber-500 opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            ) : mainStatusLabel === 'Post-mercado' ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute -inset-0.5 rounded-full bg-purple-500 opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
              </span>
            ) : mainStatusLabel === 'FUTURES' ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute -inset-0.5 rounded-full bg-sky-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
              </span>
            ) : (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute -inset-0.5 rounded-full bg-emerald-500 opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
            )}
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-semibold tracking-wider text-slate-800 dark:text-slate-100 uppercase">
                {mainStatusLabel}
              </span>
              {lastUpdated && (
                <span className="flex items-center gap-0.5 text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {fmtUpdated(lastUpdated)}
                </span>
              )}
            </div>
          </div>

          {/* Marquee Ticker Track (Rotates slowly, pauses on hover) */}
          <div className="relative flex-1 overflow-hidden ml-2 py-1 group">
            {/* Subtle fade edges for smooth transition */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white/95 dark:from-[#1e1e1e] to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/95 dark:from-[#1e1e1e] to-transparent z-10" />

            {/* Seamless scrolling marquee track */}
            <div className="animate-ticker-marquee flex items-center gap-2 pt-1 pb-0.5">
              {[...rawIndices, ...rawIndices].map((idx: any, index: number) => {
                const isPos = (idx.change_pct ?? 0) >= 0
                const state: string = idx.market_state || 'REGULAR'
                const extPrice: number | null =
                  state === 'PRE' ? (idx.pre_market_price ?? null) :
                  (state === 'POST' || state === 'POSTPOST') ? (idx.post_market_price ?? null) : null
                const domain = idx.domain || getAssetDomain(idx.name, idx.ticker || '')
                const logo = idx.logo_url || getAssetLogo(idx.name, idx.ticker || '')

                return (
                  <div
                    role="button"
                    tabIndex={0}
                    key={`${idx.name}-${index}`}
                    onClick={() => handleCardClick(idx)}
                    className="relative flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/90 hover:border-blue-400/60 shadow-xs hover:shadow-md transition-all shrink-0 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:border-white/[0.07] dark:hover:border-white/20 cursor-pointer active:scale-[0.98]"
                  >
                    {/* Floating Overlaid State Badge (Upper-right corner) */}
                    {state !== 'REGULAR' && (
                      <MarketStateBadge state={state} name={idx.name} />
                    )}

                    <CompanyLogo
                      ticker={idx.ticker || idx.name}
                      name={idx.name}
                      domain={domain}
                      logoUrl={logo}
                      size="xs"
                    />
                    {/* Name + price — always exactly 2 lines, no extra rows */}
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap leading-none">
                        {idx.name}
                      </span>
                      <span className="text-[11.5px] font-bold text-slate-900 tracking-tight dark:text-white mt-[3px] tabular-nums leading-none whitespace-nowrap">
                        {idx.price != null ? fmtPrice(idx.price, idx.ticker) : '—'}
                      </span>
                    </div>

                    {/* Change % badge — fixed height, no extra lines */}
                    <div
                      className={`flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md border shrink-0 ${
                        isPos
                          ? 'text-emerald-800 bg-emerald-50/90 border-emerald-300/80 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                          : 'text-rose-800 bg-rose-50/90 border-rose-300/80 dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/20'
                      }`}
                    >
                      {isPos ? (
                        <TrendingUp className="w-2.5 h-2.5 stroke-[2.5]" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5 stroke-[2.5]" />
                      )}
                      <span>
                        {isPos ? '+' : ''}{idx.change_pct?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal for Live Ticker items when managed internally */}
      {!onSelectStock && (
        <StockDetailModal
          stock={internalSelectedStock}
          onClose={() => setInternalSelectedStock(null)}
        />
      )}
    </>
  )
}
