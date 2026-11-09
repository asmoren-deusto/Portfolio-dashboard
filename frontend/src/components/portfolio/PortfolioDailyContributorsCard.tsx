import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Flame,
  ArrowRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Calendar,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { BrokerBadge } from '@/components/ui/Badge'
import { fmt, cn, formatAssetDisplayName } from '@/lib/utils'
import type { Position } from '@/lib/mockData'

interface PortfolioDailyContributorsCardProps {
  positions: Position[]
  onSelectPosition?: (pos: Position) => void
  className?: string
}

type PeriodMode = '1d' | '7d' | 'total'

export function PortfolioDailyContributorsCard({
  positions = [],
  onSelectPosition,
  className,
}: PortfolioDailyContributorsCardProps) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('1d')

  // Calculate metrics based on selected period
  const stats = useMemo(() => {
    if (!positions || positions.length === 0) {
      return {
        netEuro: 0,
        netPct: 0,
        advancers: 0,
        decliners: 0,
        unchanged: 0,
        gainers: [] as { pos: Position; euro: number; pct: number }[],
        losers: [] as { pos: Position; euro: number; pct: number }[],
      }
    }

    const items = positions.map((pos) => {
      let euro = 0
      let pct = 0

      if (periodMode === '1d') {
        euro = pos.daily_change ?? 0
        pct = pos.daily_change_pct ?? 0
        // Fallback approximation if daily_change is 0 but daily_change_pct exists
        if (euro === 0 && pct !== 0 && pos.current_value) {
          euro = (pos.current_value * pct) / 100
        }
      } else if (periodMode === '7d') {
        euro = pos.weekly_change ?? 0
        pct = pos.weekly_change_pct ?? 0
        if (euro === 0 && pct !== 0 && pos.current_value) {
          euro = (pos.current_value * pct) / 100
        }
      } else {
        euro = pos.unrealized_pnl ?? 0
        pct = pos.unrealized_pnl_pct ?? 0
      }

      return { pos, euro, pct }
    })

    const totalValue = positions.reduce((acc, p) => acc + (p.current_value || 0), 0)
    const netEuro = items.reduce((acc, item) => acc + item.euro, 0)
    const netPct = totalValue > 0 ? (netEuro / totalValue) * 100 : 0

    let advancers = 0
    let decliners = 0
    let unchanged = 0

    items.forEach((item) => {
      if (item.euro > 0.05) advancers++
      else if (item.euro < -0.05) decliners++
      else unchanged++
    })

    // Sort for top gainers and top losers
    const gainers = items
      .filter((item) => item.euro > 0)
      .sort((a, b) => b.euro - a.euro)
      .slice(0, 3)

    const losers = items
      .filter((item) => item.euro < 0)
      .sort((a, b) => a.euro - b.euro)
      .slice(0, 3)

    return {
      netEuro,
      netPct,
      advancers,
      decliners,
      unchanged,
      gainers,
      losers,
    }
  }, [positions, periodMode])

  const periodLabel =
    periodMode === '1d' ? 'Hoy' : periodMode === '7d' ? 'Semana (7D)' : 'Total Acumulado'

  return (
    <Card className={cn('overflow-hidden relative flex flex-col h-full', className)}>
      <CardHeader className="flex-row items-center justify-between pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Impacto en Euros</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08] font-mono">
                {periodLabel}
              </span>
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Contribución neta de tus activos
            </p>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.08] shrink-0 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setPeriodMode('1d')}
            className={cn(
              'px-2 py-1 rounded-lg transition-all',
              periodMode === '1d'
                ? 'bg-white dark:bg-[#2b2b2d] text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('7d')}
            className={cn(
              'px-2 py-1 rounded-lg transition-all',
              periodMode === '7d'
                ? 'bg-white dark:bg-[#2b2b2d] text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            7D
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('total')}
            className={cn(
              'px-2 py-1 rounded-lg transition-all',
              periodMode === 'total'
                ? 'bg-white dark:bg-[#2b2b2d] text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Total
          </button>
        </div>
      </CardHeader>

      <div className="p-3.5 sm:p-4 pt-1 flex flex-col flex-1 justify-between gap-3 min-h-0">
        {/* Net Impact Banner */}
        <div
          className={cn(
            'p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors',
            stats.netEuro >= 0
              ? 'bg-emerald-500/[0.05] border-emerald-500/20 dark:bg-emerald-500/[0.08]'
              : 'bg-rose-500/[0.05] border-rose-500/20 dark:bg-rose-500/[0.08]'
          )}
        >
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Variación Neta {periodLabel}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                data-private
                className={cn(
                  'text-lg sm:text-xl font-mono font-black tracking-tight',
                  stats.netEuro >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                )}
              >
                {stats.netEuro >= 0 ? '+' : ''}
                {fmt.currency(stats.netEuro)}
              </span>
              <span
                className={cn(
                  'text-xs font-mono font-bold',
                  stats.netEuro >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                ({stats.netPct >= 0 ? '+' : ''}
                {stats.netPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono text-slate-400 block">Distribución</span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {stats.advancers}
              </span>
              <span className="text-slate-300 dark:text-white/20">/</span>
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {stats.decliners}
              </span>
            </div>
          </div>
        </div>

        {/* Top Movers Lists */}
        <div className="space-y-2.5 flex-1 overflow-y-auto scrollbar-thin pr-0.5 min-h-0">
          {/* Top Impulsores */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                Mayores Impulsores (+€)
              </span>
            </div>

            {stats.gainers.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">Sin activos en positivo en este periodo</p>
            ) : (
              <div className="space-y-1.5">
                {stats.gainers.map(({ pos, euro, pct }) => (
                  <div
                    key={pos.isin}
                    onClick={() => onSelectPosition?.(pos)}
                    className="p-2 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] hover:bg-slate-100/90 dark:hover:bg-white/[0.05] border border-slate-200/70 dark:border-white/[0.05] flex items-center justify-between gap-2 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CompanyLogo
                        name={pos.name}
                        isin={pos.isin}
                        ticker={pos.ticker ?? undefined}
                        className="w-6 h-6 rounded-lg text-[9px] shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {formatAssetDisplayName(pos.name)}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                          {pos.broker || pos.asset_type}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        data-private
                        className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block"
                      >
                        +{fmt.currency(euro)}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500/80 block">
                        +{pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Detractores */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-3.5 h-3.5" />
                Mayores Detractores (-€)
              </span>
            </div>

            {stats.losers.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">Sin activos en negativo en este periodo</p>
            ) : (
              <div className="space-y-1.5">
                {stats.losers.map(({ pos, euro, pct }) => (
                  <div
                    key={pos.isin}
                    onClick={() => onSelectPosition?.(pos)}
                    className="p-2 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] hover:bg-slate-100/90 dark:hover:bg-white/[0.05] border border-slate-200/70 dark:border-white/[0.05] flex items-center justify-between gap-2 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CompanyLogo
                        name={pos.name}
                        isin={pos.isin}
                        ticker={pos.ticker ?? undefined}
                        className="w-6 h-6 rounded-lg text-[9px] shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {formatAssetDisplayName(pos.name)}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                          {pos.broker || pos.asset_type}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        data-private
                        className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 block"
                      >
                        {fmt.currency(euro)}
                      </span>
                      <span className="text-[10px] font-mono text-rose-500/80 block">
                        {pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Link */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px]">
          <Link
            to="/positions"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Ver atribución completa <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-slate-400 text-[10px] font-mono">
            {positions.length} activos en cartera
          </span>
        </div>
      </div>
    </Card>
  )
}
