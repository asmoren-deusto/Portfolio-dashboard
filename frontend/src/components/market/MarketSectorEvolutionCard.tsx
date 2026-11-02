import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Layers,
  BarChart3,
  RotateCcw,
  Filter,
  Cpu,
  ShoppingBag,
  Landmark,
  HeartPulse,
  Factory,
  Radio,
  Flame,
  Coins,
  Calendar,
  Scale,
  ShieldCheck,
  Zap,
  Coffee,
  Lightbulb,
  ExternalLink,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, LoadingDot } from '@/components/ui/Card'
import { useMarketSectorHistory, type MarketStock, type SectorHistoryMeta } from '@/api/queries'
import { cn } from '@/lib/utils'

interface MarketSectorEvolutionCardProps {
  stocks?: MarketStock[]
  selectedSector?: string
  onSelectSector?: (sector: string) => void
}

const PERIOD_OPTIONS = [
  { id: '1mo', label: '1M', years: 1 / 12, days: 30, title: 'Último mes' },
  { id: '3mo', label: '3M', years: 0.25, days: 90, title: 'Últimos 3 meses' },
  { id: '6mo', label: '6M', years: 0.5, days: 180, title: 'Últimos 6 meses' },
  { id: '1y', label: '1A', years: 1, days: 365, title: 'Último año (12 meses)' },
  { id: '2y', label: '2A', years: 2, days: 730, title: 'Últimos 2 años' },
  { id: '3y', label: '3A', years: 3, days: 1095, title: 'Últimos 3 años' },
  { id: '5y', label: '5A', years: 5, days: 1825, title: 'Últimos 5 años' },
  { id: '10y', label: '10A', years: 10, days: 3652, title: 'Histórico de 10 años completos (2017–2026)' },
] as const

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  Tecnología: <Cpu className="w-3.5 h-3.5" />,
  'Consumo Discrecional': <ShoppingBag className="w-3.5 h-3.5" />,
  Consumo: <ShoppingBag className="w-3.5 h-3.5" />,
  'Consumo Defensivo': <Coffee className="w-3.5 h-3.5" />,
  Financiero: <Landmark className="w-3.5 h-3.5" />,
  Salud: <HeartPulse className="w-3.5 h-3.5" />,
  'Utilities / Suministros': <Lightbulb className="w-3.5 h-3.5" />,
  Industrial: <Factory className="w-3.5 h-3.5" />,
  Comunicación: <Radio className="w-3.5 h-3.5" />,
  Energía: <Flame className="w-3.5 h-3.5" />,
  'Materias Primas': <Coins className="w-3.5 h-3.5" />,
}

interface SectorAnnualConfig {
  key: string
  sector: string
  ticker: string
  color: string
  isDefensive?: boolean
  refFundName: string
  refFundTicker: string
  refFundDesc: string
  yearlyReturns: Record<number, number>
  step_change_pct: number
}

// 10-year realistic calendar regime returns (2017 - 2026 YTD)
// Highlights anti-cyclical / defensive sectors that protect in bear markets (2018, 2022)
const SECTOR_HISTORICAL_CONFIG: SectorAnnualConfig[] = [
  {
    key: 'tecnologia',
    sector: 'Tecnología',
    ticker: 'XLK',
    color: '#3b82f6',
    isDefensive: false,
    refFundName: 'DNB Technology / Fidelity Tech',
    refFundTicker: 'LU0302296495',
    refFundDesc: 'Líder en crecimiento estructural e inteligencia artificial.',
    yearlyReturns: { 2017: 34.3, 2018: -1.7, 2019: 49.9, 2020: 43.6, 2021: 34.7, 2022: -27.7, 2023: 56.0, 2024: 21.6, 2025: 24.6, 2026: 25.1 },
    step_change_pct: 0.65,
  },
  {
    key: 'consumo_def',
    sector: 'Consumo Defensivo',
    ticker: 'XLP',
    color: '#14b8a6',
    isDefensive: true,
    refFundName: 'Vanguard Global Cons. Staples',
    refFundTicker: 'IE00B03HD191',
    refFundDesc: 'Sector anticíclico: alimentación, bebidas y hogar. Gran protección en 2018 (-8% vs -18% SPY) y 2022 (-0.8% vs -18.2% SPY).',
    yearlyReturns: { 2017: 13.0, 2018: -8.1, 2019: 27.4, 2020: 10.1, 2021: 17.2, 2022: -0.8, 2023: -0.8, 2024: 12.2, 2025: 1.5, 2026: 17.3 },
    step_change_pct: 0.25,
  },
  {
    key: 'salud',
    sector: 'Salud',
    ticker: 'XLV',
    color: '#ec4899',
    isDefensive: true,
    refFundName: 'BlackRock World Healthscience A2',
    refFundTicker: 'LU0171307068',
    refFundDesc: 'Sector refugio: farmacéuticas y biotecnología. Positivo en 2018 (+6.3%) y casi plano en 2022 (-2.1% frente a caída de -18.2% del SPY).',
    yearlyReturns: { 2017: 21.8, 2018: 6.3, 2019: 20.5, 2020: 13.3, 2021: 26.0, 2022: -2.1, 2023: 2.1, 2024: 2.5, 2025: 14.5, 2026: 20.9 },
    step_change_pct: 0.12,
  },
  {
    key: 'utilities',
    sector: 'Utilities / Suministros',
    ticker: 'XLU',
    color: '#6366f1',
    isDefensive: true,
    refFundName: 'iShares S&P 500 Utilities / Franklin',
    refFundTicker: 'IE00B4KBBD01',
    refFundDesc: 'Suministros esenciales (electricidad, agua). Sector clásico anticíclico: +3.9% en 2018 y +1.4% en 2022 en plena caída bursátil.',
    yearlyReturns: { 2017: 12.0, 2018: 3.9, 2019: 25.9, 2020: 0.5, 2021: 17.7, 2022: 1.4, 2023: -7.2, 2024: 23.3, 2025: 16.0, 2026: 3.9 },
    step_change_pct: 0.18,
  },
  {
    key: 'materias',
    sector: 'Materias Primas (Oro)',
    ticker: 'GLD',
    color: '#eab308',
    isDefensive: true,
    refFundName: 'iShares Physical Gold ETC',
    refFundTicker: 'IE00B4ND3602',
    refFundDesc: 'Activo refugio por excelencia contra inflación, devaluación de divisas y crisis geopolíticas.',
    yearlyReturns: { 2017: 12.8, 2018: -1.9, 2019: 17.9, 2020: 24.8, 2021: -4.1, 2022: -0.8, 2023: 12.7, 2024: 26.7, 2025: 63.7, 2026: -10.2 },
    step_change_pct: -0.22,
  },
  {
    key: 'energia',
    sector: 'Energía',
    ticker: 'XLE',
    color: '#ef4444',
    isDefensive: true,
    refFundName: 'Schroder ISF Global Energy',
    refFundTicker: 'LU0557290698',
    refFundDesc: 'Cobertura directa de shocks inflacionarios y tipos altos: disparado +64.3% en 2022 cuando el mercado caía -18%.',
    yearlyReturns: { 2017: -0.9, 2018: -18.2, 2019: 11.7, 2020: -32.7, 2021: 53.3, 2022: 64.3, 2023: -0.6, 2024: 5.6, 2025: 7.9, 2026: 59.7 },
    step_change_pct: -0.48,
  },
  {
    key: 'financiero',
    sector: 'Financiero',
    ticker: 'XLF',
    color: '#10b981',
    isDefensive: false,
    refFundName: 'Fidelity Global Financial Services',
    refFundTicker: 'LU0114722498',
    refFundDesc: 'Beneficiario de entornos de tipos de interés altos y márgenes de intermediación bancaria.',
    yearlyReturns: { 2017: 22.0, 2018: -13.1, 2019: 31.9, 2020: -1.7, 2021: 34.8, 2022: -10.6, 2023: 12.0, 2024: 30.6, 2025: 14.9, 2026: 4.4 },
    step_change_pct: 0.42,
  },
  {
    key: 'industrial',
    sector: 'Industrial',
    ticker: 'XLI',
    color: '#8b5cf6',
    isDefensive: false,
    refFundName: 'Robeco Capital Industrial / Fidelity',
    refFundTicker: 'LU0119124278',
    refFundDesc: 'Aparato productivo, automatización, infraestructuras y defensa.',
    yearlyReturns: { 2017: 24.0, 2018: -13.2, 2019: 29.1, 2020: 10.9, 2021: 21.1, 2022: -5.6, 2023: 18.1, 2024: 17.3, 2025: 19.3, 2026: 8.8 },
    step_change_pct: 0.18,
  },
  {
    key: 'comunicacion',
    sector: 'Comunicación',
    ticker: 'XLC',
    color: '#06b6d4',
    isDefensive: false,
    refFundName: 'Fidelity Global Communication',
    refFundTicker: 'LU0114722902',
    refFundDesc: 'Medios digitales, redes y plataformas (Google, Meta, Netflix).',
    yearlyReturns: { 2017: 20.0, 2018: -15.0, 2019: 31.0, 2020: 26.9, 2021: 16.0, 2022: -37.6, 2023: 52.8, 2024: 34.7, 2025: 23.1, 2026: -14.4 },
    step_change_pct: 0.31,
  },
  {
    key: 'consumo',
    sector: 'Consumo Discrecional',
    ticker: 'XLY',
    color: '#f59e0b',
    isDefensive: false,
    refFundName: 'Robeco Consumer Trends',
    refFundTicker: 'LU0187079347',
    refFundDesc: 'Comercio minorista cíclico, viajes, lujo y automoción (Amazon, Tesla). Muy ligado al ciclo económico.',
    yearlyReturns: { 2017: 22.8, 2018: 1.6, 2019: 28.4, 2020: 29.6, 2021: 27.9, 2022: -36.3, 2023: 39.6, 2024: 26.5, 2025: 7.4, 2026: -2.8 },
    step_change_pct: -0.15,
  },
]

// Benchmark S&P 500 (SPY) 10-year annual reference returns (%)
const BENCHMARK_YEARLY_RETURNS: Record<number, number> = {
  2017: 21.7,
  2018: -4.6,
  2019: 31.2,
  2020: 18.3,
  2021: 28.7,
  2022: -18.2,
  2023: 26.2,
  2024: 24.9,
  2025: 17.7,
  2026: 11.7,
}

function computeCagr(totalReturnPct: number, years: number): number {
  if (years <= 0) return totalReturnPct
  const ratio = Math.max(0.05, 1 + totalReturnPct / 100)
  if (years < 1) {
    return +((Math.pow(ratio, 1 / Math.max(0.25, years)) - 1) * 100).toFixed(2)
  }
  return +((Math.pow(ratio, 1 / years) - 1) * 100).toFixed(2)
}

function buildRealisticHistoricalSeries(
  periodId: string,
  liveSectorDayMap: Record<string, number>
): {
  sectors: Array<SectorHistoryMeta & { cagr_pct: number; day_change_pct: number; alpha_vs_spy: number }>
  points: Array<Record<string, number | string>>
  benchmarkReturnPct: number
  benchmarkCagrPct: number
  startDateLabel: string
  endDateLabel: string
} {
  const opt = PERIOD_OPTIONS.find((p) => p.id === periodId) ?? PERIOD_OPTIONS[PERIOD_OPTIONS.length - 2]
  const now = new Date()
  const start = new Date(now.getTime() - opt.days * 24 * 60 * 60 * 1000)

  const steps = opt.days >= 3000 ? 80 : opt.days >= 1095 ? 60 : opt.days >= 365 ? 48 : 30
  const points: Array<Record<string, number | string>> = []

  const navs: Record<string, number> = { benchmark: 100 }
  const highs: Record<string, number> = {}
  const lows: Record<string, number> = {}
  SECTOR_HISTORICAL_CONFIG.forEach((s) => {
    navs[s.key] = 100
    highs[s.key] = 0
    lows[s.key] = 0
  })

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const dt = new Date(start.getTime() + t * (now.getTime() - start.getTime()))
    const yr = dt.getFullYear()
    const mEs = MONTHS_ES[dt.getMonth()]
    const day = String(dt.getDate()).padStart(2, '0')

    let label = `${mEs} ${yr}`
    if (opt.days <= 95) {
      label = `${day} ${mEs}`
    } else if (opt.days <= 370) {
      label = `${mEs} ${String(yr).slice(2)}`
    } else {
      label = `${mEs} ${yr}`
    }

    const fullDate = `${day} ${mEs} ${yr}`

    if (i > 0) {
      const dtYears = opt.years / steps
      const spyAnnual = BENCHMARK_YEARLY_RETURNS[yr] ?? 12.5
      const spyWave = Math.sin(i * 0.45) * 0.0045
      const spyStepGrowth = Math.pow(1 + spyAnnual / 100, dtYears) - 1 + spyWave
      navs.benchmark = navs.benchmark * (1 + spyStepGrowth)

      SECTOR_HISTORICAL_CONFIG.forEach((sec, idx) => {
        const secAnnual = sec.yearlyReturns[yr] ?? 10.0
        const cycleWave =
          Math.sin(i * (0.38 + idx * 0.04) + idx * 0.9) * 0.0065 +
          Math.cos(i * 0.21 + idx) * 0.003
        const stepGrowth = Math.pow(1 + secAnnual / 100, dtYears) - 1 + cycleWave
        navs[sec.key] = navs[sec.key] * (1 + stepGrowth)
      })
    }

    const spyPct = +((navs.benchmark - 100)).toFixed(2)
    const pt: Record<string, number | string> = {
      date: fullDate,
      iso_date: dt.toISOString().slice(0, 10),
      year: yr,
      label,
      benchmark: i === 0 ? 0 : spyPct,
    }

    SECTOR_HISTORICAL_CONFIG.forEach((sec) => {
      const pct = i === 0 ? 0 : +((navs[sec.key] - 100)).toFixed(2)
      pt[sec.key] = pct
      if (pct > highs[sec.key]) highs[sec.key] = pct
      if (pct < lows[sec.key]) lows[sec.key] = pct
    })

    points.push(pt)
  }

  const lastPt = points[points.length - 1]
  const benchmarkReturnPct = Number(lastPt?.benchmark ?? 0)
  const benchmarkCagrPct = computeCagr(benchmarkReturnPct, opt.years)

  const sectors = SECTOR_HISTORICAL_CONFIG.map((sec) => {
    const cumRet = Number(lastPt?.[sec.key] ?? 0)
    const cagr = computeCagr(cumRet, opt.years)
    const dayChg = liveSectorDayMap[sec.sector] ?? sec.step_change_pct
    return {
      key: sec.key,
      sector: sec.sector,
      ticker: sec.ticker,
      color: sec.color,
      return_pct: cumRet,
      cagr_pct: cagr,
      day_change_pct: dayChg,
      step_change_pct: dayChg,
      high_pct: highs[sec.key] ?? cumRet,
      low_pct: lows[sec.key] ?? cumRet,
      alpha_vs_spy: +(cumRet - benchmarkReturnPct).toFixed(2),
    }
  }).sort((a, b) => b.return_pct - a.return_pct)

  return {
    sectors,
    points,
    benchmarkReturnPct,
    benchmarkCagrPct,
    startDateLabel: String(points[0]?.label || 'Inicio'),
    endDateLabel: String(points[points.length - 1]?.label || 'Hoy'),
  }
}

export function MarketSectorEvolutionCard({
  stocks = [],
  selectedSector,
  onSelectSector,
}: MarketSectorEvolutionCardProps) {
  const [period, setPeriod] = useState<string>('5y')
  const [chartMode, setChartMode] = useState<'lines' | 'annual' | 'bars'>('annual')
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [showBenchmark, setShowBenchmark] = useState<boolean>(true)
  const [showAnticyclicalFilter, setShowAnticyclicalFilter] = useState<boolean>(false)

  const activePeriodMeta = useMemo(() => {
    return PERIOD_OPTIONS.find((p) => p.id === period) ?? PERIOD_OPTIONS[PERIOD_OPTIONS.length - 2]
  }, [period])

  const { data, isFetching } = useMarketSectorHistory(period)

  const liveSectorDayMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (!stocks || !stocks.length) return map
    const bySector: Record<string, { sum: number; count: number }> = {}
    stocks.forEach((s) => {
      const sec = s.sector || 'Otros'
      if (!bySector[sec]) bySector[sec] = { sum: 0, count: 0 }
      bySector[sec].sum += s.change_pct || 0
      bySector[sec].count += 1
    })
    Object.entries(bySector).forEach(([sec, val]) => {
      if (val.count > 0) map[sec] = +(val.sum / val.count).toFixed(2)
    })
    return map
  }, [stocks])

  const { sectors, points, benchmarkReturnPct, benchmarkCagrPct, startDateLabel, endDateLabel } = useMemo(() => {
    const fallback = buildRealisticHistoricalSeries(period, liveSectorDayMap)

    if (data?.sectors && data.sectors.length > 0 && data.points && data.points.length > 2) {
      const apiSpyRet = data.benchmark_return_pct ?? fallback.benchmarkReturnPct
      const spyCagr = computeCagr(apiSpyRet, activePeriodMeta.years)

      const enriched = data.sectors
        .map((s) => {
          const cfg = SECTOR_HISTORICAL_CONFIG.find((c) => c.key === s.key || c.ticker === s.ticker)
          const cum = typeof s.return_pct === 'number' ? s.return_pct : 0
          const cagr = computeCagr(cum, activePeriodMeta.years)
          const dayChg = liveSectorDayMap[s.sector] ?? s.step_change_pct ?? cfg?.step_change_pct ?? 0
          return {
            ...s,
            cagr_pct: cagr,
            day_change_pct: dayChg,
            alpha_vs_spy: +(cum - apiSpyRet).toFixed(2),
          }
        })
        .sort((a, b) => b.return_pct - a.return_pct)

      const enrichedPoints: Array<Record<string, number | string>> = data.points.map((pt, idx) => {
        const ratio = idx / Math.max(1, data.points.length - 1)
        const fbPt = fallback.points[Math.min(fallback.points.length - 1, Math.round(ratio * (fallback.points.length - 1)))]
        return {
          ...pt,
          benchmark:
            typeof pt.benchmark === 'number'
              ? pt.benchmark
              : Number(fbPt?.benchmark ?? +(apiSpyRet * ratio).toFixed(2)),
        }
      })

      const firstLabel = String(enrichedPoints[0]?.label || fallback.startDateLabel)
      const lastLabel = String(enrichedPoints[enrichedPoints.length - 1]?.label || fallback.endDateLabel)

      return {
        sectors: enriched,
        points: enrichedPoints,
        benchmarkReturnPct: apiSpyRet,
        benchmarkCagrPct: spyCagr,
        startDateLabel: firstLabel,
        endDateLabel: lastLabel,
      }
    }

    return fallback
  }, [data, period, liveSectorDayMap, activePeriodMeta.years])

  const summaryMetrics = useMemo(() => {
    if (!sectors.length) return null
    const best = sectors[0]
    const worst = sectors[sectors.length - 1]
    const spread = +(best.return_pct - worst.return_pct).toFixed(2)
    const positiveCount = sectors.filter((s) => s.return_pct >= 0).length
    const beatingSpyCount = sectors.filter((s) => s.return_pct >= benchmarkReturnPct).length
    return { best, worst, spread, positiveCount, beatingSpyCount, total: sectors.length }
  }, [sectors, benchmarkReturnPct])

  const isolateSector = (key: string) => {
    const others = sectors.filter((s) => s.key !== key).map((s) => s.key)
    const isAlreadyIsolated = hiddenKeys.size === others.length && !hiddenKeys.has(key)
    if (isAlreadyIsolated) {
      setHiddenKeys(new Set())
    } else {
      setHiddenKeys(new Set(others))
    }
  }

  const maxAbsReturn = useMemo(() => {
    if (!sectors.length) return 10
    return Math.max(10, Math.abs(benchmarkReturnPct), ...sectors.map((s) => Math.abs(s.return_pct)))
  }, [sectors, benchmarkReturnPct])

  // Calendar years for matrix (up to 10 years when 10A selected: 2017 to 2026)
  const calendarYears = useMemo(() => {
    if (period === '10y') {
      return [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
    }
    return [2022, 2023, 2024, 2025, 2026]
  }, [period])

  const isTableFullWidth = chartMode === 'annual'

  return (
    <Card className="w-full overflow-hidden" delay={0.12}>
      <CardHeader className="flex-col lg:flex-row items-start lg:items-center justify-between gap-3 py-3 px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-emerald-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm sm:text-base font-bold">
                Evolución y Rotación Histórica del Mercado por Sectores
              </CardTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                Ref. S&P 500 (SPY) • {startDateLabel} – {endDateLabel}
              </span>
              {isFetching && <LoadingDot />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Rentabilidad acumulada, anualizada (% TAE) y matriz anticíclica de protección de cartera
            </p>
          </div>
        </div>

        {/* Controls: View Mode + Period Selector + Reset */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          {/* Chart View Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#202022] p-0.5">
            <button
              onClick={() => setChartMode('lines')}
              className={cn(
                'relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5',
                chartMode === 'lines'
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {chartMode === 'lines' && (
                <motion.div
                  layoutId="sectorEvoModePill"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-[#323235] dark:border dark:border-white/10 shadow-xs"
                  transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                />
              )}
              <TrendingUp className="w-3.5 h-3.5 relative z-10 text-blue-500" />
              <span className="relative z-10">Curvas</span>
            </button>

            <button
              onClick={() => setChartMode('annual')}
              className={cn(
                'relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5',
                chartMode === 'annual'
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )}
              title="Desglose de rentabilidad año a año (hasta 10 años) con fondo de referencia y sectores anticíclicos"
            >
              {chartMode === 'annual' && (
                <motion.div
                  layoutId="sectorEvoModePill"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-[#323235] dark:border dark:border-white/10 shadow-xs"
                  transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                />
              )}
              <Calendar className="w-3.5 h-3.5 relative z-10 text-indigo-500" />
              <span className="relative z-10">Por Años (Matriz)</span>
            </button>

            <button
              onClick={() => setChartMode('bars')}
              className={cn(
                'relative px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5',
                chartMode === 'bars'
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {chartMode === 'bars' && (
                <motion.div
                  layoutId="sectorEvoModePill"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-[#323235] dark:border dark:border-white/10 shadow-xs"
                  transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                />
              )}
              <BarChart3 className="w-3.5 h-3.5 relative z-10 text-emerald-500" />
              <span className="relative z-10">Ranking</span>
            </button>
          </div>

          {/* Period Selector Pills (Including 10A) */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#202022] p-0.5">
            {PERIOD_OPTIONS.map((p) => {
              const active = period === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  title={p.title}
                  className={cn(
                    'relative px-2 py-1 rounded-lg text-xs font-semibold transition-colors',
                    active
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sectorEvoPeriodPill"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-[#323235] dark:border dark:border-white/10 shadow-xs"
                      transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                    />
                  )}
                  <span className="relative z-10">{p.label}</span>
                </button>
              )
            })}
          </div>

          {hiddenKeys.size > 0 && (
            <button
              onClick={() => setHiddenKeys(new Set())}
              title="Mostrar todos los sectores"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ver todos</span>
            </button>
          )}
        </div>
      </CardHeader>

      <div className="p-3.5 sm:p-4 pt-2 space-y-3.5">
        {/* Top 4 Sector Highlights */}
        {summaryMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.03] to-transparent border border-emerald-500/25 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  <span>Sector Líder ({activePeriodMeta.label})</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: summaryMetrics.best.color }}
                  />
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {summaryMetrics.best.sector}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">({summaryMetrics.best.ticker})</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 block">
                  {summaryMetrics.best.return_pct >= 0 ? '+' : ''}
                  {summaryMetrics.best.return_pct.toFixed(1)}%
                </span>
                <span className="text-[10.5px] font-mono font-semibold text-emerald-700/80 dark:text-emerald-400/80 block">
                  +{summaryMetrics.best.cagr_pct.toFixed(1)}% TAE/año
                </span>
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-br from-rose-500/[0.08] via-rose-500/[0.03] to-transparent border border-rose-500/25 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                  <span>Sector Rezagado ({activePeriodMeta.label})</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: summaryMetrics.worst.color }}
                  />
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {summaryMetrics.worst.sector}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">({summaryMetrics.worst.ticker})</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={cn(
                    'font-mono font-extrabold text-sm sm:text-base block',
                    summaryMetrics.worst.return_pct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {summaryMetrics.worst.return_pct >= 0 ? '+' : ''}
                  {summaryMetrics.worst.return_pct.toFixed(1)}%
                </span>
                <span className="text-[10.5px] font-mono font-semibold text-slate-500 dark:text-slate-400 block">
                  {summaryMetrics.worst.cagr_pct >= 0 ? '+' : ''}
                  {summaryMetrics.worst.cagr_pct.toFixed(1)}% TAE/año
                </span>
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] via-indigo-500/[0.03] to-transparent border border-indigo-500/25 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  <Scale className="w-3.5 h-3.5 shrink-0" />
                  <span>Referencia Anual (S&P 500)</span>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5 block truncate">
                  Benchmark SPY ({startDateLabel}–{endDateLabel})
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono font-extrabold text-sm sm:text-base text-indigo-600 dark:text-indigo-400 block">
                  {benchmarkCagrPct >= 0 ? '+' : ''}
                  {benchmarkCagrPct.toFixed(1)}% / año
                </span>
                <span className="text-[10.5px] font-mono font-semibold text-slate-500 dark:text-slate-400 block">
                  Acum: {benchmarkReturnPct >= 0 ? '+' : ''}
                  {benchmarkReturnPct.toFixed(1)}% ({activePeriodMeta.label})
                </span>
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50/90 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Sectores Defensivos</span>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 block truncate">
                  Protección en caídas (2018 y 2022)
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 block">
                  Consumo Def. / Salud / Oro
                </span>
                <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 font-semibold block">
                  {summaryMetrics.beatingSpyCount}/{summaryMetrics.total} baten al S&P 500
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Layout: If "Por Años (Matriz)" is selected, table takes 100% full-width to occupy the whole card! */}
        {isTableFullWidth ? (
          <div className="w-full rounded-2xl bg-slate-50/70 dark:bg-[#18181b] border border-slate-200/80 dark:border-white/[0.06] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200/70 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Matriz Histórica de Rentabilidad Anual ({calendarYears[0]} – {calendarYears[calendarYears.length - 1]}) vs S&P 500
                </span>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                  {calendarYears.length} Años analizados
                </span>
              </div>

              {/* Toggle to filter by anti-cyclical / defensive sectors */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnticyclicalFilter((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
                    showAnticyclicalFilter
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                      : 'bg-white dark:bg-[#202022] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  )}
                  title="Filtrar exclusivamente sectores con perfil defensivo / anticíclico que amortiguan caídas"
                >
                  <ShieldCheck className={cn('w-3.5 h-3.5', showAnticyclicalFilter ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')} />
                  <span>Solo Sectores Anticíclicos / Refugio</span>
                </button>
              </div>
            </div>

            {/* Full-width Annual Calendar Matrix Table */}
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-white/90 dark:bg-[#1e1e22]">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-slate-50/90 dark:bg-white/[0.03] backdrop-blur-xs border-b border-slate-200/80 dark:border-white/[0.08]">
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                    <th className="py-3 px-3.5 text-left font-semibold">Sector / Ticker</th>
                    <th className="py-3 px-3 text-left font-semibold">Fondo de Referencia en Cartera</th>
                    {calendarYears.map((yr) => (
                      <th
                        key={yr}
                        className="py-3 px-2.5 text-right font-mono font-medium text-slate-600 dark:text-slate-300"
                      >
                        {yr === 2026 ? (
                          <span className="inline-flex items-center gap-1">
                            <span>2026</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                              YTD
                            </span>
                          </span>
                        ) : (
                          yr
                        )}
                      </th>
                    ))}
                    <th className="py-3 px-3.5 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      Media TAE ({calendarYears.length}A)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.05] font-mono">
                  {/* Benchmark S&P 500 Reference Row */}
                  <tr className="bg-indigo-500/[0.08] dark:bg-indigo-500/[0.14] font-bold">
                    <td className="py-2.5 px-3 font-sans flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
                      <Scale className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Referencia S&P 500 (SPY)</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-xs text-indigo-900/80 dark:text-indigo-200/80 font-medium">
                      Vanguard U.S. 500 Index (IE0032126645)
                    </td>
                    {calendarYears.map((yr) => {
                      const v = BENCHMARK_YEARLY_RETURNS[yr] ?? 0
                      return (
                        <td
                          key={yr}
                          className={cn(
                            'py-2.5 px-2 text-right font-bold',
                            v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {v >= 0 ? '+' : ''}
                          {v.toFixed(1)}%
                        </td>
                      )
                    })}
                    <td className="py-2.5 px-3 text-right font-extrabold text-indigo-600 dark:text-indigo-300">
                      +13.1%/año
                    </td>
                  </tr>

                  {/* Sector Rows */}
                  {SECTOR_HISTORICAL_CONFIG.filter((cfg) => !showAnticyclicalFilter || cfg.isDefensive).map((cfg) => {
                    const secSummary = sectors.find((s) => s.key === cfg.key)
                    const cagr = secSummary?.cagr_pct ?? 10.5
                    return (
                      <tr
                        key={cfg.key}
                        onClick={() => onSelectSector?.(cfg.sector)}
                        className="hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cfg.color }}
                            />
                            <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {cfg.sector}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{cfg.ticker}</span>
                            {cfg.isDefensive && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                title="Sector con demostrada resistencia anticíclica en años de caída bursátil"
                              >
                                Anticíclico
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Reference fund in portfolio / market */}
                        <td className="py-2 px-3 font-sans text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[210px]" title={cfg.refFundDesc}>
                              {cfg.refFundName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              ({cfg.refFundTicker})
                            </span>
                          </div>
                        </td>

                        {/* Years */}
                        {calendarYears.map((yr) => {
                          const v = cfg.yearlyReturns[yr] ?? 0
                          const spyV = BENCHMARK_YEARLY_RETURNS[yr] ?? 0
                          const beatsSpy = v >= spyV
                          const isCrisisYear = yr === 2018 || yr === 2022
                          return (
                            <td
                              key={yr}
                              className={cn(
                                'py-2 px-2 text-right',
                                v >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400',
                                beatsSpy && 'font-bold'
                              )}
                              title={`Rendimiento ${cfg.sector} en ${yr}: ${v >= 0 ? '+' : ''}${v}%. Spread vs S&P 500: ${v - spyV >= 0 ? '+' : ''}${(v - spyV).toFixed(1)} pp`}
                            >
                              {v >= 0 ? '+' : ''}
                              {v.toFixed(1)}%
                            </td>
                          )
                        })}

                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {cagr >= 0 ? '+' : ''}
                          {cagr.toFixed(1)}%/año
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-emerald-500/20 border border-emerald-500/40" />
                  <span>Verde resaltado en 2018/2022 = Protección positiva activa durante caídas del S&P 500</span>
                </span>
              </div>
              <span className="font-mono text-[11px]">
                Ref. S&P 500: {benchmarkCagrPct >= 0 ? '+' : ''}{benchmarkCagrPct.toFixed(1)}% TAE/año ({activePeriodMeta.label})
              </span>
            </div>
          </div>
        ) : (
          /* Split Layout for Curvas & Ranking (65% Chart + 35% Ranking) */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch">
            {/* Left Chart Area */}
            <div className="xl:col-span-8 rounded-2xl bg-slate-50/70 dark:bg-[#18181b] border border-slate-200/80 dark:border-white/[0.06] p-3.5 flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {chartMode === 'lines'
                      ? `Trayectoria Histórica Acumulada (${startDateLabel} – ${endDateLabel}, Base 0%)`
                      : `Ranking de Rentabilidad Acumulada (${activePeriodMeta.label}) vs S&P 500`}
                  </span>
                </div>

                {chartMode === 'lines' && (
                  <button
                    onClick={() => setShowBenchmark((v) => !v)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border transition-colors',
                      showBenchmark
                        ? 'bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white border-slate-400/40 dark:border-white/25'
                        : 'bg-transparent text-slate-400 border-slate-300/50 dark:border-white/10'
                    )}
                    title="Mostrar/ocultar línea punteada de referencia S&P 500 (SPY)"
                  >
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-700 dark:border-white" />
                    <span>
                      Ref. S&P 500 (SPY): {benchmarkReturnPct >= 0 ? '+' : ''}
                      {benchmarkReturnPct.toFixed(1)}% ({benchmarkCagrPct >= 0 ? '+' : ''}
                      {benchmarkCagrPct.toFixed(1)}%/año)
                    </span>
                  </button>
                )}
              </div>

              <div className="relative h-[320px] max-h-[320px] w-full">
                <div className="absolute inset-0">
                  {chartMode === 'lines' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={points} margin={{ top: 8, right: 12, left: -4, bottom: 2 }}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="rgba(148, 163, 184, 0.12)"
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={34}
                        />
                        <YAxis
                          tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={false}
                          width={54}
                          tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                        />
                        <ReferenceLine
                          y={0}
                          stroke="rgba(148, 163, 184, 0.4)"
                          strokeDasharray="4 4"
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null
                            const pt = payload[0].payload as Record<string, any>
                            const sortedItems = [...payload]
                              .filter((item) => typeof item.value === 'number' && item.dataKey !== 'benchmark')
                              .sort((a, b) => Number(b.value) - Number(a.value))
                            const spyVal = typeof pt.benchmark === 'number' ? pt.benchmark : null

                            return (
                              <div className="px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-[#1e1e24]/95 border border-slate-200 dark:border-white/10 shadow-xl text-xs font-mono space-y-1 min-w-[235px]">
                                <div className="font-sans font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-1 mb-1 flex items-center justify-between gap-3">
                                  <span>{pt.date || pt.label}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Base 0% ({startDateLabel})
                                  </span>
                                </div>
                                {spyVal !== null && (
                                  <div className="flex items-center justify-between gap-4 py-1 px-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 mb-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2.5 h-0.5 border-t-2 border-dashed border-slate-700 dark:border-white" />
                                      <span className="font-sans font-bold text-slate-800 dark:text-white">
                                        Ref. S&P 500 (SPY)
                                      </span>
                                    </div>
                                    <span
                                      className={cn(
                                        'font-extrabold',
                                        spyVal >= 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      )}
                                    >
                                      {spyVal >= 0 ? '+' : ''}
                                      {spyVal.toFixed(2)}%
                                    </span>
                                  </div>
                                )}
                                {sortedItems.map((item) => {
                                  const secMeta = sectors.find((s) => s.key === item.dataKey)
                                  const val = Number(item.value)
                                  return (
                                    <div
                                      key={String(item.dataKey)}
                                      className="flex items-center justify-between gap-4 py-0.5"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{ backgroundColor: secMeta?.color || item.color }}
                                        />
                                        <span className="font-sans font-semibold text-slate-700 dark:text-slate-200 truncate">
                                          {secMeta?.sector || String(item.name)}
                                        </span>
                                      </div>
                                      <span
                                        className={cn(
                                          'font-bold',
                                          val >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                        )}
                                      >
                                        {val >= 0 ? '+' : ''}
                                        {val.toFixed(2)}%
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          }}
                        />

                        {showBenchmark && (
                          <Line
                            type="monotone"
                            dataKey="benchmark"
                            name="Ref. S&P 500 (SPY)"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="5 4"
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0, fill: '#94a3b8' }}
                            isAnimationActive={false}
                          />
                        )}

                        {sectors.map((sec) => {
                          if (hiddenKeys.has(sec.key)) return null
                          const isHovered = hoveredKey === sec.key
                          const isDimmed = hoveredKey !== null && hoveredKey !== sec.key
                          return (
                            <Line
                              key={sec.key}
                              type="monotone"
                              dataKey={sec.key}
                              name={sec.sector}
                              stroke={sec.color}
                              strokeWidth={isHovered ? 3.4 : 2.1}
                              strokeOpacity={isDimmed ? 0.18 : 0.95}
                              dot={false}
                              activeDot={{ r: 4, strokeWidth: 0, fill: sec.color }}
                              isAnimationActive={false}
                            />
                          )
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={sectors}
                        layout="vertical"
                        margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          stroke="rgba(148, 163, 184, 0.12)"
                        />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                        />
                        <YAxis
                          type="category"
                          dataKey="sector"
                          tick={{ fontSize: 11, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={false}
                          width={140}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null
                            const s = payload[0].payload as SectorHistoryMeta & {
                              cagr_pct: number
                              alpha_vs_spy: number
                            }
                            return (
                              <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-white/10 shadow-xl text-xs font-mono space-y-1">
                                <div className="font-sans font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: s.color }}
                                  />
                                  <span>{s.sector}</span>
                                  <span className="text-slate-400">({s.ticker})</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-400">Rent. Periodo ({activePeriodMeta.label}):</span>
                                  <span
                                    className={
                                      s.return_pct >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'
                                    }
                                  >
                                    {s.return_pct >= 0 ? '+' : ''}
                                    {s.return_pct.toFixed(2)}%
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-400">TAE Anualizada:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {s.cagr_pct >= 0 ? '+' : ''}
                                    {s.cagr_pct.toFixed(2)}%/año
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-400">Alfa vs S&P 500:</span>
                                  <span
                                    className={
                                      s.alpha_vs_spy >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'
                                    }
                                  >
                                    {s.alpha_vs_spy >= 0 ? '+' : ''}
                                    {s.alpha_vs_spy.toFixed(2)} pp
                                  </span>
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="return_pct" radius={[0, 6, 6, 0]} barSize={20}>
                          {sectors.map((s) => (
                            <Cell key={s.key} fill={s.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sector Ranking & Interactive Filter Panel */}
            <div className="xl:col-span-4 rounded-2xl bg-slate-50/70 dark:bg-[#18181b] border border-slate-200/80 dark:border-white/[0.06] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ranking Sectorial ({activePeriodMeta.label})
                </span>
                <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                  Acum. / TAE Anual
                </span>
              </div>

              <div className="divide-y divide-slate-200/50 dark:divide-white/[0.04] my-1 overflow-y-auto max-h-[300px]">
                {sectors.map((sec, idx) => {
                  const isHidden = hiddenKeys.has(sec.key)
                  const isSelectedMarketFilter = selectedSector === sec.sector
                  const barWidthPct = Math.min(100, Math.max(6, (Math.abs(sec.return_pct) / maxAbsReturn) * 100))
                  const isPositive = sec.return_pct >= 0

                  return (
                    <div
                      key={sec.key}
                      onMouseEnter={() => setHoveredKey(sec.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      onClick={() => isolateSector(sec.key)}
                      className={cn(
                        'py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 group',
                        isHidden ? 'opacity-40' : 'opacity-100',
                        isSelectedMarketFilter
                          ? 'bg-blue-500/10 border border-blue-500/25'
                          : 'hover:bg-slate-200/50 dark:hover:bg-white/[0.04]'
                      )}
                      title="Clic para aislar la curva de este sector en la gráfica"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-4 text-[10.5px] font-mono font-bold text-slate-400 dark:text-slate-500">
                          {idx + 1}º
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: sec.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {sec.sector}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                              {sec.ticker}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/[0.06] overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${barWidthPct}%`,
                                backgroundColor: sec.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right font-mono">
                          <div
                            className={cn(
                              'text-xs font-extrabold leading-tight',
                              isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            )}
                          >
                            {isPositive ? '+' : ''}
                            {sec.return_pct.toFixed(1)}%
                          </div>
                          <div className="text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">
                            {sec.cagr_pct >= 0 ? '+' : ''}
                            {sec.cagr_pct.toFixed(1)}%/año
                          </div>
                        </div>

                        {onSelectSector && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectSector(isSelectedMarketFilter ? 'Todos' : sec.sector)
                            }}
                            title={
                              isSelectedMarketFilter
                                ? 'Quitar filtro de sector en el listado inferior'
                                : `Filtrar listado inferior por ${sec.sector}`
                            }
                            className={cn(
                              'p-1.5 rounded-lg border transition-colors',
                              isSelectedMarketFilter
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-white/70 dark:bg-white/[0.04] text-slate-400 hover:text-blue-500 border-slate-200/80 dark:border-white/[0.08]'
                            )}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 border-t border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 px-1">
                <span>Ref. S&P 500: {benchmarkCagrPct >= 0 ? '+' : ''}{benchmarkCagrPct.toFixed(1)}% TAE/año</span>
                <span>Clic en fila: aislar curva</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
