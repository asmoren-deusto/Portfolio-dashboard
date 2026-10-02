import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Award,
  Flame,
  ArrowUpRight,
  Info,
  Calendar,
  Activity,
} from 'lucide-react'
import type { PricePoint } from '@/lib/mockData'
import { usePerformance } from '@/api/queries'
import { fmt, cn } from '@/lib/utils'

interface MonthlyReturnsHeatmapProps {
  data?: PricePoint[]
  className?: string
  compact?: boolean
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

export function MonthlyReturnsHeatmap({ data: propData, className, compact = false }: MonthlyReturnsHeatmapProps) {
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

  const [hoveredCell, setHoveredCell] = useState<{
    type: 'month' | 'year'
    year: number
    month?: number
    returnPct: number
    daysCount?: number
    positiveMonths?: number
    totalMonths?: number
    bestMonth?: string
  } | null>(null)

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-400 dark:text-slate-500">
        Sin suficiente histórico para generar la matriz mensual
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-1">
        <table className="w-full text-center border-collapse min-w-[620px]">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <th className="py-2 px-2.5 text-left font-bold text-slate-800 dark:text-slate-200 w-16">
                Año
              </th>
              {MONTH_NAMES.map((m) => (
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
            {rows.map((row) => {
              const yearMonths = Object.values(row.months)
              const posCount = yearMonths.filter((x) => x.returnPct >= 0).length
              const bestM = yearMonths.reduce<{ val: number; m: number } | null>((best, cur) => {
                if (!best || cur.returnPct > best.val) return { val: cur.returnPct, m: cur.month }
                return best
              }, null)
              const bestMonthStr = bestM ? `${MONTH_NAMES[bestM.m - 1]} (+${bestM.val.toFixed(1)}%)` : '—'
              const isYearHovered = hoveredCell?.type === 'year' && hoveredCell.year === row.year

              return (
                <tr key={row.year} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.015] transition-colors">
                  <td className="py-2 px-2.5 text-left font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                    {row.year}
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const mData = row.months[m]
                    const val = mData?.returnPct
                    const isCellHovered =
                      hoveredCell?.type === 'month' &&
                      hoveredCell.year === row.year &&
                      hoveredCell.month === m

                    return (
                      <td key={m} className="p-1">
                        <div
                          onMouseEnter={() => {
                            if (val !== undefined) {
                              setHoveredCell({
                                type: 'month',
                                year: row.year,
                                month: m,
                                returnPct: val,
                                daysCount: mData?.daysCount,
                              })
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={cn(
                            "relative h-8 sm:h-9 rounded-lg flex items-center justify-center font-mono text-[11px] transition-all cursor-pointer select-none",
                            getCellClasses(val),
                            val !== undefined && "hover:ring-2 hover:ring-blue-500/80 hover:z-10 hover:scale-105",
                            isCellHovered && "ring-2 ring-blue-500 shadow-md scale-105 z-10"
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
                      onMouseEnter={() => {
                        setHoveredCell({
                          type: 'year',
                          year: row.year,
                          returnPct: row.annualReturnPct,
                          positiveMonths: posCount,
                          totalMonths: yearMonths.length,
                          bestMonth: bestMonthStr,
                        })
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cn(
                        "inline-flex items-center justify-end px-2.5 py-1 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer",
                        row.annualReturnPct >= 0
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20",
                        isYearHovered && "ring-2 ring-blue-500 shadow-md scale-105"
                      )}
                    >
                      {row.annualReturnPct >= 0 ? '+' : ''}{row.annualReturnPct.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 4 Bottom Informative Boxes with Live Hover Integration */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs">
          {/* Box 1 */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#121727] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-all duration-150"
            title={
              hoveredCell
                ? (hoveredCell.type === 'month'
                    ? `Periodo: ${FULL_MONTH_NAMES[hoveredCell.month! - 1]} ${hoveredCell.year}`
                    : `Ejercicio anual ${hoveredCell.year}`)
                : `Tasa de acierto: ${stats.positiveMonths} de ${stats.totalMonths} meses en verde (${stats.winRate}%)`
            }
          >
            <div className={cn(
              "p-1 rounded-lg shrink-0",
              hoveredCell ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}>
              {hoveredCell ? <Calendar size={14} /> : <CheckCircle2 size={14} />}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">
                {hoveredCell ? (hoveredCell.type === 'month' ? 'Mes:' : 'Año:') : 'Acierto:'}
              </span>
              <span className={cn(
                "font-mono font-extrabold text-xs truncate",
                hoveredCell ? "text-slate-950 dark:text-white" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {hoveredCell
                  ? (hoveredCell.type === 'month'
                      ? `${MONTH_NAMES[hoveredCell.month! - 1]} ${hoveredCell.year}`
                      : `${hoveredCell.year} Total`)
                  : `${stats.winRate}% (${stats.positiveMonths}/${stats.totalMonths} m.)`}
              </span>
            </div>
          </div>

          {/* Box 2 */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#121727] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-all duration-150"
            title={
              hoveredCell
                ? `Rentabilidad neta registrada: ${hoveredCell.returnPct >= 0 ? '+' : ''}${hoveredCell.returnPct.toFixed(2)}%`
                : `Mejor mes histórico: ${stats.bestMonth ? `${stats.bestMonth.label} (+${stats.bestMonth.val.toFixed(2)}%)` : '—'}`
            }
          >
            <div className={cn(
              "p-1 rounded-lg shrink-0",
              hoveredCell
                ? (hoveredCell.returnPct >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400")
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}>
              {hoveredCell
                ? (hoveredCell.returnPct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />)
                : <Flame size={14} />}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">
                {hoveredCell ? 'Retorno:' : 'Mejor:'}
              </span>
              <span className={cn(
                "font-mono font-extrabold text-xs truncate",
                hoveredCell
                  ? (hoveredCell.returnPct >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400")
                  : "text-emerald-600 dark:text-emerald-400"
              )}>
                {hoveredCell
                  ? `${hoveredCell.returnPct >= 0 ? '+' : ''}${hoveredCell.returnPct.toFixed(2)}%`
                  : stats.bestMonth
                  ? `+${stats.bestMonth.val.toFixed(2)}% (${stats.bestMonth.label})`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Box 3 */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#121727] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-all duration-150"
            title={
              hoveredCell
                ? (hoveredCell.type === 'month'
                    ? `Sesiones de mercado computadas en ${MONTH_NAMES[hoveredCell.month! - 1]} ${hoveredCell.year}`
                    : `Meses con retorno positivo en ${hoveredCell.year}`)
                : `Peor mes histórico: ${stats.worstMonth ? `${stats.worstMonth.label} (${stats.worstMonth.val.toFixed(2)}%)` : '—'}`
            }
          >
            <div className={cn(
              "p-1 rounded-lg shrink-0",
              hoveredCell
                ? (hoveredCell.type === 'month' ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}>
              {hoveredCell
                ? (hoveredCell.type === 'month' ? <Activity size={14} /> : <CheckCircle2 size={14} />)
                : <TrendingDown size={14} />}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">
                {hoveredCell ? (hoveredCell.type === 'month' ? 'Días:' : 'En verde:') : 'Peor:'}
              </span>
              <span className={cn(
                "font-mono font-extrabold text-xs truncate",
                hoveredCell
                  ? "text-slate-950 dark:text-white"
                  : "text-rose-600 dark:text-rose-400"
              )}>
                {hoveredCell
                  ? (hoveredCell.type === 'month'
                      ? `${hoveredCell.daysCount ?? 21} sesiones`
                      : `${hoveredCell.positiveMonths} de ${hoveredCell.totalMonths} m.`)
                  : stats.worstMonth
                  ? `${stats.worstMonth.val.toFixed(2)}% (${stats.worstMonth.label})`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Box 4 */}
          {(() => {
            const diff = hoveredCell ? hoveredCell.returnPct - stats.avgMonthly : 0
            const isDiffPos = diff >= 0
            return (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#121727] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs hover:border-slate-300 dark:hover:border-white/20 transition-all duration-150"
                title={
                  hoveredCell
                    ? (hoveredCell.type === 'month'
                        ? `Diferencia frente a la media mensual histórica (${stats.avgMonthly >= 0 ? '+' : ''}${stats.avgMonthly.toFixed(2)}%)`
                        : `Mes con mayor rentabilidad de ${hoveredCell.year}`)
                    : `Rentabilidad mensual media histórica`
                }
              >
                <div className={cn(
                  "p-1 rounded-lg shrink-0",
                  hoveredCell
                    ? (hoveredCell.type === 'month'
                        ? (isDiffPos ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400")
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                )}>
                  {hoveredCell
                    ? (hoveredCell.type === 'month'
                        ? <ArrowUpRight size={14} className={isDiffPos ? "text-emerald-500" : "text-rose-500 rotate-90"} />
                        : <Flame size={14} />)
                    : <TrendingUp size={14} />}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">
                    {hoveredCell ? (hoveredCell.type === 'month' ? 'vs Media:' : 'Pico:') : 'Media:'}
                  </span>
                  <span className={cn(
                    "font-mono font-extrabold text-xs truncate",
                    hoveredCell
                      ? (hoveredCell.type === 'month'
                          ? (isDiffPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")
                          : "text-slate-950 dark:text-white")
                      : (stats.avgMonthly >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")
                  )}>
                    {hoveredCell
                      ? (hoveredCell.type === 'month'
                          ? `${isDiffPos ? '+' : ''}${diff.toFixed(2)}%`
                          : hoveredCell.bestMonth)
                      : `${stats.avgMonthly >= 0 ? '+' : ''}${stats.avgMonthly.toFixed(2)}% / mes`}
                  </span>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
