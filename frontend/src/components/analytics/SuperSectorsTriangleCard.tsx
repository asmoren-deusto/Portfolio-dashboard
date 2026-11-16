import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Layers, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { XRaySuperSectorsReport } from '@/lib/xrayEngine'

interface SuperSectorsTriangleCardProps {
  data?: XRaySuperSectorsReport
  className?: string
}

export const SuperSectorsTriangleCard: React.FC<SuperSectorsTriangleCardProps> = ({
  data = {
    ciclico: {
      totalWeight: 28.75,
      benchmarkWeight: 31.50,
      industries: [
        { name: 'Materiales Básicos', weight: 4.39, color: '#d97706' },
        { name: 'Consumo Cíclico', weight: 8.90, color: '#f59e0b' },
        { name: 'Servicios Financieros', weight: 14.27, color: '#10b981' },
        { name: 'Inmobiliario', weight: 1.18, color: '#6366f1' },
      ],
    },
    sensible: {
      totalWeight: 58.95,
      benchmarkWeight: 44.20,
      industries: [
        { name: 'Servicios de Comunicación', weight: 8.74, color: '#06b6d4' },
        { name: 'Energía', weight: 7.20, color: '#ef4444' },
        { name: 'Industria', weight: 9.14, color: '#8b5cf6' },
        { name: 'Tecnología', weight: 33.87, color: '#3b82f6' },
      ],
    },
    defensivo: {
      totalWeight: 11.73,
      benchmarkWeight: 24.30,
      industries: [
        { name: 'Consumo Defensivo', weight: 3.83, color: '#84cc16' },
        { name: 'Salud', weight: 5.69, color: '#ec4899' },
        { name: 'Servicios Públicos', weight: 2.22, color: '#14b8a6' },
      ],
    },
    triangleCoords: {
      portfolio: { x: 38.5, y: 34.0 },
      benchmark: { x: 50.0, y: 55.0 },
    },
  },
  className,
}) => {
  const [selectedSector, setSelectedSector] = useState<'sensible' | 'ciclico' | 'defensivo' | null>(null)

  // Geometría del triángulo equilátero exacto (Lado L = 80, Altura H = L * sqrt(3)/2 = 69.28)
  // Vértice Superior (Sensible): (60, 17)
  // Vértice Inferior Izquierdo (Defensivo): (20, 86.3)
  // Vértice Inferior Derecho (Cíclico): (100, 86.3)
  // Centroide / Baricentro de convergencia: (60, 63.2)
  const topX = 60, topY = 17
  const leftX = 20, leftY = 86.3
  const rightX = 100, rightY = 86.3

  const sW = data.sensible.totalWeight || 0
  const dW = data.defensivo.totalWeight || 0
  const cW = data.ciclico.totalWeight || 0
  const totalW = sW + dW + cW || 1

  const portX = (sW / totalW) * topX + (dW / totalW) * leftX + (cW / totalW) * rightX
  const portY = (sW / totalW) * topY + (dW / totalW) * leftY + (cW / totalW) * rightY

  const sBench = data.sensible.benchmarkWeight || 44.2
  const dBench = data.defensivo.benchmarkWeight || 24.3
  const cBench = data.ciclico.benchmarkWeight || 31.5
  const totalBench = sBench + dBench + cBench || 1

  const benchX = (sBench / totalBench) * topX + (dBench / totalBench) * leftX + (cBench / totalBench) * rightX
  const benchY = (sBench / totalBench) * topY + (dBench / totalBench) * leftY + (cBench / totalBench) * rightY

  return (
    <Card className={cn('p-5 sm:p-6 flex flex-col justify-between h-full', className)}>
      <div className="flex flex-col justify-between flex-1 h-full min-h-0">
        <div className="flex items-end justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Compass size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Triángulo de SuperSectores Morningstar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ponderación macroeconómica ternaria: Sensible al ciclo, Cíclico y Defensivo
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 hidden sm:inline-block shrink-0 self-end">
            Look-Through Macro
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center my-auto py-2">
          {/* Ternary Triangle SVG (4 cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center pr-0 md:pr-4 md:border-r border-slate-200/70 dark:border-white/[0.08]">
            <div className="relative w-48 sm:w-52 h-48 sm:h-52 flex items-center justify-center">
              <svg viewBox="0 0 120 114" className="w-full h-full overflow-visible">
                {/* Background shaded areas - Triángulo Equilátero Exacto */}
                <polygon
                  points="60,17 20,86.3 100,86.3"
                  fill="currentColor"
                  className="text-slate-100 dark:text-white/[0.03] stroke-slate-400 dark:stroke-white/20"
                  strokeWidth="1.2"
                />

                {/* Internal dividers convergentes en el centroide (60, 63.2) */}
                <line x1="60" y1="17" x2="60" y2="63.2" stroke="currentColor" strokeDasharray="2" className="text-slate-300 dark:text-white/10" />
                <line x1="20" y1="86.3" x2="60" y2="63.2" stroke="currentColor" strokeDasharray="2" className="text-slate-300 dark:text-white/10" />
                <line x1="100" y1="86.3" x2="60" y2="63.2" stroke="currentColor" strokeDasharray="2" className="text-slate-300 dark:text-white/10" />

                {/* Vertex Labels */}
                {/* Sensible (Top Vertex) */}
                <text
                  x="60"
                  y="8"
                  textAnchor="middle"
                  fontSize="7.5"
                  className="font-bold fill-blue-600 dark:fill-blue-400"
                >
                  Sensible ({data.sensible.totalWeight.toFixed(1)}%)
                </text>

                {/* Defensivo (Vértice inferior izquierdo) */}
                <text
                  x="20"
                  y="95"
                  textAnchor="middle"
                  fontSize="7.5"
                  className="font-bold fill-emerald-600 dark:fill-emerald-400"
                >
                  Defensivo
                </text>
                <text
                  x="20"
                  y="103"
                  textAnchor="middle"
                  fontSize="6.8"
                  className="font-bold fill-emerald-600/90 dark:fill-emerald-400/90"
                >
                  ({data.defensivo.totalWeight.toFixed(1)}%)
                </text>

                {/* Cíclico (Vértice inferior derecho) */}
                <text
                  x="100"
                  y="95"
                  textAnchor="middle"
                  fontSize="7.5"
                  className="font-bold fill-amber-600 dark:fill-amber-400"
                >
                  Cíclico
                </text>
                <text
                  x="100"
                  y="103"
                  textAnchor="middle"
                  fontSize="6.8"
                  className="font-bold fill-amber-600/90 dark:fill-amber-400/90"
                >
                  ({data.ciclico.totalWeight.toFixed(1)}%)
                </text>

                {/* Benchmark Position (Diamond) */}
                <polygon
                  points={`${benchX},${benchY - 4} ${benchX + 4},${benchY} ${benchX},${benchY + 4} ${benchX - 4},${benchY}`}
                  fill="#10b981"
                />

                {/* Portfolio Position (Red Target) */}
                <circle cx={portX} cy={portY} r="8" fill="#C8102E" fillOpacity="0.15" />
                <circle cx={portX} cy={portY} r="5" fill="#ffffff" stroke="#C8102E" strokeWidth="2.5" />
                <circle cx={portX} cy={portY} r="1.5" fill="#C8102E" />
              </svg>
            </div>

            <div className="flex items-center gap-3.5 mt-2.5 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#C8102E] bg-white inline-block" /> Tu Cartera
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-[11px]">
                <span className="w-2 h-2 rotate-45 bg-[#10b981] inline-block" /> Benchmark Global
              </span>
            </div>
          </div>

          {/* 3 SuperSectors Breakdown (8 cols - AMPLIA) */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Cíclico */}
            <div
              onClick={() => setSelectedSector(selectedSector === 'ciclico' ? null : 'ciclico')}
              className={cn(
                'p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-full shadow-2xs',
                selectedSector === 'ciclico'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/10'
              )}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                  <span className="font-bold text-amber-700 dark:text-amber-400">Cíclico</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {data.ciclico.totalWeight.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {data.ciclico.industries.map((ind, i) => (
                    <div key={i} className="flex justify-between items-center text-[11.5px] text-slate-600 dark:text-slate-400 min-w-0">
                      <span className="truncate pr-1 flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                        <span className="truncate">{ind.name}</span>
                      </span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white shrink-0 ml-1">{ind.weight.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sensible */}
            <div
              onClick={() => setSelectedSector(selectedSector === 'sensible' ? null : 'sensible')}
              className={cn(
                'p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-full shadow-2xs',
                selectedSector === 'sensible'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/10'
              )}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
                  <span className="font-bold text-blue-700 dark:text-blue-400">Sensible al ciclo</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {data.sensible.totalWeight.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {data.sensible.industries.map((ind, i) => (
                    <div key={i} className="flex justify-between items-center text-[11.5px] text-slate-600 dark:text-slate-400 min-w-0">
                      <span className="truncate pr-1 flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                        <span className="truncate">{ind.name}</span>
                      </span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white shrink-0 ml-1">{ind.weight.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Defensivo */}
            <div
              onClick={() => setSelectedSector(selectedSector === 'defensivo' ? null : 'defensivo')}
              className={cn(
                'p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-full shadow-2xs',
                selectedSector === 'defensivo'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/10'
              )}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">Defensivo</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {data.defensivo.totalWeight.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {data.defensivo.industries.map((ind, i) => (
                    <div key={i} className="flex justify-between items-center text-[11.5px] text-slate-600 dark:text-slate-400 min-w-0">
                      <span className="truncate pr-1 flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                        <span className="truncate">{ind.name}</span>
                      </span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white shrink-0 ml-1">{ind.weight.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
export default SuperSectorsTriangleCard

