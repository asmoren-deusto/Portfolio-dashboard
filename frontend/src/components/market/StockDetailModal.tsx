import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, ExternalLink, Globe } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { fmt } from '@/lib/utils'
import { useMarketHistory, type MarketStock } from '@/api/queries'

interface StockDetailModalProps {
  stock: MarketStock | null
  onClose: () => void
}

const PERIODS = [
  { label: '1D', value: '1d' },
  { label: '1S', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y' },
  { label: '5A', value: '5y' },
] as const

type PeriodKey = (typeof PERIODS)[number]['value']

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose }) => {
  const [period, setPeriod] = useState<PeriodKey>('1mo')

  // Reset period to 1mo whenever stock changes
  useEffect(() => {
    if (stock) {
      setPeriod('1mo')
    }
  }, [stock?.ticker])

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!stock) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [stock, onClose])

  const { data: histData, isLoading: histLoading } = useMarketHistory(stock?.ticker, period)

  if (typeof document === 'undefined') return null

  const isPos = (stock?.change_pct ?? 0) >= 0
  const cur = stock?.currency ?? 'USD'
  const price = stock?.price ?? 0
  const high = stock?.day_high ?? price
  const low = stock?.day_low ?? price

  let progress = 50
  if (high > low) {
    progress = Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100))
  }

  // Chart data and dynamic color based on period return
  const chartData = histData?.points || []
  const isPeriodPos = histData?.period_change_pct !== undefined
    ? histData.period_change_pct >= 0
    : isPos
  const chartColor = isPeriodPos ? '#10b981' : '#f43f5e'
  const gradientId = `chartGrad_${stock?.ticker?.replace(/[^a-zA-Z0-9]/g, '') || 'item'}`

  const formatYTick = (val: number) => {
    if (val == null || isNaN(val)) return ''
    if (val >= 10000) {
      return val.toLocaleString('es-ES', { maximumFractionDigits: 0 })
    } else if (val >= 100) {
      return val.toLocaleString('es-ES', { maximumFractionDigits: 1 })
    } else if (val >= 1) {
      return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } else {
      return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload
      return (
        <div className="rounded-xl bg-slate-900/95 backdrop-blur-md border border-white/10 px-3 py-2 shadow-2xl text-white pointer-events-none">
          <div className="text-[10px] text-slate-400 font-medium">{pData.date || pData.time}</div>
          <div className="text-sm font-bold font-mono text-white mt-0.5">
            {fmt.price(pData.price, cur)}
          </div>
        </div>
      )
    }
    return null
  }

  return createPortal(
    <AnimatePresence>
      {stock && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-10 w-full max-w-[990px] my-auto rounded-3xl bg-white dark:bg-[#0f1424] border border-slate-200 dark:border-white/10 shadow-2xl p-5 sm:p-7 overflow-hidden text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Subtle background glow */}
            <div
              className={`pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 dark:opacity-25 ${
                isPeriodPos ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-slate-400 dark:hover:text-white transition-all shadow-sm z-20"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-4">
              <CompanyLogo
                ticker={stock.ticker}
                name={stock.name}
                logoUrl={stock.logo_url}
                domain={stock.domain}
                size="xl"
              />
              <div className="min-w-0 pr-8">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                    {stock.name}
                  </h3>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] tracking-wide">
                    {stock.ticker}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {stock.sector}
                  </span>
                  {stock.index && stock.index.length > 0 && (
                    <>
                      <span className="text-slate-400 dark:text-slate-600">•</span>
                      <div className="flex gap-1 flex-wrap">
                        {stock.index.map((idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/20"
                          >
                            {idx}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Price & Period Control Header */}
            <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] p-4 mb-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white tabular-nums">
                    {fmt.price(stock.price, cur)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium tabular-nums">
                    Cierre anterior: <span className="text-slate-800 dark:text-slate-200 font-semibold">{fmt.price(stock.prev_close, cur)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div
                    className={`flex items-center gap-1.5 text-sm font-semibold tabular-nums px-3 py-1 rounded-xl shadow-xs ${
                      isPos
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/20'
                        : 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/20'
                    }`}
                  >
                    {isPos ? (
                      <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <TrendingDown className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>
                      {isPos ? '+' : ''}
                      {stock.change_pct != null ? stock.change_pct.toFixed(2) : '0.00'}%
                    </span>
                  </div>

                  {histData && histData.period_change_pct !== undefined && period !== '1d' && (
                    <span className={`text-[11px] font-semibold tabular-nums ${isPeriodPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPeriodPos ? '+' : ''}{histData.period_change_pct.toFixed(2)}% ({period.toUpperCase()})
                    </span>
                  )}
                </div>
              </div>

              {/* Period Selector Tabs */}
              <div className="flex items-center justify-between border-t border-slate-200/70 dark:border-white/[0.06] pt-2.5 mt-3">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Evolución Histórica
                </span>
                <div className="flex gap-1 bg-slate-200/60 dark:bg-white/[0.05] p-0.5 rounded-xl">
                  {PERIODS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPeriod(p.value)}
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg transition-all ${
                        period === p.value
                          ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Evolution Chart Area */}
            <div className="w-full h-60 mb-4 relative rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.015] border border-slate-200/60 dark:border-white/[0.04] p-1 pt-2">
              {histLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Cargando histórico...
                  </div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 10, bottom: 2 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="currentColor"
                      className="stroke-slate-200/70 dark:stroke-white/[0.06]"
                    />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      dy={4}
                      minTickGap={38}
                    />
                    <YAxis
                      orientation="right"
                      domain={['auto', 'auto']}
                      tickFormatter={formatYTick}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      width={56}
                      dx={4}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={chartColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#${gradientId})`}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  Sin datos históricos disponibles
                </div>
              )}
            </div>

            {/* Day Range Bar */}
            {stock.day_high && stock.day_low && stock.day_high > stock.day_low && (
              <div className="mb-3.5 space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400 font-medium">
                  <span>Mín: {fmt.price(stock.day_low, cur)}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">Rango Intradía</span>
                  <span>Máx: {fmt.price(stock.day_high, cur)}</span>
                </div>
                <div className="relative h-1.5 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ${
                      isPos ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Streamlined Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  Rango ({period.toUpperCase()})
                </span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5 block truncate">
                  {histData?.min_price ? `${fmt.price(histData.min_price, cur)} - ${fmt.price(histData.max_price, cur)}` : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  Volumen
                </span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5 block truncate">
                  {fmt.volume(stock.volume)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  Cap. Bursátil
                </span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5 block truncate">
                  {stock.market_cap ? fmt.marketCap(stock.market_cap, cur) : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  Moneda
                </span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {cur}
                </span>
              </div>
            </div>

            {/* External Links */}
            <div className="flex gap-2">
              <a
                href={`https://finance.yahoo.com/quote/${stock.ticker}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver en Yahoo Finance
              </a>
              {stock.domain && (
                <a
                  href={`https://${stock.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-slate-300 dark:hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Sitio Web
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

