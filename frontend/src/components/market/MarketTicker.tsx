import React, { useState, useRef, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { useMarketIndices, type MarketStock } from '@/api/queries'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { cn } from '@/lib/utils'
import { isNativePlatform } from '@/api/config'

interface MarketTickerProps {
  onSelectStock?: (stock: MarketStock) => void
  fullWidth?: boolean
  className?: string
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
  if (ticker === 'EURUSD=X' || (price > 0 && price < 5)) {
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
    FUTURES: 'Futures',
    OVERNIGHT: 'Futures',
    CLOSED: 'Cerrado',
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
    PRE: 'bg-amber-500/20 text-amber-400',
    POST: 'bg-purple-500/20 text-purple-400',
    POSTPOST: 'bg-purple-500/20 text-purple-400',
    FUTURES: 'bg-sky-500/20 text-sky-400',
    OVERNIGHT: 'bg-sky-500/20 text-sky-400',
    CLOSED: 'bg-slate-500/20 text-slate-400',
  }
  const cls = colors[effectiveState] || colors.CLOSED
  return (
    <span
      title={tooltips[effectiveState] || effectiveState}
      className={`text-[11px] font-bold font-mono uppercase tracking-tight px-2 py-0.5 rounded-md ml-0.5 shrink-0 leading-none select-none ${cls}`}
    >
      {labels[effectiveState] || effectiveState}
    </span>
  )
}

export const MarketTicker: React.FC<MarketTickerProps> = ({ onSelectStock, fullWidth = true, className }) => {
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
    { name: 'EUR/USD', ticker: 'EURUSD=X', price: 1.1210, change_pct: 0.29, market_state: 'CLOSED' },
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

  const NUM_SETS = 6
  const repeatedIndices = useMemo(() => {
    const sets = []
    for (let i = 0; i < NUM_SETS; i++) {
      sets.push(...rawIndices)
    }
    return sets
  }, [rawIndices])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isMouseDownRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const lastMouseXRef = useRef(0)
  const hasDraggedRef = useRef(false)
  const isHoveredRef = useRef(false)
  const isInteractingRef = useRef(false)
  const touchTimerRef = useRef<number | null>(null)
  const touchStartXRef = useRef(0)
  const currentScrollPosRef = useRef(0)
  const oneSetWidthRef = useRef(0)
  const isProgrammaticScrollRef = useRef(false)

  // Measure and cache set width to eliminate el.scrollWidth reads from 60fps RAF loop
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const updateSetWidth = () => {
      if (!el) return
      const w = el.scrollWidth / NUM_SETS
      if (w > 0) {
        oneSetWidthRef.current = w
      }
    }

    updateSetWidth()
    const ro = new ResizeObserver(updateSetWidth)
    ro.observe(el)

    return () => ro.disconnect()
  }, [rawIndices.length])

  // Auto-scroll loop using requestAnimationFrame (pauses when hovering, dragging, touching, or tab is hidden)
  useEffect(() => {
    const speed = 36 // pixels per second for a gentle, readable pace
    let lastTime = performance.now()
    let rafId: number

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      const el = scrollContainerRef.current
      if (
        el &&
        !document.hidden &&
        !isHoveredRef.current &&
        !isMouseDownRef.current &&
        !isInteractingRef.current
      ) {
        let oneSetWidth = oneSetWidthRef.current
        if (oneSetWidth <= 0) {
          oneSetWidth = el.scrollWidth / NUM_SETS
          oneSetWidthRef.current = oneSetWidth
        }

        if (oneSetWidth > 0) {
          currentScrollPosRef.current += speed * dt
          // Seamlessly loop inside middle sets (between set 2 and 3)
          if (currentScrollPosRef.current >= 3 * oneSetWidth) {
            currentScrollPosRef.current -= oneSetWidth
          }
          isProgrammaticScrollRef.current = true
          el.scrollLeft = currentScrollPosRef.current
        }
      }

      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Window mousemove and mouseup listeners for uninterrupted drag across the screen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || !scrollContainerRef.current) return
      const dx = e.pageX - lastMouseXRef.current
      if (Math.abs(e.pageX - startXRef.current) > 5) {
        hasDraggedRef.current = true
      }
      lastMouseXRef.current = e.pageX
      scrollContainerRef.current.scrollLeft -= dx
      currentScrollPosRef.current = scrollContainerRef.current.scrollLeft
    }

    const handleMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false
        setIsDragging(false)
        setTimeout(() => {
          hasDraggedRef.current = false
        }, 100)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Seamless wrap-around on scroll (infinite loop in both directions)
  const handleScroll = () => {
    // If scroll was triggered by the programmatic RAF ticker, bypass layout queries completely
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false
      return
    }

    const el = scrollContainerRef.current
    if (!el) return

    const oneSetWidth = oneSetWidthRef.current || (el.scrollWidth / NUM_SETS)
    if (oneSetWidth <= 0) return

    // Keep manual drag safely in the middle sets without ever hitting container bounds
    if (el.scrollLeft >= 4 * oneSetWidth) {
      el.scrollLeft -= 2 * oneSetWidth
    } else if (el.scrollLeft < 1 * oneSetWidth) {
      el.scrollLeft += 2 * oneSetWidth
    }

    currentScrollPosRef.current = el.scrollLeft
  }

  // Initial scroll position safely centered in the middle sets
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const setInitialScroll = () => {
      if (!el) return
      const oneSetWidth = oneSetWidthRef.current || (el.scrollWidth / NUM_SETS)
      if (oneSetWidth > 0 && (el.scrollLeft === 0 || el.scrollLeft < oneSetWidth)) {
        el.scrollLeft = 2 * oneSetWidth
        currentScrollPosRef.current = 2 * oneSetWidth
      }
    }
    setInitialScroll()
    const timer = setTimeout(setInitialScroll, 100)
    return () => clearTimeout(timer)
  }, [rawIndices.length])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !scrollContainerRef.current) return
    isMouseDownRef.current = true
    hasDraggedRef.current = false
    startXRef.current = e.pageX
    lastMouseXRef.current = e.pageX
    setIsDragging(true)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    isInteractingRef.current = true
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    touchStartXRef.current = e.touches[0].pageX
    hasDraggedRef.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (Math.abs(e.touches[0].pageX - touchStartXRef.current) > 6) {
      hasDraggedRef.current = true
    }
  }

  const handleTouchEnd = () => {
    touchTimerRef.current = window.setTimeout(() => {
      isInteractingRef.current = false
      hasDraggedRef.current = false
    }, 1500)
  }

  const handleCardClick = (idx: any) => {
    if (hasDraggedRef.current) return
    const stockObj = normalizeStock(idx)
    if (onSelectStock) {
      onSelectStock(stockObj)
    } else {
      setInternalSelectedStock(stockObj)
    }
  }

  const isMarketClosed = mainStatusLabel === 'Cerrado'
  const isNative = isNativePlatform()

  return (
    <>
      <div className={cn(
        "dark relative overflow-hidden w-full transition-all duration-200",
        fullWidth
          ? "rounded-none bg-[#202020] dark:bg-[#262626] text-white border-b border-white/[0.08] dark:border-white/[0.1] py-1.5 px-3 sm:px-4 md:px-7 shadow-xs"
          : "rounded-2xl bg-[#202020] dark:bg-[#262626] text-white border border-white/10 dark:border-white/[0.1] shadow-md py-1.5 px-3 sm:px-3.5",
        className
      )}>
        <div className="flex items-center">
          {/* Live Indicator (Fixed on left) */}
          <div
            className={cn(
              "flex items-center border-r border-white/10 dark:border-white/[0.1] shrink-0 z-20 bg-[#202020] dark:bg-[#262626]",
              isNative ? "pl-0 pr-2 gap-1.5" : "pr-3 sm:pr-3.5 gap-2"
            )}
            title={`${mainStatusLabel}${lastUpdated ? ` • ${fmtUpdated(lastUpdated)}` : ''}`}
          >
            <div className="flex items-center justify-center w-4 h-4 shrink-0">
              <span className="live-dot emerald" />
            </div>
            {!isNative && (
              <div className="flex items-center gap-1.5 pl-0.5">
                <span className="text-[11px] font-bold tracking-wider text-slate-200 uppercase whitespace-nowrap">
                  MERCADOS EN VIVO
                </span>
                {lastUpdated && (
                  <span className="hidden xl:flex items-center gap-0.5 text-[9px] text-slate-400 font-mono">
                    <Clock className="w-2.5 h-2.5 text-emerald-400" />
                    {fmtUpdated(lastUpdated)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Marquee Ticker Track (Draggable with mouse/hand, auto-scrolls, pauses on interaction) */}
          <div className={cn("relative flex-1 overflow-hidden py-0 group", isNative ? "ml-1.5" : "ml-2.5")}>
            {/* Subtle fade edges for smooth transition */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[#202020] dark:from-[#262626] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-[#202020] dark:from-[#262626] to-transparent" />

            {/* Seamless scrolling marquee track with interactive drag */}
            <div
              ref={scrollContainerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={() => {
                isHoveredRef.current = true
              }}
              onMouseLeave={() => {
                isHoveredRef.current = false
              }}
              onScroll={handleScroll}
              onDragStart={(e) => e.preventDefault()}
              className={cn(
                'overflow-x-auto select-none',
                'scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              )}
              style={{ touchAction: 'pan-x', contain: 'content', willChange: 'scroll-position' }}
            >
              <div className="flex items-center gap-2 sm:gap-3.5 py-0.5 w-max">
                {repeatedIndices.map((idx: any, index: number) => {
                  const isPos = (idx.change_pct ?? 0) >= 0
                  const state: string = idx.market_state || 'REGULAR'
                  const domain = idx.domain || getAssetDomain(idx.name, idx.ticker || '')
                  const logo = idx.logo_url || getAssetLogo(idx.name, idx.ticker || '')
                  const currency = idx.currency || (['^IBEX', '^GDAXI', '^STOXX50E', 'BTC-EUR'].includes(idx.ticker) || idx.name === 'BTC/EUR' || idx.name === 'Euro 50' || idx.name.includes('IBEX') ? 'EUR' : 'USD')

                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      key={`${idx.name}-${index}`}
                      onClick={() => handleCardClick(idx)}
                      className="relative flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors shrink-0 cursor-pointer"
                    >
                      <CompanyLogo
                        ticker={idx.ticker || idx.name}
                        name={idx.name}
                        domain={domain}
                        logoUrl={logo}
                        size="xs"
                        className="!bg-white/[0.07] !border !border-white/10 shadow-xs"
                      />

                      {/* Name + price + currency inline — locked on the same baseline */}
                      <div className="flex items-baseline gap-1 min-w-0 leading-none">
                        <span className="text-[12px] font-medium text-slate-400 whitespace-nowrap leading-none">
                          {idx.name}:
                        </span>
                        <span className="text-[12px] font-bold text-white font-mono tabular-nums tracking-tight whitespace-nowrap leading-none">
                          {idx.price != null ? fmtPrice(idx.price, idx.ticker) : '—'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase whitespace-nowrap leading-none">
                          {currency}
                        </span>
                      </div>

                      {/* Change % badge — dark tinted pill matching reference, slightly larger */}
                      <span
                        className={cn(
                          "text-[11.5px] font-bold font-mono tabular-nums px-2 py-0.5 rounded-md ml-0.5 shrink-0 leading-none",
                          isPos
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        )}
                      >
                        {isPos ? '+' : ''}{idx.change_pct?.toFixed(2)}%
                      </span>

                      {/* Market state badge (Futures, Pre, Post, etc.) directly AFTER the % badge with same style */}
                      {state !== 'REGULAR' && (
                        <MarketStateBadge state={state} name={idx.name} />
                      )}
                    </div>
                  )
                })}
              </div>
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
