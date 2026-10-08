import React, { useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Award,
  Flame,
  ArrowUpRight,
  Info,
} from 'lucide-react'
import type { PricePoint } from '@/lib/mockData'
import { usePerformance } from '@/api/queries'
import { fmt, cn } from '@/lib/utils'

interface MonthlyReturnsHeatmapProps {
  data?: PricePoint[]
  className?: string
  compact?: boolean
  tableMaxHeight?: string
}

interface MonthData {
  month: number
  returnPct: number
  daysCount: number
}

interface YearRow {
  year: number
  months: Record<number, MonthData>
  annualReturnPct: number
}

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

const FULL_MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function MonthlyReturnsHeatmap({ data: propData, className, compact = false, tableMaxHeight }: MonthlyReturnsHeatmapProps) {
  // If data is not provided, fetch 5y performance to cover all years
  const { data: fetchedData = [] } = usePerformance()
  const rawData = propData || fetchedData

  const { rows, stats } = useMemo(() => {
    if (!rawData || rawData.length < 2) {
      return { rows: [], stats: null }
    }

    // Sort chronologically
    const sorted = [...rawData]
      .filter(p => p && p.date && typeof p.value === 'number')
      .sort((a, b) => a.date.localeCompare(b.date))

    if (sorted.length < 2) {
      return { rows: [], stats: null }
    }

    // Group daily returns by year and month
    // We compute true time-weighted return (TWR) for each day:
    // r_t = (value_t - inflow_t - value_{t-1}) / value_{t-1}
    const yearMonthDailyRets: Record<number, Record<number, number[]>> = {}

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]

      const prevVal = prev.value
      const curVal = cur.value
      const prevInv = prev.invested ?? prevVal
      const curInv = cur.invested ?? curVal
      const netInflow = curInv - prevInv

      if (prevVal > 0) {
        let r = (curVal - netInflow - prevVal) / prevVal
        // Safety bounds against extreme spikes / artificial data
        r = Math.max(-0.25, Math.min(0.25, r))

        const year = parseInt(cur.date.substring(0, 4), 10)
        const month = parseInt(cur.date.substring(5, 7), 10)

        if (!yearMonthDailyRets[year]) yearMonthDailyRets[year] = {}
        if (!yearMonthDailyRets[year][month]) yearMonthDailyRets[year][month] = []
        yearMonthDailyRets[year][month].push(r)
      }
    }

    // Compound daily returns into monthly and annual returns
    const computedRows: YearRow[] = []
    let totalPositiveMonths = 0
    let totalEvaluatedMonths = 0
    let bestMonthVal = -Infinity
    let bestMonthLabel = ''
    let worstMonthVal = Infinity
    let worstMonthLabel = ''
    let sumMonthlyReturns = 0

    const years = Object.keys(yearMonthDailyRets)
      .map(Number)
      .sort((a, b) => b - a) // Descending: newest year first

    for (const year of years) {
      const monthsData: Record<number, MonthData> = {}
      let annualFactor = 1.0

      for (let m = 1; m <= 12; m++) {
        const dailyRets = yearMonthDailyRets[year]?.[m]
        if (dailyRets && dailyRets.length > 0) {
          // Compound: (1 + r1) * (1 + r2) * ... - 1
          let monthFactor = 1.0
          for (const r of dailyRets) {
            monthFactor *= 1.0 + r
          }
          const returnPct = Number(((monthFactor - 1.0) * 100).toFixed(2))

          monthsData[m] = {
            month: m,
            returnPct,
            daysCount: dailyRets.length,
          }

          annualFactor *= monthFactor

          // Global stats
          totalEvaluatedMonths++
          sumMonthlyReturns += returnPct
          if (returnPct >= 0) totalPositiveMonths++

          if (returnPct > bestMonthVal) {
            bestMonthVal = returnPct
            bestMonthLabel = `${MONTH_NAMES[m - 1]} ${year}`
          }
          if (returnPct < worstMonthVal) {
            worstMonthVal = returnPct
            worstMonthLabel = `${MONTH_NAMES[m - 1]} ${year}`
          }
        }
      }

      const annualReturnPct = Number(((annualFactor - 1.0) * 100).toFixed(2))
      computedRows.push({
        year,
        months: monthsData,
        annualReturnPct,
      })
    }

    const winRate = totalEvaluatedMonths > 0
      ? Math.round((totalPositiveMonths / totalEvaluatedMonths) * 100)
      : 0
    const avgMonthly = totalEvaluatedMonths > 0
      ? Number((sumMonthlyReturns / totalEvaluatedMonths).toFixed(2))
      : 0

    const computedStats = {
      winRate,
      totalMonths: totalEvaluatedMonths,
      positiveMonths: totalPositiveMonths,
      bestMonth: bestMonthVal !== -Infinity ? { val: bestMonthVal, label: bestMonthLabel } : null,
      worstMonth: worstMonthVal !== Infinity ? { val: worstMonthVal, label: worstMonthLabel } : null,
      avgMonthly,
    }

    return { rows: computedRows, stats: computedStats }
  }, [rawData])

  // Cell color helper
  const getCellClasses = (val: number | undefined) => {
    if (val === undefined) {
      return 'bg-slate-50/50 dark:bg-white/[0.01] text-slate-400 dark:text-slate-600'
    }
    if (val >= 4.0) {
      return 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/35 hover:brightness-110 shadow-xs'
    }
    if (val >= 1.5) {
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/20 hover:brightness-105'
    }
    if (val > 0) {
      return 'bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-500/15'
    }
    if (val === 0) {
      return 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 font-medium'
    }
    if (val > -1.5) {
      return 'bg-rose-500/8 text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-500/15'
    }
    if (val > -4.0) {
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold border border-rose-500/20 hover:brightness-105'
    }
    return 'bg-rose-500/25 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/35 hover:brightness-110 shadow-xs'
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-400 dark:text-slate-500">
        Sin suficiente histórico para generar la matriz mensual
      </div>
    )
  }

  return (
    <div data-private className={cn("space-y-3.5", className)}>
      {/* Institutional Metric Highlights */}
      {stats && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Tasa de Acierto
              </span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {stats.winRate}%
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                {stats.positiveMonths} de {stats.totalMonths} meses en verde
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Mejor Mes
              </span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {stats.bestMonth ? `+${stats.bestMonth.val.toFixed(2)}%` : '—'}
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                {stats.bestMonth ? stats.bestMonth.label : '—'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Flame size={16} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Peor Mes
              </span>
              <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                {stats.worstMonth ? `${stats.worstMonth.val.toFixed(2)}%` : '—'}
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                {stats.worstMonth ? stats.worstMonth.label : '—'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <TrendingDown size={16} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                Media Mensual
              </span>
              <span className={cn("text-xl font-bold font-mono mt-0.5 block", stats.avgMonthly >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {stats.avgMonthly >= 0 ? '+' : ''}{stats.avgMonthly.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                tasa promedio / mes
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Grid */}
      <div
        className={cn(
          "overflow-x-auto pb-1",
          tableMaxHeight && "overflow-y-auto"
        )}
        style={tableMaxHeight ? { maxHeight: tableMaxHeight } : undefined}
      >
        <table className="w-full text-center border-collapse min-w-[620px]">
          <thead className={tableMaxHeight ? "sticky top-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-xs z-10" : ""}>
            <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <th className="py-2 px-2.5 text-left font-bold text-slate-800 dark:text-slate-200 w-16">
                Año
              </th>
              {MONTH_NAMES.map((m, idx) => (
                <th key={m} className="py-2 px-1 text-center font-semibold">
                  {m}
                </th>
              ))}
              <th className="py-2 px-2.5 text-right font-bold text-slate-800 dark:text-slate-200 w-24">
                Total Año
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
            {rows.map(row => (
              <tr key={row.year} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.015] transition-colors">
                <td className="py-2 px-2.5 text-left font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                  {row.year}
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                  const mData = row.months[m]
                  const val = mData?.returnPct

                  return (
                    <td key={m} className="p-1">
                      <div
                        className={cn(
                          "relative h-8 sm:h-9 rounded-lg flex items-center justify-center font-mono text-[11px] transition-all cursor-default select-none",
                          getCellClasses(val),
                          val !== undefined && "hover:ring-2 hover:ring-blue-500/60 hover:z-10 hover:scale-105"
                        )}
                        title={val !== undefined ? `${FULL_MONTH_NAMES[m - 1]} ${row.year}: ${val >= 0 ? '+' : ''}${val.toFixed(2)}%` : undefined}
                      >
                        {val !== undefined ? (
                          <span>
                            {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>
                        )}
                      </div>
                    </td>
                  )
                })}
                <td className="py-2 px-2.5 text-right">
                  <span
                    className={cn(
                      "inline-flex items-center justify-end px-2.5 py-1 rounded-lg font-mono text-xs font-bold border transition-colors",
                      row.annualReturnPct >= 0
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {row.annualReturnPct >= 0 ? '+' : ''}{row.annualReturnPct.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
