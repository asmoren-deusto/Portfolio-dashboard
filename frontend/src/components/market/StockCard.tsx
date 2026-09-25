import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Cpu,
  ShoppingBag,
  Landmark,
  HeartPulse,
  Zap,
  Factory,
  Tv,
  Sparkles,
  Layers,
  Clock,
} from 'lucide-react'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { fmt } from '@/lib/utils'
import type { MarketStock } from '@/api/queries'

interface StockCardProps {
  stock: MarketStock
  onClick?: () => void
}

function getSectorIcon(sector: string) {
  switch (sector.toLowerCase()) {
    case 'tecnología':
      return <Cpu className="w-3 h-3 text-cyan-400" />
    case 'consumo':
      return <ShoppingBag className="w-3 h-3 text-amber-400" />
    case 'financiero':
      return <Landmark className="w-3 h-3 text-blue-400" />
    case 'salud':
      return <HeartPulse className="w-3 h-3 text-rose-400" />
    case 'energía':
      return <Zap className="w-3 h-3 text-yellow-400" />
    case 'industrial':
      return <Factory className="w-3 h-3 text-slate-400" />
    case 'comunicación':
      return <Tv className="w-3 h-3 text-violet-400" />
    case 'lujo':
      return <Sparkles className="w-3 h-3 text-fuchsia-400" />
    default:
      return <Layers className="w-3 h-3 text-slate-400" />
  }
}

export const StockCard: React.FC<StockCardProps> = ({ stock, onClick }) => {
  const isPos = (stock.change_pct ?? 0) >= 0
  const cur = stock.currency ?? 'USD'
  const price = stock.price ?? 0
  const high = stock.day_high ?? price
  const low = stock.day_low ?? price

  let progress = 50
  if (high > low) {
    progress = Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100))
  }

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl bg-white/95 hover:bg-white border border-slate-200/90 hover:border-blue-500/50 p-5 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 cursor-pointer flex flex-col justify-between backdrop-blur-md overflow-hidden dark:bg-[#111625]/80 dark:hover:bg-[#151c2e] dark:border-white/[0.07] dark:hover:border-blue-500/40"
    >
      {/* Subtle hover gradient reflection */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-blue-500/[0.04] dark:from-white/[0.06] via-transparent to-transparent" />

      {/* Top Header: Logo, Name, Badges, Arrow */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <CompanyLogo
              ticker={stock.ticker}
              name={stock.name}
              logoUrl={stock.logo_url}
              domain={stock.domain}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-[14px] text-slate-900 dark:text-white tracking-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {stock.name}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded tracking-wide">
                  {stock.ticker}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                  {getSectorIcon(stock.sector)}
                  <span>{stock.sector}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Indices badges + View action icon */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1">
              {stock.index.slice(0, 2).map((idx) => (
                <span
                  key={idx}
                  className="text-xs font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shadow-xs"
                >
                  {idx}
                </span>
              ))}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Price & Change */}
        <div className="flex items-baseline justify-between gap-2 my-2">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white tabular-nums group-hover:scale-[1.02] transition-transform origin-left">
              {fmt.price(stock.price, cur)}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium tabular-nums">
                Cierre ant: <span className="text-slate-900 dark:text-slate-200 font-semibold">{fmt.price(stock.prev_close, cur)}</span>
              </div>
              {stock.market_state && stock.market_state !== 'REGULAR' && (
                <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                  stock.market_state === 'PRE'
                    ? 'bg-amber-50 text-amber-700 border-amber-300/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
                    : 'bg-purple-50 text-purple-700 border-purple-300/70 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20'
                }`}>
                  {stock.market_state === 'PRE' ? 'Pre-mercado' : 'Post-mercado'}
                </span>
              )}
            </div>
          </div>

          <div
            className={`flex items-center gap-1 text-xs font-semibold tabular-nums px-2.5 py-1 rounded-xl shadow-xs transition-transform group-hover:scale-105 ${
              isPos
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20'
            }`}
          >
            {isPos ? (
              <TrendingUp className="w-3.5 h-3.5 stroke-[2]" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 stroke-[2]" />
            )}
            <span>
              {isPos ? '+' : ''}
              {stock.change_pct != null ? stock.change_pct.toFixed(2) : '0.00'}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
        {/* Day Range Mini Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-mono mb-1 font-medium">
            <span>Mín: {fmt.price(stock.day_low, cur)}</span>
            <span className="text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider font-bold">Rango Intradía</span>
            <span>Máx: {fmt.price(stock.day_high, cur)}</span>
          </div>
          <div className="relative h-1.5 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ${
                isPos ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/40' : 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-sm shadow-rose-500/40'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Market Cap & Volume */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold">
              Cap. Bursátil
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-200 font-mono">
              {fmt.marketCap(stock.market_cap, cur)}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold">
              Volumen
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-200 font-mono">
              {fmt.volume(stock.volume)}
            </span>
          </div>
        </div>

        {/* Last updated */}
        {stock.last_updated && (
          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-2">
            <Clock className="w-3 h-3" />
            <span>Act. {new Date(stock.last_updated).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        )}
      </div>
    </div>
  )
}
