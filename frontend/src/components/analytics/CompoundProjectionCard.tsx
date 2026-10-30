import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts'
import {
  Sparkles,
  Rocket,
  Flame,
  Target,
  TrendingUp,
  RotateCcw,
  Coins,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { fmt, cn } from '@/lib/utils'

interface CompoundProjectionCardProps {
  currentValue: number
  currentInvested: number
  defaultMonthlyDca?: number
  defaultAnnualReturn?: number
  volatility?: number
}

const MILESTONES = [50000, 100000, 150000, 250000, 500000, 1000000]

export function CompoundProjectionCard({
  currentValue,
  currentInvested,
  defaultMonthlyDca = 416.66,
  defaultAnnualReturn = 8.5,
  volatility = 10.5,
}: CompoundProjectionCardProps) {
  const safeBaseReturn = useMemo(() => {
    if (!defaultAnnualReturn || Number.isNaN(defaultAnnualReturn)) return 8.5
    return Math.min(15, Math.max(4.5, +defaultAnnualReturn.toFixed(1)))
  }, [defaultAnnualReturn])

  const safeBaseDca = useMemo(() => {
    if (!defaultMonthlyDca || Number.isNaN(defaultMonthlyDca) || defaultMonthlyDca <= 0) return 416.66
    return Math.round(defaultMonthlyDca)
  }, [defaultMonthlyDca])

  const [horizonYears, setHorizonYears] = useState<number>(10)
  const [monthlyDca, setMonthlyDca] = useState<number>(safeBaseDca)
  const [expectedReturn, setExpectedReturn] = useState<number>(safeBaseReturn)

  useEffect(() => {
    setMonthlyDca(safeBaseDca)
  }, [safeBaseDca])

  const simulation = useMemo(() => {
    const startVal = Math.max(0, currentValue || 77000)
    const startInv = Math.max(0, currentInvested || 66800)
    const currentYear = new Date().getFullYear()
    const vol = Math.min(22, Math.max(5, volatility || 10.5)) / 100
    const rBase = expectedReturn / 100

    const points: {
      yearLabel: string
      yearOffset: number
      invested: number
      base: number
      optimistic: number
      conservative: number
      annualGain: number
      annualContribution: number
    }[] = []

    let valBase = startVal
    let valOpt = startVal
    let valCons = startVal
    let cumInvested = startInv
    let snowballCrossoverYear: number | null = null

    const annualContrib = monthlyDca * 12

    // Check if already at snowball crossover at year 0
    if (startVal * rBase >= annualContrib && annualContrib > 0) {
      snowballCrossoverYear = 0
    }

    for (let y = 0; y <= horizonYears; y++) {
      const annualGainThisYear = y === 0 ? startVal * rBase : valBase * rBase

      points.push({
        yearLabel: y === 0 ? 'Hoy' : `${currentYear + y}`,
        yearOffset: y,
        invested: Math.round(cumInvested),
        base: Math.round(valBase),
        optimistic: Math.round(valOpt),
        conservative: Math.round(valCons),
        annualGain: Math.round(annualGainThisYear),
        annualContribution: Math.round(annualContrib),
      })

      if (y < horizonYears) {
        // Monthly compounding step
        for (let m = 0; m < 12; m++) {
          valBase = valBase * (1 + rBase / 12) + monthlyDca
          cumInvested += monthlyDca
        }
        // Cone of uncertainty widening with sqrt(t)
        const t = y + 1
        const rOpt = rBase + (0.65 * vol) / Math.pow(t, 0.25)
        const rCons = Math.max(0.015, rBase - (0.65 * vol) / Math.pow(t, 0.25))

        // Recompute smooth paths for optimistic/conservative
        valOpt =
          startVal * Math.pow(1 + rOpt, t) +
          (rOpt > 0
            ? monthlyDca * 12 * ((Math.pow(1 + rOpt, t) - 1) / rOpt)
            : monthlyDca * 12 * t)
        valCons =
          startVal * Math.pow(1 + rCons, t) +
          (rCons > 0
            ? monthlyDca * 12 * ((Math.pow(1 + rCons, t) - 1) / rCons)
            : monthlyDca * 12 * t)

        if (
          snowballCrossoverYear === null &&
          annualContrib > 0 &&
          valBase * rBase >= annualContrib
        ) {
          snowballCrossoverYear = t
        }
      }
    }

    const finalPoint = points[points.length - 1]
    const totalCompoundGain = finalPoint.base - finalPoint.invested
    const compoundSharePct =
      finalPoint.base > 0 ? (totalCompoundGain / finalPoint.base) * 100 : 0

    // Safe Withdrawal Rate (4% Rule) monthly passive income
    const swrMonthlyNow = (startVal * 0.04) / 12
    const swrMonthlyFuture = (finalPoint.base * 0.04) / 12

    // Next milestone calculation
    const nextMilestone =
      MILESTONES.find((m) => m > startVal) || Math.ceil(startVal / 250000) * 250000 + 250000
    const prevMilestone =
      [...MILESTONES].reverse().find((m) => m <= startVal) || 0
    const milestoneProgressPct = Math.min(
      100,
      Math.max(
        2,
        ((startVal - prevMilestone) / Math.max(1, nextMilestone - prevMilestone)) * 100
      )
    )

    // Estimate years to next milestone
    let yearsToNextMilestone = 0
    let testVal = startVal
    while (testVal < nextMilestone && yearsToNextMilestone < 40) {
      testVal = testVal * (1 + rBase / 12) + monthlyDca
      yearsToNextMilestone += 1 / 12
    }

    return {
      points,
      finalPoint,
      totalCompoundGain,
      compoundSharePct,
      snowballCrossoverYear,
      swrMonthlyNow,
      swrMonthlyFuture,
      nextMilestone,
      milestoneProgressPct,
      yearsToNextMilestone: +yearsToNextMilestone.toFixed(1),
    }
  }, [currentValue, currentInvested, horizonYears, monthlyDca, expectedReturn, volatility])

  const handleReset = () => {
    setHorizonYears(10)
    setMonthlyDca(safeBaseDca)
    setExpectedReturn(safeBaseReturn)
  }

  return (
    <Card className="w-full h-full flex flex-col justify-between overflow-hidden" delay={0.31}>
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-blue-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shrink-0">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm sm:text-base font-bold">
                Proyección de Interés Compuesto, Cono Monte Carlo y Bola de Nieve
              </CardTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                Simulador Patrimonial
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Bandas probabilísticas (P15 / Base / P85), punto de inflexión de interés compuesto e hitos de libertad financiera
            </p>
          </div>
        </div>

        {/* Horizon Selector Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#202022] p-0.5">
            {[5, 10, 15, 20, 25].map((yrs) => {
              const active = horizonYears === yrs
              return (
                <button
                  key={yrs}
                  onClick={() => setHorizonYears(yrs)}
                  className={cn(
                    'relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                    active
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="compoundHorizonPill"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-[#323235] dark:border dark:border-white/10 shadow-xs"
                      transition={{ type: 'spring', bounce: 0.12, duration: 0.28 }}
                    />
                  )}
                  <span className="relative z-10">{yrs}A</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={handleReset}
            title="Restaurar parámetros reales de la cartera"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardHeader>

      <div data-private className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
        {/* Top Interactive Sliders + Next Milestone Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Control 1: DCA Monthly Slider */}
          <div className="p-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-indigo-500" />
                Aportación DCA Mensual
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                {fmt.currency(monthlyDca)}/mes
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2500}
              step={25}
              value={monthlyDca}
              onChange={(e) => setMonthlyDca(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer my-2 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg"
            />
            <div className="flex justify-between text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
              <span>0 €/m</span>
              <span>Anual: {fmt.currency(monthlyDca * 12)}/año</span>
              <span>2.500 €/m</span>
            </div>
          </div>

          {/* Control 2: Annual Return Slider */}
          <div className="p-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Rentabilidad Anual Esperada
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {expectedReturn.toFixed(1)}% TAE
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={15}
              step={0.5}
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer my-2 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg"
            />
            <div className="flex justify-between text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
              <span>Conservador (4%)</span>
              <span>Histórico (8.5%)</span>
              <span>Agresivo (15%)</span>
            </div>
          </div>

          {/* Next Milestone Progress */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/[0.06] via-blue-500/[0.04] to-transparent border border-indigo-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                Próximo Hito: {fmt.currency(simulation.nextMilestone)}
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {simulation.milestoneProgressPct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden my-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${simulation.milestoneProgressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>
                Faltan:{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {fmt.currency(Math.max(0, simulation.nextMilestone - currentValue))}
                </strong>
              </span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                ~{simulation.yearsToNextMilestone} años (
                {new Date().getFullYear() + Math.ceil(simulation.yearsToNextMilestone)})
              </span>
            </div>
          </div>
        </div>

        {/* Main Monte Carlo Cone Chart + 4 KPI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-stretch flex-1">
          {/* Cone Chart */}
          <div className="rounded-2xl bg-slate-50/70 dark:bg-[#18181b] border border-slate-200/80 dark:border-white/[0.06] p-3.5 sm:p-4 flex flex-col justify-between h-full">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Curva de Crecimiento Exponencial a {horizonYears} Años ({new Date().getFullYear() + horizonYears})
              </span>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Optimista P85
                </span>
                <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Base P50
                </span>
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-0.5 bg-indigo-400" />
                  Aportado
                </span>
              </div>
            </div>

            <div className="h-[245px] min-h-[235px] flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={simulation.points}
                  margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="projOptGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="projBaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.12)"
                  />
                  <XAxis
                    dataKey="yearLabel"
                    tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    width={62}
                    tickFormatter={(v: number) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M€`
                        : `${Math.round(v / 1000)}k€`
                    }
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const pt = payload[0].payload as (typeof simulation.points)[0]
                      const gain = pt.base - pt.invested
                      return (
                        <div className="px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-[#1e1e24]/95 border border-slate-200 dark:border-white/10 shadow-xl text-xs font-mono space-y-1">
                          <div className="font-sans font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-1">
                            Año {pt.yearLabel} ({pt.yearOffset === 0 ? 'Actual' : `+${pt.yearOffset} años`})
                          </div>
                          <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                            <span>Optimista (P85):</span>
                            <span className="font-bold">{fmt.currency(pt.optimistic)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-blue-600 dark:text-blue-400">
                            <span>Escenario Base:</span>
                            <span className="font-bold">{fmt.currency(pt.base)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-amber-600 dark:text-amber-400">
                            <span>Conservador (P15):</span>
                            <span className="font-bold">{fmt.currency(pt.conservative)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/10">
                            <span>Capital Aportado:</span>
                            <span>{fmt.currency(pt.invested)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-indigo-600 dark:text-indigo-400 font-bold">
                            <span>Interés Compuesto:</span>
                            <span>+{fmt.currency(gain)}</span>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="optimistic"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    fill="url(#projOptGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="base"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#projBaseGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="conservative"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    fill="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="invested"
                    stroke="#6366f1"
                    strokeWidth={1.8}
                    strokeDasharray="5 4"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Insights Column */}
          <div className="flex flex-col justify-between gap-2.5">
            {/* Final Expected Capital */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/25">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                Patrimonio Estimado ({horizonYears} Años)
              </span>
              <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white mt-0.5">
                {fmt.currency(simulation.finalPoint.base)}
              </div>
              <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                +{fmt.currency(simulation.totalCompoundGain)} ganancia ({simulation.compoundSharePct.toFixed(0)}% del total)
              </div>
            </div>

            {/* Snowball Crossover Insight */}
            <div className="p-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Efecto Bola de Nieve</span>
              </div>
              <p className="text-[11.5px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                {simulation.snowballCrossoverYear === 0 ? (
                  <>
                    ¡Alcanzado! Tu cartera ya genera{' '}
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      {fmt.currency(simulation.points[0].annualGain)}/año
                    </strong>
                    , superando tu aportación anual de{' '}
                    <strong className="font-mono">{fmt.currency(monthlyDca * 12)}</strong>.
                  </>
                ) : simulation.snowballCrossoverYear !== null ? (
                  <>
                    En{' '}
                    <strong className="font-mono text-amber-600 dark:text-amber-400">
                      {new Date().getFullYear() + simulation.snowballCrossoverYear} (+
                      {simulation.snowballCrossoverYear} años)
                    </strong>{' '}
                    el retorno anual de tu cartera superará lo que aportas de tu bolsillo.
                  </>
                ) : (
                  <>
                    Al final del año {horizonYears}, tu cartera generará{' '}
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      {fmt.currency(simulation.finalPoint.annualGain)}/año
                    </strong>{' '}
                    de forma autónoma.
                  </>
                )}
              </p>
            </div>

            {/* Safe Withdrawal Rate (4% Rule) */}
            <div className="p-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  Renta Perpetua (Regla 4% SWR)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-white dark:bg-[#222225] border border-slate-200/70 dark:border-white/[0.05]">
                  <span className="text-[10px] font-sans text-slate-500 dark:text-slate-400 block">
                    Renta Hoy
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {fmt.currency(simulation.swrMonthlyNow)}/m
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-sans text-emerald-700 dark:text-emerald-300 block">
                    En {horizonYears} Años
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {fmt.currency(simulation.swrMonthlyFuture)}/m
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

