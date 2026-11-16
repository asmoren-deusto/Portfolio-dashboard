import React, { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Activity, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FundCorrelationMatrixCardProps {
  funds?: { index: number; name: string; weight: number; mean: number; vol: number }[]
  matrix?: (number | null)[][]
}

export const FundCorrelationMatrixCard: React.FC<FundCorrelationMatrixCardProps> = ({
  funds = [
    { index: 1, name: 'Vanguard U.S. 500 Stk Idx € Acc', weight: 43.93, mean: 19.66, vol: 12.67 },
    { index: 2, name: 'DNB Fund Technology A EUR Acc', weight: 12.45, mean: 29.92, vol: 17.29 },
    { index: 3, name: 'Azvalor Internacional FI', weight: 11.60, mean: 18.85, vol: 15.52 },
    { index: 4, name: 'Fidelity Euro 50 Index A-Acc-EUR', weight: 10.97, mean: 17.31, vol: 12.07 },
    { index: 5, name: 'iShares EmergMkts Idx (IE) S Acc EUR', weight: 10.53, mean: 15.80, vol: 14.50 },
    { index: 6, name: 'Fidelity MSCI Japan Index EUR P Acc H', weight: 10.52, mean: 23.28, vol: 14.45 },
    { index: 7, name: 'BGF World Healthscience A2 EUR', weight: 0.00, mean: 11.25, vol: 14.20 },
  ],
  matrix = [
    [1.00, null, null, null, null, null, null],
    [0.78, 1.00, null, null, null, null, null],
    [0.15, 0.24, 1.00, null, null, null, null],
    [0.53, 0.44, 0.14, 1.00, null, null, null],
    [null, null, null, null, null, null, null],
    [0.45, 0.45, 0.16, 0.60, null, 1.00, null],
    [0.40, 0.12, 0.06, 0.32, null, 0.19, 1.00],
  ],
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number; val: number | null } | null>(null)

  const getCellColor = (val: number | null) => {
    if (val === null) return 'bg-slate-100 dark:bg-white/5 text-slate-400'
    if (val >= 0.60) return 'bg-blue-600 dark:bg-blue-600 text-white font-bold shadow-2xs'
    if (val >= 0.20) return 'bg-blue-400/80 dark:bg-blue-500/60 text-slate-900 dark:text-white font-semibold'
    if (val >= -0.20) return 'bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-slate-200'
    if (val >= -0.60) return 'bg-amber-200 dark:bg-amber-500/40 text-amber-950 dark:text-amber-200'
    return 'bg-red-500 text-white font-bold'
  }

  return (
    <Card className="p-5 sm:p-6 flex flex-col justify-between h-full">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
              Matriz de Correlación Inter-Activos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grado de co-movimiento entre los fondos de la cartera (escala Morningstar de -1 a +1)
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hidden sm:inline-block shrink-0">
          Look-Through
        </span>
      </div>

      {/* 2. Matrix Grid (flex-1 para igualar altura dinámica exacta con la tarjeta derecha) */}
      <div className="my-4 flex-1 flex flex-col justify-center overflow-x-auto overflow-y-hidden pt-1 pb-4 px-1 -mx-1 min-h-[320px]">
        <table className="w-full border-separate border-spacing-1 text-center text-xs my-auto">
          <thead>
            <tr>
              <th className="p-1.5 w-10"></th>
              {funds.map((f) => (
                <th key={f.index} className="p-1 sm:p-1.5" title={f.name}>
                  <span className="w-7 h-7 rounded-full bg-[#991b1b] dark:bg-[#7f1d1d] text-white font-black inline-flex items-center justify-center text-xs shadow-xs">
                    {f.index}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="p-1 sm:p-1.5 text-left" title={funds[rIdx]?.name}>
                  <span className="w-7 h-7 rounded-full bg-[#991b1b] dark:bg-[#7f1d1d] text-white font-black inline-flex items-center justify-center text-xs shadow-xs">
                    {rIdx + 1}
                  </span>
                </td>
                {row.map((val, cIdx) => {
                  const isHovered = hoveredCell?.r === rIdx && hoveredCell?.c === cIdx
                  return (
                    <td
                      key={cIdx}
                      onMouseEnter={() => setHoveredCell({ r: rIdx, c: cIdx, val })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cn(
                        'p-2 sm:p-2.5 font-mono text-xs sm:text-[13px] rounded-lg transition-all cursor-pointer relative',
                        getCellColor(val),
                        isHovered
                          ? 'z-20 ring-2 ring-blue-600 dark:ring-blue-400 ring-offset-1 dark:ring-offset-slate-900 shadow-lg scale-[1.05]'
                          : 'hover:opacity-90'
                      )}
                    >
                      {val !== null ? val.toFixed(2) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Cell Tooltip Info */}
      <div className="min-h-12 p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm flex items-center justify-between shadow-2xs shrink-0">
        {hoveredCell ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#991b1b] text-white text-[11px] font-black inline-flex items-center justify-center shrink-0 shadow-2xs">
              {hoveredCell.r + 1}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {funds[hoveredCell.r]?.name}
            </span>
            <span className="text-slate-400 font-medium">vs</span>
            <span className="w-5 h-5 rounded-full bg-[#991b1b] text-white text-[11px] font-black inline-flex items-center justify-center shrink-0 shadow-2xs">
              {hoveredCell.c + 1}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {funds[hoveredCell.c]?.name}:
            </span>
            <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 ml-1">
              {hoveredCell.val !== null ? hoveredCell.val.toFixed(2) : 'Sin historial suficiente'}
            </span>
            {hoveredCell.val !== null && (
              <span className="text-slate-500 text-xs">
                ({hoveredCell.val < 0.3 ? 'Excelente diversificación' : hoveredCell.val > 0.7 ? 'Alta correlación' : 'Correlación moderada'})
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            <span className="w-2 h-2 rounded-full bg-[#991b1b] animate-pulse" />
            <span>Pasa el cursor sobre cualquier casilla para ver la correlación entre parejas de fondos.</span>
          </div>
        )}
      </div>

      {/* 4. Legend Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block" /> 1.00 a 0.60 (Alta)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-blue-400 inline-block" /> 0.60 a 0.20 (Moderada)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-slate-300 dark:bg-white/20 inline-block" /> 0.20 a -0.20 (Neutral)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-300 inline-block" /> -0.20 a -0.60 (Baja)
        </span>
      </div>
    </Card>
  )
}
export default FundCorrelationMatrixCard

