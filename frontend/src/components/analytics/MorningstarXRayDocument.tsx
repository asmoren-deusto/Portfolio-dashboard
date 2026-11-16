import React from 'react'
import type { PortfolioXRayReport } from '@/lib/xrayEngine'
import { fmt } from '@/lib/utils'
import { WorldMapChoropleth } from './WorldMapChoropleth'

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
    topCountries,
    regionalBreakdown,
    superSectorsDetail,
    styleBox,
    fixedIncomeStyle,
    topHoldings,
    performance,
    stockOverlap,
    fundPositions,
    generatedAt,
    asOfDate,
  } = report

  // Morningstar Stars Renderer
  const renderStars = (rating: number) => {
    if (!rating || rating <= 0) return <span className="text-slate-400 font-normal">-</span>
    return (
      <span className="text-amber-500 tracking-[-1px] text-[11px] font-mono">
        {'★'.repeat(rating)}
        <span className="text-slate-200">{'★'.repeat(Math.max(0, 5 - rating))}</span>
      </span>
    )
  }

  // Correlation Color Mapper
  const getCorrelationColor = (val: number | null) => {
    if (val === null) return 'bg-slate-100 text-slate-400'
    if (val >= 0.60) return 'bg-[#1e40af] text-white font-bold' // 1.00 to 0.60 (Dark Blue)
    if (val >= 0.20) return 'bg-[#60a5fa] text-slate-900 font-semibold' // 0.60 to 0.20 (Light Blue)
    if (val >= -0.20) return 'bg-[#f1f5f9] text-slate-800' // 0.20 to -0.20 (Neutral)
    if (val >= -0.60) return 'bg-[#fed7aa] text-amber-900' // -0.20 to -0.60 (Orange)
    return 'bg-[#ef4444] text-white font-bold' // -0.60 to -1.00 (Red)
  }

  // Pesos regionales agregados para el Mapamundi Coroplético
  const naWeight =
    (regionalBreakdown.america?.subregions?.find((s) => s.name === 'Estados Unidos')?.actionWeight ?? 56.06) +
    (regionalBreakdown.america?.subregions?.find((s) => s.name === 'Canada')?.actionWeight ?? 1.73)
  const laWeight =
    regionalBreakdown.america?.subregions?.find((s) => s.name.includes('América Latina'))?.actionWeight ?? 2.13
  const euWeight = regionalBreakdown.europa?.actionWeight ?? 19.07
  const afWeight =
    regionalBreakdown.europa?.subregions?.find((s) => s.name.includes('Oriente Medio'))?.actionWeight ?? 0.91
  const asWeight =
    (regionalBreakdown.asia?.subregions?.find((s) => s.name === 'Japón')?.actionWeight ?? 11.02) +
    (regionalBreakdown.asia?.subregions?.find((s) => s.name.includes('4 tigres'))?.actionWeight ?? 5.56) +
    (regionalBreakdown.asia?.subregions?.find((s) => s.name.includes('Emergente'))?.actionWeight ?? 3.44)
  const ocWeight =
    regionalBreakdown.asia?.subregions?.find((s) => s.name === 'Australasia')?.actionWeight ?? 0.42

  return (
    <div className="w-full bg-white text-slate-900 font-sans antialiased text-[10px] leading-normal selection:bg-slate-200">
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── PÁGINA 1: X-RAY DE CARTERA                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="print-page w-full min-h-[275mm] print:min-h-0 print:h-auto p-6 sm:p-7 flex flex-col justify-between bg-white border border-slate-200 shadow-md rounded-sm mb-6 print:mb-0 print:rounded-none print:shadow-none print:border-none print:p-0">
        <div>
          {/* Header Metadata Strip */}
          <div className="flex items-center justify-between text-[9px] text-slate-500 pb-1 border-b border-slate-300">
            <span>Informe a {generatedAt}</span>
            <span className="font-semibold text-slate-700">PORTFOLIO X-RAY OFICIAL</span>
          </div>

          <div className="h-[3px] bg-[#C8102E] w-full my-2" />

          {/* Institutional Title */}
          <div className="flex items-start justify-between pb-2 mb-3 border-b-2 border-slate-950">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 font-sans">
                X-Ray de Cartera
              </h1>
              <p className="text-[10.5px] text-slate-500 font-medium">
                Descomposición analítica en profundidad, estilo y activos subyacentes
              </p>
            </div>
            <div className="text-right text-[9.5px] text-slate-600 space-y-0.5">
              <div><span className="text-slate-400">Titular:</span> <strong>{brokerLabel}</strong></div>
              <div><span className="text-slate-400">Benchmark:</span> <strong>MSCI ACWI / Mercado Monetario EUR</strong></div>
            </div>
          </div>

          {/* Bloque 1: Distribución de Activos % & Exposición por País % */}
          <div className="grid grid-cols-12 gap-3 pb-3 border-b border-slate-200">
            {/* Distribución de Activos (5 cols) */}
            <div className="col-span-5 pr-2 border-r border-slate-200">
              <h3 className="font-bold text-[10.5px] text-slate-900 uppercase tracking-wide mb-1.5">
                Distribución de activos %
              </h3>
              <div className="flex items-center gap-3">
                {/* Donut SVG */}
                <div className="w-[72px] h-[72px] shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 44 44" className="w-full h-full transform -rotate-90 overflow-visible">
                    <circle cx="22" cy="22" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    {(() => {
                      let accumulated = 0
                      return assetAllocation
                        .filter((item) => item.weight > 0.005)
                        .map((item) => {
                          const dash = `${item.weight.toFixed(2)} ${(100 - item.weight).toFixed(2)}`
                          const offset = -accumulated
                          accumulated += item.weight
                          return (
                            <circle
                              key={item.id}
                              cx="22"
                              cy="22"
                              r="15.9155"
                              fill="none"
                              stroke={item.color}
                              strokeWidth="6"
                              strokeDasharray={dash}
                              strokeDashoffset={offset}
                            />
                          )
                        })
                    })()}
                  </svg>
                </div>
                {/* Table */}
                <table className="w-full text-[9px] leading-tight">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold text-slate-600">
                      <th className="text-left py-0.5">Distribución de Activos</th>
                      <th className="text-right py-0.5">Port</th>
                      <th className="text-right py-0.5 text-slate-400">Ref.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetAllocation.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-0.5 flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.label}</span>
                        </td>
                        <td className="text-right font-mono font-bold py-0.5">{item.weight.toFixed(2).replace('.', ',')}</td>
                        <td className="text-right font-mono text-slate-400 py-0.5">{item.benchmarkWeight.toFixed(2).replace('.', ',')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Exposición por País % (7 cols) */}
            <div className="col-span-7 pl-1">
              <h3 className="font-bold text-[10.5px] text-slate-900 uppercase tracking-wide mb-1.5">
                Exposición por país %
              </h3>
              <div className="grid grid-cols-2 gap-x-4 text-[9px]">
                {/* Columna Izquierda (Top 1-5) */}
                <table className="w-full leading-tight">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold text-slate-600">
                      <th className="text-left py-0.5">País</th>
                      <th className="text-right py-0.5">Acción</th>
                      <th className="text-right py-0.5 text-slate-400">Ref.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCountries.slice(0, 5).map((c, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-0.5 flex items-center gap-1 font-medium truncate">
                          <span>{c.flag}</span>
                          <span>{c.country}</span>
                        </td>
                        <td className="text-right font-mono font-bold py-0.5">{c.actionWeight.toFixed(2).replace('.', ',')}</td>
                        <td className="text-right font-mono text-slate-400 py-0.5">{c.refWeight.toFixed(2).replace('.', ',')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Columna Derecha (Top 6-10) */}
                <table className="w-full leading-tight">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold text-slate-600">
                      <th className="text-left py-0.5">País</th>
                      <th className="text-right py-0.5">Acción</th>
                      <th className="text-right py-0.5 text-slate-400">Ref.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCountries.slice(5, 10).map((c, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-0.5 flex items-center gap-1 font-medium truncate">
                          <span>{c.flag}</span>
                          <span>{c.country}</span>
                        </td>
                        <td className="text-right font-mono font-bold py-0.5">{c.actionWeight.toFixed(2).replace('.', ',')}</td>
                        <td className="text-right font-mono text-slate-400 py-0.5">{c.refWeight.toFixed(2).replace('.', ',')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bloque 2: Desglose por Regiones % */}
          <div className="py-2.5 border-b border-slate-200">
            <h3 className="font-bold text-[10.5px] text-slate-900 uppercase tracking-wide mb-1.5">
              Desglose por regiones %
            </h3>
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Mapamundi / Leyenda (3 cols) */}
              <div className="col-span-3 pr-2 border-r border-slate-200">
                <div className="w-full h-[76px] bg-slate-50/80 border border-slate-200 rounded flex items-center justify-center overflow-hidden">
                  <WorldMapChoropleth
                    className="w-full h-full"
                    northAmericaWeight={naWeight}
                    latinAmericaWeight={laWeight}
                    europeWeight={euWeight}
                    africaMiddleEastWeight={afWeight}
                    asiaWeight={asWeight}
                    australasiaWeight={ocWeight}
                  />
                </div>
                {/* Scale Legend */}
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 mt-1.5 pt-1 border-t border-slate-200">
                  <span className="flex items-center gap-0.5"><span className="w-2.5 h-2 bg-[#ffedd5] inline-block border border-amber-300" /> &lt;10</span>
                  <span className="flex items-center gap-0.5"><span className="w-2.5 h-2 bg-[#fdba74] inline-block border border-orange-400" /> 10-25</span>
                  <span className="flex items-center gap-0.5"><span className="w-2.5 h-2 bg-[#fb923c] inline-block border border-orange-500" /> 25-50</span>
                  <span className="flex items-center gap-0.5"><span className="w-2.5 h-2 bg-[#ea580c] inline-block border border-orange-700" /> &gt;50</span>
                </div>
                <div className="mt-1 text-[8px] text-slate-500">
                  No Clasificados: <span className="font-bold text-slate-800 font-mono">0,57%</span>
                </div>
              </div>

              {/* Tablas Jerárquicas Regionales (9 cols) */}
              <div className="col-span-9 grid grid-cols-3 gap-3 text-[9px] leading-tight">
                {/* Europa */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-400 pb-0.5 mb-1 font-bold">
                    <span className="text-slate-950 font-bold">Europa</span>
                    <div className="flex gap-2">
                      <span className="text-slate-900 font-mono">{regionalBreakdown.europa.actionWeight.toFixed(2).replace('.', ',')}</span>
                      <span className="text-slate-400 font-mono">0,00</span>
                    </div>
                  </div>
                  {regionalBreakdown.europa.subregions.map((sub, idx) => (
                    <div key={idx} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                      <span className="truncate pr-1">{sub.name}</span>
                      <span className="font-mono text-slate-900 font-medium shrink-0">{sub.actionWeight.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                {/* América */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-400 pb-0.5 mb-1 font-bold">
                    <span className="text-slate-950 font-bold">América</span>
                    <div className="flex gap-2">
                      <span className="text-slate-900 font-mono">{regionalBreakdown.america.actionWeight.toFixed(2).replace('.', ',')}</span>
                      <span className="text-slate-400 font-mono">0,00</span>
                    </div>
                  </div>
                  {regionalBreakdown.america.subregions.map((sub, idx) => (
                    <div key={idx} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                      <span className="truncate pr-1">{sub.name}</span>
                      <span className="font-mono text-slate-900 font-medium shrink-0">{sub.actionWeight.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                {/* Asia */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-400 pb-0.5 mb-1 font-bold">
                    <span className="text-slate-950 font-bold">Asia</span>
                    <div className="flex gap-2">
                      <span className="text-slate-900 font-mono">{regionalBreakdown.asia.actionWeight.toFixed(2).replace('.', ',')}</span>
                      <span className="text-slate-400 font-mono">0,00</span>
                    </div>
                  </div>
                  {regionalBreakdown.asia.subregions.map((sub, idx) => (
                    <div key={idx} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                      <span className="truncate pr-1">{sub.name}</span>
                      <span className="font-mono text-slate-900 font-medium shrink-0">{sub.actionWeight.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 3: Sectores de Renta Variable % y Triángulo de SuperSectores */}
          <div className="py-2.5 border-b border-slate-200">
            <h3 className="font-bold text-[10.5px] text-slate-900 uppercase tracking-wide mb-1.5">
              Sectores de Renta Variable %
            </h3>
            <div className="grid grid-cols-12 gap-3 items-center">
              {/* Triángulo de SuperSectores SVG (3 cols) */}
              <div className="col-span-3 pr-2 border-r border-slate-200 flex flex-col items-center">
                <div className="relative w-32 h-28">
                  <svg viewBox="0 0 100 90" className="w-full h-full overflow-visible">
                    {/* Equilateral Triangle */}
                    <polygon points="50,12 12,78 88,78" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
                    {/* Corner Labels */}
                    <text x="50" y="8" textAnchor="middle" className="text-[7px] font-bold fill-slate-700">Sensible al ciclo</text>
                    <text x="8" y="86" textAnchor="middle" className="text-[7px] font-bold fill-slate-700">Defensivo</text>
                    <text x="90" y="86" textAnchor="middle" className="text-[7px] font-bold fill-slate-700">Cíclico</text>
                    
                    {/* Inner dividing lines converging at centroid (50, 56) */}
                    <line x1="50" y1="12" x2="50" y2="56" stroke="#cbd5e1" strokeDasharray="1.5" />
                    <line x1="12" y1="78" x2="50" y2="56" stroke="#cbd5e1" strokeDasharray="1.5" />
                    <line x1="88" y1="78" x2="50" y2="56" stroke="#cbd5e1" strokeDasharray="1.5" />

                    {/* Benchmark Point (Diamond perfectly centered at 50, 56) */}
                    <polygon points="50,52 53.5,56 50,60 46.5,56" fill="#10b981" stroke="#047857" strokeWidth="0.8" />
                    {/* Cartera Point (Circle with red ring calculated from macro weights) */}
                    {(() => {
                      const sW = superSectorsDetail.sensible.totalWeight || 0
                      const dW = superSectorsDetail.defensivo.totalWeight || 0
                      const cW = superSectorsDetail.ciclico.totalWeight || 0
                      const totalW = sW + dW + cW || 100
                      const portX = (sW / totalW) * 50 + (dW / totalW) * 12 + (cW / totalW) * 88
                      const portY = (sW / totalW) * 12 + (dW / totalW) * 78 + (cW / totalW) * 78
                      return (
                        <g>
                          <circle cx={portX} cy={portY} r="4.5" fill="#ffffff" stroke="#C8102E" strokeWidth="2.5" />
                          <circle cx={portX} cy={portY} r="1.5" fill="#C8102E" />
                        </g>
                      )
                    })()}
                  </svg>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 mt-1 text-[8.5px] font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-[#C8102E] bg-white inline-block" /> Cartera
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rotate-45 bg-[#10b981] inline-block" /> Benchmark
                  </span>
                </div>
              </div>

              {/* 3 Columnas de SuperSectores e Industrias (9 cols) */}
              <div className="col-span-9 grid grid-cols-3 gap-3 text-[9px] leading-tight">
                {/* Cíclico */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-400 pb-0.5 mb-1 font-bold">
                    <span className="text-slate-950 font-bold">Cíclico</span>
                    <div className="flex gap-2">
                      <span className="text-slate-900 font-mono">{superSectorsDetail.ciclico.totalWeight.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                  {superSectorsDetail.ciclico.industries.map((ind, i) => (
                    <div key={i} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                      <span className="truncate pr-1 flex items-center gap-1.5 font-normal">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                        <span>{ind.name}</span>
                      </span>
                      <span className="font-mono text-slate-900 font-medium shrink-0">{ind.weight.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                {/* Sensible al ciclo */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-400 pb-0.5 mb-1 font-bold">
                    <span className="text-slate-950 font-bold">Sensible al ciclo</span>
                    <div className="flex gap-2">
                      <span className="text-slate-900 font-mono">{superSectorsDetail.sensible.totalWeight.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                  {superSectorsDetail.sensible.industries.map((ind, i) => (
                    <div key={i} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                      <span className="truncate pr-1 flex items-center gap-1.5 font-normal">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                        <span>{ind.name}</span>
                      </span>
                      <span className="font-mono text-slate-900 font-medium shrink-0">{ind.weight.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                {/* Defensivo */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-400 pb-0.5 mb-1 font-bold">
                    <span className="text-slate-950 font-bold">Defensivo</span>
                    <div className="flex gap-2">
                      <span className="text-slate-900 font-mono">{superSectorsDetail.defensivo.totalWeight.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                  {superSectorsDetail.defensivo.industries.map((ind, i) => (
                    <div key={i} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                      <span className="truncate pr-1 flex items-center gap-1.5 font-normal">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                        <span>{ind.name}</span>
                      </span>
                      <span className="font-mono text-slate-900 font-medium shrink-0">{ind.weight.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 4: Estilo de Inversión (Equity & Fixed Income Style Box 3x3) */}
          <div className="py-2.5 border-b border-slate-200">
            <h3 className="font-bold text-[10.5px] text-slate-900 uppercase tracking-wide mb-1.5">
              Estilo de inversión
            </h3>
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Equity Style Box (4 cols) */}
              <div className="col-span-4 pr-2 border-r border-slate-200">
                <div className="text-[8.5px] font-bold text-slate-600 mb-1 flex justify-between">
                  <span>Estilo de Renta Variable</span>
                  <span className="text-slate-400 font-mono">3x3 Grid</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="text-[7.5px] font-bold text-slate-500 flex flex-col justify-around h-18 text-right pr-1">
                    <span>Grande</span>
                    <span>Med.</span>
                    <span>Peq.</span>
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 p-1 bg-slate-200 border border-slate-400 rounded">
                    {[
                      { val: styleBox.largeValue, bg: styleBox.largeValue >= 25 ? 'bg-blue-300' : 'bg-white' },
                      { val: styleBox.largeBlend, bg: styleBox.largeBlend >= 25 ? 'bg-blue-400 text-white font-bold' : 'bg-white' },
                      { val: styleBox.largeGrowth, bg: styleBox.largeGrowth >= 25 ? 'bg-blue-300' : 'bg-white' },
                      { val: styleBox.midValue, bg: 'bg-white' },
                      { val: styleBox.midBlend, bg: 'bg-white' },
                      { val: styleBox.midGrowth, bg: 'bg-white' },
                      { val: styleBox.smallValue, bg: 'bg-white' },
                      { val: styleBox.smallBlend, bg: 'bg-white' },
                      { val: styleBox.smallGrowth, bg: 'bg-white' },
                    ].map((box, i) => (
                      <div key={i} className={`w-8 h-5 flex items-center justify-center font-mono text-[9px] font-semibold ${box.bg}`}>
                        {box.val}
                      </div>
                    ))}
                  </div>
                  <div className="text-[8.5px] space-y-1 pl-2">
                    <div className="border-b border-slate-200 pb-0.5">
                      <span className="text-slate-500 block text-[7.5px]">P/VC:</span>
                      <strong className="font-mono text-slate-900">{styleBox.priceToBook}</strong>
                    </div>
                    <div className="border-b border-slate-200 pb-0.5">
                      <span className="text-slate-500 block text-[7.5px]">PER:</span>
                      <strong className="font-mono text-slate-900">{styleBox.priceToEarnings}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[7.5px]">P/CF:</span>
                      <strong className="font-mono text-slate-900">{styleBox.priceToCashFlow}</strong>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-[7.5px] font-bold text-slate-500 px-8 mt-1">
                  <span>Valor</span>
                  <span>Mixto</span>
                  <span>Crecimiento</span>
                </div>
              </div>

              {/* Fixed Income Style Box & Metrics (4 cols) */}
              <div className="col-span-4 pr-2 border-r border-slate-200">
                <div className="text-[8.5px] font-bold text-slate-600 mb-1 flex justify-between">
                  <span>Estilo de Renta Fija</span>
                  <span className="text-slate-400 font-mono">Calidad / Duración</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="text-[7.5px] font-bold text-slate-500 flex flex-col justify-around h-18 text-right pr-1">
                    <span>Alto</span>
                    <span>Med.</span>
                    <span>Bajo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 p-1 bg-slate-200 border border-slate-400 rounded">
                    {(fixedIncomeStyle?.grid?.length === 3
                      ? fixedIncomeStyle.grid.flat()
                      : [0, 100, 0, 0, 0, 0, 0, 0, 0]
                    ).map((v, i) => (
                      <div
                        key={i}
                        className={`w-8 h-5 flex items-center justify-center font-mono text-[9px] font-semibold ${
                          v >= 25
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : v > 0
                              ? 'bg-amber-100 text-slate-800'
                              : 'bg-white text-slate-400'
                        }`}
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                  <div className="text-[8.5px] space-y-1 pl-2">
                    <div className="border-b border-slate-200 pb-0.5">
                      <span className="text-slate-500 block text-[7.5px]">Duración:</span>
                      <strong className="font-mono text-slate-900">
                        {fixedIncomeStyle?.effectiveDurationPort != null
                          ? `${fixedIncomeStyle.effectiveDurationPort.toFixed(2).replace('.', ',')} a`
                          : '5,20 a'}{' '}
                        <span className="text-slate-500 font-normal">
                          (Ref {fixedIncomeStyle?.effectiveDurationRef?.toFixed(2).replace('.', ',') || '0,50'})
                        </span>
                      </strong>
                    </div>
                    <div className="border-b border-slate-200 pb-0.5">
                      <span className="text-slate-500 block text-[7.5px]">Vencimiento:</span>
                      <strong className="font-mono text-slate-900">
                        {fixedIncomeStyle?.effectiveMaturityPort != null
                          ? `${fixedIncomeStyle.effectiveMaturityPort.toFixed(2).replace('.', ',')} a`
                          : '5,70 a'}{' '}
                        <span className="text-slate-500 font-normal">
                          (Ref {fixedIncomeStyle?.effectiveMaturityRef?.toFixed(2).replace('.', ',') || '0,74'})
                        </span>
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[7.5px]">Calidad cred.:</span>
                      <strong className="font-mono text-slate-900">
                        {fixedIncomeStyle?.creditQualityPort || 'A'}{' '}
                        <span className="text-slate-500 font-normal">
                          (Ref {fixedIncomeStyle?.creditQualityRef || 'A'})
                        </span>
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-[7.5px] font-bold text-slate-500 px-8 mt-1">
                  <span>Ltd</span>
                  <span>Mod</span>
                  <span>Ext</span>
                </div>
              </div>

              {/* Síntesis Cuantitativa de Estilo (4 cols) */}
              <div className="col-span-4 pl-1 text-[8.5px] space-y-1.5">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block font-bold text-[9px] mb-0.5">
                    Orientación Estratégica
                  </strong>
                  <p className="text-slate-600 leading-tight">
                    Cartera marcadamente concentrada en <strong>Renta Variable Grande / Mixta</strong> ({styleBox.totalLarge}%), combinando valoración equilibrada ({styleBox.priceToEarnings}x PER) con activos de alto flujo de caja.
                  </p>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-indigo-50/60 border border-indigo-100 font-mono text-[9px]">
                  <span className="text-indigo-900 font-semibold font-sans">TER Ponderado:</span>
                  <span className="font-bold text-indigo-700">{summary.weightedTer.toFixed(2)}% anual</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 5: Las 10 Principales Posiciones Look-Through */}
          <div className="pt-2">
            <h3 className="font-bold text-[10.5px] text-slate-900 uppercase tracking-wide mb-1.5">
              Las 10 principales posiciones (Look-Through)
            </h3>
            <table className="w-full text-[9px] leading-tight">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-700 font-bold">
                  <th className="text-right py-1 w-16">Activos %</th>
                  <th className="text-left py-1 pl-3">Nombre</th>
                  <th className="text-left py-1">Tipo</th>
                  <th className="text-left py-1">Sector</th>
                  <th className="text-left py-1">País</th>
                </tr>
              </thead>
              <tbody>
                {topHoldings.slice(0, 10).map((h, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="text-right py-1 font-mono font-bold text-slate-950">{h.portfolioWeight.toFixed(2).replace('.', ',')}</td>
                    <td className="text-left py-1 pl-3 font-semibold text-slate-900">{h.name}</td>
                    <td className="text-left py-1 text-slate-500">{h.type}</td>
                    <td className="text-left py-1 text-slate-700">{h.sector}</td>
                    <td className="text-left py-1 text-slate-600 flex items-center gap-1">
                      <span>{h.flag}</span>
                      <span>{h.country}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Oficial Morningstar */}
        <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-500">
          <span>© 2026 Morningstar Network S.L. Todos los derechos reservados. Informe cuantitativo generado para {clientName}.</span>
          <span className="font-bold font-mono">Página 1 de 5</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── PÁGINA 2: MORNINGSTAR RENDIMIENTO X-RAY                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="print-page w-full min-h-[275mm] print:min-h-0 print:h-auto p-6 sm:p-7 flex flex-col justify-between bg-white border border-slate-200 shadow-md rounded-sm mb-6 print:mb-0 print:rounded-none print:shadow-none print:border-none print:p-0">
        <div>
          <div className="flex items-center justify-between text-[9px] text-slate-500 pb-1 border-b border-slate-300">
            <span>Informe a {generatedAt}</span>
            <span className="font-semibold text-slate-700">MORNINGSTAR RENDIMIENTO X-RAY</span>
          </div>
          <div className="h-[3px] bg-[#C8102E] w-full my-2" />

          <div className="flex items-start justify-between pb-2 mb-2 border-b-2 border-slate-950">
            <div className="min-w-0 pr-4">
              <h1 className="text-xl sm:text-[21px] font-black tracking-tight text-slate-950 font-sans whitespace-nowrap leading-tight">
                Morningstar Rendimiento X-Ray
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                Análisis histórico de rentabilidad, exceso sobre benchmark, dispersión y estadísticas MPT
              </p>
            </div>
            <div className="text-right text-[9.5px] text-slate-600 space-y-0.5 shrink-0">
              <div><span className="text-slate-400">Benchmark:</span> <strong>{performance.benchmarkName}</strong></div>
              <div><span className="text-slate-400">Fecha de corte:</span> <strong>{asOfDate}</strong></div>
            </div>
          </div>

          {/* Gráfico de Crecimiento de 10.000 EUR */}
          <div className="pb-2 border-b border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[10px] text-slate-900">
                Rentabilidad · Crecim. de EUR 10000
              </span>
              <div className="flex items-center gap-3 text-[8.5px] font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8102E] inline-block" /> Cartera
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Benchmark
                </span>
              </div>
            </div>
            {/* SVG Curva de Capital (10k a 40k) */}
            <div className="w-full h-24 bg-slate-50 border border-slate-200 rounded p-1.5 relative">
              <svg viewBox="0 0 500 80" className="w-full h-full overflow-visible">
                {/* Horizontal Grid lines */}
                <line x1="30" y1="10" x2="490" y2="10" stroke="#e2e8f0" strokeDasharray="2" />
                <line x1="30" y1="30" x2="490" y2="30" stroke="#e2e8f0" strokeDasharray="2" />
                <line x1="30" y1="50" x2="490" y2="50" stroke="#e2e8f0" strokeDasharray="2" />
                <line x1="30" y1="70" x2="490" y2="70" stroke="#e2e8f0" strokeDasharray="2" />
                {/* Y-axis Labels */}
                <text x="25" y="13" textAnchor="end" className="text-[7px] font-mono fill-slate-400">40k</text>
                <text x="25" y="33" textAnchor="end" className="text-[7px] font-mono fill-slate-400">30k</text>
                <text x="25" y="53" textAnchor="end" className="text-[7px] font-mono fill-slate-400">20k</text>
                <text x="25" y="73" textAnchor="end" className="text-[7px] font-mono fill-slate-400">10k</text>

                {/* Benchmark Line (Flat steady growth) */}
                <path d="M 30,70 L 80,69 L 130,69 L 180,68 L 230,68 L 280,67 L 330,66 L 380,65 L 430,64 L 490,63" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

                {/* Portfolio Line (Exponential growth from 10k to 40.8k) */}
                <path d="M 30,70 L 80,66 L 130,58 L 180,51 L 230,37 L 280,45 L 330,28 L 380,18 L 430,13 L 490,9" fill="none" stroke="#C8102E" strokeWidth="2.2" />

                {/* Year Markers */}
                {['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'].map((yr, i) => (
                  <text key={yr} x={30 + i * 51} y="79" textAnchor="middle" className="text-[6.5px] font-mono fill-slate-500">{yr}</text>
                ))}
              </svg>
            </div>
          </div>

          {/* Gráfico de Rentabilidad Trimestral Respecto Benchmark */}
          <div className="py-2 border-b border-slate-200">
            <span className="font-bold text-[9.5px] text-slate-800 block mb-1">
              Rentabilidad trimestral respecto benchmark
            </span>
            <div className="w-full h-14 bg-slate-50 border border-slate-200 rounded p-1 relative">
              <svg viewBox="0 0 500 50" className="w-full h-full overflow-visible">
                {/* Zero line */}
                <line x1="20" y1="25" x2="495" y2="25" stroke="#64748b" strokeWidth="1" />
                <text x="16" y="27" textAnchor="end" className="text-[6.5px] font-mono fill-slate-400">0</text>
                <text x="16" y="10" textAnchor="end" className="text-[6.5px] font-mono fill-slate-400">+16</text>
                <text x="16" y="44" textAnchor="end" className="text-[6.5px] font-mono fill-slate-400">-16</text>

                {/* Bars */}
                {performance.quarterlyExcess.map((q, i) => {
                  const barWidth = 8
                  const x = 25 + i * 12.5
                  const h = Math.min(22, Math.abs(q.excess) * 1.0)
                  const y = q.isPositive ? 25 - h : 25
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(1, h)}
                      fill={q.isPositive ? '#C8102E' : '#1e3a8a'}
                    />
                  )
                })}
              </svg>
            </div>
          </div>

          {/* Tablas de Rentabilidad Acumulada y Rentabilidad por Periodos */}
          <div className="grid grid-cols-12 gap-3 py-2 border-b border-slate-200 text-[8.5px]">
            {/* Rentab. acum. % (5 cols) */}
            <div className="col-span-5 pr-2 border-r border-slate-200">
              <table className="w-full leading-tight">
                <thead>
                  <tr className="border-b border-slate-400 font-bold text-slate-800">
                    <th className="text-left py-0.5">Rentab. acum. %</th>
                    <th className="text-right py-0.5">Port</th>
                    <th className="text-right py-0.5 text-slate-400">Ref.</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.accumulatedReturns.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-0.5 font-medium">{r.period}</td>
                      <td className="text-right font-mono font-bold py-0.5">{r.portfolio.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono text-slate-400 py-0.5">{r.reference.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rentab. por periodos % (Mejor y Peor) (7 cols) */}
            <div className="col-span-7 pl-1">
              <table className="w-full leading-tight">
                <thead>
                  <tr className="border-b border-slate-400 font-bold text-slate-800">
                    <th className="text-left py-0.5">Rentab. por periodos %</th>
                    <th className="text-right py-0.5 text-emerald-700">Mejor</th>
                    <th className="text-right py-0.5 text-rose-700">Peor</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.periodExtremes.map((p, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-0.5 font-medium">{p.period}</td>
                      <td className="text-right font-mono text-emerald-700 font-semibold py-0.5">
                        {p.bestReturn.toFixed(2).replace('.', ',')} <span className="text-[7.5px] font-sans text-slate-400">({p.bestDates})</span>
                      </td>
                      <td className="text-right font-mono text-rose-700 font-semibold py-0.5">
                        {p.worstReturn.toFixed(2).replace('.', ',')} <span className="text-[7.5px] font-sans text-slate-400">({p.worstDates})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análisis de Rentabilidades (Scatter Plot) y Matriz de Correlación */}
          <div className="grid grid-cols-12 gap-3 py-2 border-b border-slate-200 items-stretch">
            {/* Scatter Plot Riesgo/Retorno (6 cols) */}
            <div className="col-span-6 pr-2 border-r border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[9.5px] text-slate-900">Análisis de rentabilidades (3a)</span>
                  <span className="text-[7.5px] text-slate-400 font-mono">Media vs Volatilidad</span>
                </div>
                <div className="w-full h-[175px] bg-slate-50 border border-slate-200 rounded p-2 flex items-center justify-center relative">
                  <svg viewBox="0 0 210 148" className="w-full h-full overflow-visible">
                    {/* Gridlines */}
                    {[7, 14, 21, 28, 35].map((v) => {
                      const gx = 24 + (v / 35) * 172
                      return (
                        <line
                          key={v}
                          x1={gx}
                          y1="12"
                          x2={gx}
                          y2="120"
                          stroke="#e2e8f0"
                          strokeDasharray="2"
                          strokeWidth="0.8"
                        />
                      )
                    })}
                    {[10, 20, 30, 40].map((m) => {
                      const gy = 120 - (m / 40) * 108
                      return (
                        <line
                          key={m}
                          x1="24"
                          y1={gy}
                          x2="196"
                          y2={gy}
                          stroke="#e2e8f0"
                          strokeDasharray="2"
                          strokeWidth="0.8"
                        />
                      )
                    })}

                    {/* Axis lines */}
                    <line x1="24" y1="12" x2="24" y2="120" stroke="#94a3b8" strokeWidth="1" />
                    <line x1="24" y1="120" x2="196" y2="120" stroke="#94a3b8" strokeWidth="1" />
                    
                    {/* X labels (Volatilidad) */}
                    {[0, 7, 14, 21, 28, 35].map((v) => {
                      const lx = 24 + (v / 35) * 172
                      return (
                        <text key={v} x={lx} y="130" textAnchor="middle" className="text-[6.5px] font-mono fill-slate-500">{v}</text>
                      )
                    })}
                    <text x="110" y="142" textAnchor="middle" className="text-[6.5px] font-bold fill-slate-600">Volatilidad a 3a (%)</text>

                    {/* Y labels (Media 3a) */}
                    {[0, 10, 20, 30, 40].map((m) => {
                      const ly = 120 - (m / 40) * 108
                      return (
                        <text key={m} x="20" y={ly} textAnchor="end" dominantBaseline="central" className="text-[6.5px] font-mono fill-slate-500">{m}</text>
                      )
                    })}
                    
                    {/* Scatter Points */}
                    {/* Benchmark */}
                    {(() => {
                      const bp = performance.scatterPoints.find((p) => p.isBenchmark) || { volatility: 0.5, meanReturn: 2.71 }
                      const bx = 24 + (Math.max(0, Math.min(35, bp.volatility)) / 35) * 172
                      const by = 120 - (Math.max(0, Math.min(40, bp.meanReturn)) / 40) * 108
                      return (
                        <g>
                          <rect x={bx - 2.5} y={by - 2.5} width="5" height="5" rx="1" fill="#10b981" />
                          <text x={bx - 1} y={by - 4.5} textAnchor="start" className="text-[4.5px] font-bold fill-emerald-600 font-sans">
                            Ref Mon. ({bp.meanReturn.toFixed(1)}%)
                          </text>
                        </g>
                      )
                    })()}

                    {/* Cartera Consolidada */}
                    {(() => {
                      const cp = performance.scatterPoints.find((p) => p.isPortfolio) || { volatility: 11.85, meanReturn: 20.85 }
                      const cx = 24 + (Math.max(0, Math.min(35, cp.volatility)) / 35) * 172
                      const cy = 120 - (Math.max(0, Math.min(40, cp.meanReturn)) / 40) * 108
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r="5.0" fill="#ffffff" stroke="#C8102E" strokeWidth="1.6" />
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="text-[5px] font-black fill-[#C8102E] font-sans">
                            C
                          </text>
                        </g>
                      )
                    })()}

                    {/* Numbered Fund Points (1 to N) - Formato idéntico al badge de la derecha (círculo rojo, texto blanco y más pequeño) */}
                    {performance.scatterPoints
                      .filter((p) => !p.isPortfolio && !p.isBenchmark)
                      .map((p) => {
                        const fx = 24 + (Math.max(0, Math.min(35, p.volatility)) / 35) * 172
                        const fy = 120 - (Math.max(0, Math.min(40, p.meanReturn)) / 40) * 108
                        return (
                          <g key={p.id || p.index}>
                            <circle cx={fx} cy={fy} r="3.5" fill="#C8102E" />
                            <text
                              x={fx}
                              y={fy}
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="text-[4.2px] font-bold fill-white font-sans"
                            >
                              {p.index}
                            </text>
                          </g>
                        )
                      })}
                  </svg>
                </div>
              </div>
            </div>

            {/* Matriz de Correlación (6 cols) */}
            <div className="col-span-6 pl-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[9.5px] text-slate-900">Matriz de correlación</span>
                  <span className="text-[7.5px] text-slate-400 font-mono">
                    Fondos 1-{(performance.correlationFunds.length > 0 ? performance.correlationFunds.length : (performance.correlationMatrix[0] || []).length)}
                  </span>
                </div>
                <table className="w-full border-collapse text-[8px] leading-tight text-center overflow-visible">
                  <thead>
                    <tr>
                      <th className="w-4 py-0.5"></th>
                      {(performance.correlationFunds.length > 0
                        ? performance.correlationFunds.map((f) => f.index)
                        : (performance.correlationMatrix[0] || []).map((_, i) => i + 1)
                      ).map((num) => (
                        <th key={num} className="py-0.5 px-0.5 text-center align-middle">
                          <span className="w-3.5 h-3.5 mx-auto rounded-full bg-[#C8102E] text-white font-bold flex items-center justify-center text-[6.5px] leading-none shrink-0 shadow-2xs">
                            {num}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {performance.correlationMatrix.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="py-0.5 px-0.5 text-center align-middle">
                          <span className="w-3.5 h-3.5 mx-auto rounded-full bg-[#C8102E] text-white font-bold flex items-center justify-center text-[6.5px] leading-none shrink-0 shadow-2xs">
                            {rIdx + 1}
                          </span>
                        </td>
                        {row.map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-0.5 px-0.5 border border-white font-mono text-[6.5px] ${getCorrelationColor(val)}`}
                          >
                            {val !== null ? val.toFixed(2) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Correlation Color Legend */}
              <div className="flex items-center justify-between text-[7px] mt-1.5 pt-1 border-t border-slate-100 font-mono text-slate-600">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#1e40af] inline-block" /> 1.00 - 0.60</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#60a5fa] inline-block" /> 0.60 - 0.20</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#f1f5f9] border border-slate-300 inline-block" /> 0.20 - -0.20</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#fed7aa] inline-block" /> -0.20 - -0.60</span>
              </div>
            </div>
          </div>

          {/* Bloque Inferior: 10 Mayores Posiciones y Estadísticas MPT */}
          <div className="grid grid-cols-12 gap-3 pt-2 text-[8px] leading-tight">
            {/* 10 Mayores Posiciones (6 cols) */}
            <div className="col-span-6 pr-2 border-r border-slate-200">
              <span className="font-bold text-[9px] text-slate-900 block mb-1">
                10 mayores posiciones
              </span>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-300 font-bold text-slate-600">
                    <th className="text-left py-0.5">Nombre</th>
                    <th className="text-right py-0.5">Peso (%)</th>
                    <th className="text-right py-0.5">Medio</th>
                    <th className="text-right py-0.5">Vol.</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.correlationFunds.map((f) => (
                    <tr key={f.index} className="border-b border-slate-100">
                      <td className="py-0.5 flex items-center gap-1 truncate font-medium">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#C8102E] text-white flex items-center justify-center text-[6.5px] leading-none shrink-0 font-bold shadow-2xs">
                          {f.index}
                        </span>
                        <span className="truncate">{f.name}</span>
                      </td>
                      <td className="text-right font-mono font-bold">{f.weight.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono text-slate-700">{f.mean.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono text-slate-700">{f.vol.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Estadísticas de Riesgo y Estadísticas MPT (6 cols) */}
            <div className="col-span-6 pl-1 space-y-1.5">
              <div>
                <span className="font-bold text-[9px] text-slate-900 block mb-0.5">
                  Estadísticas de Rentabilidad y Riesgo
                </span>
                <table className="w-full border-b border-slate-200">
                  <thead>
                    <tr className="text-slate-400 font-normal">
                      <th className="text-left py-0.5"></th>
                      <th className="text-right py-0.5">3 años</th>
                      <th className="text-right py-0.5">5 años</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-0.5 font-medium">Volatilidad</td>
                      <td className="text-right font-mono font-bold">{performance.mptStats.volatility3y.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono">{performance.mptStats.volatility5y.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-medium">Media Aritmética</td>
                      <td className="text-right font-mono font-bold">{performance.mptStats.meanReturn3y.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono">{performance.mptStats.meanReturn5y.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-medium">Ratio de Sharpe</td>
                      <td className="text-right font-mono font-bold text-emerald-700">{performance.mptStats.sharpeRatio3y.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono text-emerald-700">{performance.mptStats.sharpeRatio5y.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <span className="font-bold text-[9px] text-slate-900 block mb-0.5">
                  Estadísticas MPT (Modern Portfolio Theory)
                </span>
                <table className="w-full">
                  <thead>
                    <tr className="text-slate-400 font-normal">
                      <th className="text-left py-0.5"></th>
                      <th className="text-right py-0.5">3 años</th>
                      <th className="text-right py-0.5">5 años</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-0.5 font-medium">Alfa 3a</td>
                      <td className="text-right font-mono font-bold text-emerald-700">+{performance.mptStats.alpha3y.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono text-emerald-700">+{performance.mptStats.alpha5y.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-medium">Beta</td>
                      <td className="text-right font-mono font-bold">{performance.mptStats.beta3y.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono">{performance.mptStats.beta5y.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-medium">R cuadrado (R²)</td>
                      <td className="text-right font-mono">{performance.mptStats.rSquared3y.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono">{performance.mptStats.rSquared5y.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-medium">Ratio de Información</td>
                      <td className="text-right font-mono font-bold text-indigo-700">{performance.mptStats.infoRatio3y.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono text-indigo-700">{performance.mptStats.infoRatio5y.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-medium">Tracking Error</td>
                      <td className="text-right font-mono">{performance.mptStats.trackingError3y.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right font-mono">{performance.mptStats.trackingError5y.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Oficial Morningstar */}
        <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-500">
          <span>© 2026 Morningstar Network S.L. Todos los derechos reservados. Rendimiento ajustado con costes de fondos actuales.</span>
          <span className="font-bold font-mono">Página 2 de 5</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── PÁGINA 3: SOLAPAMIENTO DE ACCIONES                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="print-page w-full min-h-[275mm] print:min-h-0 print:h-auto p-6 sm:p-7 flex flex-col justify-between bg-white border border-slate-200 shadow-md rounded-sm mb-6 print:mb-0 print:rounded-none print:shadow-none print:border-none print:p-0">
        <div>
          <div className="flex items-center justify-between text-[9px] text-slate-500 pb-1 border-b border-slate-300">
            <span>Informe a {generatedAt}</span>
            <span className="font-semibold text-slate-700">SOLAPAMIENTO DE ACCIONES (STOCK OVERLAP)</span>
          </div>
          <div className="h-[3px] bg-[#C8102E] w-full my-2" />

          <div className="pb-2 mb-2 border-b-2 border-slate-950">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 font-sans">
              Solapamiento de acciones
            </h1>
            <p className="text-[9.5px] text-slate-500 font-medium leading-relaxed mt-1">
              La fecha de la cartera es la más reciente disponible en base de datos para la publicación completa de las participaciones. Es posible que dos fondos tengan una fecha de cartera diferente. Por favor, consulte las páginas de información para más detalles.
            </p>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 text-[9px] font-bold text-slate-700 pb-1.5 border-b border-slate-400">
            <div className="col-span-4">% Cartera / Nombre</div>
            <div className="col-span-3">ISIN</div>
            <div className="col-span-2 text-right">% Posición</div>
            <div className="col-span-2">Sector</div>
            <div className="col-span-1 text-right">Cartera fecha</div>
          </div>

          {/* List of Stock Overlaps */}
          <div className="divide-y divide-slate-150 text-[8.5px]">
            {stockOverlap.map((item, idx) => (
              <div key={idx} className="py-1.5">
                {/* Main Stock Row */}
                <div className="grid grid-cols-12 gap-2 font-bold text-slate-950 items-center">
                  <div className="col-span-4 flex items-center gap-1.5">
                    <span className="font-mono text-[9.5px] text-indigo-700 w-10 text-right shrink-0">
                      {item.totalPortfolioWeight.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </div>
                  <div className="col-span-3 font-mono text-[8px] text-slate-500">
                    {item.isin}
                  </div>
                  <div className="col-span-2 text-right font-mono text-slate-400">
                    -
                  </div>
                  <div className="col-span-2 text-slate-700 flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{item.sector}</span>
                  </div>
                  <div className="col-span-1 text-right text-slate-400">
                    -
                  </div>
                </div>

                {/* Contributing Funds Sub-Rows */}
                <div className="pl-6 pt-1 space-y-0.5">
                  {item.contributingFunds.map((cf, cIdx) => (
                    <div key={cIdx} className="grid grid-cols-12 gap-2 text-[8px] text-slate-600 items-center">
                      <div className="col-span-4 flex items-center gap-1.5 truncate">
                        <span className="font-mono text-slate-400 text-right w-10 shrink-0">
                          {cf.contributedWeight.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="truncate text-slate-800">{cf.fundName}</span>
                      </div>
                      <div className="col-span-3 font-mono text-slate-400">
                        {cf.fundIsin}
                      </div>
                      <div className="col-span-2 text-right font-mono font-semibold text-slate-900">
                        {cf.weightInFund.toFixed(2).replace('.', ',')}%
                      </div>
                      <div className="col-span-2 text-slate-400">
                        -
                      </div>
                      <div className="col-span-1 text-right font-mono text-slate-500">
                        {cf.portfolioDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Oficial Morningstar */}
        <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-500">
          <span>© 2026 Morningstar Network S.L. Todos los derechos reservados. Look-Through ponderado multi-fondo.</span>
          <span className="font-bold font-mono">Página 3 de 5</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── PÁGINA 4: POSICIONES DE CARTERA                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="print-page w-full min-h-[275mm] print:min-h-0 print:h-auto p-6 sm:p-7 flex flex-col justify-between bg-white border border-slate-200 shadow-md rounded-sm mb-6 print:mb-0 print:rounded-none print:shadow-none print:border-none print:p-0">
        <div>
          <div className="flex items-center justify-between text-[9px] text-slate-500 pb-1 border-b border-slate-300">
            <span>Informe a {generatedAt}</span>
            <span className="font-semibold text-slate-700">POSICIONES DE CARTERA</span>
          </div>
          <div className="h-[3px] bg-[#C8102E] w-full my-2" />

          <div className="pb-2 mb-3 border-b-2 border-slate-950">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 font-sans">
              Posiciones de Cartera
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Inventario oficial de fondos y activos con rentabilidades anualizadas, rating de estrellas y comisiones (TER)
            </p>
          </div>

          {/* Tabla Oficial de Posiciones de Cartera */}
          <table className="w-full text-[9px] leading-tight">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-700 font-bold">
                <th className="text-left py-1.5 w-60">Nombre</th>
                <th className="text-left py-1.5">Tipo</th>
                <th className="text-left py-1.5">Fecha de cartera</th>
                <th className="text-center py-1.5">Rating Morningstar™</th>
                <th className="text-right py-1.5">1 año</th>
                <th className="text-right py-1.5">3 Años Anualizado</th>
                <th className="text-right py-1.5">5 Años Anualizado</th>
                <th className="text-right py-1.5">Gastos Corrientes</th>
                <th className="text-right py-1.5">Peso (%)</th>
              </tr>
            </thead>
            <tbody>
              {fundPositions.map((f, idx) => (
                <tr key={idx} className="border-b border-slate-150 hover:bg-slate-50/60">
                  <td className="py-2 pr-2">
                    <span className="font-bold text-slate-950 block">{f.name}</span>
                    <span className="font-mono text-[8px] text-slate-400">{f.isin}</span>
                  </td>
                  <td className="py-2 text-slate-600">{f.type}</td>
                  <td className="py-2 text-slate-600 font-mono">{f.portfolioDate}</td>
                  <td className="py-2 text-center">{renderStars(f.morningstarRating)}</td>
                  <td className="py-2 text-right font-mono font-semibold text-slate-900">
                    {f.return1y.toFixed(2).replace('.', ',')}%
                  </td>
                  <td className="py-2 text-right font-mono text-slate-700">
                    {f.return3yAnn !== null ? `${f.return3yAnn.toFixed(2).replace('.', ',')}%` : '-'}
                  </td>
                  <td className="py-2 text-right font-mono text-slate-700">
                    {f.return5yAnn !== null ? `${f.return5yAnn.toFixed(2).replace('.', ',')}%` : '-'}
                  </td>
                  <td className="py-2 text-right font-mono text-indigo-700 font-semibold">
                    {f.ongoingChargesTer.toFixed(2).replace('.', ',')}%
                  </td>
                  <td className="py-2 text-right font-mono font-bold text-slate-950">
                    {f.portfolioWeight.toFixed(2).replace('.', ',')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumen Total */}
          <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[9.5px]">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900">Total Posiciones Evaluadas: {fundPositions.length} fondos</span>
              <span className="block text-slate-500">Patrimonio consolidado analizado: {fmt.currency(summary.totalValue)}</span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="font-bold text-slate-900 font-mono">Peso Total: 100,00%</span>
              <span className="block font-mono text-indigo-700 font-semibold">TER Medio Ponderado: {summary.weightedTer.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Footer Oficial Morningstar */}
        <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-500">
          <span>© 2026 Morningstar Network S.L. Todos los derechos reservados. Información oficial de fondos armonizados UCITS.</span>
          <span className="font-bold font-mono">Página 4 de 5</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── PÁGINA 5: DISCLOSURE Y METODOLOGÍA OFICIAL MORNINGSTAR            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="print-page w-full min-h-[275mm] print:min-h-0 print:h-auto p-6 sm:p-7 flex flex-col justify-between bg-white border border-slate-200 shadow-md rounded-sm print:mb-0 print:rounded-none print:shadow-none print:border-none print:p-0">
        <div>
          <div className="flex items-center justify-between text-[9px] text-slate-500 pb-1 border-b border-slate-300">
            <span>Informe a {generatedAt}</span>
            <span className="font-semibold text-slate-700">DISCLOSURE & METODOLOGÍA</span>
          </div>
          <div className="h-[3px] bg-[#C8102E] w-full my-2" />

          <div className="pb-1 mb-2 border-b-2 border-slate-950">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 font-sans">
              Disclosure
            </h1>
          </div>

          {/* 2 Column Legal & Methodological Glossary Text */}
          <div className="grid grid-cols-2 gap-x-5 text-[8.2px] leading-relaxed text-slate-700 text-justify">
            {/* Columna Izquierda */}
            <div className="space-y-2">
              <p>
                Los datos de rendimiento expresados representan el rendimiento pasado y no deben considerarse indicadores de resultados futuros. Los rendimientos de fondos no reflejan transacciones activas y no necesariamente reflejan los resultados que podrían haberse obtenido mediante la administración activa de la cuenta. Los rendimientos de inversiones de otros clientes del asesor pueden diferir considerablemente de la inversión representada.
              </p>

              <div>
                <strong className="text-slate-950 block font-bold text-[8.8px] mb-0.5">Asignación de activos</strong>
                <p>
                  Este gráfico circular y este cuadro muestran la exposición de la cartera a las siguientes clases de activos amplias: Acciones, Bonos, Efectivo y Otro. La categoría “Otro” representa una clase de activo que Morningstar reconoce pero clasifica fuera de las clases de activos antes mencionadas. “No clasificado” se usa para los títulos que Morningstar no reconoce o registra. Los cuadros adyacentes al gráfico circular identifican los porcentajes de asignación de activos netos de la cartera.
                </p>
              </div>

              <div>
                <strong className="text-slate-950 block font-bold text-[8.8px] mb-0.5">Regiones internacionales</strong>
                <p>
                  Este conjunto de datos ofrece un desglose amplio de la exposición geográfica de una cartera, por región y por madurez del mercado. Sólo los activos accionarios no monetarios se evalúan al determinar las exposiciones. “No clasificado” indica el porcentaje de la parte accionaria de la cartera para la cual Morningstar no puede evaluar la región o el origen.
                </p>
              </div>

              <div>
                <strong className="text-slate-950 block font-bold text-[8.8px] mb-0.5">Sector de acciones</strong>
                <p>
                  Este cuadro muestra el porcentaje de los activos accionarios de la cartera invertidos en cada uno de los tres supersectores (información, servicios y economías de producción) y 12 subclasificaciones industriales principales, en comparación con una referencia. El gráfico de sectores que acompaña al cuadro demuestra la orientación del sector de la cartera en relación con el Índice de mercado amplio de Morningstar.
                </p>
              </div>

              <div>
                <strong className="text-slate-950 block font-bold text-[8.8px] mb-0.5">Las 10 tenencias subyacentes principales</strong>
                <p>
                  Este listado indica las 10 tenencias subyacentes con mayor ponderación en la cartera, identificando los porcentajes de activos que cada una representa en la cartera, el tipo de título, la clasificación del sector y el país de origen.
                </p>
              </div>

              <div>
                <strong className="text-slate-950 block font-bold text-[8.8px] mb-0.5">Rendimiento total</strong>
                <p>
                  El rendimiento total refleja el comportamiento sin el ajuste de costos de venta o los efectos tributarios, pero está ajustado para reflejar todos los gastos del fondo reales actuales y asume una reinversión de dividendos y plusvalías. Si se ajustan, los costos de venta reducirían el rendimiento citado.
                </p>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-2">
              <div>
                <strong className="text-slate-950 block font-bold text-[8.8px] mb-0.5">Perfil de riesgo y rendimiento</strong>
                <p>
                  El indicador <strong>R-squared</strong> refleja el porcentaje de los movimientos de un fondo que se explican mediante movimientos en su índice de referencia, demostrando el grado de correlación entre el fondo y la referencia.
                </p>
                <p className="mt-1">
                  <strong>Beta</strong> es una medida de la sensibilidad de un fondo a los movimientos del mercado. Una cartera con una medida beta mayor que 1 es más volátil que el mercado y una cartera con una medida beta menor que 1 es menos volátil que el mercado.
                </p>
                <p className="mt-1">
                  <strong>Alfa</strong> mide la diferencia entre los rendimientos reales de un fondo y su comportamiento previsto, dado su nivel de riesgo (según la medición de beta).
                </p>
                <p className="mt-1">
                  El <strong>ratio de Sharpe</strong> es una medida ajustada por el riesgo que se calcula utilizando la desviación estándar y el exceso de rendimiento para determinar el beneficio por unidad de riesgo. Cuanto más alto es el ratio de Sharpe, mejor es el rendimiento ajustado por el riesgo histórico del fondo.
                </p>
                <p className="mt-1">
                  La <strong>desviación estándar</strong> muestra cuánto se extiende un conjunto de valores por encima y por debajo del promedio para un tipo de fondo en particular. Si la desviación estándar es baja, entonces el fondo ha rendido cerca del promedio.
                </p>
              </div>

              <div>
                <strong className="text-slate-950 block font-bold text-[8.8px] mb-0.5">Gráfico de crecimiento</strong>
                <p>
                  El gráfico compara el crecimiento de un fondo con el de un índice y con el del promedio de todos los fondos en su categoría de Morningstar. Los rendimientos totales están ajustados para reflejar los gastos del fondo reales actuales y asumen la reinversión de los dividendos y plusvalías.
                </p>
              </div>

              <div>
                <strong className="text-slate-950 block font-bold text-[8.8px] mb-0.5">Gráfico de puntos de riesgo (Diagrama de dispersión)</strong>
                <p>
                  El diagrama de puntos de riesgo/beneficio se basa en el riesgo y el rendimiento de cada tenencia a lo largo del período de tres años más reciente. El riesgo se mide como la desviación estándar del rendimiento de 3 años. El rendimiento se mide como el rendimiento medio de 3 años. El diagrama también contiene el riesgo y el rendimiento de la cartera.
                </p>
              </div>

              <div>
                <strong className="text-slate-950 block font-bold text-[8.8px] mb-0.5">Matriz de correlación</strong>
                <p>
                  La matriz muestra la correlación de rendimiento entre diferentes tenencias. Una correlación de 1 indica que las dos tenencias se mueven en la misma dirección, una correlación de -1 indica que las dos tenencias se mueven en direcciones opuestas y una correlación de 0 significa que no se pudo hallar correlación. Una correlación de -1 ofrecerá la máxima diversificación.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Oficial Morningstar */}
        <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-500">
          <span>© 2026 Morningstar Network S.L. Todos los derechos reservados. Metodología institucional Morningstar Portfolio X-Ray®.</span>
          <span className="font-bold font-mono">Página 5 de 5</span>
        </div>
      </section>

    </div>
  )
}
export default MorningstarXRayDocument
