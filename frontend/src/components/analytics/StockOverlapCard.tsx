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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Solapamiento de Acciones (Stock Overlap)
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 mt-0.5">
                Desglose multi-fondo: qué fondos de tu cartera compran la misma acción y cuánto peso aporta cada uno
              </p>
            </div>
          </div>

          {/* Controls: Expand/Collapse All + Search Box (alineados a la derecha a la altura del subtítulo) */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 self-start sm:self-end">
            <button
              type="button"
              onClick={toggleAll}
              title={allExpanded ? 'Colapsar todas las filas' : 'Desplegar todas las filas'}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <ChevronsUpDown size={14} />
              <span>{allExpanded ? 'Colapsar todo' : 'Desplegar todo'}</span>
            </button>

            <div className="relative w-full sm:w-60">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar acción o ISIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs sm:text-[13px] bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>
        </div>

        {/* Overlap List con separadores suaves y altura compacta */}
        <div className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.05]">
          {filteredItems.map((item) => {
            const isExpanded = !collapsedTickers.has(item.ticker)
            return (
              <div key={item.ticker} className="py-2">
                <div
                  onClick={() => toggleExpand(item.ticker)}
                  className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Logo con imagen oficial de la compañía */}
                    <CompanyLogo
                      isin={item.isin}
                      ticker={item.ticker}
                      name={item.name}
                      size="sm"
                      className="w-9 h-9 rounded-xl shrink-0 shadow-2xs border border-slate-200/80 dark:border-white/10"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 shrink-0">
                          {item.isin}
                        </span>
                      </div>
                      <span className="text-xs sm:text-[13px] font-medium text-slate-600 dark:text-slate-300 leading-tight block mt-0.5">
                        {item.sector} · <strong className="text-slate-800 dark:text-slate-200 font-bold">{item.contributingFunds.length} fondos inversores</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-black text-sm sm:text-base text-blue-700 dark:text-blue-400 block">
                        {item.totalPortfolioWeight.toFixed(2)}%
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                        Total en cartera
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-slate-500 dark:text-slate-400" />
                    ) : (
                      <ChevronDown size={18} className="text-slate-500 dark:text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Contributing Funds Sub-rows (Compactos en una sola línea por fondo) */}
                {isExpanded && (
                  <div className="mt-1.5 mb-1 ml-9 sm:ml-12 mr-1 p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-1.5 animate-in fade-in duration-100">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block px-1">
                      Aportación por cada fondo:
                    </span>
                    {item.contributingFunds.map((cf, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs sm:text-[13px] py-1.5 px-3 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-3">
                          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-white truncate text-xs sm:text-[13px]">
                            {cf.fundName}
                          </span>
                          <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 shrink-0 hidden md:inline ml-1">
                            {cf.fundIsin}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right font-mono text-xs sm:text-[13px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {cf.weightInFund.toFixed(2)}%{' '}
                            <span className="text-[11px] font-sans font-medium text-slate-500 dark:text-slate-400">
                              del fondo
                            </span>
                          </span>
                          <span className="text-slate-400 dark:text-white/20 font-sans">→</span>
                          <span className="font-black text-blue-700 dark:text-blue-400">
                            +{cf.contributedWeight.toFixed(2)}%{' '}
                            <span className="text-[11px] font-sans font-semibold text-slate-600 dark:text-slate-300">
                              en cartera
                            </span>
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

