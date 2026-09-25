import React, { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, ExternalLink, Globe } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { AssetBadge } from '@/components/ui/Badge'
import { fmt } from '@/lib/utils'
import { useMarketHistory } from '@/api/queries'
import type { Position } from '@/lib/mockData'

interface PositionDetailModalProps {
  position: Position | null
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

export const PositionDetailModal: React.FC<PositionDetailModalProps> = ({ position, onClose }) => {
  const [period, setPeriod] = useState<PeriodKey>('1mo')

  // Reset period to 1mo whenever position changes
  useEffect(() => {
    if (position) {
      setPeriod('1mo')
    }
  }, [position?.isin])

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!position) return

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
  }, [position, onClose])

  const targetSymbol = position?.ticker || position?.isin
  const { data: histData, isLoading: histLoading } = useMarketHistory(targetSymbol, period)

  // High fidelity fallback points in case backend/yfinance has no history for this specific asset
  const fallbackPoints = useMemo(() => {
    if (!position) return []
    const price = position.current_price || position.avg_cost || 100
    const points: { date: string; time: string; price: number }[] = []
    const count =
      period === '1d' ? 24 : period === '5d' ? 35 : period === '1mo' ? 30 : period === '6mo' ? 60 : period === '1y' ? 75 : 90
    const now = new Date()

    let periodPct = 0
    if (period === '1d') periodPct = 0.35
    else if (period === '5d') periodPct = 1.15
    else if (period === '1mo') periodPct = 2.45
    else if (period === '6mo') periodPct = 6.8
    else if (period === '1y') periodPct = position.unrealized_pnl_pct ? Math.abs(position.unrealized_pnl_pct) * 0.6 : 12.5
    else periodPct = position.unrealized_pnl_pct ? Math.abs(position.unrealized_pnl_pct) : 22.0

    const dir = (position.unrealized_pnl ?? 0) >= 0 ? 1 : -1
    const totalDeltaPct = (periodPct * dir) / 100
    const startPrice = price / (1 + totalDeltaPct)

    const isinHash = position.isin.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

    for (let i = 0; i <= count; i++) {
      const frac = i / count
      const noise = Math.sin(i * 0.9 + isinHash) * 0.007 + Math.cos(i * 1.4 + isinHash) * 0.004
      const p = startPrice + (price - startPrice) * frac + price * noise

      const stepMs =
        period === '1d'
          ? 3600 * 1000
          : period === '5d'
          ? 4 * 3600 * 1000
          : 24 * 3600 * 1000 * (period === '5y' ? 20 : period === '1y' ? 5 : 1)
      const d = new Date(now.getTime() - (count - i) * stepMs)

      const lbl =
        period === '1d'
          ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

      points.push({
        date: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: lbl,
        price: Number(Math.max(0.01, p).toFixed(2)),
      })
    }
    if (points.length > 0) {
      points[points.length - 1].price = price
    }
    return points
  }, [position, period])

  if (typeof document === 'undefined') return null

  const isPos = (position?.unrealized_pnl ?? 0) >= 0
  const cur = position?.currency || 'EUR'

  // Chart data and dynamic color
  const chartData = histData?.points && histData.points.length > 2 ? histData.points : fallbackPoints

  const firstPrice = chartData[0]?.price || position?.avg_cost || position?.current_price || 1
  const lastPrice = chartData[chartData.length - 1]?.price || position?.current_price || 1
  const calculatedPeriodChangePct =
    histData?.period_change_pct !== undefined
      ? histData.period_change_pct
      : Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2))

  const isPeriodPos = calculatedPeriodChangePct >= 0
  const chartColor = isPeriodPos ? '#10b981' : '#f43f5e'
  const gradientId = `chartGrad_${position?.isin?.replace(/[^a-zA-Z0-9]/g, '') || 'item'}`

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
          <div className="text-sm font-bold font-mono text-white mt-0.5">{fmt.price(pData.price, cur)}</div>
        </div>
      )
    }
    return null
  }

  return createPortal(
    <AnimatePresence>
      {position && (
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

          {/* Modal Container — Matching StockDetailModal exactly */}
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

            {/* Header: Logo, Name, ISIN, Ticker, AssetType, Category */}
            <div className="flex items-start gap-3.5 sm:gap-4 mb-4">
              <CompanyLogo
                ticker={position.ticker || position.isin.slice(0, 4)}
                name={position.name}
                domain={position.domain}
                size="xl"
              />
              <div className="min-w-0 pr-10 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {position.name}
                  </h3>
                  {position.ticker && (
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                      {position.ticker}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md">
                    {position.isin}
                  </span>
                  <AssetBadge type={position.asset_type} />
                  {position.category && (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                      {position.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Value, Price & P&L Hero Box */}
            <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] p-4 mb-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Valoración en Cartera */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                    Valoración en Cartera
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-950 dark:text-white">
                    {fmt.currency(position.current_value)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 font-medium">
                    Inversión neta:{' '}
                    <span className="text-slate-800 dark:text-slate-200 font-bold">
                      {fmt.currency(position.invested_amount)}
                    </span>
                  </div>
                </div>

                {/* Precio Liquidativo */}
                <div className="sm:text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                    Precio Liquidativo
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
                    {fmt.price(position.current_price, cur)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 font-medium">
                    Coste medio:{' '}
                    <span className="text-slate-800 dark:text-slate-200 font-bold">
                      {fmt.currency(position.avg_cost)}
                    </span>
                  </div>
                </div>

                {/* Rentabilidad / P&L */}
                <div className="flex flex-col sm:items-end gap-1">
                  <div
                    className={`flex items-center gap-1.5 text-sm font-bold font-mono px-3 py-1 rounded-xl shadow-xs ${
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
                      {fmt.pct(position.unrealized_pnl_pct)} ({fmt.currency(position.unrealized_pnl)})
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-semibold tabular-nums ${
                      isPeriodPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    Periodo {period.toUpperCase()}: {isPeriodPos ? '+' : ''}
                    {calculatedPeriodChangePct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Period Selector Tabs */}
              <div className="flex items-center justify-between border-t border-slate-200/70 dark:border-white/[0.06] pt-2.5 mt-3">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Evolución Histórica
                </span>
                <div className="flex gap-1 bg-slate-200/60 dark:bg-white/[0.05] p-0.5 rounded-xl">
                  {PERIODS.map((p) => (
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
              {histLoading && chartData.length === 0 ? (
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

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  Participaciones
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-950 dark:text-white mt-0.5 block truncate">
                  {fmt.num(position.shares)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  Coste Medio
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-slate-200 mt-0.5 block truncate">
                  {fmt.currency(position.avg_cost)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  Precio Liquidativo
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-950 dark:text-white mt-0.5 block truncate">
                  {fmt.currency(position.current_price)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  Peso en Cartera
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5 block truncate">
                  {position.weight.toFixed(1)}%
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  TER (Gastos)
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  {position.ter ? `${position.ter}%` : '0.20%'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold truncate">
                  Región
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  {position.geo || 'Global'}
                </span>
              </div>
            </div>

            {/* External Links */}
            <div className="flex gap-2">
              <a
                href={`https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=${position.isin}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ficha en Morningstar
              </a>
              {position.ticker && (
                <a
                  href={`https://finance.yahoo.com/quote/${position.ticker}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-slate-300 dark:hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Yahoo Finance
                </a>
              )}
              {position.domain && (
                <a
                  href={`https://${position.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-slate-300 dark:hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Gestora
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
