import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Cpu,
  ShoppingBag,
  Landmark,
  HeartPulse,
  Zap,
  Factory,
  Tv,
  Sparkles,
  Layers,
} from 'lucide-react'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { fmt } from '@/lib/utils'
import type { MarketStock } from '@/api/queries'

interface StockTableRowProps {
  stock: MarketStock
  onClick?: () => void
}

function getSectorIcon(sector: string) {
  switch (sector.toLowerCase()) {
    case 'tecnología':
      return <Cpu className="w-2.5 h-2.5 text-cyan-400" />
    case 'consumo':
      return <ShoppingBag className="w-2.5 h-2.5 text-amber-400" />
    case 'financiero':
      return <Landmark className="w-2.5 h-2.5 text-blue-400" />
    case 'salud':
      return <HeartPulse className="w-2.5 h-2.5 text-rose-400" />
    case 'energía':
      return <Zap className="w-2.5 h-2.5 text-yellow-400" />
    case 'industrial':
      return <Factory className="w-2.5 h-2.5 text-slate-400" />
    case 'comunicación':
      return <Tv className="w-2.5 h-2.5 text-violet-400" />
    case 'lujo':
      return <Sparkles className="w-2.5 h-2.5 text-fuchsia-400" />
    default:
      return <Layers className="w-2.5 h-2.5 text-slate-400" />
  }
}

export const StockTableRow: React.FC<StockTableRowProps> = ({ stock, onClick }) => {
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
    <tr
      onClick={onClick}
      className="group border-b border-slate-100 dark:border-white/[0.04] hover:bg-slate-50/80 dark:hover:bg-white/[0.035] transition-colors cursor-pointer"
    >
      {/* Company */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <CompanyLogo
            ticker={stock.ticker}
            name={stock.name}
            logoUrl={stock.logo_url}
            domain={stock.domain}
            size="sm"
          />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {stock.name}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded tracking-wide">
                {stock.ticker}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                {getSectorIcon(stock.sector)}
                <span>{stock.sector}</span>
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="py-3.5 px-4 text-right">
        <div className="font-semibold tabular-nums text-slate-950 dark:text-white text-sm">
          {fmt.price(stock.price, cur)}
        </div>
        <div className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-medium tabular-nums">
          Ant: {fmt.price(stock.prev_close, cur)}
        </div>
      </td>

      {/* Change % */}
      <td className="py-3.5 px-4 text-right">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-lg ${
            isPos
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20'
          }`}
        >
          {isPos ? (
            <TrendingUp className="w-3 h-3 stroke-[2]" />
          ) : (
            <TrendingDown className="w-3 h-3 stroke-[2]" />
          )}
          {isPos ? '+' : ''}
          {stock.change_pct != null ? stock.change_pct.toFixed(2) : '0.00'}%
        </span>
      </td>

      {/* Market Cap */}
      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-900 dark:text-slate-200 text-xs">
        {fmt.marketCap(stock.market_cap, cur)}
      </td>

      {/* Volume */}
      <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300 text-xs font-medium">
        {fmt.volume(stock.volume)}
      </td>

      {/* Day Range */}
      <td className="py-3.5 px-4 w-44">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-300 font-medium">
            <span>{fmt.price(stock.day_low, cur)}</span>
            <span>{fmt.price(stock.day_high, cur)}</span>
          </div>
          <div className="relative h-1.5 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 rounded-full ${
                isPos ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-pink-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </td>

      {/* Indices */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1 flex-wrap">
          {stock.index.map((idx) => (
            <span
              key={idx}
              className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
            >
              {idx}
            </span>
          ))}
        </div>
      </td>
    </tr>
  )
}
