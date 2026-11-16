import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { TrendingUp, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { XRayScatterPoint } from '@/lib/xrayEngine'

interface RiskReturnScatterCardProps {
  points?: XRayScatterPoint[]
}

export const RiskReturnScatterCard: React.FC<RiskReturnScatterCardProps> = ({
  points = [
    { index: 'C', id: 'cartera', name: 'Cartera Consolidada', meanReturn: 21.53, volatility: 11.02, weight: 100, isPortfolio: true },
    { index: 'B', id: 'benchmark', name: 'Mercado Monetario EUR (Ref)', meanReturn: 2.71, volatility: 0.50, weight: 0, isBenchmark: true },
    { index: 1, id: '1', name: 'Vanguard U.S. 500 Stk Idx € Acc', meanReturn: 19.66, volatility: 12.67, weight: 43.93 },
    { index: 2, id: '2', name: 'DNB Fund Technology A EUR Acc', meanReturn: 29.92, volatility: 17.29, weight: 12.45 },
    { index: 3, id: '3', name: 'Azvalor Internacional FI', meanReturn: 18.85, volatility: 15.52, weight: 11.60 },
    { index: 4, id: '4', name: 'Fidelity Euro 50 Index A-Acc-EUR', meanReturn: 17.31, volatility: 12.07, weight: 10.97 },
    { index: 5, id: '5', name: 'iShares EmergMkts Idx (IE) S Acc EUR', meanReturn: 15.80, volatility: 14.50, weight: 10.53 },
    { index: 6, id: '6', name: 'Fidelity MSCI Japan Index EUR P Acc H', meanReturn: 23.28, volatility: 14.45, weight: 10.52 },
    { index: 7, id: '7', name: 'BGF World Healthscience A2 EUR', meanReturn: 11.25, volatility: 14.20, weight: 0.00 },
  ],
}) => {
  const [activePoint, setActivePoint] = useState<XRayScatterPoint | null>(null)

  // Bounds for SVG mapping
  // X (volatility): 0 to 22
  // Y (mean return): 0 to 35
  const minX = 0
  const maxX = 22
  const minY = 0
  const maxY = 35

  const mapX = (vol: number) => 38 + ((vol - minX) / (maxX - minX)) * 262
  const mapY = (ret: number) => 165 - ((ret - minY) / (maxY - minY)) * 142

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Target size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Diagrama de Dispersión Riesgo-Rentabilidad (3 Años)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Relación empírica entre Retorno Medio Anualizado (Eje Y) y Volatilidad Histórica (Eje X)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
            Ratio de Sharpe 1.71
          </span>
        </div>

        {/* Scatter Plot SVG (Ampliado para coincidir en altura y sin solapamiento de textos) */}
        <div className="mt-4 w-full h-[285px] sm:h-[305px] bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.08] rounded-2xl p-2 relative flex items-center justify-center">
          <svg viewBox="0 0 320 215" className="w-full h-full overflow-visible">
            {/* Grid Lines */}
            {[5, 10, 15, 20].map((v) => (
              <line
                key={v}
                x1={mapX(v)}
                y1={22}
                x2={mapX(v)}
                y2={165}
                stroke="currentColor"
                strokeDasharray="2"
                className="text-slate-200 dark:text-white/10"
              />
            ))}
            {[10, 20, 30].map((r) => (
              <line
                key={r}
                x1={38}
                y1={mapY(r)}
                x2={305}
                y2={mapY(r)}
                stroke="currentColor"
                strokeDasharray="2"
                className="text-slate-200 dark:text-white/10"
              />
            ))}

            {/* Axes */}
            <line x1={38} y1={18} x2={38} y2={165} stroke="currentColor" strokeWidth="1.2" className="text-slate-400" />
            <line x1={38} y1={165} x2={308} y2={165} stroke="currentColor" strokeWidth="1.2" className="text-slate-400" />

            {/* Axis Ticks & Labels (Separados verticalmente para evitar solapamiento) */}
            {[0, 5, 10, 15, 20].map((v) => (
              <text key={v} x={mapX(v)} y={178} textAnchor="middle" className="text-[8px] font-mono fill-slate-500">
                {v}%
              </text>
            ))}
            <text x={175} y={198} textAnchor="middle" className="text-[8.5px] font-bold fill-slate-700 dark:fill-slate-300">
              Volatilidad Histórica (Desviación Típica 3a) →
            </text>

            {[10, 20, 30].map((r) => (
              <text key={r} x={32} y={mapY(r) + 3} textAnchor="end" className="text-[8px] font-mono fill-slate-500">
                {r}%
              </text>
            ))}
            <text x={38} y={12} textAnchor="start" className="text-[8px] font-bold fill-slate-700 dark:fill-slate-300">
              ↑ Retorno Medio Anualizado (%)
            </text>

            {/* Points */}
            {points.map((p) => {
              const cx = mapX(p.volatility)
              const cy = mapY(p.meanReturn)
              const isHovered = activePoint?.id === p.id

              if (p.isPortfolio) {
                return (
                  <g
                    key={p.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setActivePoint(p)}
                    onMouseLeave={() => setActivePoint(null)}
                  >
                    <circle cx={cx} cy={cy} r={isHovered ? 13 : 9.5} fill="#C8102E" fillOpacity="0.15" />
                    <circle cx={cx} cy={cy} r={isHovered ? 8.5 : 6} fill="#ffffff" stroke="#C8102E" strokeWidth="2.5" />
                    <text x={cx} y={cy + 2.5} textAnchor="middle" className="text-[7.5px] font-black fill-[#C8102E]">
                      C
                    </text>
                    {/* Etiqueta hacia la izquierda limpia sin solaparse con fondos 1, 4 o 6 */}
                    <text x={cx - 12} y={cy + 3} textAnchor="end" className="text-[8px] font-extrabold fill-[#C8102E]">
                      Cartera ({p.meanReturn.toFixed(1)}%)
                    </text>
                  </g>
                )
              }

              if (p.isBenchmark) {
                return (
                  <g
                    key={p.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setActivePoint(p)}
                    onMouseLeave={() => setActivePoint(null)}
                  >
                    <rect x={cx - 4} y={cy - 4} width="8" height="8" fill="#10b981" rx="1.5" />
                    <text x={cx + 9} y={cy - 5} className="text-[7.5px] font-bold fill-emerald-600 dark:fill-emerald-400">
                      Ref ({p.meanReturn.toFixed(1)}%)
                    </text>
                  </g>
                )
              }

              return (
                <g
                  key={p.id}
                  className="cursor-pointer transition-transform"
                  onMouseEnter={() => setActivePoint(p)}
                  onMouseLeave={() => setActivePoint(null)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 8.5 : 6}
                    fill="#3b82f6"
                    className="transition-all"
                  />
                  <text x={cx} y={cy + 2.5} textAnchor="middle" className="text-[7px] font-bold fill-white">
                    {p.index}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Detail Panel */}
        <div className="min-h-9 mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-xs flex items-center justify-between">
          {activePoint ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-900 dark:text-white">
                {activePoint.name}:
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                Retorno Medio: {activePoint.meanReturn.toFixed(2)}%/año
              </span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                Volatilidad: ±{activePoint.volatility.toFixed(2)}%
              </span>
              {activePoint.weight > 0 && (
                <span className="font-mono text-slate-500">
                  Peso en cartera: {activePoint.weight.toFixed(1)}%
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-xs">
              Pasa el cursor sobre cualquier punto numerado para ver el retorno y volatilidad específica de cada fondo.
            </span>
          )}
        </div>

        {/* Legend strip coincidente con la tarjeta izquierda */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#C8102E] bg-white inline-flex items-center justify-center text-[7px] font-bold text-[#C8102E]">C</span> Tu Cartera
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#10b981] rounded-xs inline-block" /> Benchmark Monetario
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-flex items-center justify-center text-[7px] font-bold text-white">#</span> Fondos Individuales (1-7)
          </span>
        </div>
      </div>
    </Card>
  )
}
export default RiskReturnScatterCard

