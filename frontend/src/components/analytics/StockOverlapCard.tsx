import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Layers, ChevronDown, ChevronUp, Search, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { XRayStockOverlapItem } from '@/lib/xrayEngine'

interface StockOverlapCardProps {
  items?: XRayStockOverlapItem[]
}

export const StockOverlapCard: React.FC<StockOverlapCardProps> = ({
  items = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null)

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.isin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sector.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

          {/* Search Box */}
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

        {/* Overlap List */}
        <div className="mt-4 divide-y divide-slate-150 dark:divide-white/5">
          {filteredItems.map((item) => {
            const isExpanded = expandedTicker === item.ticker
            return (
              <div key={item.ticker} className="py-2.5">
                <div
                  onClick={() => setExpandedTicker(isExpanded ? null : item.ticker)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                      {item.ticker}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                          {item.isin}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {item.sector} · {item.contributingFunds.length} fondos inversores
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 block">
                        {item.totalPortfolioWeight.toFixed(2)}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">Total en cartera</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Contributing Funds Sub-rows */}
                {isExpanded && (
                  <div className="mt-2 ml-12 mr-2 p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-2 animate-in fade-in duration-150">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Aportación por cada fondo de la cartera:
                    </span>
                    {item.contributingFunds.map((cf, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-900 dark:text-white block truncate">
                            {cf.fundName}
                          </span>
                          <span className="text-[10.5px] font-mono text-slate-400">
                            ISIN: {cf.fundIsin} · Fecha cartera: {cf.portfolioDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-right">
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white block text-xs">
                              {cf.weightInFund.toFixed(2)}%
                            </span>
                            <span className="text-[10px] text-slate-400 block">Peso en el fondo</span>
                          </div>
                          <div className="border-l border-slate-200 dark:border-white/10 pl-3">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block text-xs">
                              +{cf.contributedWeight.toFixed(2)}%
                            </span>
                            <span className="text-[10px] text-slate-400 block">Aporte a tu cartera</span>
                          </div>
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

