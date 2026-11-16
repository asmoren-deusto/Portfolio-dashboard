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
    <Card className="p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Matriz de Correlación Inter-Activos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grado de co-movimiento entre los fondos de la cartera (escala Morningstar de -1 a +1)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hidden sm:inline-block">
            Look-Through
          </span>
        </div>

        {/* Matrix Grid */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="p-1 w-8"></th>
                {funds.map((f) => (
                  <th key={f.index} className="p-1" title={f.name}>
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] shadow-xs">
                      {f.index}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td className="p-1 text-left" title={funds[rIdx]?.name}>
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] shadow-xs">
                      {rIdx + 1}
                    </span>
                  </td>
                  {row.map((val, cIdx) => (
                    <td
                      key={cIdx}
                      onMouseEnter={() => setHoveredCell({ r: rIdx, c: cIdx, val })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cn(
                        'p-1.5 border border-white dark:border-[#1e1e20] font-mono text-xs rounded transition-transform cursor-pointer',
                        getCellColor(val),
                        hoveredCell?.r === rIdx && hoveredCell?.c === cIdx && 'scale-110 z-10 ring-2 ring-blue-500'
                      )}
                    >
                      {val !== null ? val.toFixed(2) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cell tooltip info */}
        <div className="min-h-8 mt-3 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-xs flex items-center justify-between">
          {hoveredCell ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                [{hoveredCell.r + 1}] {funds[hoveredCell.r]?.name} vs [{hoveredCell.c + 1}] {funds[hoveredCell.c]?.name}:
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {hoveredCell.val !== null ? hoveredCell.val.toFixed(2) : 'Sin historial suficiente'}
              </span>
              {hoveredCell.val !== null && (
                <span className="text-slate-500 text-[11px]">
                  ({hoveredCell.val < 0.3 ? 'Excelente diversificación' : hoveredCell.val > 0.7 ? 'Alta correlación' : 'Correlación moderada'})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-xs">
              Pasa el cursor sobre cualquier casilla para ver la correlación entre parejas de fondos.
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> 1.00 a 0.60 (Alta)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-400 inline-block" /> 0.60 a 0.20 (Moderada)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300 dark:bg-white/20 inline-block" /> 0.20 a -0.20 (Neutral)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-300 inline-block" /> -0.20 a -0.60 (Baja)
          </span>
        </div>
      </div>
    </Card>
  )
}
export default FundCorrelationMatrixCard
