import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, PieChart, Sparkles, ShieldCheck, ScanSearch } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { DiversificationDashboard } from '@/components/analytics/DiversificationDashboard'
import { SuperSectorsTriangleCard } from '@/components/analytics/SuperSectorsTriangleCard'
import { MarketSectorEvolutionCard } from '@/components/market/MarketSectorEvolutionCard'
import { usePositions, useMarketQuotes } from '@/api/queries'

export function DiversificationPage() {
  const { data: positions = [], isLoading, isFetching } = usePositions()
  const { data: quoteData } = useMarketQuotes()
  const [selectedSector, setSelectedSector] = useState<string>('Todos')

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Header Banner */}
      <Card className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-5">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <PieChart size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white leading-tight">
                Diversificación & Asignación Global
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                vs MSCI ACWI Benchmark
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Diagnóstico de salud de cartera: ponderación geográfica frente a la capitalización bursátil mundial, exposición multidivisa, concentración y simulador de rebalanceo inteligente.
            </p>
          </div>
        </div>

        {/* Botón Acción: Informe X-Ray */}
        <Link
          to="/xray"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0 self-start lg:self-center"
          title="Ver informe cuantitativo Look-Through de cartera"
        >
          <ScanSearch size={14} className="stroke-[2.2]" />
          <span>Informe X-Ray</span>
        </Link>
      </Card>

      {/* Main Diversification Dashboard Component */}
      <DiversificationDashboard positions={positions} isLoading={isLoading} />

      {/* Triángulo de SuperSectores Morningstar (Cíclico, Sensible, Defensivo) */}
      <SuperSectorsTriangleCard />

      {/* Evolución y Rotación Histórica del Mercado por Sectores */}
      <div style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto none auto 520px' }}>
        <MarketSectorEvolutionCard
          stocks={quoteData?.stocks ?? []}
          selectedSector={selectedSector}
          onSelectSector={setSelectedSector}
        />
      </div>
    </div>
  )
}

export default DiversificationPage
