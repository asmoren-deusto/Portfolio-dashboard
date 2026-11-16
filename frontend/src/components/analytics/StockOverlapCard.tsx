import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { ChevronDown, ChevronUp, Search, Building2, ChevronsUpDown } from 'lucide-react'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { cn } from '@/lib/utils'
import type { XRayStockOverlapItem } from '@/lib/xrayEngine'

interface StockOverlapCardProps {
  items?: XRayStockOverlapItem[]
}

export const StockOverlapCard: React.FC<StockOverlapCardProps> = ({
  items = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  // Por defecto todas las filas desplegadas (el set de colapsadas empieza vacío)
  const [collapsedTickers, setCollapsedTickers] = useState<Set<string>>(new Set())

  const toggleExpand = (ticker: string) => {
    setCollapsedTickers((prev) => {
      const next = new Set(prev)
      if (next.has(ticker)) {
        next.delete(ticker)
      } else {
        next.add(ticker)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (collapsedTickers.size === 0) {
      // Colapsar todas
      setCollapsedTickers(new Set(items.map((i) => i.ticker)))
    } else {
      // Desplegar todas
      setCollapsedTickers(new Set())
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.isin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sector.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const allExpanded = collapsedTickers.size === 0

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Solapamiento de Acciones (Stock Overlap)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Desglose multi-fondo: qué fondos de tu cartera compran la misma acción y cuánto peso aporta cada uno
              </p>
            </div>
          </div>

          {/* Controls: Expand/Collapse All + Search Box */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={toggleAll}
              title={allExpanded ? 'Colapsar todas las filas' : 'Desplegar todas las filas'}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
            >
              <ChevronsUpDown size={14} />
              <span>{allExpanded ? 'Colapsar todo' : 'Desplegar todo'}</span>
            </button>

            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar acción o ISIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Overlap List con separadores suaves y altura compacta */}
        <div className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.05]">
          {filteredItems.map((item) => {
            const isExpanded = !collapsedTickers.has(item.ticker)
            return (
              <div key={item.ticker} className="py-1.5">
                <div
                  onClick={() => toggleExpand(item.ticker)}
                  className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Logo con imagen oficial de la compañía */}
                    <CompanyLogo
                      isin={item.isin}
                      ticker={item.ticker}
                      name={item.name}
                      size="sm"
                      className="w-8 h-8 rounded-xl shrink-0 shadow-2xs border border-slate-200/60 dark:border-white/10"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                          {item.isin}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
                        {item.sector} · {item.contributingFunds.length} fondos inversores
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 block">
                        {item.totalPortfolioWeight.toFixed(2)}%
                      </span>
                      <span className="text-[9.5px] text-slate-400 block leading-none">Total en cartera</span>
                    </div>
                    {isExpanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                  </div>
                </div>

                {/* Contributing Funds Sub-rows (Compactos en una sola línea por fondo) */}
                {isExpanded && (
                  <div className="mt-1 mb-1 ml-9 sm:ml-10 mr-1 p-2 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.04] space-y-1 animate-in fade-in duration-100">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">
                      Aportación por cada fondo:
                    </span>
                    {item.contributingFunds.map((cf, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/90 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/[0.04]"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11.5px]">
                            {cf.fundName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 hidden md:inline ml-1">
                            {cf.fundIsin}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-right font-mono text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            {cf.weightInFund.toFixed(2)}% <span className="text-[9.5px] font-sans text-slate-400">del fondo</span>
                          </span>
                          <span className="text-slate-300 dark:text-white/15">→</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            +{cf.contributedWeight.toFixed(2)}% <span className="text-[9.5px] font-sans font-normal text-slate-400">en cartera</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
export default StockOverlapCard

