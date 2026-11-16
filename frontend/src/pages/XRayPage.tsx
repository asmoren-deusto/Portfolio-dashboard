import { useState, useMemo } from 'react'
import {
  ScanSearch,
  Printer,
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
  X,
  ExternalLink,
} from 'lucide-react'
import { usePositions } from '@/api/queries'
import { useAppStore } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { downloadExcelReport } from '@/api/export'
import { MorningstarXRayDocument } from '@/components/analytics/MorningstarXRayDocument'
import {
  buildPortfolioXRayReport,
  type LookThroughHolding,
  type PortfolioXRayReport,
} from '@/lib/xrayEngine'

type XRayTab = 'overview' | 'holdings' | 'stylebox' | 'geo_sectors' | 'audit'

export function XRayPage() {
  const storeBroker = useAppStore((s) => s.selectedBroker)
  const currentUser = useAppStore((s) => s.currentUser)
  const { data: positions = [], isLoading } = usePositions()
  const [selectedBroker, setSelectedBroker] = useState<string>(storeBroker || 'all')
  const [activeTab, setActiveTab] = useState<XRayTab>('overview')
  const [selectedHolding, setSelectedHolding] = useState<LookThroughHolding | null>(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [showMorningstarPreview, setShowMorningstarPreview] = useState(false)

  const brokerLabel = useMemo(() => {
    if (selectedBroker === 'all') return 'Todas las Entidades (Consolidado)'
    if (selectedBroker === 'myinvestor') return 'MyInvestor'
    if (selectedBroker === 'indexa') return 'Indexa Capital'
    if (selectedBroker === 'traderepublic') return 'Trade Republic'
    return selectedBroker
  }, [selectedBroker])

  // Construir el informe X-Ray cuantitativo
  const report: PortfolioXRayReport = useMemo(() => {
    return buildPortfolioXRayReport(positions, selectedBroker)
  }, [positions, selectedBroker])

  const handlePrint = () => {
    window.print()
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
    styleBox,
    topHoldings,
    geographicExposure,
    sectorExposure,
    superSectors,
    strengths,
    watchpoints,
    recommendations,
  } = report

  return (
    <div className="w-full">
      {/* ── DOCUMENTO OFICIAL MORNINGSTAR X-RAY (IMPRESIÓN / GENERACIÓN PDF) ── */}
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
        <Card className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-5">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <ScanSearch size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white leading-tight">
                  Informe X-Ray de Cartera
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Morningstar Look-Through
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Descomposición analítica en profundidad: empresas subyacentes, estilo 3x3, geografía y sectores reales.
              </p>
            </div>
          </div>

          {/* Action Controls & Entity Filter */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start xl:self-center">
            {/* Selector de Entidad */}
            <div className="h-8 inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedBroker('all')}
                className={cn(
                  'px-2.5 h-7 rounded-md transition-all cursor-pointer text-xs font-semibold flex items-center justify-center',
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
                    'px-2.5 h-7 rounded-md transition-all cursor-pointer text-xs font-semibold capitalize flex items-center justify-center',
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
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-700 dark:text-red-400 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#C8102E]" />
              <span>PDF Morningstar</span>
            </button>

            {/* Botón Imprimir / Guardar PDF */}
            <button
              type="button"
              onClick={handlePrint}
              title="Imprimir o guardar como PDF en formato oficial Morningstar"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200/70 dark:border-white/[0.08] bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-500" />
              <span>Imprimir / PDF</span>
            </button>

            {/* Botón Descargar Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              title="Descargar libro Excel (.xlsx) completo de cartera"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>
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
            PER Medio / Div. Yield
          </span>
          <div className="font-mono font-bold text-base sm:text-lg text-slate-950 dark:text-white mt-1 truncate">
            {summary.weightedPe.toFixed(1)}x <span className="text-xs font-normal text-slate-400">· {summary.dividendYieldEst.toFixed(2)}%</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            P/VC: {summary.weightedPb.toFixed(1)}x
          </span>
        </Card>
      </div>

      {/* ── SUB-TABS NAVIGATION ────────────────────────────────────────── */}
      <Card className="p-1.5 overflow-x-auto no-scrollbar print:hidden">
        <div className="flex items-center gap-1.5 min-w-max">
        {[
          { id: 'overview', label: 'Resumen & Estilo Box', icon: Layers },
          { id: 'holdings', label: `Look-Through Top Holdings (${topHoldings.length})`, icon: Building2 },
          { id: 'stylebox', label: 'Morningstar Style Box 3x3', icon: PieChart },
          { id: 'geo_sectors', label: 'Geografía & Sectores vs MSCI', icon: Globe },
          { id: 'audit', label: 'Auditoría & Recomendaciones', icon: ShieldCheck },
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
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
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

        {/* TAB 1: OVERVIEW & STYLE BOX */}
        {(activeTab === 'overview' || activeTab === 'stylebox') && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Left: Asignación de Activos (40% / 5 cols) */}
              <Card className="lg:col-span-5 p-5 sm:p-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <PieChart className="w-5 h-5 text-violet-500" />
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Asignación Real de Activos
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Total {fmt.currency(summary.totalValue)}
                  </span>
                </div>

                {/* Stacked Allocation Progress Bar */}
                <div className="mt-5">
                  <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-white/10 shadow-inner">
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

                {/* Listado de Clases de Activo */}
                <div className="mt-5 space-y-2.5">
                  {assetAllocation.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-[#252528] border border-slate-200/60 dark:border-white/[0.04]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">
                          {fmt.currency(item.value)}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white w-14 text-right">
                          {item.weight.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  💡 <strong>Estructura Patrimonial:</strong> Cartera con perfil marcadamente <strong>Crecimiento / Renta Variable</strong> ({assetAllocation.find((a) => a.id === 'equity')?.weight.toFixed(1)}%), complementada con reservas de liquidez y activos de cobertura.
                </div>
              </Card>

              {/* Right: Morningstar Style Box 3x3 (60% / 7 cols) */}
              <Card className="lg:col-span-7 p-5 sm:p-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Morningstar Equity Style Box™ (3x3)
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                    {styleBox.dominantLabel}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2.5">
                  Descomposición de la renta variable según capitalización de mercado (Large, Mid, Small) y estilo de inversión (Value, Blend, Growth).
                </p>

                {/* Matriz 3x3 Interactiva */}
                <div className="mt-5 max-w-md mx-auto">
                  {/* Column Header Titles */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 pb-1.5">
                    <div></div>
                    <div className="uppercase tracking-wider">Valor</div>
                    <div className="uppercase tracking-wider">Mixto</div>
                    <div className="uppercase tracking-wider">Crec.</div>
                  </div>

                  {/* Row 1: Large Cap */}
                  <div className="grid grid-cols-4 gap-2 mb-2 items-center">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 text-right pr-2">
                      Grande
                    </div>
                    {/* Large Value */}
                    <div
                      className="h-16 sm:h-18 rounded-2xl border flex flex-col items-center justify-center p-1.5 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.largeValue / 100)})`,
                        borderColor: styleBox.largeValue > 15 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {styleBox.largeValue.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Large Value</span>
                    </div>
                    {/* Large Blend */}
                    <div
                      className="h-16 sm:h-18 rounded-2xl border flex flex-col items-center justify-center p-1.5 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.largeBlend / 100)})`,
                        borderColor: styleBox.largeBlend > 15 ? 'rgba(99, 102, 241, 0.5)' : 'rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {styleBox.largeBlend.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Large Blend</span>
                    </div>
                    {/* Large Growth */}
                    <div
                      className="h-16 sm:h-18 rounded-2xl border flex flex-col items-center justify-center p-1.5 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.largeGrowth / 100)})`,
                        borderColor: styleBox.largeGrowth > 15 ? 'rgba(99, 102, 241, 0.6)' : 'rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {styleBox.largeGrowth.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Large Growth</span>
                    </div>
                  </div>

                  {/* Row 2: Mid Cap */}
                  <div className="grid grid-cols-4 gap-2 mb-2 items-center">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 text-right pr-2">
                      Mediana
                    </div>
                    {/* Mid Value */}
                    <div
                      className="h-14 sm:h-16 rounded-2xl border flex flex-col items-center justify-center p-1 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.midValue / 100)})`,
                        borderColor: styleBox.midValue > 10 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {styleBox.midValue.toFixed(1)}%
                      </span>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400">Mid Value</span>
                    </div>
                    {/* Mid Blend */}
                    <div
                      className="h-14 sm:h-16 rounded-2xl border flex flex-col items-center justify-center p-1 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.midBlend / 100)})`,
                        borderColor: styleBox.midBlend > 10 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {styleBox.midBlend.toFixed(1)}%
                      </span>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400">Mid Blend</span>
                    </div>
                    {/* Mid Growth */}
                    <div
                      className="h-14 sm:h-16 rounded-2xl border flex flex-col items-center justify-center p-1 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.midGrowth / 100)})`,
                        borderColor: styleBox.midGrowth > 10 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {styleBox.midGrowth.toFixed(1)}%
                      </span>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400">Mid Growth</span>
                    </div>
                  </div>

                  {/* Row 3: Small Cap */}
                  <div className="grid grid-cols-4 gap-2 items-center">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 text-right pr-2">
                      Pequeña
                    </div>
                    {/* Small Value */}
                    <div
                      className="h-14 sm:h-16 rounded-2xl border flex flex-col items-center justify-center p-1 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.smallValue / 100)})`,
                        borderColor: styleBox.smallValue > 5 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {styleBox.smallValue.toFixed(1)}%
                      </span>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400">Small Value</span>
                    </div>
                    {/* Small Blend */}
                    <div
                      className="h-14 sm:h-16 rounded-2xl border flex flex-col items-center justify-center p-1 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.smallBlend / 100)})`,
                        borderColor: styleBox.smallBlend > 5 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {styleBox.smallBlend.toFixed(1)}%
                      </span>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400">Small Blend</span>
                    </div>
                    {/* Small Growth */}
                    <div
                      className="h-14 sm:h-16 rounded-2xl border flex flex-col items-center justify-center p-1 transition-all shadow-2xs"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.smallGrowth / 100)})`,
                        borderColor: styleBox.smallGrowth > 5 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {styleBox.smallGrowth.toFixed(1)}%
                      </span>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400">Small Growth</span>
                    </div>
                  </div>
                </div>

                {/* Resumen del Centroide */}
                <div className="mt-5 pt-3.5 border-t border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {styleBox.summaryText}
                  </span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: LOOK-THROUGH TOP HOLDINGS */}
        {(activeTab === 'overview' || activeTab === 'holdings') && (
          <Card className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                    Mayores Compañías Subyacentes (Look-Through Holdings)
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Transparencia agregada: qué empresas posees en total a través de tus fondos indexados, fondos activos y acciones.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Top 15 posiciones representan el{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {topHoldings.reduce((sum, h) => sum + h.portfolioWeight, 0).toFixed(1)}%
                </strong>{' '}
                de tu patrimonio
              </span>
            </div>

            {/* Tabla de Look-Through Holdings */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#252528]/50">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/90 dark:border-white/[0.06] bg-slate-100/80 dark:bg-[#252528] text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-3.5">#</th>
                    <th className="py-3 px-3.5">Compañía / Ticker</th>
                    <th className="py-3 px-3.5">Sector</th>
                    <th className="py-3 px-3.5">País</th>
                    <th className="py-3 px-3.5 text-right">Peso en Cartera</th>
                    <th className="py-3 px-3.5 text-right">Valor Efectivo</th>
                    <th className="py-3 px-3.5">Fondos Aportantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04] bg-white dark:bg-[#1e1e1e]">
                  {topHoldings.map((h, idx) => (
                    <tr
                      key={h.id}
                      className="hover:bg-indigo-50/40 dark:hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => setSelectedHolding(selectedHolding?.id === h.id ? null : h)}
                    >
                      <td className="py-3 px-3.5 font-mono text-slate-400 text-xs w-9">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                            {h.ticker}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                            {h.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 font-medium text-xs"
                          style={{ color: h.sectorColor }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: h.sectorColor }}
                          />
                          {h.sector}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">
                        <span className="mr-1.5">{h.flag}</span> {h.country}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min(100, (h.portfolioWeight / 8) * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-950 dark:text-white">
                            {h.portfolioWeight.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-200">
                        {fmt.currency(h.portfolioValue)}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {h.contributingFunds.slice(0, 2).map((cf, cIdx) => (
                            <span
                              key={cIdx}
                              title={`${cf.fundName}: aporta ${cf.fundWeightInHolding.toFixed(1)}%`}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5 truncate max-w-[140px]"
                            >
                              {cf.fundName.replace(' Fund', '').replace(' Index', '')}
                            </span>
                          ))}
                          {h.contributingFunds.length > 2 && (
                            <span className="text-[10px] font-mono text-slate-400">
                              +{h.contributingFunds.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: GEOGRAFÍA & SECTORES VS BENCHMARKS */}
        {(activeTab === 'overview' || activeTab === 'geo_sectors') && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Geografía vs MSCI ACWI */}
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Exposición Geográfica vs MSCI ACWI
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Benchmark Mundial
                  </span>
                </div>

                <div className="mt-5 space-y-3.5">
                  {geographicExposure.map((geo) => (
                    <div key={geo.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{geo.flag}</span>
                          <span>{geo.shortName}</span>
                        </span>
                        <div className="flex items-center gap-2.5 font-mono text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            Ref: {geo.worldWeight.toFixed(1)}%
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {geo.portfolioWeight.toFixed(1)}%
                          </span>
                          <span
                            className={cn(
                              'font-bold text-[11px] px-1.5 py-0.2 rounded',
                              geo.delta >= 0
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            )}
                          >
                            {geo.delta >= 0 ? '+' : ''}{geo.delta.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      {/* Comparative Bar */}
                      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, geo.portfolioWeight)}%`, backgroundColor: geo.color }}
                        />
                        {/* Marker de Benchmark */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10"
                          style={{ left: `${Math.min(99, geo.worldWeight)}%` }}
                          title={`Benchmark mundial: ${geo.worldWeight}%`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Right: Sectores & SuperSectores */}
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Ponderación Sectorial vs MSCI World
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    11 Sectores
                  </span>
                </div>

                {/* SuperSectores Badges */}
                <div className="grid grid-cols-3 gap-2.5 mt-5">
                  {superSectors.map((ss) => (
                    <div
                      key={ss.name}
                      className="p-2.5 rounded-2xl border text-center"
                      style={{
                        borderColor: `${ss.color}40`,
                        backgroundColor: `${ss.color}10`,
                      }}
                    >
                      <span className="text-[11px] font-bold block" style={{ color: ss.color }}>
                        {ss.name}
                      </span>
                      <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5 block">
                        {ss.weight.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Ref: {ss.worldWeight.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Top Sectores */}
                <div className="mt-5 space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {sectorExposure.slice(0, 7).map((sec) => (
                    <div key={sec.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {sec.name}
                        </span>
                        <div className="flex items-center gap-2.5 font-mono text-xs">
                          <span className="text-slate-400">Ref: {sec.worldWeight.toFixed(1)}%</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {sec.portfolioWeight.toFixed(1)}%
                          </span>
                          <span
                            className={cn(
                              'font-bold text-[10px] px-1 rounded',
                              sec.delta >= 0 ? 'text-blue-500' : 'text-slate-400'
                            )}
                          >
                            {sec.delta >= 0 ? '+' : ''}{sec.delta.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, sec.portfolioWeight * 2.5)}%`, backgroundColor: sec.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 4: AUDITORÍA Y RECOMENDACIONES */}
        {(activeTab === 'overview' || activeTab === 'audit') && (
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
            Metodología cuantitativa Morningstar Look-Through agregada con pesos oficiales de fondos y ETFs.
          </span>
          <span>
            Generado: {report.generatedAt} · Moneda base: EUR (€)
          </span>
        </div>

      </div>
      </div>

      {/* ── MODAL DETALLE DE COMPAÑÍA SUBYACENTE ───────────────────────── */}
      {selectedHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#202023] border border-slate-200 dark:border-white/10 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm font-mono">
                  {selectedHolding.ticker}
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedHolding.name}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedHolding.flag} {selectedHolding.country} · {selectedHolding.sector}
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
                  ¿A través de qué posiciones tienes esta empresa?
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedHolding.contributingFunds.map((cf, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-slate-900 dark:text-white block truncate">
                          {cf.fundName}
                        </span>
                        <span className="text-[10.5px] text-slate-400">
                          Peso de {selectedHolding.ticker} dentro del fondo: {cf.fundWeightInHolding.toFixed(2)}%
                        </span>
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

      {/* ── MODAL VISTA PREVIA MORNINGSTAR PDF ─────────────────────────── */}
      {showMorningstarPreview && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-150">
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
                Vista Previa Oficial: Morningstar Portfolio X-Ray®
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                2 Páginas A4
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#C8102E] hover:bg-[#a60c24] text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Guardar como PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMorningstarPreview(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar vista previa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Paper Canvas Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center gap-6 bg-slate-200/90 dark:bg-[#111113]">
            <div className="w-full max-w-[210mm] shadow-2xl rounded-sm overflow-hidden bg-white">
              <MorningstarXRayDocument
                report={report}
                brokerLabel={brokerLabel}
                clientName={currentUser?.name || 'Inversor'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default XRayPage
