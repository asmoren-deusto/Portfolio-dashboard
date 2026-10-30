import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Compass,
  Percent,
  Award,
  Layers,
  Flame,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { BrokerBadge } from '@/components/ui/Badge'
import { fmt, cn, formatAssetDisplayName } from '@/lib/utils'
import type { Position } from '@/lib/mockData'

interface PortfolioAttributionCardProps {
  positions: Position[]
  onSelectPosition?: (pos: Position) => void
  defaultTab?: 'attribution' | 'quadrant' | 'fees'
}

const PALETTE = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#6366f1',
  '#84cc16',
  '#f97316',
  '#14b8a6',
]

export function PortfolioAttributionCard({
  positions,
  onSelectPosition,
  defaultTab = 'attribution',
}: PortfolioAttributionCardProps) {
  const [activeTab, setActiveTab] = useState<'attribution' | 'quadrant' | 'fees'>(defaultTab)
  const [hoveredIsin, setHoveredIsin] = useState<string | null>(null)

  const metrics = useMemo(() => {
    if (!positions || positions.length === 0) return null

    const totalValue = positions.reduce((acc, p) => acc + (p.current_value || 0), 0)
    const totalInvested = positions.reduce((acc, p) => acc + (p.invested_amount || 0), 0)
    const totalPnl = positions.reduce((acc, p) => acc + (p.unrealized_pnl || 0), 0)

    const byPnl = [...positions].sort((a, b) => (b.unrealized_pnl || 0) - (a.unrealized_pnl || 0))
    const positiveSum = byPnl.filter((p) => (p.unrealized_pnl || 0) > 0).reduce((a, p) => a + p.unrealized_pnl, 0)
    const negativeSum = Math.abs(
      byPnl.filter((p) => (p.unrealized_pnl || 0) < 0).reduce((a, p) => a + p.unrealized_pnl, 0)
    )
    const maxAbsPnl = Math.max(...byPnl.map((p) => Math.abs(p.unrealized_pnl || 0)), 1)

    // Top 3 profit concentration (Pareto)
    const top3Profit = byPnl
      .slice(0, 3)
      .filter((p) => p.unrealized_pnl > 0)
      .reduce((a, p) => a + p.unrealized_pnl, 0)
    const top3ProfitShare = positiveSum > 0 ? (top3Profit / positiveSum) * 100 : 0

    // Quadrant thresholds
    const avgWeight = positions.length > 0 ? 100 / positions.length : 10
    const avgReturnPct =
      totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 8

    // Fee drag (TER) calculations
    const feeItems = positions
      .map((p, idx) => {
        const ter = p.ter ?? (p.asset_type === 'bond' ? 0.05 : p.asset_type === 'etf' ? 0.15 : 0.25)
        const annualCostEur = ((p.current_value || 0) * ter) / 100
        // 10-year compound cost assuming 7.5% gross annual growth
        const gross10y = (p.current_value || 0) * Math.pow(1.075, 10)
        const net10y = (p.current_value || 0) * Math.pow(1.075 - ter / 100, 10)
        const drag10yEur = Math.max(0, gross10y - net10y)
        return {
          position: p,
          ter,
          annualCostEur,
          drag10yEur,
          color: PALETTE[idx % PALETTE.length],
        }
      })
      .sort((a, b) => b.annualCostEur - a.annualCostEur)

    const totalAnnualFeesEur = feeItems.reduce((a, f) => a + f.annualCostEur, 0)
    const weightedTer = totalValue > 0 ? (totalAnnualFeesEur / totalValue) * 100 : 0
    const total10yDragEur = feeItems.reduce((a, f) => a + f.drag10yEur, 0)

    return {
      totalValue,
      totalInvested,
      totalPnl,
      byPnl,
      positiveSum,
      negativeSum,
      maxAbsPnl,
      top3ProfitShare,
      avgWeight,
      avgReturnPct,
      feeItems,
      totalAnnualFeesEur,
      weightedTer,
      total10yDragEur,
    }
  }, [positions])

  if (!metrics || positions.length === 0) return null

  const hoveredPos = positions.find((p) => p.isin === hoveredIsin) || null

  return (
    <Card className="w-full overflow-hidden" delay={0.28}>
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/15 via-blue-500/10 to-indigo-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm sm:text-base font-bold">
                Radiografía de Atribución, Eficiencia y Costes
              </CardTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Motores de Valor
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Qué activos generan tu beneficio real, mapa cuadrante peso/retorno y auditoría de comisiones TER
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#202022] p-0.5 shrink-0 self-start sm:self-auto">
          {[
            { id: 'attribution', label: 'Atribución P&L', icon: Award },
            { id: 'quadrant', label: 'Mapa Cuadrante', icon: Target },
            { id: 'fees', label: 'Impacto TER 10Y', icon: Percent },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  active
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="portfolioAttributionTabPill"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#323235] dark:border dark:border-white/10 shadow-xs"
                    transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon
                    size={13}
                    className={
                      active
                        ? tab.id === 'attribution'
                          ? 'text-emerald-500'
                          : tab.id === 'quadrant'
                          ? 'text-blue-500'
                          : 'text-amber-500'
                        : ''
                    }
                  />
                  <span>{tab.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>

      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          {/* ── VIEW 1: P&L ATTRIBUTION BRIDGE ────────────────────────────── */}
          {activeTab === 'attribution' && (
            <motion.div
              key="attribution"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Summary Strip */}
              <div
                data-private
                className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3"
              >
                <div className="flex items-center justify-between sm:block px-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    Beneficio Bruto Generadores
                  </span>
                  <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +{fmt.currency(metrics.positiveSum)}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:block px-2 sm:border-x border-slate-200/70 dark:border-white/[0.06]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-blue-500" />
                    Concentración Top 3 (Pareto)
                  </span>
                  <div className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {metrics.top3ProfitShare.toFixed(1)}%{' '}
                    <span className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400">
                      de las ganancias
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:block px-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    Ratio Ganancia / Lastre
                  </span>
                  <div className="text-base sm:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {metrics.negativeSum > 1
                      ? `${(metrics.positiveSum / metrics.negativeSum).toFixed(1)}x a favor`
                      : '100% en positivo'}
                  </div>
                </div>
              </div>

              {/* Horizontal Attribution Bars */}
              <div data-private className="space-y-2">
                {metrics.byPnl.map((pos, index) => {
                  const pnl = pos.unrealized_pnl || 0
                  const isPos = pnl >= 0
                  const barWidthPct = Math.max(3, (Math.abs(pnl) / metrics.maxAbsPnl) * 100)
                  const shareOfGains =
                    isPos && metrics.positiveSum > 0 ? (pnl / metrics.positiveSum) * 100 : 0

                  return (
                    <div
                      key={pos.isin}
                      onClick={() => onSelectPosition?.(pos)}
                      className="group relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5 p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.015] hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.05] transition-all cursor-pointer"
                    >
                      {/* Left: Rank + Logo + Asset Name */}
                      <div className="flex items-center gap-2.5 min-w-0 sm:w-[270px] lg:w-[310px] shrink-0">
                        <span className="w-5 text-center font-mono text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                          #{index + 1}
                        </span>
                        <CompanyLogo
                          isin={pos.isin}
                          ticker={pos.ticker || pos.isin.slice(0, 4)}
                          name={pos.name}
                          domain={pos.domain}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {formatAssetDisplayName(pos.name, true)}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            <span>Peso: {pos.weight.toFixed(1)}%</span>
                            <span>•</span>
                            <span>Inv: {fmt.currency(pos.invested_amount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Visual Proportional Bar */}
                      <div className="flex-1 flex items-center gap-2.5 min-w-0">
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-white/[0.05] overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidthPct}%` }}
                            transition={{ duration: 0.45, delay: index * 0.03, ease: 'easeOut' }}
                            className={cn(
                              'h-full rounded-full',
                              isPos
                                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400'
                                : 'bg-gradient-to-r from-rose-500 to-rose-400'
                            )}
                          />
                        </div>
                        {isPos && shareOfGains >= 1 && (
                          <span
                            className="hidden md:inline-block w-[58px] text-right font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0"
                            title="Porcentaje que representa sobre el beneficio bruto total de la cartera"
                          >
                            {shareOfGains.toFixed(1)}% tot
                          </span>
                        )}
                      </div>

                      {/* Right: P&L € and ROI % */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:w-[165px] shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/[0.04]">
                        <span
                          className={cn(
                            'font-mono text-xs sm:text-[13px] font-bold tabular-nums',
                            isPos
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {isPos ? '+' : ''}
                          {fmt.currency(pnl)}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold border tabular-nums min-w-[58px] justify-center',
                            isPos
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                          )}
                        >
                          {fmt.pct(pos.unrealized_pnl_pct)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── VIEW 2: QUADRANT EFFICIENCY MAP (WEIGHT VS RETURN) ────────── */}
          {activeTab === 'quadrant' && (
            <motion.div
              key="quadrant"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-4 items-stretch"
            >
              {/* SVG Quadrant Scatter Plot — Locked height to prevent layout shifts */}
              <div
                data-private
                className="relative rounded-2xl bg-slate-50/70 dark:bg-[#19191c] border border-slate-200/80 dark:border-white/[0.06] p-3 sm:p-4 h-[340px] min-h-[340px] max-h-[340px] flex flex-col justify-between overflow-hidden"
              >
                {/* Quadrant Corner Watermarks */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider pointer-events-none z-10 shrink-0">
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md w-fit">
                    <span>💎 Semillas de Alfa (Bajo Peso / Alto Retorno)</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md w-fit justify-self-end">
                    <span>🚀 Locomotoras Core (Alto Peso / Alto Retorno)</span>
                  </div>
                </div>

                {/* Plot Area */}
                {(() => {
                  const maxW = Math.max(...positions.map((p) => p.weight), 20) * 1.12
                  const returns = positions.map((p) => p.unrealized_pnl_pct || 0)
                  const minR = Math.min(...returns, -3) - 3
                  const maxR = Math.max(...returns, 15) + 4
                  const rangeR = Math.max(maxR - minR, 10)

                  const xPct = (w: number) => Math.min(93, Math.max(7, (w / maxW) * 100))
                  const yPct = (r: number) =>
                    Math.min(90, Math.max(10, 100 - ((r - minR) / rangeR) * 100))

                  const midX = xPct(metrics.avgWeight)
                  const midY = yPct(metrics.avgReturnPct)
                  const zeroY = yPct(0)

                  return (
                    <div className="relative flex-1 my-2 min-h-0">
                      {/* Crosshair Reference Lines */}
                      <div
                        className="absolute top-0 bottom-0 border-l border-dashed border-slate-300 dark:border-white/15 pointer-events-none"
                        style={{ left: `${midX}%` }}
                      >
                        <span className="absolute bottom-1 left-1.5 text-[9.5px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          Peso medio ({metrics.avgWeight.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-slate-300 dark:border-white/15 pointer-events-none"
                        style={{ top: `${midY}%` }}
                      >
                        <span className="absolute -top-4 right-1.5 text-[9.5px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          Retorno medio ({fmt.pct(metrics.avgReturnPct)})
                        </span>
                      </div>
                      {minR < 0 && (
                        <div
                          className="absolute left-0 right-0 border-t border-rose-500/25 pointer-events-none"
                          style={{ top: `${zeroY}%` }}
                        />
                      )}

                      {/* Asset Nodes — Outer hit-box is 100% stationary; inner circle scales smoothly */}
                      {positions.map((p, idx) => {
                        const cx = xPct(p.weight)
                        const cy = yPct(p.unrealized_pnl_pct || 0)
                        const size = Math.max(
                          30,
                          Math.min(50, 22 + Math.sqrt(p.weight) * 4.6)
                        )
                        const color = PALETTE[idx % PALETTE.length]
                        const isHovered = hoveredIsin === p.isin

                        return (
                          <div
                            key={p.isin}
                            onMouseEnter={() => setHoveredIsin(p.isin)}
                            onMouseLeave={() => setHoveredIsin(null)}
                            onClick={() => onSelectPosition?.(p)}
                            style={{
                              left: `${cx}%`,
                              top: `${cy}%`,
                              width: `${size}px`,
                              height: `${size}px`,
                            }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer z-20 hover:z-30"
                            title={`${formatAssetDisplayName(p.name, true)} — Peso: ${p.weight.toFixed(1)}% | P&L: ${fmt.pct(p.unrealized_pnl_pct)}`}
                          >
                            <div
                              style={{
                                borderColor: color,
                                boxShadow: isHovered
                                  ? `0 0 0 4px ${color}33, 0 8px 20px -2px rgba(0,0,0,0.35)`
                                  : `0 2px 8px -1px rgba(0,0,0,0.2)`,
                              }}
                              className={cn(
                                'w-full h-full rounded-full border-2 bg-white dark:bg-[#252528] flex items-center justify-center transition-transform duration-150 ease-out pointer-events-none',
                                isHovered ? 'scale-115' : 'scale-100'
                              )}
                            >
                              <CompanyLogo
                                isin={p.isin}
                                ticker={p.ticker || p.isin.slice(0, 4)}
                                name={p.name}
                                domain={p.domain}
                                size="sm"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Bottom Quadrant Labels */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider pointer-events-none z-10 shrink-0">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-white/[0.04] px-2 py-0.5 rounded-md w-fit">
                    <span>🔎 En Observación (Bajo Peso / Menor Retorno)</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md w-fit justify-self-end">
                    <span>⚓ Anclas Defensivas (Alto Peso / Retorno Estable)</span>
                  </div>
                </div>
              </div>

              {/* Right Side Inspector / Quadrant Classification — Locked exact same height h-[340px] */}
              <div
                data-private
                className="flex flex-col justify-between rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] p-3.5 h-[340px] min-h-[340px] max-h-[340px] overflow-hidden"
              >
                {hoveredPos ? (
                  <div className="space-y-2.5 flex-1 flex flex-col justify-between min-h-0">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/70 dark:border-white/[0.06] shrink-0">
                      <CompanyLogo
                        isin={hoveredPos.isin}
                        ticker={hoveredPos.ticker || hoveredPos.isin.slice(0, 4)}
                        name={hoveredPos.name}
                        domain={hoveredPos.domain}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {formatAssetDisplayName(hoveredPos.name, true)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {hoveredPos.isin}
                          </span>
                          <BrokerBadge broker={hoveredPos.broker} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-white dark:bg-[#222225] border border-slate-200/70 dark:border-white/[0.06]">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          Peso Cartera
                        </span>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {hoveredPos.weight.toFixed(2)}%
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-[#222225] border border-slate-200/70 dark:border-white/[0.06]">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          Rentabilidad
                        </span>
                        <span
                          className={cn(
                            'font-mono font-bold text-sm',
                            hoveredPos.unrealized_pnl_pct >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {fmt.pct(hoveredPos.unrealized_pnl_pct)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-[#222225] border border-slate-200/70 dark:border-white/[0.06]">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          Valor Actual
                        </span>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {fmt.currency(hoveredPos.current_value)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-[#222225] border border-slate-200/70 dark:border-white/[0.06]">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          Plusvalía €
                        </span>
                        <span
                          className={cn(
                            'font-mono font-bold text-sm',
                            hoveredPos.unrealized_pnl >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {hoveredPos.unrealized_pnl >= 0 ? '+' : ''}
                          {fmt.currency(hoveredPos.unrealized_pnl)}
                        </span>
                      </div>
                    </div>

                    {/* Quadrant Tag Summary */}
                    <div className="p-2.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 text-[11px] flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Cuadrante estratégico:
                      </span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        {hoveredPos.weight >= metrics.avgWeight &&
                        hoveredPos.unrealized_pnl_pct >= metrics.avgReturnPct
                          ? '🚀 Locomotora Core'
                          : hoveredPos.weight < metrics.avgWeight &&
                            hoveredPos.unrealized_pnl_pct >= metrics.avgReturnPct
                          ? '💎 Semilla de Alfa'
                          : hoveredPos.weight >= metrics.avgWeight
                          ? '⚓ Ancla Estable'
                          : '🔎 En Observación'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 flex flex-col justify-between min-h-0">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-500" />
                        <span>Clasificación por Cuadrante</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        Pasa el cursor sobre cualquier burbuja o haz clic para inspeccionar su eficiencia.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        {
                          title: '🚀 Locomotoras Core',
                          count: positions.filter(
                            (p) =>
                              p.weight >= metrics.avgWeight &&
                              p.unrealized_pnl_pct >= metrics.avgReturnPct
                          ).length,
                          desc: 'Sobreponderados y batiendo la media',
                        },
                        {
                          title: '💎 Semillas de Alfa',
                          count: positions.filter(
                            (p) =>
                              p.weight < metrics.avgWeight &&
                              p.unrealized_pnl_pct >= metrics.avgReturnPct
                          ).length,
                          desc: 'Alta rentabilidad con bajo peso actual',
                        },
                        {
                          title: '⚓ Anclas Estables',
                          count: positions.filter(
                            (p) =>
                              p.weight >= metrics.avgWeight &&
                              p.unrealized_pnl_pct < metrics.avgReturnPct
                          ).length,
                          desc: 'Núcleo estabilizador de volatilidad',
                        },
                        {
                          title: '🔎 En Observación',
                          count: positions.filter(
                            (p) =>
                              p.weight < metrics.avgWeight &&
                              p.unrealized_pnl_pct < metrics.avgReturnPct
                          ).length,
                          desc: 'Menor peso y retorno en maduración',
                        },
                      ].map((q) => (
                        <div
                          key={q.title}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05] text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-[11.5px]">
                              {q.title}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {q.desc}
                            </div>
                          </div>
                          <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200">
                            {q.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 mt-2 border-t border-slate-200/70 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
                  <span>Tamaño burbuja = Capital (€)</span>
                  <span className="font-mono font-semibold">{positions.length} activos</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── VIEW 3: TER FEE DRAG & 10-YEAR COMPOUND EROSION ───────────── */}
          {activeTab === 'fees' && (
            <motion.div
              key="fees"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* KPI Strip */}
              <div
                data-private
                className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3"
              >
                <div className="px-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    TER Medio Ponderado
                  </span>
                  <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {metrics.weightedTer.toFixed(2)}%{' '}
                    <span className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400">
                      ({metrics.weightedTer <= 0.35 ? 'Ultra Eficiente' : 'Moderado'})
                    </span>
                  </div>
                </div>

                <div className="px-2 sm:border-x border-slate-200/70 dark:border-white/[0.06]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Coste Implícito Anual
                  </span>
                  <div className="text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                    {fmt.currency(metrics.totalAnnualFeesEur)}/año{' '}
                    <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                      ({fmt.currency(metrics.totalAnnualFeesEur / 12)}/mes)
                    </span>
                  </div>
                </div>

                <div className="px-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Erosión Compuesta a 10 Años (7.5% anual)
                  </span>
                  <div className="text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                    -{fmt.currency(metrics.total10yDragEur)}
                  </div>
                </div>
              </div>

              {/* Fee Table / Bars */}
              <div data-private className="space-y-2">
                {metrics.feeItems.map((item) => {
                  const p = item.position
                  const isLowCost = item.ter <= 0.25
                  const isHighCost = item.ter >= 0.75
                  const shareOfFees =
                    metrics.totalAnnualFeesEur > 0
                      ? (item.annualCostEur / metrics.totalAnnualFeesEur) * 100
                      : 0

                  return (
                    <div
                      key={p.isin}
                      onClick={() => onSelectPosition?.(p)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.015] hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.05] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 sm:w-[290px] shrink-0">
                        <CompanyLogo
                          isin={p.isin}
                          ticker={p.ticker || p.isin.slice(0, 4)}
                          name={p.name}
                          domain={p.domain}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs sm:text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                            {formatAssetDisplayName(p.name, true)}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            <span>TER: {item.ter.toFixed(2)}%</span>
                            <span>•</span>
                            <span
                              className={cn(
                                'font-bold',
                                isLowCost
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isHighCost
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              )}
                            >
                              {isLowCost ? 'Indexado Low-Cost' : isHighCost ? 'Gestión Activa' : 'Eficiente'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Proportional fee share bar */}
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/[0.05] overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              isLowCost
                                ? 'bg-emerald-500'
                                : isHighCost
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            )}
                            style={{ width: `${Math.max(4, shareOfFees)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {shareOfFees.toFixed(0)}% fee
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-[210px] shrink-0 text-xs font-mono">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                          {fmt.currency(item.annualCostEur)}/año
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-bold text-[11px]"
                          title="Impacto acumulado compuesto a 10 años"
                        >
                          10Y: -{fmt.currency(item.drag10yEur)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  )
}

