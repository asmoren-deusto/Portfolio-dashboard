import React from 'react'
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  Flame,
  Calendar,
  ShieldAlert,
  PiggyBank,
  Zap,
  Activity,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn, fmt } from '@/lib/utils'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { LoadingDot } from '@/components/ui/LoadingDot'
import { GoalProgressBar } from './GoalProgressBar'
import { KpiTile } from './KpiTile'
import type { PortfolioSummary, Analytics } from '@/lib/mockData'

interface NetWorthHeroProps {
  summary?: PortfolioSummary | null
  analytics?: Analytics | null
  shortTermMetrics?: {
    dayAmount?: number
    dayPct?: number
    weekAmount?: number
    weekPct?: number
  } | null
  sessionPct?: number
  sessionAmount?: number
  sessionMarketState?: string
  selectedBrokerName?: string
  isRefreshing?: boolean
  updatedPositionsCount?: number
  totalPositionsCount?: number
  className?: string
}

export function NetWorthHero({
  summary,
  analytics,
  shortTermMetrics,
  sessionPct,
  sessionAmount,
  sessionMarketState,
  selectedBrokerName = 'Total Cartera',
  isRefreshing = false,
  updatedPositionsCount,
  totalPositionsCount,
  className,
}: NetWorthHeroProps) {
  const totalVal = summary?.total_value ?? 0
  const invested = summary?.total_invested ?? 0
  const pnl = summary?.total_pnl ?? 0
  const pnlPct = summary?.total_pnl_pct ?? 0
  const isPnlPositive = pnl >= 0

  // Key metrics from backend
  const tir = summary?.irr ?? analytics?.annualized_return ?? analytics?.cagr
  const realizedPnl = summary?.realized_pnl ?? analytics?.realized_pnl ?? 0
  const monthlyPace = summary?.monthly_pace ?? analytics?.monthly_pace ?? 0
  const streakMonths = summary?.contribution_streak_months ?? analytics?.contribution_streak_months ?? 0
  const totalContributions = summary?.total_contributions_count ?? analytics?.total_contributions_count ?? 0
  const maxDrawdown = analytics?.max_drawdown ?? null

  return (
    <div className={cn('flex flex-col gap-3 sm:gap-3.5', className)}>
      {/* ── Main Net Worth Card ────────────────────────────────────────────── */}
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl border transition-all duration-300',
          'bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 dark:from-white/[0.04] dark:via-white/[0.02] dark:to-transparent',
          'border-slate-800/80 dark:border-white/[0.08] shadow-2xl p-5 sm:p-7 backdrop-blur-xl'
        )}
      >
        {/* Glow ambient background effects */}
        <div
          className="pointer-events-none absolute -top-24 left-1/3 h-52 w-96 rounded-full bg-blue-600/15 blur-3xl dark:bg-blue-500/10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 right-10 h-44 w-72 rounded-full bg-emerald-600/10 blur-3xl dark:bg-emerald-500/10"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header row: Overline label + Broker badge + Updating status */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25">
                <Wallet size={13} className="stroke-[2.5]" />
              </span>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300">
                Patrimonio Neto
              </span>
              {isRefreshing && <LoadingDot />}
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 dark:bg-white/[0.06] border border-slate-700/60 dark:border-white/[0.08] text-[11px] font-semibold text-slate-300 dark:text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                {selectedBrokerName}
              </span>
              {totalPositionsCount !== undefined && totalPositionsCount > 0 && (
                <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono">
                  {updatedPositionsCount !== undefined ? `${updatedPositionsCount}/${totalPositionsCount}` : totalPositionsCount} pos. act.
                </span>
              )}
            </div>
          </div>

          {/* Monumental Net Worth Figure + Daily Badges */}
          <div className="flex flex-wrap items-baseline justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <div
                data-private
                className="text-3xl sm:text-5xl lg:text-6xl font-black font-mono tracking-tight text-white dark:text-white leading-none"
              >
                <AnimatedNumber value={totalVal} format={fmt.currency} />
              </div>

              {/* Day / Live performance badges */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {shortTermMetrics?.dayPct !== undefined && (
                  <span
                    data-private
                    title={
                      shortTermMetrics.dayAmount !== undefined
                        ? `Rendimiento Sesión Hoy (NAV oficial): ${shortTermMetrics.dayAmount >= 0 ? '+' : ''}${fmt.currency(shortTermMetrics.dayAmount)} (${fmt.pct(shortTermMetrics.dayPct)})`
                        : `Rendimiento Sesión Hoy (NAV oficial): ${fmt.pct(shortTermMetrics.dayPct)}`
                    }
                    className={cn(
                      'inline-flex items-center font-mono font-semibold px-2 py-0.5 text-xs rounded-lg gap-1 border transition-all cursor-default',
                      shortTermMetrics.dayPct >= 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                    )}
                  >
                    <Zap size={12} className="stroke-[2.5]" />
                    <span>Hoy:</span>
                    <span className="font-bold">{fmt.pct(shortTermMetrics.dayPct)}</span>
                  </span>
                )}

                {sessionPct !== undefined && !isNaN(sessionPct) && (
                  <Link
                    to="/market"
                    data-private
                    title={`Rendimiento Mercado en Directo: ${sessionPct >= 0 ? '+' : ''}${fmt.pct(sessionPct)}${sessionAmount !== undefined && !isNaN(sessionAmount) ? ` (${sessionAmount >= 0 ? '+' : ''}${fmt.currency(sessionAmount)})` : ''} • Estimación con réplica de ETFs líquidos (${sessionMarketState || 'LIVE'}). Clic para abrir Mercado.`}
                    className={cn(
                      'inline-flex items-center font-mono font-semibold px-2 py-0.5 text-xs rounded-lg gap-1 border transition-all hover:opacity-85 active:scale-95 cursor-pointer',
                      sessionPct >= 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                    )}
                  >
                    <Activity size={12} className="stroke-[2.5]" />
                    <span>Live:</span>
                    <span className="font-bold">{fmt.pct(sessionPct)}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Rumbo-style Insight Headline (Castellano llano que responde a las preguntas clave) */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-[13.5px] font-medium text-slate-300 dark:text-slate-300 pt-0.5">
            <span
              data-private
              className={cn(
                'font-bold font-mono',
                isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {isPnlPositive ? '+' : ''}
              {fmt.currency(pnl)} ({fmt.pct(pnlPct)})
            </span>
            <span className="text-slate-400 dark:text-slate-400">sobre lo aportado</span>

            {realizedPnl !== 0 && (
              <>
                <span className="text-slate-500 dark:text-slate-600">•</span>
                <span data-private className="text-emerald-400/90 font-mono font-semibold">
                  {realizedPnl >= 0 ? '+' : ''}
                  {fmt.currency(realizedPnl)}
                </span>
                <span className="text-slate-400 dark:text-slate-400">ya cobrados en ventas</span>
              </>
            )}

            {tir !== undefined && tir !== null && (
              <>
                <span className="text-slate-500 dark:text-slate-600">•</span>
                <span className="text-slate-400 dark:text-slate-400">TIR anualizada</span>
                <span data-private className="font-mono font-bold text-emerald-400">
                  +{tir}%
                </span>
              </>
            )}
          </div>

          {/* Goal Progress Bar */}
          <div className="pt-1">
            <GoalProgressBar currentValue={totalVal} />
          </div>
        </div>
      </div>

      {/* ── 6-KPI Mastery Grid (Rumbo-inspired 3-line tiles) ───────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {/* 1. Aportado */}
        <KpiTile
          label="Aportado"
          value={<AnimatedNumber value={invested} format={fmt.currency} />}
          context={totalContributions > 0 ? `${totalContributions} aportaciones` : 'capital desembolsado'}
          accentColor="indigo"
          icon={<PiggyBank size={14} />}
        />

        {/* 2. Plusvalía Latente */}
        <KpiTile
          label="Plusvalía Latente"
          value={
            <span className={isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}>
              {isPnlPositive ? '+' : ''}
              <AnimatedNumber value={pnl} format={fmt.currency} />
            </span>
          }
          context={`${fmt.pct(pnlPct)} sobre aportado`}
          accentColor={isPnlPositive ? 'emerald' : 'rose'}
          icon={<ArrowUpRight size={14} className={isPnlPositive ? 'text-emerald-400' : 'text-rose-400'} />}
        />

        {/* 3. TIR Anualizada */}
        <KpiTile
          label="TIR Anualizada"
          value={
            tir !== undefined && tir !== null ? (
              <span className="text-emerald-400">+{tir}%</span>
            ) : (
              '—'
            )
          }
          context="rentabilidad real del dinero"
          accentColor="emerald"
          icon={<TrendingUp size={14} />}
        />

        {/* 4. Ritmo Mensual */}
        <KpiTile
          label="Ritmo Mensual"
          value={
            monthlyPace > 0 ? (
              <span>~{fmt.currency(monthlyPace)}/m</span>
            ) : (
              '—'
            )
          }
          context="media últimos 12 meses"
          accentColor="blue"
          icon={<Calendar size={14} />}
        />

        {/* 5. Racha de Ahorro */}
        <KpiTile
          label="Racha de Ahorro"
          value={
            streakMonths > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Flame size={18} className="fill-amber-400 text-amber-400 animate-pulse" />
                {streakMonths} m
              </span>
            ) : (
              '—'
            )
          }
          context={streakMonths > 0 ? `${streakMonths} meses ininterrumpidos` : 'meses consecutivos'}
          accentColor="amber"
          icon={<Flame size={14} />}
        />

        {/* 6. Peor Caída (Max Drawdown) */}
        <KpiTile
          label="Peor Caída"
          value={
            maxDrawdown !== null ? (
              <span className={maxDrawdown > -10 ? 'text-slate-200' : 'text-rose-400'}>
                {maxDrawdown.toFixed(2)}%
              </span>
            ) : (
              '—'
            )
          }
          context={
            maxDrawdown !== null
              ? maxDrawdown > -8
                ? 'bajo impacto histórico'
                : 'controlada en cartera'
              : 'drawdown histórico'
          }
          accentColor={maxDrawdown && maxDrawdown < -15 ? 'rose' : 'purple'}
          icon={<ShieldAlert size={14} />}
        />
      </div>
    </div>
  )
}
