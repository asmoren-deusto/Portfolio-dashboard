import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Layers, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { XRaySuperSectorsReport } from '@/lib/xrayEngine'

interface SuperSectorsTriangleCardProps {
  data?: XRaySuperSectorsReport
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
}) => {
  const [selectedSector, setSelectedSector] = useState<'sensible' | 'ciclico' | 'defensivo' | null>(null)

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/[0.08]">
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
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 hidden sm:inline-block">
            Look-Through Macro
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center mt-4">
          {/* Ternary Triangle SVG */}
          <div className="md:col-span-5 flex flex-col items-center justify-center pr-0 md:pr-3 md:border-r border-slate-200/70 dark:border-white/[0.08]">
            <div className="relative w-48 h-44">
              <svg viewBox="0 0 100 90" className="w-full h-full overflow-visible">
                {/* Background shaded areas */}
                <polygon points="50,14 14,78 86,78" fill="currentColor" className="text-slate-100 dark:text-white/[0.03] stroke-slate-400 dark:stroke-white/20" strokeWidth="1.2" />

                {/* Internal dividers */}
                <line x1="50" y1="14" x2="50" y2="56" stroke="currentColor" strokeDasharray="2" className="text-slate-300 dark:text-white/10" />
                <line x1="14" y1="78" x2="50" y2="56" stroke="currentColor" strokeDasharray="2" className="text-slate-300 dark:text-white/10" />
                <line x1="86" y1="78" x2="50" y2="56" stroke="currentColor" strokeDasharray="2" className="text-slate-300 dark:text-white/10" />

                {/* Vertex Labels */}
                <text x="50" y="8" textAnchor="middle" className="text-[7.5px] font-bold fill-blue-600 dark:fill-blue-400">
                  Sensible ({data.sensible.totalWeight.toFixed(1)}%)
                </text>
                <text x="6" y="86" textAnchor="start" className="text-[7.5px] font-bold fill-emerald-600 dark:fill-emerald-400">
                  Defensivo ({data.defensivo.totalWeight.toFixed(1)}%)
                </text>
                <text x="94" y="86" textAnchor="end" className="text-[7.5px] font-bold fill-amber-600 dark:fill-amber-400">
                  Cíclico ({data.ciclico.totalWeight.toFixed(1)}%)
                </text>

                {/* Benchmark Position (Diamond) */}
                <polygon points="50,47 54,51 50,55 46,51" fill="#10b981" />

                {/* Portfolio Position (Red Target) */}
                <circle cx="56" cy="38" r="8" fill="#C8102E" fillOpacity="0.15" />
                <circle cx="56" cy="38" r="5" fill="#ffffff" stroke="#C8102E" strokeWidth="2.5" />
                <circle cx="56" cy="38" r="1.5" fill="#C8102E" />
              </svg>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full border-2 border-[#C8102E] bg-white inline-block" /> Tu Cartera
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rotate-45 bg-[#10b981] inline-block" /> Benchmark Global
              </span>
            </div>
          </div>

          {/* 3 SuperSectors Breakdown */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Cíclico */}
            <div
              onClick={() => setSelectedSector(selectedSector === 'ciclico' ? null : 'ciclico')}
              className={cn(
                'p-3 rounded-2xl border transition-all cursor-pointer',
                selectedSector === 'ciclico'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]'
              )}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
                <span className="font-bold text-amber-700 dark:text-amber-400">Cíclico</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {data.ciclico.totalWeight.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {data.ciclico.industries.map((ind, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="truncate pr-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                      <span>{ind.name}</span>
                    </span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{ind.weight.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sensible */}
            <div
              onClick={() => setSelectedSector(selectedSector === 'sensible' ? null : 'sensible')}
              className={cn(
                'p-3 rounded-2xl border transition-all cursor-pointer',
                selectedSector === 'sensible'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]'
              )}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-blue-500/20">
                <span className="font-bold text-blue-700 dark:text-blue-400">Sensible al ciclo</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {data.sensible.totalWeight.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {data.sensible.industries.map((ind, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="truncate pr-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                      <span>{ind.name}</span>
                    </span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{ind.weight.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Defensivo */}
            <div
              onClick={() => setSelectedSector(selectedSector === 'defensivo' ? null : 'defensivo')}
              className={cn(
                'p-3 rounded-2xl border transition-all cursor-pointer',
                selectedSector === 'defensivo'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]'
              )}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">Defensivo</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {data.defensivo.totalWeight.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {data.defensivo.industries.map((ind, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="truncate pr-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                      <span>{ind.name}</span>
                    </span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{ind.weight.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
export default SuperSectorsTriangleCard

