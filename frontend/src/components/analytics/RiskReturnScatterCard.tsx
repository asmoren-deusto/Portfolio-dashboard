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
    { index: 'B', id: 'benchmark', name: '80% MSCI ACWI / 20% Monetario EUR', meanReturn: 10.15, volatility: 11.40, weight: 0, isBenchmark: true },
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
  const minX = 0
  const maxVol = Math.max(...points.map((p) => p.volatility), 20)
  const maxX = Math.max(20, Math.ceil((maxVol + 2) / 5) * 5)
  const minY = 0
  const maxRet = Math.max(...points.map((p) => p.meanReturn), 30)
  const maxY = Math.max(35, Math.ceil((maxRet + 2) / 5) * 5)

  const mapX = (vol: number) => 70 + ((vol - minX) / (maxX - minX)) * 550
  const mapY = (ret: number) => 305 - ((ret - minY) / (maxY - minY)) * 290

  const xTicks = [5, 10, 15, 20, 25, 30].filter((v) => v <= maxX)
  const xLabels = [0, 5, 10, 15, 20, 25, 30].filter((v) => v <= maxX)
  const yTicks = [5, 10, 15, 20, 25, 30, 35].filter((r) => r <= maxY)

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between h-full">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-slate-200/70 dark:border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Target size={17} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              Diagrama de Dispersión Riesgo-Rentabilidad (3 Años)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Relación empírica entre Retorno Medio Anualizado (Eje Y) y Volatilidad Histórica (Eje X)
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hidden sm:inline-block shrink-0">
          Ratio Sharpe 1.71
        </span>
      </div>

      {/* 2. Scatter Plot SVG Container (ampliado en altura y anchura aprovechando la reubicación de leyendas) */}
      <div className="my-2 sm:my-2.5 w-full h-[330px] sm:h-[355px] bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] rounded-xl p-2 sm:p-2.5 relative flex items-center justify-center shadow-2xs shrink-0 overflow-hidden">
        <svg viewBox="0 0 650 330" className="w-full h-full max-h-[330px] sm:max-h-[355px] overflow-visible">
          {/* Grid Lines */}
          {xTicks.map((v) => (
            <line
              key={v}
              x1={mapX(v)}
              y1={12}
              x2={mapX(v)}
              y2={305}
              stroke="currentColor"
              strokeDasharray="3"
              className="text-slate-200 dark:text-white/10"
            />
          ))}
          {yTicks.map((r) => (
            <line
              key={r}
              x1={70}
              y1={mapY(r)}
              x2={620}
              y2={mapY(r)}
              stroke="currentColor"
              strokeDasharray="3"
              className="text-slate-200 dark:text-white/10"
            />
          ))}

          {/* Axes */}
          <line x1={70} y1={12} x2={70} y2={305} stroke="currentColor" strokeWidth="1.5" className="text-slate-400 dark:text-slate-500" />
          <line x1={70} y1={305} x2={625} y2={305} stroke="currentColor" strokeWidth="1.5" className="text-slate-400 dark:text-slate-500" />

          {/* Y Axis Vertical Label con contenedor de fondo blanco */}
          <g transform="rotate(-90)" className="pointer-events-none select-none">
            <rect
              x={-285}
              y={6}
              width="254"
              height="25"
              rx="6"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1"
              className="dark:fill-[#1e1e24] dark:stroke-white/10 shadow-2xs"
            />
            <text
              x={-158}
              y={22.5}
              textAnchor="middle"
              className="text-[11px] font-bold fill-slate-700 dark:fill-slate-300 font-sans"
            >
              ↑ Retorno Medio Anualizado (3 Años)
            </text>
          </g>

          {/* Y Axis Ticks */}
          {yTicks.map((r) => (
            <text key={r} x={62} y={mapY(r) + 4} textAnchor="end" className="text-[12px] font-mono font-bold fill-slate-500">
              {r}%
            </text>
          ))}

          {/* X Axis Ticks (separados y limpios) */}
          {xLabels.map((v) => (
            <text key={v} x={mapX(v)} y={322} textAnchor="middle" className="text-[12px] font-mono font-bold fill-slate-500">
              {v}%
            </text>
          ))}

          {/* X Axis Label (ubicado en el cuadrante inferior derecho despejado según indicación visual) */}
          <g className="pointer-events-none select-none">
            <rect
              x={368}
              y={273}
              width="254"
              height="25"
              rx="6"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1"
              className="dark:fill-[#1e1e24] dark:stroke-white/10 shadow-2xs"
            />
            <text
              x={495}
              y={289.5}
              textAnchor="middle"
              className="text-[11px] font-bold fill-slate-700 dark:fill-slate-300 font-sans"
            >
              Volatilidad Histórica (Desv. Típica a 3A) →
            </text>
          </g>

          {/* Points & Labels */}
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
                  {/* Anillos concéntricos de Tu Cartera */}
                  <circle cx={cx} cy={cy} r={isHovered ? 20 : 16} fill="#C8102E" fillOpacity="0.18" className="transition-all" />
                  <circle cx={cx} cy={cy} r={isHovered ? 14 : 11} fill="#ffffff" stroke="#C8102E" strokeWidth="3" className="transition-all" />
                  <text x={cx} y={cy + 4} textAnchor="middle" className="text-[11px] font-black fill-[#C8102E] pointer-events-none">
                    C
                  </text>

                  {/* Cartela destacada hacia la izquierda en zona 100% despejada */}
                  <rect
                    x={cx - 150}
                    y={cy - 16}
                    width="132"
                    height="32"
                    rx="10"
                    fill="#ffffff"
                    stroke="#C8102E"
                    strokeWidth="2"
                    className="dark:fill-[#1e1e22] shadow-sm"
                  />
                  <text x={cx - 84} y={cy + 5} textAnchor="middle" className="text-[12.5px] font-black fill-[#C8102E]">
                    Cartera (+{p.meanReturn.toFixed(1)}%)
                  </text>
                  <line x1={cx - 18} y1={cy} x2={cx - 14} y2={cy} stroke="#C8102E" strokeWidth="2" strokeDasharray="2" />
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
                  <rect x={cx - 7} y={cy - 7} width="14" height="14" rx="3.5" fill="#10b981" />
                  <text
                    x={cx + 12}
                    y={cy - 6}
                    className="text-[10.5px] font-bold fill-emerald-600 dark:fill-emerald-400 select-none"
                  >
                    Benchmark ({p.meanReturn.toFixed(1)}%)
                  </text>
                </g>
              )
            }

            // Fondos individuales (1 a 7) - Círculos limpios y nítidos sin textos pegados
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
                  r={isHovered ? 15 : 12}
                  fill={isHovered ? '#1d4ed8' : '#2563eb'}
                  className="transition-all shadow-sm"
                />
                <text x={cx} y={cy + 4} textAnchor="middle" className="text-[11px] font-extrabold fill-white pointer-events-none">
                  {p.index}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 3. Detail Panel con altura fija para evitar saltos o redimensiones en hover */}
      <div className="h-[42px] px-3 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-xs flex items-center shadow-2xs shrink-0 overflow-hidden">
        {activePoint ? (
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs text-white shrink-0",
                activePoint.isPortfolio ? "bg-[#C8102E]" : activePoint.isBenchmark ? "bg-emerald-600" : "bg-blue-600"
              )}>
                {activePoint.index}
              </span>
              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {activePoint.name}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs shrink-0 whitespace-nowrap">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{activePoint.meanReturn.toFixed(1)}%/a
              </span>
              <span className="text-slate-300 dark:text-white/20">|</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                ±{activePoint.volatility.toFixed(1)}%
              </span>
              {activePoint.weight > 0 && (
                <>
                  <span className="text-slate-300 dark:text-white/20">|</span>
                  <span className="text-slate-600 dark:text-slate-300 font-sans">
                    {activePoint.weight.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Pasa el cursor sobre cualquier punto numerado o la Cartera para ver su desglose cuantitativo exacto.</span>
          </div>
        )}
      </div>

      {/* 4. Legend Strip coincidente en altura y espaciado con la tarjeta derecha */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-white/10 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#C8102E] bg-white inline-flex items-center justify-center text-[8px] font-black text-[#C8102E]">C</span>
          <span>Tu Cartera (+21,5%)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-[#10b981] rounded-xs inline-block" />
          <span>Benchmark 80/20 (+10,2%)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-flex items-center justify-center text-[8px] font-bold text-white">#</span>
          <span>Fondos de Cartera (1-7)</span>
        </span>
      </div>
    </Card>
  )
}
export default RiskReturnScatterCard

