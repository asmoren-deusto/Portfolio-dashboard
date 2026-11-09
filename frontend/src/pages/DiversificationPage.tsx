import React, { useState } from 'react'
import { Globe, PieChart, Sparkles, ShieldCheck } from 'lucide-react'
import { DiversificationDashboard } from '@/components/analytics/DiversificationDashboard'
import { MarketSectorEvolutionCard } from '@/components/market/MarketSectorEvolutionCard'
import { usePositions, useMarketQuotes } from '@/api/queries'

export function DiversificationPage() {
  const { data: positions = [], isLoading, isFetching } = usePositions()
  const { data: quoteData } = useMarketQuotes()
  const [selectedSector, setSelectedSector] = useState<string>('Todos')

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5">
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
      </div>

      {/* Main Diversification Dashboard Component */}
      <DiversificationDashboard positions={positions} isLoading={isLoading} />

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
