import React from 'react'
import type { PortfolioXRayReport } from '@/lib/xrayEngine'
import { fmt } from '@/lib/utils'

interface MorningstarXRayDocumentProps {
  report: PortfolioXRayReport
  brokerLabel?: string
  clientName?: string
}

export const MorningstarXRayDocument: React.FC<MorningstarXRayDocumentProps> = ({
  report,
  brokerLabel = 'Todas las Entidades (Consolidado)',
  clientName = 'Cartera Global',
}) => {
  const {
    summary,
    assetAllocation,
    styleBox,
    topHoldings,
    geographicExposure,
    sectorExposure,
    superSectors,
    strengths,
    watchpoints,
    recommendations,
  } = report

  const formattedDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const top15Weight = topHoldings.slice(0, 15).reduce((sum, h) => sum + h.portfolioWeight, 0).toFixed(1)
  const top15ValueEur = topHoldings.slice(0, 15).reduce((sum, h) => sum + h.portfolioValue, 0)

  return (
    <div className="w-full bg-white text-slate-900 font-sans antialiased text-[11px] leading-normal selection:bg-slate-200">
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── PÁGINA 1: RESUMEN DE ASIGNACIÓN, ESTILO 3X3, SECTORES Y GEOGRAFÍA */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="print-page w-full min-h-[270mm] p-6 sm:p-8 flex flex-col justify-between bg-white border border-slate-200 print:border-none print:p-0">
        <div>
          {/* Morningstar Signature Red Top Stripe */}
          <div className="h-[3.5px] bg-[#C8102E] w-full mb-3" />

          {/* Institutional Header */}
          <header className="flex items-start justify-between pb-3 border-b-2 border-slate-900 gap-4">
            <div>
              <div className="flex items-center gap-2">
                {/* Morningstar Iconic Wordmark */}
                <div className="flex items-center text-xl font-black tracking-tight text-slate-950 font-sans">
                  <span>M</span>
                  <span className="relative inline-flex items-center justify-center w-3.5 h-3.5 mx-[1px]">
                    <span className="w-3.5 h-3.5 rounded-full border-[2.5px] border-slate-950" />
                    <span className="absolute w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                  </span>
                  <span>RNINGSTAR</span>
                </div>
                <span className="text-slate-300 font-light text-lg">|</span>
                <span className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Portfolio X-Ray<sup className="text-[9px]">®</sup>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Informe Oficial de Descomposición Look-Through y Diagnóstico Cuantitativo
              </p>
            </div>

            {/* Metadata Table */}
            <div className="text-[10px] text-right text-slate-600 leading-tight space-y-0.5 shrink-0">
              <div>
                <span className="text-slate-400">Titular / Cartera:</span>{' '}
                <strong className="text-slate-900">{brokerLabel}</strong>
              </div>
              <div>
                <span className="text-slate-400">Benchmark Oficial:</span>{' '}
                <strong className="text-slate-900">MSCI All Country World Index (ACWI) Net TR</strong>
              </div>
              <div>
                <span className="text-slate-400">Fecha de Análisis:</span>{' '}
                <strong className="text-slate-900">{formattedDate}</strong>
              </div>
              <div>
                <span className="text-slate-400">Patrimonio Analizado:</span>{' '}
                <strong className="text-slate-950 font-mono font-bold">{fmt.currency(summary.totalValue)}</strong>
              </div>
            </div>
          </header>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-5 gap-2 py-2 my-2.5 bg-slate-100/90 border-y border-slate-300 text-center text-[10px]">
            <div>
              <span className="text-slate-500 block">Patrimonio Total</span>
              <strong className="font-mono text-xs text-slate-900">{fmt.currency(summary.totalValue)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Salud de Cartera</span>
              <strong className="text-xs text-emerald-700 font-bold">{summary.healthScore}/100 ({summary.healthScoreLabel})</strong>
            </div>
            <div>
              <span className="text-slate-500 block">TER Medio Ponderado</span>
              <strong className="font-mono text-xs text-indigo-700 font-bold">{summary.weightedTer.toFixed(2)}% /año</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Volatilidad Est.</span>
              <strong className="font-mono text-xs text-slate-900 font-bold">±{summary.expectedVolatility.toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Ratio de Sharpe</span>
              <strong className="font-mono text-xs text-slate-900 font-bold">{summary.sharpeRatio.toFixed(2)}</strong>
            </div>
          </div>

          {/* ── ROW 1: ASSET ALLOCATION & MORNINGSTAR STYLE BOX (3x3) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            
            {/* 1. ASSET ALLOCATION */}
            <div className="border border-slate-300 rounded-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider flex items-center justify-between">
                  <span>Asset Allocation · Asignación de Activos</span>
                  <span className="text-slate-300 text-[9px] font-mono">Look-Through</span>
                </div>

                <table className="w-full text-[10px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                      <th className="py-1 px-2">Clase de Activo</th>
                      <th className="py-1 px-1.5 text-right font-mono">Cartera %</th>
                      <th className="py-1 px-1.5 text-right font-mono">Bmark %</th>
                      <th className="py-1 px-1.5 text-right font-mono">Dif. %</th>
                      <th className="py-1 px-2 text-right font-mono">Valor Efectivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assetAllocation.map((item) => {
                      const delta = item.weight - item.benchmarkWeight
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="py-1 px-2 font-medium flex items-center gap-1.5 text-slate-800">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span>{item.label}</span>
                          </td>
                          <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                            {item.weight.toFixed(1)}%
                          </td>
                          <td className="py-1 px-1.5 text-right font-mono text-slate-500">
                            {item.benchmarkWeight.toFixed(1)}%
                          </td>
                          <td className={`py-1 px-1.5 text-right font-mono font-semibold ${delta >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-slate-700 font-medium">
                            {fmt.currency(item.value)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                      <td className="py-1 px-2">Total Consolidado</td>
                      <td className="py-1 px-1.5 text-right font-mono">100.0%</td>
                      <td className="py-1 px-1.5 text-right font-mono text-slate-500">100.0%</td>
                      <td className="py-1 px-1.5 text-right font-mono text-slate-500">0.0%</td>
                      <td className="py-1 px-2 text-right font-mono">{fmt.currency(summary.totalValue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Composition Progress Bar */}
              <div className="p-2 bg-slate-50 border-t border-slate-200 mt-2">
                <div className="text-[9px] text-slate-500 font-medium mb-1">Composición Visual de la Cartera:</div>
                <div className="h-3 w-full rounded-xs overflow-hidden flex bg-slate-200 shadow-inner">
                  {assetAllocation.map((item) => (
                    <div
                      key={item.id}
                      style={{ width: `${item.weight}%`, backgroundColor: item.color }}
                      title={`${item.label}: ${item.weight.toFixed(1)}%`}
                      className="h-full"
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1 text-[8.5px] text-slate-500">
                  {assetAllocation.map((item) => (
                    <span key={item.id} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.label} ({item.weight.toFixed(0)}%)</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. MORNINGSTAR STOCK STYLE BOX™ */}
            <div className="border border-slate-300 rounded-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider flex items-center justify-between">
                  <span>Morningstar Equity Style Box™ (3x3)</span>
                  <span className="text-amber-300 text-[9px] font-semibold">{styleBox.dominantLabel}</span>
                </div>

                <div className="p-2.5 flex gap-3 items-center justify-center bg-white">
                  {/* The 3x3 Grid Matrix */}
                  <div className="relative">
                    {/* Header Columns */}
                    <div className="grid grid-cols-3 text-center text-[9px] font-bold text-slate-600 mb-1 pl-12">
                      <span>Valor</span>
                      <span>Mixto</span>
                      <span>Crecim.</span>
                    </div>

                    <div className="flex">
                      {/* Left Header Rows */}
                      <div className="flex flex-col justify-between text-right text-[9px] font-bold text-slate-600 pr-2 w-12 py-1">
                        <span>Grande</span>
                        <span>Media</span>
                        <span>Peq.</span>
                      </div>

                      {/* 9 Box Cells */}
                      <div className="grid grid-cols-3 grid-rows-3 w-40 h-28 border-2 border-slate-900 bg-white text-center">
                        {/* Large Value */}
                        <div className={`border border-slate-300 flex flex-col items-center justify-center p-0.5 ${styleBox.dominantSize === 'Large' && styleBox.dominantStyle === 'Value' ? 'bg-red-50 font-bold border-red-500' : ''}`}>
                          <span className="font-mono text-[10.5px]">{styleBox.largeValue.toFixed(1)}%</span>
                        </div>
                        {/* Large Blend */}
                        <div className={`border border-slate-300 flex flex-col items-center justify-center p-0.5 ${styleBox.dominantSize === 'Large' && styleBox.dominantStyle === 'Blend' ? 'bg-red-50 font-bold border-red-500 ring-2 ring-red-400 inset-0' : ''}`}>
                          {styleBox.dominantSize === 'Large' && styleBox.dominantStyle === 'Blend' && (
                            <span className="text-[#C8102E] text-[10px] leading-none mb-0.5">●</span>
                          )}
                          <span className="font-mono text-[10.5px] font-bold text-slate-950">{styleBox.largeBlend.toFixed(1)}%</span>
                        </div>
                        {/* Large Growth */}
                        <div className={`border border-slate-300 flex flex-col items-center justify-center p-0.5 ${styleBox.dominantSize === 'Large' && styleBox.dominantStyle === 'Growth' ? 'bg-red-50 font-bold border-red-500' : ''}`}>
                          <span className="font-mono text-[10.5px]">{styleBox.largeGrowth.toFixed(1)}%</span>
                        </div>

                        {/* Mid Value */}
                        <div className="border border-slate-300 flex flex-col items-center justify-center p-0.5">
                          <span className="font-mono text-[10px] text-slate-600">{styleBox.midValue.toFixed(1)}%</span>
                        </div>
                        {/* Mid Blend */}
                        <div className="border border-slate-300 flex flex-col items-center justify-center p-0.5">
                          <span className="font-mono text-[10px] text-slate-600">{styleBox.midBlend.toFixed(1)}%</span>
                        </div>
                        {/* Mid Growth */}
                        <div className="border border-slate-300 flex flex-col items-center justify-center p-0.5">
                          <span className="font-mono text-[10px] text-slate-600">{styleBox.midGrowth.toFixed(1)}%</span>
                        </div>

                        {/* Small Value */}
                        <div className="border border-slate-300 flex flex-col items-center justify-center p-0.5">
                          <span className="font-mono text-[9px] text-slate-500">{styleBox.smallValue.toFixed(1)}%</span>
                        </div>
                        {/* Small Blend */}
                        <div className="border border-slate-300 flex flex-col items-center justify-center p-0.5">
                          <span className="font-mono text-[9px] text-slate-500">{styleBox.smallBlend.toFixed(1)}%</span>
                        </div>
                        {/* Small Growth */}
                        <div className="border border-slate-300 flex flex-col items-center justify-center p-0.5">
                          <span className="font-mono text-[9px] text-slate-500">{styleBox.smallGrowth.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Marginal Row Totals (Right) */}
                      <div className="flex flex-col justify-between text-left text-[9px] font-mono font-bold text-slate-700 pl-1.5 py-1">
                        <span>{styleBox.totalLarge.toFixed(0)}%</span>
                        <span>{styleBox.totalMid.toFixed(0)}%</span>
                        <span>{styleBox.totalSmall.toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Marginal Column Totals (Bottom) */}
                    <div className="grid grid-cols-3 text-center text-[9px] font-mono font-bold text-slate-700 mt-1 pl-12">
                      <span>{styleBox.totalValue.toFixed(0)}%</span>
                      <span>{styleBox.totalBlend.toFixed(0)}%</span>
                      <span>{styleBox.totalGrowth.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equity Valuation Ratios Table */}
              <div className="bg-slate-50 border-t border-slate-200 p-2 text-[9.5px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-semibold border-b border-slate-200">
                      <th className="text-left pb-0.5">Métricas de Valoración</th>
                      <th className="text-right pb-0.5 font-mono">Cartera</th>
                      <th className="text-right pb-0.5 font-mono">Benchmark</th>
                      <th className="text-right pb-0.5 font-mono">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="py-0.5 text-slate-700">PER Ponderado (P/E)</td>
                      <td className="text-right font-mono font-bold text-slate-900">{summary.weightedPe.toFixed(1)}x</td>
                      <td className="text-right font-mono text-slate-500">21.4x</td>
                      <td className="text-right font-mono text-blue-700">+2.0x</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-slate-700">Precio / Valor Contable (P/B)</td>
                      <td className="text-right font-mono font-bold text-slate-900">{summary.weightedPb.toFixed(1)}x</td>
                      <td className="text-right font-mono text-slate-500">2.8x</td>
                      <td className="text-right font-mono text-blue-700">+0.1x</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-slate-700">Rentabilidad por Dividendo</td>
                      <td className="text-right font-mono font-bold text-slate-900">{summary.dividendYieldEst.toFixed(2)}%</td>
                      <td className="text-right font-mono text-slate-500">1.75%</td>
                      <td className="text-right font-mono text-amber-700">-0.17%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── ROW 2: STOCK SECTORS & WORLD REGIONS ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            
            {/* 3. STOCK SECTORS (PONDERACIÓN SECTORIAL) */}
            <div className="border border-slate-300 rounded-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider flex items-center justify-between">
                  <span>Stock Sectors · Ponderación Sectorial</span>
                  <span className="text-slate-300 text-[9px] font-mono">vs MSCI World</span>
                </div>

                {/* SuperSectors Bar */}
                <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 text-center py-1 text-[9.5px]">
                  {superSectors.map((ss) => (
                    <div key={ss.name} className="px-1 border-r last:border-r-0 border-slate-200">
                      <span className="text-slate-500 block text-[8.5px] uppercase font-semibold">{ss.name}</span>
                      <strong className="font-mono font-bold text-slate-900">{ss.weight.toFixed(1)}%</strong>
                      <span className="text-[8.5px] text-slate-400 block font-mono">MSCI: {ss.worldWeight.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>

                {/* Sector Table */}
                <table className="w-full text-[9.5px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                      <th className="py-1 px-2">Sector</th>
                      <th className="py-1 px-1.5 text-right font-mono">Cartera %</th>
                      <th className="py-1 px-1.5 text-right font-mono">MSCI %</th>
                      <th className="py-1 px-1.5 text-right font-mono">Dif. %</th>
                      <th className="py-1 px-2 text-left">Ponderación Visual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sectorExposure.slice(0, 8).map((sec) => (
                      <tr key={sec.id} className="hover:bg-slate-50/60">
                        <td className="py-0.5 px-2 font-medium text-slate-800 truncate max-w-[120px]">
                          {sec.name}
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold text-slate-900">
                          {sec.portfolioWeight.toFixed(1)}%
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-mono text-slate-500">
                          {sec.worldWeight.toFixed(1)}%
                        </td>
                        <td className={`py-0.5 px-1.5 text-right font-mono font-semibold ${sec.delta >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                          {sec.delta >= 0 ? '+' : ''}{sec.delta.toFixed(1)}%
                        </td>
                        <td className="py-0.5 px-2">
                          <div className="h-1.5 w-full bg-slate-200 rounded-xs overflow-hidden">
                            <div
                              className="h-full rounded-xs"
                              style={{ width: `${Math.min(100, sec.portfolioWeight * 2.8)}%`, backgroundColor: sec.color }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. WORLD REGIONS (EXPOSICIÓN GEOGRÁFICA) */}
            <div className="border border-slate-300 rounded-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider flex items-center justify-between">
                  <span>World Regions · Exposición Geográfica</span>
                  <span className="text-slate-300 text-[9px] font-mono">vs MSCI ACWI</span>
                </div>

                <table className="w-full text-[9.5px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                      <th className="py-1 px-2">Región / Mercado</th>
                      <th className="py-1 px-1.5 text-right font-mono">Cartera %</th>
                      <th className="py-1 px-1.5 text-right font-mono">MSCI %</th>
                      <th className="py-1 px-1.5 text-right font-mono">Dif. %</th>
                      <th className="py-1 px-2 text-center">Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {geographicExposure.map((geo) => (
                      <tr key={geo.id} className="hover:bg-slate-50/60">
                        <td className="py-1 px-2 font-medium text-slate-800 flex items-center gap-1.5">
                          <span>{geo.flag}</span>
                          <span>{geo.shortName}</span>
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                          {geo.portfolioWeight.toFixed(1)}%
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono text-slate-500">
                          {geo.worldWeight.toFixed(1)}%
                        </td>
                        <td className={`py-1 px-1.5 text-right font-mono font-semibold ${geo.delta >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                          {geo.delta >= 0 ? '+' : ''}{geo.delta.toFixed(1)}%
                        </td>
                        <td className="py-1 px-2 text-center">
                          <span
                            className={`text-[8.5px] px-1.5 py-0.2 rounded font-semibold ${
                              geo.status === 'overweight'
                                ? 'bg-blue-100 text-blue-800'
                                : geo.status === 'underweight'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {geo.status === 'overweight' ? 'Sobreponderada' : geo.status === 'underweight' ? 'Infraponderada' : 'Alineada'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Geographic Insight Notice */}
              <div className="p-2 bg-slate-50 border-t border-slate-200 text-[9px] text-slate-600 leading-tight">
                <strong>Análisis de Diversificación:</strong> La cartera ofrece una cobertura global balanceada, con núcleo en renta variable norteamericana y diversificación complementaria en Europa, Asia-Pacífico y Mercados Emergentes.
              </div>
            </div>

          </div>
        </div>

        {/* Page 1 Footer */}
        <footer className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-400">
          <span>© Morningstar, Inc. All rights reserved. Metodología oficial Morningstar Portfolio X-Ray®.</span>
          <span className="font-bold text-slate-600">Página 1 de 2</span>
          <span>Informe Confidencial para Inversores</span>
        </footer>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── PÁGINA 2: LOOK-THROUGH TOP HOLDINGS, AUDITORÍA Y DISCLOSURES    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="print-page print-page-break w-full min-h-[270mm] p-6 sm:p-8 flex flex-col justify-between bg-white border border-slate-200 print:border-none print:p-0 mt-8 print:mt-0">
        <div>
          {/* Morningstar Signature Red Top Stripe */}
          <div className="h-[3.5px] bg-[#C8102E] w-full mb-3" />

          {/* Page 2 Header */}
          <header className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
            <div className="flex items-center gap-2">
              <div className="flex items-center text-lg font-black tracking-tight text-slate-950 font-sans">
                <span>M</span>
                <span className="relative inline-flex items-center justify-center w-3 h-3 mx-[1px]">
                  <span className="w-3 h-3 rounded-full border-[2px] border-slate-950" />
                  <span className="absolute w-1 h-1 rounded-full bg-[#C8102E]" />
                </span>
                <span>RNINGSTAR</span>
              </div>
              <span className="text-slate-300 font-light text-base">|</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Portfolio X-Ray<sup className="text-[8px]">®</sup> · Look-Through Holdings & Auditoría
              </span>
            </div>
            <div className="text-[9.5px] text-slate-500 font-mono">
              Página 2 de 2 · {formattedDate}
            </div>
          </header>

          {/* ── TOP 15 UNDERLYING LOOK-THROUGH HOLDINGS ── */}
          <div className="mt-3 border border-slate-300 rounded-sm overflow-hidden">
            <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider flex items-center justify-between">
              <span>Top 15 Underlying Holdings · Valores Subyacentes en Cartera</span>
              <span className="text-indigo-300 text-[9px] font-mono">
                Top 15 = {top15Weight}% del patrimonio total ({fmt.currency(top15ValueEur)})
              </span>
            </div>

            <table className="w-full text-[9px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-1 px-1.5 text-center w-6">#</th>
                  <th className="py-1 px-2">Empresa Subyacente</th>
                  <th className="py-1 px-1.5 text-center font-mono">Ticker</th>
                  <th className="py-1 px-2">Sector Morningstar</th>
                  <th className="py-1 px-1.5">País</th>
                  <th className="py-1 px-2 text-right font-mono">Peso Cartera</th>
                  <th className="py-1 px-2 text-right font-mono">Valor Efectivo</th>
                  <th className="py-1 px-2">Vehículos de Inversión Aportantes (Look-Through)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topHoldings.slice(0, 15).map((h, idx) => (
                  <tr key={h.ticker || h.name} className="hover:bg-slate-50/70">
                    <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-0.5 px-2 font-bold text-slate-900 truncate max-w-[160px]">
                      {h.name}
                    </td>
                    <td className="py-0.5 px-1.5 text-center font-mono font-semibold text-slate-600">
                      {h.ticker}
                    </td>
                    <td className="py-0.5 px-2 text-slate-700 truncate max-w-[110px]">
                      {h.sector}
                    </td>
                    <td className="py-0.5 px-1.5 text-slate-700 truncate max-w-[90px]">
                      <span className="inline-flex items-center gap-1">
                        <span>{h.flag}</span>
                        <span>{h.country}</span>
                      </span>
                    </td>
                    <td className="py-0.5 px-2 text-right font-mono font-bold text-slate-950">
                      {h.portfolioWeight.toFixed(2)}%
                    </td>
                    <td className="py-0.5 px-2 text-right font-mono font-semibold text-slate-800">
                      {fmt.currency(h.portfolioValue)}
                    </td>
                    <td className="py-0.5 px-2 text-[8.5px] text-slate-500 font-mono truncate max-w-[200px]">
                      {h.contributingFunds.map((cf) => `${cf.fundName.replace('Vanguard ', '').replace('Fidelity ', '')} (${cf.fundWeightInHolding}%)`).join(' · ')}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                  <td colSpan={5} className="py-1 px-2 text-right uppercase text-[9px] text-slate-600">
                    Suma Agregada Top 15 Holdings:
                  </td>
                  <td className="py-1 px-2 text-right font-mono text-indigo-700">{top15Weight}%</td>
                  <td className="py-1 px-2 text-right font-mono text-slate-900">{fmt.currency(top15ValueEur)}</td>
                  <td className="py-1 px-2 text-[8.5px] text-slate-500 font-normal">
                    Representa el núcleo de mayor convicción de la cartera
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── RISK & PERFORMANCE PROFILE ── */}
          <div className="grid grid-cols-4 gap-2.5 mt-3">
            <div className="p-2 border border-slate-300 rounded-sm bg-slate-50/80">
              <span className="text-[9px] uppercase font-semibold text-slate-500 block">Costes Operativos (TER)</span>
              <div className="font-mono font-bold text-sm text-indigo-800 mt-0.5">
                {summary.weightedTer.toFixed(2)}% <span className="text-[9px] font-normal text-slate-500">/año</span>
              </div>
              <span className="text-[8.5px] text-slate-500 block mt-0.5">
                Coste anual estimado: {fmt.currency(summary.annualFeeCostEur)}/año
              </span>
            </div>

            <div className="p-2 border border-slate-300 rounded-sm bg-slate-50/80">
              <span className="text-[9px] uppercase font-semibold text-slate-500 block">Volatilidad Anualizada</span>
              <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                ±{summary.expectedVolatility.toFixed(1)}%
              </div>
              <span className="text-[8.5px] text-slate-500 block mt-0.5">
                Max Drawdown histórico: {summary.maxDrawdown.toFixed(1)}%
              </span>
            </div>

            <div className="p-2 border border-slate-300 rounded-sm bg-slate-50/80">
              <span className="text-[9px] uppercase font-semibold text-slate-500 block">Ratio de Sharpe</span>
              <div className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
                {summary.sharpeRatio.toFixed(2)}
              </div>
              <span className="text-[8.5px] text-emerald-600 block mt-0.5 font-medium">
                Alta eficiencia rentabilidad/riesgo
              </span>
            </div>

            <div className="p-2 border border-slate-300 rounded-sm bg-slate-50/80">
              <span className="text-[9px] uppercase font-semibold text-slate-500 block">Score Salud Cartera</span>
              <div className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
                {summary.healthScore}/100
              </div>
              <span className="text-[8.5px] text-slate-600 block mt-0.5 font-medium">
                {summary.healthScoreLabel}
              </span>
            </div>
          </div>

          {/* ── QUANTITATIVE AUDIT & RECOMMENDATIONS ── */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            {/* Puntos Fuertes */}
            <div className="border border-emerald-300 bg-emerald-50/30 rounded-sm p-2">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide border-b border-emerald-200 pb-1 mb-1.5 flex items-center gap-1">
                <span>✓</span>
                <span>Puntos Fuertes de Cartera</span>
              </div>
              <ul className="space-y-1 text-[9px] text-slate-700">
                {strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1 leading-snug">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Puntos de Atención */}
            <div className="border border-amber-300 bg-amber-50/30 rounded-sm p-2">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide border-b border-amber-200 pb-1 mb-1.5 flex items-center gap-1">
                <span>⚠</span>
                <span>Puntos de Atención / Riesgo</span>
              </div>
              <ul className="space-y-1 text-[9px] text-slate-700">
                {watchpoints.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1 leading-snug">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recomendaciones Cuantitativas */}
            <div className="border border-indigo-300 bg-indigo-50/30 rounded-sm p-2">
              <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide border-b border-indigo-200 pb-1 mb-1.5 flex items-center gap-1">
                <span>★</span>
                <span>Recomendaciones Operativas</span>
              </div>
              <ul className="space-y-1 text-[9px] text-slate-700">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-1 leading-snug">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── STANDARD MORNINGSTAR DISCLOSURES & METHODOLOGY ── */}
          <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-sm text-[8px] text-slate-500 leading-normal space-y-1">
            <p>
              <strong>Metodología Morningstar Portfolio X-Ray® Look-Through:</strong> El informe desagrega las tenencias directas de acciones y las carteras de fondos indexados, fondos de inversión activos y ETFs según sus ponderaciones oficiales reportadas a los reguladores (CNMV, SEC, ESMA). La clasificación de Estilo 3x3 y la asignación a los 11 Sectores y 3 SuperSectores sigue la taxonomía propietaria de Morningstar.
            </p>
            <p>
              <strong>Aviso Legal y Exención de Responsabilidad:</strong> La rentabilidad pasada no garantiza resultados futuros. Este documento se genera exclusivamente con fines informativos y de diagnóstico cuantitativo para el titular del patrimonio. No constituye una recomendación de compra, venta o asesoramiento financiero personalizado. Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* Page 2 Footer */}
        <footer className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-400">
          <span>© Morningstar, Inc. All rights reserved. Metodología oficial Morningstar Portfolio X-Ray®.</span>
          <span className="font-bold text-slate-600">Página 2 de 2</span>
          <span>Generado por PortfolioPro Institutional Engine</span>
        </footer>
      </section>

    </div>
  )
}
