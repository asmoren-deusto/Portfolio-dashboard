import { useState, useMemo } from 'react'
import {
  ScanSearch,
  Printer,
  Download,
  Loader2,
  FileSpreadsheet,
  FileText,
  Globe,
  PieChart,
  Layers,
  Building2,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Activity,
  Target,
  Compass,
  X,
  ExternalLink,
} from 'lucide-react'
import { usePositions, type Position } from '@/api/queries'
import { useAppStore } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { downloadExcelReport } from '@/api/export'
import { downloadXRayPdf } from '@/lib/exportXRayPdf'
import { MorningstarXRayDocument } from '@/components/analytics/MorningstarXRayDocument'
import { FundCorrelationMatrixCard } from '@/components/analytics/FundCorrelationMatrixCard'
import { RiskReturnScatterCard } from '@/components/analytics/RiskReturnScatterCard'
import { SuperSectorsTriangleCard } from '@/components/analytics/SuperSectorsTriangleCard'
import { StockOverlapCard } from '@/components/analytics/StockOverlapCard'
import { MptStatsCard } from '@/components/analytics/MptStatsCard'
import { MorningstarPerformanceHistoryCard } from '@/components/analytics/MorningstarPerformanceHistoryCard'
import { WorldMapChoropleth } from '@/components/analytics/WorldMapChoropleth'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import {
  buildPortfolioXRayReport,
  type LookThroughHolding,
  type PortfolioXRayReport,
} from '@/lib/xrayEngine'

type XRayTab = 'overview' | 'performance' | 'overlap' | 'funds' | 'holdings' | 'audit'

export function XRayPage() {
  const { selectedBroker, setSelectedBroker, currentUser } = useAppStore()
  const { data: positions = [], isLoading } = usePositions()
  const [activeTab, setActiveTab] = useState<XRayTab>('overview')
  const [selectedHolding, setSelectedHolding] = useState<LookThroughHolding | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [showMorningstarPreview, setShowMorningstarPreview] = useState(false)

  const brokerLabel = useMemo(() => {
    if (selectedBroker === 'all') return 'Todas las Entidades (Consolidado)'
    if (selectedBroker === 'myinvestor') return 'MyInvestor'
    if (selectedBroker === 'indexa') return 'Indexa Capital'
    if (selectedBroker === 'traderepublic') return 'Trade Republic'
    return selectedBroker
  }, [selectedBroker])

  // Construir el informe X-Ray cuantitativo completo
  const report: PortfolioXRayReport = useMemo(() => {
    return buildPortfolioXRayReport(positions, selectedBroker)
  }, [positions, selectedBroker])

  const handlePrint = () => {
    const originalTitle = document.title
    document.title = 'Morningstar Portfolio X-Ray - Impresión'
    window.print()
    setTimeout(() => {
      document.title = originalTitle
    }, 1500)
  }

  const handleSavePdf = async () => {
    try {
      setIsGeneratingPdf(true)
      await downloadXRayPdf({
        positions,
        broker: selectedBroker,
        clientName: currentUser?.name || 'Inversor',
      })
    } catch (err) {
      console.error('Error al generar PDF directo:', err)
      alert('No se pudo generar el archivo PDF automáticamente. Revisa la consola para más detalles.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true)
      await downloadExcelReport('full', {
        broker: selectedBroker !== 'all' ? selectedBroker : undefined,
        defaultFilename: `Informe_XRay_Cartera_${new Date().toISOString().slice(0, 10)}.xlsx`,
      })
    } catch (err) {
      console.error('Error al exportar a Excel:', err)
    } finally {
      setIsExportingExcel(false)
    }
  }

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
    strengths,
    watchpoints,
    recommendations,
  } = report

  const renderStars = (rating: number) => {
    if (!rating || rating <= 0) return <span className="text-slate-400 font-normal">-</span>
    return (
      <span className="text-amber-500 tracking-[-1px] text-xs font-mono">
        {'★'.repeat(rating)}
        <span className="text-slate-200 dark:text-white/10">{'★'.repeat(Math.max(0, 5 - rating))}</span>
      </span>
    )
  }

  return (
    <div className="w-full">
      {/* ── DOCUMENTO OFICIAL MORNINGSTAR X-RAY (IMPRESIÓN / GENERACIÓN PDF 5 PÁGINAS) ── */}
      <div className="hidden print:block w-full">
        <MorningstarXRayDocument
          report={report}
          brokerLabel={brokerLabel}
          clientName={currentUser?.name || 'Inversor'}
        />
      </div>

      {/* ── VISTA INTERACTIVA WEB DEL INFORME ───────────────────────────── */}
      <div className="print:hidden flex flex-col gap-4 pb-8 w-full">
        {/* ── HEADER BANNER ──────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <ScanSearch size={22} className="stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white leading-tight">
                  Informe X-Ray de Cartera
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Morningstar Look-Through
                </span>
              </div>

              {/* Subtítulo a la izquierda y Controles centrados en altura a la derecha */}
              <div className="mt-1.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Descomposición analítica completa: activos, estilo de inversión, supersectores macro, rendimiento histórico MPT, solapamiento de acciones e inventario de fondos.
                </p>

                {/* Action Controls & Entity Filter (centrados en altura con el subtítulo) */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Selector de Entidad */}
                  <div className="h-9 inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setSelectedBroker('all')}
                      className={cn(
                        'px-2.5 h-7 rounded-lg transition-all cursor-pointer text-xs font-semibold flex items-center justify-center',
                        selectedBroker === 'all'
                          ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white font-bold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      Todas
                    </button>
                    {['myinvestor', 'indexa', 'traderepublic'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBroker(b)}
                        className={cn(
                          'px-2.5 h-7 rounded-lg transition-all cursor-pointer text-xs font-semibold capitalize flex items-center justify-center',
                          selectedBroker === b
                            ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white font-bold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        )}
                      >
                        {b === 'traderepublic' ? 'Trade Rep.' : b}
                      </button>
                    ))}
                  </div>

                  {/* Botón Vista Previa PDF Morningstar */}
                  <button
                    type="button"
                    onClick={() => setShowMorningstarPreview(true)}
                    title="Ver informe oficial estilo Morningstar Portfolio X-Ray"
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-700 dark:text-red-400 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#C8102E]" />
                    <span>PDF Morningstar</span>
                  </button>

                  {/* Botón Descargar Excel */}
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                    title="Descargar libro Excel (.xlsx) completo de cartera"
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>

      {/* ── KPI EXECUTIVE STRIP ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 print:grid-cols-6">
        {/* 1. Valor Analizado */}
        <Card className="p-3.5 sm:p-4">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            Patrimonio X-Ray
          </span>
          <div className="font-mono font-bold text-base sm:text-lg text-slate-950 dark:text-white mt-1 truncate">
            {fmt.currency(summary.totalValue)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            {summary.numPositions} posiciones activas
          </span>
        </Card>

        {/* 2. Score de Diversificación */}
        <Card className="p-3.5 sm:p-4">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            Salud de Cartera
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="font-mono font-extrabold text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
              {summary.healthScore}/100
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              {summary.healthScoreLabel}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            Score multivariable
          </span>
        </Card>

        {/* 3. TER Medio Ponderado */}
        <Card className="p-3.5 sm:p-4">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            TER Medio Ponderado
          </span>
          <div className="font-mono font-bold text-base sm:text-lg text-indigo-600 dark:text-indigo-400 mt-1 truncate">
            {summary.weightedTer.toFixed(2)}% <span className="text-xs font-normal text-slate-400">/año</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            Coste: {fmt.currency(summary.annualFeeCostEur)}/año
          </span>
        </Card>

        {/* 4. Volatilidad Anualizada */}
        <Card className="p-3.5 sm:p-4">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            Volatilidad Estimada
          </span>
          <div className="font-mono font-bold text-base sm:text-lg text-slate-950 dark:text-white mt-1 truncate">
            ±{summary.expectedVolatility.toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            Max Drawdown: {summary.maxDrawdown.toFixed(1)}%
          </span>
        </Card>

        {/* 5. Sharpe Ratio */}
        <Card className="p-3.5 sm:p-4">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            Ratio de Sharpe
          </span>
          <div className="font-mono font-bold text-base sm:text-lg text-slate-950 dark:text-white mt-1 truncate">
            {summary.sharpeRatio.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block truncate">
            Eficiencia alta (&gt;1.0)
          </span>
        </Card>

        {/* 6. PER Ponderado & Dividendo */}
        <Card className="p-3.5 sm:p-4">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            PER / P/VC / P/CF
          </span>
          <div className="font-mono font-bold text-base sm:text-lg text-slate-950 dark:text-white mt-1 truncate">
            {summary.weightedPe.toFixed(1)}x <span className="text-xs font-normal text-slate-400">· {summary.weightedPb.toFixed(1)}x P/VC</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            P/CashFlow: {summary.weightedPcf.toFixed(1)}x
          </span>
        </Card>
      </div>

      {/* ── SUB-TABS NAVIGATION ────────────────────────────────────────── */}
      <Card className="p-1.5 overflow-x-auto no-scrollbar print:hidden">
        <div className="flex items-center gap-1.5 min-w-max">
        {[
          { id: 'overview', label: 'Radiografía & SuperSectores', icon: Layers },
          { id: 'performance', label: 'Rendimiento & Riesgo MPT', icon: TrendingUp },
          { id: 'overlap', label: `Solapamiento de Acciones (${stockOverlap.length})`, icon: Cpu },
          { id: 'funds', label: `Posiciones de Cartera (${fundPositions.length})`, icon: Building2 },
          { id: 'holdings', label: `Top 25 Holdings (${topHoldings.length})`, icon: Globe },
          { id: 'audit', label: 'Auditoría & Diagnóstico', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as XRayTab)}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
                active
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
        </div>
      </Card>

      {/* ── MAIN CONTENT SECTIONS ───────────────────────────────────────── */}
      <div className="space-y-6">

        {/* TAB 1: OVERVIEW & SUPERSECTORES */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* FILA 1 - IZQUIERDA (4 cols): Asignación Real de Activos */}
              <div className="lg:col-span-4 flex flex-col min-h-0">
                <Card className="p-4 sm:p-4.5 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-200/70 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-violet-500" />
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          Asignación Real de Activos
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        Total {fmt.currency(summary.totalValue)}
                      </span>
                    </div>

                    {/* Stacked Allocation Progress Bar */}
                    <div className="mt-3 sm:mt-3.5">
                      <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-white/10 shadow-inner">
                        {assetAllocation.map((item) => (
                          <div
                            key={item.id}
                            style={{ width: `${item.weight}%`, backgroundColor: item.color }}
                            title={`${item.label}: ${item.weight.toFixed(1)}% (${fmt.currency(item.value)})`}
                            className="h-full transition-all duration-300 hover:opacity-85"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Listado de Clases de Activo con Port vs Benchmark */}
                    <div className="mt-3 space-y-1.5 text-xs">
                      {assetAllocation.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-[#252528] border border-slate-200/60 dark:border-white/[0.04]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-xs">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                            <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
                              {fmt.currency(item.value)}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white w-14 text-right text-xs">
                              {item.weight.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* FILA 1 - DERECHA (8 cols): Triángulo de SuperSectores (Misma altura exacta que Asignación de Activos) */}
              <div className="lg:col-span-8 flex flex-col min-h-0">
                <SuperSectorsTriangleCard data={superSectorsDetail} className="h-full" />
              </div>

              {/* FILA 2 - IZQUIERDA (4 cols): Morningstar Style Box 3x3 */}
              <div className="lg:col-span-4 flex flex-col min-h-0">
                <Card className="p-5 sm:p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          Morningstar Equity Style Box™
                        </h3>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                        {styleBox.dominantLabel}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2.5">
                      Descomposición de la renta variable según capitalización de mercado (Large, Mid, Small) y estilo de inversión (Value, Blend, Growth).
                    </p>

                    {/* Matriz de Estilo Interactiva (centrada equilibrada sin cortes de texto) */}
                    <div className="mt-3.5 w-full max-w-[340px] sm:max-w-[360px] mx-auto">
                      <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-1.5 sm:gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 pb-1.5">
                        <div></div>
                        <div className="uppercase tracking-wider text-[11px]">Valor</div>
                        <div className="uppercase tracking-wider text-[11px]">Mixto</div>
                        <div className="uppercase tracking-wider text-[11px]">Crec.</div>
                      </div>

                      {/* Row 1: Large Cap */}
                      <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-1.5 sm:gap-2 mb-1.5 items-center">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 text-left">Grande</div>
                        <div className="h-12 sm:h-13 rounded-xl border flex flex-col items-center justify-center p-1 bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-200/60 dark:border-indigo-500/20">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{styleBox.largeValue}%</span>
                          <span className="text-[9px] text-slate-400">Large Value</span>
                        </div>
                        <div className="h-12 sm:h-13 rounded-xl border flex flex-col items-center justify-center p-1 bg-indigo-600 text-white border-indigo-700 shadow-sm">
                          <span className="font-mono font-bold text-sm">{styleBox.largeBlend}%</span>
                          <span className="text-[9px] text-indigo-100">Large Blend</span>
                        </div>
                        <div className="h-12 sm:h-13 rounded-xl border flex flex-col items-center justify-center p-1 bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-200/60 dark:border-indigo-500/20">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{styleBox.largeGrowth}%</span>
                          <span className="text-[9px] text-slate-400">Large Growth</span>
                        </div>
                      </div>

                      {/* Row 2: Mid Cap */}
                      <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-1.5 sm:gap-2 mb-1.5 items-center">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 text-left">Mediana</div>
                        <div className="h-10 sm:h-11 rounded-xl border flex flex-col items-center justify-center p-1 bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{styleBox.midValue}%</span>
                        </div>
                        <div className="h-10 sm:h-11 rounded-xl border flex flex-col items-center justify-center p-1 bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{styleBox.midBlend}%</span>
                        </div>
                        <div className="h-10 sm:h-11 rounded-xl border flex flex-col items-center justify-center p-1 bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{styleBox.midGrowth}%</span>
                        </div>
                      </div>

                      {/* Row 3: Small Cap */}
                      <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-1.5 sm:gap-2 mb-1.5 items-center">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 text-left">Pequeña</div>
                        <div className="h-10 sm:h-11 rounded-xl border flex flex-col items-center justify-center p-1 bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{styleBox.smallValue}%</span>
                        </div>
                        <div className="h-10 sm:h-11 rounded-xl border flex flex-col items-center justify-center p-1 bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{styleBox.smallBlend}%</span>
                        </div>
                        <div className="h-10 sm:h-11 rounded-xl border flex flex-col items-center justify-center p-1 bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{styleBox.smallGrowth}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Style Metrics Strip (reducido en altura al mínimo según indicación) */}
                  <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-center text-xs">
                    <div className="py-0.5 px-1 rounded-md bg-slate-50/70 dark:bg-white/[0.02]">
                      <span className="text-slate-400 block text-[9px] leading-tight">P/Valor Cont.</span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block mt-0.5">{styleBox.priceToBook}x</span>
                    </div>
                    <div className="py-0.5 px-1 rounded-md bg-slate-50/70 dark:bg-white/[0.02]">
                      <span className="text-slate-400 block text-[9px] leading-tight">PER</span>
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 block mt-0.5">{styleBox.priceToEarnings}x</span>
                    </div>
                    <div className="py-0.5 px-1 rounded-md bg-slate-50/70 dark:bg-white/[0.02]">
                      <span className="text-slate-400 block text-[9px] leading-tight">P/CashFlow</span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block mt-0.5">{styleBox.priceToCashFlow}x</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* FILA 2 - DERECHA (8 cols): Exposición por País % (en 2 columnas para 10 países) */}
              <div className="lg:col-span-8 flex flex-col min-h-0">
                <Card className="p-5 sm:p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-5 h-5 text-blue-500" />
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                            Exposición por País %
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Distribución geográfica ponderada de la renta variable subyacente
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                        Top 10 Países
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {topCountries.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#252528] border border-slate-200/60 dark:border-white/[0.04]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{c.flag}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{c.country}</span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="w-16 sm:w-20 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, c.actionWeight * 1.6)}%` }} />
                            </div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white w-12 text-right">
                              {c.actionWeight.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Desglose Regional Jerárquico Oficial con Mapamundi Coroplético */}
            <Card className="p-5 sm:p-6 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.06] gap-2">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                      Desglose por Regiones %
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Mapa coroplético institucional y asignación jerárquica por bloques económicos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-mono self-start sm:self-auto">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#ffedd5] border border-amber-300" /> &lt;10%</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#fdba74] border border-orange-400" /> 10-25%</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#fb923c] border border-orange-500" /> 25-50%</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#ea580c] border border-orange-700" /> &gt;50%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 items-start">
                {/* Mapamundi Coroplético (4 cols) */}
                <div className="lg:col-span-4 flex flex-col items-center">
                  <div className="w-full h-44 sm:h-48 rounded-xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] shadow-2xs">
                    <WorldMapChoropleth
                      className="w-full h-full"
                      northAmericaWeight={
                        (regionalBreakdown.america?.subregions?.find((s) => s.name === 'Estados Unidos')?.actionWeight ?? 56.06) +
                        (regionalBreakdown.america?.subregions?.find((s) => s.name === 'Canada')?.actionWeight ?? 1.73)
                      }
                      latinAmericaWeight={
                        regionalBreakdown.america?.subregions?.find((s) => s.name.includes('América Latina'))?.actionWeight ?? 2.13
                      }
                      europeWeight={regionalBreakdown.europa?.actionWeight ?? 19.07}
                      africaMiddleEastWeight={
                        regionalBreakdown.europa?.subregions?.find((s) => s.name.includes('Oriente Medio'))?.actionWeight ?? 0.91
                      }
                      asiaWeight={
                        (regionalBreakdown.asia?.subregions?.find((s) => s.name === 'Japón')?.actionWeight ?? 11.02) +
                        (regionalBreakdown.asia?.subregions?.find((s) => s.name.includes('4 tigres'))?.actionWeight ?? 5.56) +
                        (regionalBreakdown.asia?.subregions?.find((s) => s.name.includes('Emergente'))?.actionWeight ?? 3.44)
                      }
                      australasiaWeight={
                        regionalBreakdown.asia?.subregions?.find((s) => s.name === 'Australasia')?.actionWeight ?? 0.42
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between w-full mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono px-1">
                    <span>No clasificados: <strong className="text-slate-800 dark:text-slate-200">0,57%</strong></span>
                    <span>Consolidado Morningstar</span>
                  </div>
                </div>

                {/* Tablas Jerárquicas Regionales (8 cols) */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Europa */}
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-300 dark:border-white/10 font-bold">
                      <span className="text-slate-900 dark:text-white">Europa</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                        {regionalBreakdown.europa.actionWeight.toFixed(2)}%
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {regionalBreakdown.europa.subregions.map((sub, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                          <span className="truncate pr-1">{sub.name}</span>
                          <span className="font-mono text-slate-900 dark:text-slate-200 shrink-0 font-medium">
                            {sub.actionWeight.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* América */}
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-300 dark:border-white/10 font-bold">
                      <span className="text-slate-900 dark:text-white">América</span>
                      <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">
                        {regionalBreakdown.america.actionWeight.toFixed(2)}%
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {regionalBreakdown.america.subregions.map((sub, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                          <span className="truncate pr-1">{sub.name}</span>
                          <span className="font-mono text-slate-900 dark:text-slate-200 shrink-0 font-medium">
                            {sub.actionWeight.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Asia */}
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-300 dark:border-white/10 font-bold">
                      <span className="text-slate-900 dark:text-white">Asia</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {regionalBreakdown.asia.actionWeight.toFixed(2)}%
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {regionalBreakdown.asia.subregions.map((sub, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                          <span className="truncate pr-1">{sub.name}</span>
                          <span className="font-mono text-slate-900 dark:text-slate-200 shrink-0 font-medium">
                            {sub.actionWeight.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Acceso Directo a Rendimiento Histórico 10k & MPT */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-red-500/10 via-indigo-500/10 to-transparent border border-red-500/20 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-[#C8102E] dark:text-red-400 border border-red-500/20 shrink-0">
                  <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Histórico de Rentabilidad & Crecimiento de 10.000 €
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Crecimiento multi-ciclo (+4,08x), rentabilidad trimestral vs benchmark y estadísticas MPT completas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('performance')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <span>Ver Rendimiento X-Ray</span>
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: RENDIMIENTO & RIESGO MPT */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Histórico Completo de Rentabilidad & Crecimiento 10k (Morningstar X-Ray Page 2) */}
            <MorningstarPerformanceHistoryCard performance={performance} />

            {/* Scatter Plot & Matriz de Correlación */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <RiskReturnScatterCard points={performance.scatterPoints} />
              <FundCorrelationMatrixCard funds={performance.correlationFunds} matrix={performance.correlationMatrix} />
            </div>

            {/* Estadísticas MPT */}
            <MptStatsCard stats={performance.mptStats} />
          </div>
        )}

        {/* TAB 3: SOLAPAMIENTO DE ACCIONES */}
        {activeTab === 'overlap' && (
          <StockOverlapCard items={stockOverlap} />
        )}

        {/* TAB 4: POSICIONES DE CARTERA */}
        {activeTab === 'funds' && (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3.5 border-b border-slate-200/70 dark:border-white/[0.06]">
              <div className="flex items-start sm:items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-500 mt-0.5 sm:mt-0 shrink-0" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    Inventario de Posiciones de Cartera
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Fondos y activos con rating de estrellas Morningstar, TER anual y rentabilidad acumulada
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 self-start sm:self-end">
                {fundPositions.length} Fondos Auditados
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="text-left py-2">Fondo / Posición</th>
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-left py-2">Fecha Cartera</th>
                    <th className="text-center py-2">Rating Morningstar</th>
                    <th className="text-right py-2">1 Año</th>
                    <th className="text-right py-2">3 Años Anual.</th>
                    <th className="text-right py-2">5 Años Anual.</th>
                    <th className="text-right py-2">TER (%)</th>
                    <th className="text-right py-2">Peso (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {fundPositions.map((f) => {
                    const matchingPos = positions.find((p) => p.isin === f.isin || p.name === f.name)
                    return (
                      <tr
                        key={f.id}
                        onClick={() => matchingPos && setSelectedPosition(matchingPos)}
                        className={cn(
                          'hover:bg-slate-50/80 dark:hover:bg-white/[0.035] transition-colors select-none',
                          matchingPos && 'cursor-pointer'
                        )}
                        title={matchingPos ? 'Haz clic para ver el desglose completo del fondo' : undefined}
                      >
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2.5">
                            <CompanyLogo
                              isin={f.isin}
                              name={f.name}
                              size="sm"
                              className="w-8 h-8 rounded-xl shrink-0 shadow-2xs border border-slate-200/60 dark:border-white/10"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white block truncate">{f.name}</span>
                              <span className="font-mono text-[10px] text-slate-400 block">{f.isin}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">{f.type}</td>
                        <td className="py-3 font-mono text-slate-500">{f.portfolioDate}</td>
                        <td className="py-3 text-center">{renderStars(f.morningstarRating)}</td>
                        <td className="py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          +{f.return1y.toFixed(2)}%
                        </td>
                        <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">
                          {f.return3yAnn !== null ? `+${f.return3yAnn.toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200">
                          {f.return5yAnn !== null ? `+${f.return5yAnn.toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {f.ongoingChargesTer.toFixed(2)}%
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-950 dark:text-white">
                          {f.portfolioWeight.toFixed(2)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 5: TOP HOLDINGS LOOK-THROUGH */}
        {activeTab === 'holdings' && (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3.5 border-b border-slate-200/70 dark:border-white/[0.06]">
              <div className="flex items-start sm:items-center gap-2.5">
                <Globe className="w-5 h-5 text-indigo-500 mt-0.5 sm:mt-0 shrink-0" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    Top 25 Look-Through Holdings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Las 25 mayores empresas subyacentes agregadas sumando su peso en todos tus fondos
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono shrink-0 self-start sm:self-end">
                {topHoldings.slice(0, 25).reduce((acc, h) => acc + h.portfolioWeight, 0).toFixed(1)}% Cartera Total
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1">
              {topHoldings.map((h, idx) => (
                <div
                  key={h.id}
                  onClick={() => setSelectedHolding(h)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedHolding(h)
                    }
                  }}
                  className="py-2.5 px-3 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-white/[0.04] rounded-xl transition-all cursor-pointer group select-none border border-transparent hover:border-slate-200/60 dark:hover:border-white/10"
                  title="Haz clic para ver el desglose detallado de esta compañía en tus fondos"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                    <span className="font-mono text-xs font-bold text-slate-400 w-5 sm:w-6 text-center shrink-0">
                      #{idx + 1}
                    </span>
                    <CompanyLogo
                      isin={h.isin}
                      ticker={h.ticker}
                      name={h.name}
                      size="sm"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shrink-0 shadow-2xs border border-slate-200/60 dark:border-white/10"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="font-bold text-slate-900 dark:text-white truncate text-xs sm:text-[13px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {h.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden sm:inline">{h.isin}</span>
                      </div>
                      <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate">
                        {h.flag} {h.country} · {h.sector}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <span className="font-mono font-bold text-xs sm:text-sm text-blue-700 dark:text-blue-400 block">
                        {h.portfolioWeight.toFixed(2)}%
                      </span>
                      <span className="text-[10px] sm:text-[10.5px] font-mono text-slate-400 block">
                        {fmt.currency(h.portfolioValue)}
                      </span>
                    </div>
                    <ExternalLink size={14} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0 ml-1" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* TAB 6: AUDITORÍA Y RECOMENDACIONES */}
        {activeTab === 'audit' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Puntos Fuertes */}
            <Card className="p-5 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 pb-3 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Puntos Fuertes de la Cartera</span>
              </div>
              <ul className="mt-3.5 space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                {strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Puntos de Atención */}
            <Card className="p-5 border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 pb-3 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Puntos de Atención / Riesgo</span>
              </div>
              <ul className="mt-3.5 space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                {watchpoints.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Recomendaciones Operativas */}
            <Card className="p-5 border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10">
              <div className="flex items-center gap-2 pb-3 border-b border-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Recomendaciones Cuantitativas</span>
              </div>
              <ul className="mt-3.5 space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* Footer Notice */}
        <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 print:text-black">
          <span>
            Metodología cuantitativa Morningstar Look-Through oficial agregada con pesos de participaciones directas.
          </span>
          <span>
            Generado: {report.generatedAt} · Moneda base: EUR (€)
          </span>
        </div>

      </div>
      </div>

      {/* ── MODAL DETALLE DE COMPAÑÍA SUBYACENTE ───────────────────────── */}
      {selectedHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs print:hidden">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#202023] border border-slate-200 dark:border-white/10 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <CompanyLogo
                  isin={selectedHolding.isin}
                  ticker={selectedHolding.ticker}
                  name={selectedHolding.name}
                  size="md"
                  className="w-10 h-10 rounded-2xl shrink-0 shadow-2xs border border-slate-200/60 dark:border-white/10"
                />
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedHolding.name}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedHolding.flag} {selectedHolding.country} · {selectedHolding.sector} · {selectedHolding.isin}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHolding(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-400 block text-[11px]">Peso Total en Cartera</span>
                  <span className="font-mono font-bold text-lg text-slate-950 dark:text-white mt-0.5 block">
                    {selectedHolding.portfolioWeight.toFixed(2)}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-400 block text-[11px]">Valor Efectivo</span>
                  <span className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                    {fmt.currency(selectedHolding.portfolioValue)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  ¿A través de qué fondos tienes esta empresa?
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedHolding.contributingFunds.map((cf, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <CompanyLogo
                          isin={cf.fundIsin}
                          name={cf.fundName}
                          size="xs"
                          className="w-6 h-6 rounded-lg shrink-0 border border-slate-200/60 dark:border-white/10"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-white block truncate">
                            {cf.fundName}
                          </span>
                          <span className="text-[10.5px] font-mono text-slate-400 block">
                            {cf.fundIsin} · {cf.fundWeightInHolding.toFixed(2)}% del fondo
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {fmt.currency(summary.totalValue * (cf.fundPortfolioWeight / 100) * (cf.fundWeightInHolding / 100))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHolding(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL VISTA PREVIA MORNINGSTAR PDF (5 PÁGINAS COMPLETAS) ────── */}
      {showMorningstarPreview && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-150 print:hidden">
          {/* Top Bar Controls */}
          <div className="h-14 bg-white dark:bg-[#18181b] border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center text-sm font-black tracking-tight text-slate-900 dark:text-white font-sans">
                <span>M</span>
                <span className="relative inline-flex items-center justify-center w-3 h-3 mx-[1px]">
                  <span className="w-3 h-3 rounded-full border-[2px] border-slate-900 dark:border-white" />
                  <span className="absolute w-1 h-1 rounded-full bg-[#C8102E]" />
                </span>
                <span>RNINGSTAR</span>
              </div>
              <span className="text-slate-300 dark:text-white/20">|</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Informe Oficial: Morningstar Portfolio X-Ray®
              </span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                5 Páginas A4 (Completo)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Botón Imprimir (Nativo vía motor de impresión del navegador) */}
              <button
                type="button"
                onClick={handlePrint}
                title="Abre el diálogo de impresión: selecciona 'Guardar como PDF' para obtener un documento 100% VECTORIAL con texto seleccionable y zoom infinito sin distorsión"
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir (Nativo)</span>
              </button>

              {/* Botón Descarga Directa .PDF (300 DPI Lossless PNG) */}
              <button
                type="button"
                onClick={handleSavePdf}
                disabled={isGeneratingPdf}
                title="Descargar archivo PDF directamente a 300 DPI sin deformación de proporción"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#252528] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#C8102E]" />
                )}
                <span>{isGeneratingPdf ? 'Generando...' : 'Descarga Directa (.PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMorningstarPreview(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ml-0.5"
                title="Cerrar vista previa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Banner informativo de fidelidad vectorial */}
          <div className="bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200/80 dark:border-white/10 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 shrink-0">
            <span>
              💡 <strong>Máxima fidelidad:</strong> Para obtener un PDF <strong>100% vectorial</strong> (con texto seleccionable y curvas matemáticas sin pixelado al ampliar), pulsa <strong>"Imprimir (Nativo)"</strong> y elige <em>"Guardar como PDF"</em> en tu navegador.
            </span>
          </div>

          {/* Paper Canvas Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center gap-6 bg-slate-200/90 dark:bg-[#111113]">
            <div id="morningstar-pdf-canvas" className="w-full max-w-[210mm] shadow-2xl rounded-sm overflow-hidden bg-white">
              <MorningstarXRayDocument
                report={report}
                brokerLabel={brokerLabel}
                clientName={currentUser?.name || 'Inversor'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Desglose Completo de Fondo / Posición */}
      <PositionDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}

export default XRayPage
