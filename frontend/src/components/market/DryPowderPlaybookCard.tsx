import React, { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Crosshair,
  Zap,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  Clock,
  TrendingDown,
  Flame,
  RefreshCw,
  PiggyBank,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import {
  usePositions,
  useSp500Chart,
  usePerformance,
  usePortfolioSummary,
} from '@/api/queries'
import { fmt, cn } from '@/lib/utils'

interface ShotExecutionState {
  executedAt?: string
  executedPrice?: number
  executedAmount?: number
  pendingSettlement?: boolean
}

type ShotPctOption = 3.3 | 5 | 6.6

interface PlaybookStorageState {
  shots: Record<string, ShotExecutionState>
  shot2SourceIsin: 'LU0840158819' | 'ES0140794001'
  shotPctAth: ShotPctOption
}

const STORAGE_KEY = 'portfolio_dry_powder_playbook_v3'

const DEFAULT_STATE: PlaybookStorageState = {
  shots: {
    shot_10: {
      executedAt: '25 nov 2026',
      executedAmount: 3000,
      pendingSettlement: true,
    },
  },
  shot2SourceIsin: 'LU0840158819',
  shotPctAth: 5,
}

function loadPlaybookState(): PlaybookStorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw)
    const pct = parsed?.shotPctAth
    return {
      shots: parsed?.shots && typeof parsed.shots === 'object' ? parsed.shots : {},
      shot2SourceIsin:
        parsed?.shot2SourceIsin === 'ES0140794001' ? 'ES0140794001' : 'LU0840158819',
      shotPctAth: pct === 3.3 || pct === 5 || pct === 6.6 ? pct : 5,
    }
  } catch {
    return DEFAULT_STATE
  }
}

export interface DryPowderPlaybookCardProps {
  /** 'full' = interactive dashboard card; 'alert-only' = compact top banner ONLY when a shot is actively triggered or ready to recharge */
  variant?: 'full' | 'alert-only'
  className?: string
}

interface ShotDefinition {
  id: 'shot_10' | 'shot_20' | 'shot_30'
  index: 1 | 2 | 3
  triggerPct: number // positive magnitude: 10, 20, 30
  phaseLabel: string
  sourceIsin: string
  sourceName: string
  currentBalance: number
  targetAmount: number
  targetLabel: string
  targetIsin: string
  brokerLabel: string
  executionNote: string
  speedLabel: string
}

export const DryPowderPlaybookCard: React.FC<DryPowderPlaybookCardProps> = ({
  variant = 'full',
  className,
}) => {
  const { data: spData, isLoading: spLoading } = useSp500Chart('1d')
  const { data: positions = [] } = usePositions()
  const { data: perfHistory = [] } = usePerformance('all')
  const { data: portfolioSummary } = usePortfolioSummary()

  const [state, setState] = useState<PlaybookStorageState>(() => loadPlaybookState())
  const [confirmingReset, setConfirmingReset] = useState<boolean>(false)

  // Keep multiple mounted instances (Overview / Market / Diversification) in sync
  useEffect(() => {
    const onSync = () => setState(loadPlaybookState())
    window.addEventListener('dry-powder-playbook-updated', onSync)
    window.addEventListener('storage', onSync)
    return () => {
      window.removeEventListener('dry-powder-playbook-updated', onSync)
      window.removeEventListener('storage', onSync)
    }
  }, [])

  const persistState = (next: PlaybookStorageState) => {
    setState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new Event('dry-powder-playbook-updated'))
    } catch {
      // ignore storage quota errors
    }
  }

  const summary = spData?.summary
  const spPrice = summary?.price ?? 0
  const spAth = summary?.ath_price ?? (spPrice > 0 ? spPrice : 0)
  const spAthDate = summary?.ath_date ?? null
  const drawdownPct =
    typeof summary?.drawdown_from_ath_pct === 'number'
      ? Math.min(0, summary.drawdown_from_ath_pct)
      : spAth > 0 && spPrice > 0
        ? Math.min(0, ((spPrice - spAth) / spAth) * 100)
        : 0
  const drawdownAbs = Math.abs(drawdownPct)

  // Live portfolio balances & true Portfolio ATH (auto-scales targets upward, never shrinks in bear markets)
  const posByIsin = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of positions) {
      if (p.isin) map[p.isin.toUpperCase()] = p.current_value || 0
    }
    return map
  }, [positions])

  const totalPortfolioValue = useMemo(
    () => positions.reduce((acc, p) => acc + (p.current_value || 0), 0),
    [positions]
  )

  const { portfolioAth, portfolioAthDate } = useMemo(() => {
    let maxVal = totalPortfolioValue
    let maxDate: string | null = null
    for (const pt of perfHistory) {
      if (typeof pt.value === 'number' && pt.value > maxVal) {
        maxVal = pt.value
        maxDate = pt.date
      }
    }
    return { portfolioAth: maxVal, portfolioAthDate: maxDate }
  }, [perfHistory, totalPortfolioValue])

  const shotPctAth = state.shotPctAth
  const totalReservePct = shotPctAth === 3.3 ? 10 : shotPctAth === 6.6 ? 20 : 15
  const targetPerShot = Math.round(portfolioAth * (totalReservePct / 300))
  const totalTargetReserve = targetPerShot * 3

  const cashTrAmount = posByIsin['CASH_TR_EUR'] ?? 0
  const stormAmount = posByIsin['LU0840158819'] ?? 0
  const gammaAmount = posByIsin['ES0140794001'] ?? 0
  const bondAmount = posByIsin['ES0000012411'] ?? 0

  const hasBothRfFunds = stormAmount > 10 && gammaAmount > 10
  const activeShot2Isin: 'LU0840158819' | 'ES0140794001' =
    state.shot2SourceIsin === 'ES0140794001' && gammaAmount > 10
      ? 'ES0140794001'
      : stormAmount > 10
        ? 'LU0840158819'
        : gammaAmount > 10
          ? 'ES0140794001'
          : 'LU0840158819'

  const shots: ShotDefinition[] = useMemo(
    () => [
      {
        id: 'shot_10',
        index: 1,
        triggerPct: 10,
        phaseLabel: 'Corrección (-10%)',
        sourceIsin: 'CASH_TR_EUR',
        sourceName: 'Cuenta Remunerada TR',
        currentBalance: cashTrAmount,
        targetAmount: targetPerShot,
        targetLabel: 'Vanguard U.S. SP500 Index',
        targetIsin: 'IE0032126645',
        brokerLabel: 'MyInvestor',
        executionNote: state.shots.shot_10?.pendingSettlement
          ? 'Orden pendiente de liquidar (3.000 € desde TR) · TER 0,10%'
          : 'Liquidez inmediata (TR) → suscripción S&P 500 · TER 0,10%',
        speedLabel: state.shots.shot_10?.pendingSettlement ? 'Pendiente liquidar' : 'Refugio 1 · Caja',
      },
      {
        id: 'shot_20',
        index: 2,
        triggerPct: 20,
        phaseLabel: 'Bear Market (-20%)',
        sourceIsin: activeShot2Isin,
        sourceName:
          activeShot2Isin === 'ES0140794001' ? 'Gamma Global FI' : 'Storm Bond Fund',
        currentBalance: activeShot2Isin === 'ES0140794001' ? gammaAmount : stormAmount,
        targetAmount: targetPerShot,
        targetLabel: 'Vanguard U.S. SP500 Index',
        targetIsin: 'IE0032126645',
        brokerLabel: 'MyInvestor',
        executionNote: 'Traspaso interno 0% IRPF · TER 0,10%',
        speedLabel: 'Traspaso 0% IRPF',
      },
      {
        id: 'shot_30',
        index: 3,
        triggerPct: 30,
        phaseLabel: 'Pánico / Recesión (-30%)',
        sourceIsin: 'ES0000012411',
        sourceName: 'Bonos Gobierno España Jul 32',
        currentBalance: bondAmount,
        targetAmount: targetPerShot,
        targetLabel: 'Vanguard U.S. SP500 Index',
        targetIsin: 'IE0032126645',
        brokerLabel: 'MyInvestor / Bróker',
        executionNote: 'Venta bono soberano → suscripción S&P 500',
        speedLabel: 'Búnker final',
      },
    ],
    [
      cashTrAmount,
      activeShot2Isin,
      gammaAmount,
      stormAmount,
      bondAmount,
      targetPerShot,
      state.shots.shot_10,
    ]
  )

  const toggleShotExecuted = (shotId: ShotDefinition['id']) => {
    const existing = state.shots[shotId]
    const nextShots = { ...state.shots }
    if (existing?.executedAt) {
      delete nextShots[shotId]
    } else {
      const shotObj = shots.find((s) => s.id === shotId)
      nextShots[shotId] = {
        executedAt: new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        executedPrice: spPrice > 0 ? Math.round(spPrice * 100) / 100 : undefined,
        executedAmount:
          shotObj && shotObj.currentBalance > 0
            ? Math.round(shotObj.currentBalance)
            : targetPerShot,
        pendingSettlement: false,
      }
    }
    persistState({ ...state, shots: nextShots })
  }

  const resetCycle = () => {
    setConfirmingReset(false)
    persistState({ ...state, shots: {} })
  }

  const setShot2Source = (isin: 'LU0840158819' | 'ES0140794001') => {
    persistState({ ...state, shot2SourceIsin: isin })
  }

  const setShotPctAth = (pct: ShotPctOption) => {
    persistState({ ...state, shotPctAth: pct })
  }

  const triggeredPendingShots = shots.filter(
    (s) => drawdownAbs >= s.triggerPct && !state.shots[s.id]?.executedAt
  )
  const executedCount = shots.filter((s) => Boolean(state.shots[s.id]?.executedAt)).length

  // Total current balance across the 3 shelters & total recharge gap vs 3 × shotPctAth% of Portfolio ATH
  const totalPreparedNow = shots.reduce((acc, s) => acc + s.currentBalance, 0)
  const rechargeItems = shots
    .map((s) => ({
      shot: s,
      deficit: Math.max(0, s.targetAmount - s.currentBalance),
      isExecuted: Boolean(state.shots[s.id]?.executedAt),
    }))
    .filter((item) => item.deficit >= 100)
  const totalRechargeNeeded = rechargeItems.reduce((acc, it) => acc + it.deficit, 0)

  const monthlyPace = portfolioSummary?.monthly_pace && portfolioSummary.monthly_pace > 100
    ? portfolioSummary.monthly_pace
    : 1500
  const rechargeMonthsEst = totalRechargeNeeded > 0 ? totalRechargeNeeded / monthlyPace : 0
  // Reversion / Recharge mode activates when S&P 500 recovers within 3% of ATH
  const isReversionZone = spPrice > 0 && drawdownAbs < 3.0
  const isRechargeActionable = isReversionZone && totalRechargeNeeded >= 250

  // ── Alert-only banner mode (OverviewPage — zero clutter on normal days) ──────
  if (variant === 'alert-only') {
    if (spPrice <= 0) return null

    // Priority 1: Active drawdown trigger (-10% / -20% / -30%)
    if (triggeredPendingShots.length > 0) {
      const nextShot = triggeredPendingShots[0]
      const deployAmount =
        nextShot.currentBalance > 0
          ? Math.min(nextShot.currentBalance, nextShot.targetAmount * 1.15)
          : nextShot.targetAmount
      return (
        <div
          className={cn(
            'rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm',
            className
          )}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 shrink-0 animate-pulse">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  ¡Disparo {nextShot.index} Activado! · S&P 500 en {drawdownPct.toFixed(1)}% desde ATH
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25">
                  {spPrice.toLocaleString('es-ES', { maximumFractionDigits: 1 })} pts
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                Objetivo ({shotPctAth}% ATH):{' '}
                <strong className="font-mono">{fmt.currency(deployAmount)}</strong> de{' '}
                <strong>{nextShot.sourceName}</strong> → <strong>{nextShot.targetLabel}</strong> (
                {nextShot.brokerLabel}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleShotExecuted(nextShot.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marcar ejecutado</span>
            </button>
            <Link
              to="/market"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/80 dark:bg-white/[0.08] hover:bg-white dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 transition-colors"
            >
              <span>Ver plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )
    }

    // Priority 2: Reversion reached (S&P 500 recovered to ATH) & executed shot needs recharge
    if (isReversionZone && executedCount > 0 && totalRechargeNeeded >= 250) {
      return (
        <div
          className={cn(
            'rounded-2xl border border-blue-500/35 bg-gradient-to-r from-blue-500/12 via-emerald-500/8 to-blue-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm',
            className
          )}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                Reversión completada (S&P 500 a {drawdownPct.toFixed(1)}% de ATH) · Toca recargar refugio
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                Desvía <strong className="font-mono">{fmt.currency(totalRechargeNeeded)}</strong> de
                ahorro nuevo (~{rechargeMonthsEst.toFixed(1)} meses sin vender ni tributar) para
                rellenar tus refugios al {shotPctAth}% ATH cada uno.
              </p>
            </div>
          </div>
          <Link
            to="/market"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0"
          >
            <span>Plan de recarga</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )
    }

    return null
  }

  // ── Full Interactive Playbook Card ───────────────────────────────────────────
  const thermometerMax = 35
  const needlePct = Math.min(100, Math.max(0, (drawdownAbs / thermometerMax) * 100))

  return (
    <Card className={cn('overflow-hidden border-amber-500/20', className)}>
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div
              className={cn(
                'p-2.5 rounded-xl border shrink-0',
                triggeredPendingShots.length > 0
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/35 animate-pulse'
                  : 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent text-amber-600 dark:text-amber-400 border-amber-500/25'
              )}
            >
              <Crosshair className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Protocolo Pólvora Seca · 3 Disparos S&P 500
                </h3>
                <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                  -10% · -20% · -30%
                </span>
                {executedCount > 0 && !confirmingReset && (
                  <button
                    type="button"
                    onClick={() => setConfirmingReset(true)}
                    title="Reiniciar los 3 disparos cuando el S&P 500 recupere máximos y hayas recargado los refugios"
                    className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Rearmar ciclo</span>
                  </button>
                )}
                {confirmingReset && (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                    <span>¿Reiniciar los 3 disparos?</span>
                    <button
                      type="button"
                      onClick={resetCycle}
                      className="px-1.5 py-0.2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold cursor-pointer transition-colors"
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(false)}
                      className="px-1.5 py-0.2 rounded-md bg-slate-200/90 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      No
                    </button>
                  </span>
                )}
                {triggeredPendingShots.length > 0 && (
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 animate-pulse">
                    ¡{triggeredPendingShots.length} disparo activo!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-[430px] leading-snug">
                Auto-escalado al máximo histórico (ATH) de tu cartera: define cuánto tener listo en cada refugio y cuánto recargar tras cada rebote.
              </p>
            </div>
          </div>

          {/* Right: ATH sizing switcher + Live Summary Stats (side-by-side on desktop) */}
          <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap shrink-0">
            {/* Sizing % of Portfolio ATH selector */}
            <div
              title="Porcentaje del ATH de tu cartera asignado a cada uno de los 3 disparos (10% / 15% / 20% total)"
              className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-[11px]"
            >
              <span className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Disparo:
              </span>
              {([3.3, 5, 6.6] as const).map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setShotPctAth(pct)}
                  className={cn(
                    'px-2 py-1 rounded-lg font-mono font-bold transition-colors cursor-pointer',
                    shotPctAth === pct
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div
              data-private
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] flex items-center gap-3"
            >
              <div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                  ATH Cartera {portfolioAthDate ? `(${portfolioAthDate.slice(5)})` : ''}
                </span>
                <span className="text-xs sm:text-sm font-mono font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                  {fmt.currency(portfolioAth)}{' '}
                  <span className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400">
                    → {fmt.currency(targetPerShot)}/disp.
                  </span>
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
              <div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                  Refugios hoy
                </span>
                <span className="text-xs sm:text-sm font-mono font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                  {fmt.currency(totalPreparedNow)}{' '}
                  <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                    / {fmt.currency(totalTargetReserve)}
                  </span>
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
              <div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                  DD S&P 500
                </span>
                <span
                  className={cn(
                    'text-xs sm:text-sm font-mono font-extrabold mt-0.5 block',
                    drawdownAbs >= 10
                      ? 'text-rose-600 dark:text-rose-400'
                      : drawdownAbs >= 5
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {spLoading && spPrice === 0 ? '...' : `${drawdownPct.toFixed(2)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Drawdown Thermometer (0% -> -10% -> -20% -> -30%) */}
        <div className="py-3.5 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-2 flex-wrap gap-1">
            <span>
              S&P 500 actual:{' '}
              <strong className="text-slate-900 dark:text-white">
                {spPrice > 0
                  ? `${spPrice.toLocaleString('es-ES', { maximumFractionDigits: 2 })} pts`
                  : '—'}
              </strong>
            </span>
            <span>
              Máximo histórico S&P 500 (ATH):{' '}
              <strong className="text-slate-900 dark:text-white">
                {spAth > 0
                  ? `${spAth.toLocaleString('es-ES', { maximumFractionDigits: 2 })} pts`
                  : '—'}
              </strong>
              {spAthDate ? ` (${spAthDate})` : ''}
            </span>
          </div>

          <div className="relative h-3 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-visible">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                drawdownAbs >= 20
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600'
                  : drawdownAbs >= 10
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-blue-500'
              )}
              style={{ width: `${Math.max(2, needlePct)}%` }}
            />

            {[10, 20, 30].map((level) => {
              const leftPct = (level / thermometerMax) * 100
              const reached = drawdownAbs >= level
              return (
                <div
                  key={level}
                  style={{ left: `${leftPct}%` }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                >
                  <div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full border-2 shadow-xs',
                      reached
                        ? 'bg-rose-500 border-white dark:border-slate-900 scale-110'
                        : 'bg-white dark:bg-slate-800 border-slate-400 dark:border-slate-500'
                    )}
                  />
                </div>
              )
            })}
          </div>

          <div className="relative h-4 mt-1 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
            <span className="absolute left-0">0% (ATH)</span>
            {[10, 20, 30].map((level) => (
              <span
                key={level}
                style={{ left: `${(level / thermometerMax) * 100}%` }}
                className={cn(
                  'absolute -translate-x-1/2',
                  drawdownAbs >= level
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                -{level}%
              </span>
            ))}
          </div>
        </div>

        {/* 3 Shot Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-3.5">
          {shots.map((shot) => {
            const execInfo = state.shots[shot.id]
            const isExecuted = Boolean(execInfo?.executedAt)
            const isTriggered = drawdownAbs >= shot.triggerPct && !isExecuted
            const targetSpPrice = spAth > 0 ? spAth * (1 - shot.triggerPct / 100) : 0
            const remainingDropPct =
              spPrice > 0 && targetSpPrice > 0
                ? ((targetSpPrice - spPrice) / spPrice) * 100
                : -(shot.triggerPct - drawdownAbs)
            const remainingPts = spPrice > 0 && targetSpPrice > 0 ? targetSpPrice - spPrice : 0

            const coveragePct =
              shot.targetAmount > 0
                ? Math.min(100, Math.round((shot.currentBalance / shot.targetAmount) * 100))
                : 0
            const shelterDelta = shot.currentBalance - shot.targetAmount
            const isShelterFull = shot.targetAmount > 0 && shot.currentBalance >= shot.targetAmount * 0.95

            return (
              <div
                key={shot.id}
                className={cn(
                  'rounded-2xl border p-3.5 flex flex-col justify-between gap-3 transition-all',
                  isExecuted
                    ? execInfo?.pendingSettlement
                      ? 'bg-blue-500/[0.05] dark:bg-blue-500/[0.07] border-blue-500/30'
                      : 'bg-emerald-500/[0.05] dark:bg-emerald-500/[0.07] border-emerald-500/30'
                    : isTriggered
                      ? 'bg-amber-500/[0.08] dark:bg-amber-500/[0.10] border-amber-500/50 ring-1 ring-amber-500/25 shadow-sm'
                      : 'bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.08]'
                )}
              >
                <div>
                  {/* Top row: Shot badge + status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-6 h-6 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center border shrink-0',
                          isExecuted
                            ? execInfo?.pendingSettlement
                              ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : isTriggered
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10'
                        )}
                      >
                        {shot.index}
                      </span>
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white block leading-tight">
                          Disparo {shot.index} · -{shot.triggerPct}%
                        </span>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">
                          {shot.phaseLabel}
                        </span>
                      </div>
                    </div>

                    {isExecuted ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                          execInfo?.pendingSettlement
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                        )}
                      >
                        {execInfo?.pendingSettlement ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        <span>{execInfo?.pendingSettlement ? 'EN CURSO' : 'EJECUTADO'}</span>
                      </span>
                    ) : isTriggered ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs shrink-0 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>¡DISPARAR!</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>EN ESPERA</span>
                      </span>
                    )}
                  </div>

                  {/* Target S&P 500 level & distance */}
                  <div className="mt-2.5 px-2.5 py-2 rounded-xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between gap-2 text-[11px]">
                    <div>
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                        Gatillo S&P 500
                      </span>
                      <span className="font-mono font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                        {targetSpPrice > 0
                          ? `≤ ${targetSpPrice.toLocaleString('es-ES', { maximumFractionDigits: 0 })} pts`
                          : `-${shot.triggerPct}% ATH`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                        {isExecuted ? 'Lanzado el' : isTriggered ? 'Estado' : 'Distancia'}
                      </span>
                      {isExecuted ? (
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                          {execInfo?.executedAt}
                        </span>
                      ) : isTriggered ? (
                        <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block">
                          Nivel superado
                        </span>
                      ) : (
                        <span className="font-mono font-semibold text-slate-600 dark:text-slate-300 mt-0.5 flex items-center justify-end gap-0.5">
                          <TrendingDown className="w-3 h-3 text-slate-400" />
                          {remainingDropPct.toFixed(1)}%
                          {remainingPts < 0 ? ` (${Math.round(remainingPts)} pts)` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Shelter Coverage Meter: Actual vs Optimal % ATH */}
                  <div
                    data-private
                    className="mt-2.5 px-2.5 py-2 rounded-xl bg-white/75 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-1 text-[10.5px]">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        Refugio ({shotPctAth}% ATH):{' '}
                        <strong className="font-mono text-slate-900 dark:text-white">
                          {fmt.currency(shot.targetAmount)}
                        </strong>
                      </span>
                      <span
                        className={cn(
                          'font-mono font-bold text-[10px]',
                          isExecuted
                            ? 'text-blue-600 dark:text-blue-400'
                            : isShelterFull
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {isExecuted
                          ? `Recargar ${fmt.currency(Math.max(0, shot.targetAmount - shot.currentBalance))}`
                          : isShelterFull
                            ? `Cubierto (+${fmt.currency(Math.max(0, shelterDelta))})`
                            : `Faltan ${fmt.currency(Math.abs(shelterDelta))}`}
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden mt-1.5">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isExecuted
                            ? 'bg-blue-500'
                            : isShelterFull
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                        )}
                        style={{ width: `${coveragePct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                      <span>Preparado hoy: {fmt.currency(shot.currentBalance)}</span>
                      <span>{coveragePct}%</span>
                    </div>
                  </div>

                  {/* Order flow: Source -> Target */}
                  <div className="mt-2.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {shot.sourceName}
                      </span>
                      {shot.index === 2 && hasBothRfFunds && (
                        <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-white/[0.06] p-0.5 text-[10px] shrink-0">
                          <button
                            type="button"
                            onClick={() => setShot2Source('LU0840158819')}
                            className={cn(
                              'px-1.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer',
                              activeShot2Isin === 'LU0840158819'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-500 dark:text-slate-400'
                            )}
                          >
                            Storm
                          </button>
                          <button
                            type="button"
                            onClick={() => setShot2Source('ES0140794001')}
                            className={cn(
                              'px-1.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer',
                              activeShot2Isin === 'ES0140794001'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-500 dark:text-slate-400'
                            )}
                          >
                            Gamma
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{shot.targetLabel}</span>
                    </div>

                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                      {shot.executionNote}
                    </p>
                  </div>
                </div>

                {/* Action footer */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {shot.index === 1 ? (
                      <Zap className="w-3 h-3 text-amber-500" />
                    ) : (
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    )}
                    <span>
                      {shot.brokerLabel} · {shot.speedLabel}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleShotExecuted(shot.id)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0',
                      isExecuted
                        ? 'bg-slate-200/80 hover:bg-slate-300/80 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-slate-200'
                        : isTriggered
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-white/10'
                    )}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isExecuted ? 'Deshacer' : 'Marcar hecho'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Automatic Reversion & Shelter Recharge Plan */}
        {rechargeItems.length > 0 && (
          <div
            data-private
            className={cn(
              'mt-3.5 rounded-2xl border p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3',
              isRechargeActionable
                ? 'bg-blue-500/[0.07] dark:bg-blue-500/[0.10] border-blue-500/35'
                : 'bg-slate-50/80 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.08]'
            )}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={cn(
                  'p-2 rounded-xl border shrink-0 mt-0.5',
                  isRechargeActionable
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30'
                    : 'bg-slate-200/70 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-slate-300/70 dark:border-white/10'
                )}
              >
                {isRechargeActionable ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <PiggyBank className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {isRechargeActionable
                      ? 'Modo Recarga Activo · Reversión completada'
                      : 'Plan de Recarga de Refugios (cuando el S&P 500 vuelva a máximos)'}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border',
                      isRechargeActionable
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-200/80 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-slate-300/60 dark:border-white/10'
                    )}
                  >
                    {isRechargeActionable
                      ? `Recargar ${fmt.currency(totalRechargeNeeded)}`
                      : `En pausa (S&P 500 a ${drawdownPct.toFixed(1)}% ATH)`}
                  </span>
                </div>

                <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {isRechargeActionable ? (
                    <>
                      El S&P 500 ya está cerca de máximos ({drawdownPct.toFixed(1)}%). Desvía tus
                      próximas aportaciones nuevas (~<strong>{rechargeMonthsEst.toFixed(1)} meses</strong>{' '}
                      a tu ritmo de {fmt.currency(monthlyPace)}/mes, <strong>0% IRPF sin vender</strong>)
                      para rellenar:
                    </>
                  ) : (
                    <>
                      Mientras el S&P 500 siga por debajo de <strong>-3% desde ATH</strong>, sigue
                      metiendo tus aportaciones mensuales en Renta Variable. En cuanto recupere
                      máximos, desvía{' '}
                      <strong className="font-mono">{fmt.currency(totalRechargeNeeded)}</strong> (~
                      <strong>{rechargeMonthsEst.toFixed(1)} meses</strong> de ahorro, 0% IRPF) para
                      recuperar tus refugios al {shotPctAth}% ATH:
                    </>
                  )}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {rechargeItems.map(({ shot, deficit }) => (
                    <span
                      key={shot.id}
                      className="inline-flex items-center gap-1.5 text-[10.5px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-white/10"
                    >
                      <span className="text-blue-600 dark:text-blue-400">#{shot.index}</span>
                      <span className="font-sans font-semibold">{shot.sourceName}:</span>
                      <span className="text-emerald-700 dark:text-emerald-400">
                        +{fmt.currency(deficit)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
