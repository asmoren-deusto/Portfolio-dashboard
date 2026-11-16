/**
 * PortfolioXRayModal.tsx
 * Modal interactivo e imprimible de Informe X-Ray Completo de Cartera.
 * Proporciona descomposición Look-Through estilo Morningstar institucional:
 *  - Portada ejecutiva con métricas de calidad, volatilidad, Sharpe y TER.
 *  - Look-Through de Mayores Compañías Subyacentes (peso y valor real en €).
 *  - Matriz Morningstar Style Box 3x3 (Tamaño vs Estilo).
 *  - Radiografía Geográfica vs MSCI ACWI Benchmark.
 *  - Radiografía Sectorial (11 Sectores + 3 SuperSectores) vs MSCI World.
 *  - Exposición multidivisa y auditoría de riesgos.
 *  - Opciones de exportación directa a Excel (.xlsx) y generación de PDF / Impresión.
 */

import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Printer,
  FileSpreadsheet,
  ScanSearch,
  PieChart,
  Globe,
  Layers,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Building2,
  ChevronRight,
  ExternalLink,
  Coins,
  Cpu,
  Flame,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import { fmt, cn } from '@/lib/utils'
import { usePositions } from '@/api/queries'
import { downloadExcelReport } from '@/api/export'
import {
  buildPortfolioXRayReport,
  type PortfolioXRayReport,
  type LookThroughHolding,
} from '@/lib/xrayEngine'

interface PortfolioXRayModalProps {
  isOpen: boolean
  onClose: () => void
  initialBroker?: string
}

type XRayTab = 'overview' | 'holdings' | 'stylebox' | 'geo_sectors' | 'audit'

export function PortfolioXRayModal({ isOpen, onClose, initialBroker = 'all' }: PortfolioXRayModalProps) {
  const { data: positions = [], isLoading } = usePositions()
  const [selectedBroker, setSelectedBroker] = useState<string>(initialBroker)
  const [activeTab, setActiveTab] = useState<XRayTab>('overview')
  const [selectedHolding, setSelectedHolding] = useState<LookThroughHolding | null>(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)

  // Sincronizar broker inicial si cambia
  useEffect(() => {
    if (initialBroker) setSelectedBroker(initialBroker)
  }, [initialBroker])

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Bloquear scroll de la página de fondo
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

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

  if (!isOpen) return null

  const {
    summary,
    assetAllocation,
    styleBox,
    topHoldings,
    geographicExposure,
    sectorExposure,
    superSectors,
    currencyExposure,
    strengths,
    watchpoints,
    recommendations,
  } = report

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:static print:block">
        {/* Backdrop (hidden in print) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity print:hidden"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:rounded-none print:bg-white print:text-black print:overflow-visible"
        >
          {/* ── HEADER MODAL ──────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200/90 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#222225]/80 print:bg-white print:border-b-2 print:border-black shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                <ScanSearch className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    Informe X-Ray de Cartera
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
                    Morningstar Look-Through
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Descomposición de activos, estilo 3x3, geografía, sectores y compañías subyacentes
                </p>
              </div>
            </div>

            {/* Action Buttons & Filter */}
            <div className="flex items-center gap-2 shrink-0 print:hidden flex-wrap">
              {/* Selector de Entidad */}
              <div className="flex items-center h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#2b2b2e] p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedBroker('all')}
                  className={cn(
                    'px-2.5 h-6.5 rounded-md transition-colors cursor-pointer text-[11px]',
                    selectedBroker === 'all'
                      ? 'bg-slate-100 dark:bg-white/15 text-slate-900 dark:text-white font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
                      'px-2 h-6.5 rounded-md transition-colors cursor-pointer text-[11px] capitalize',
                      selectedBroker === b
                        ? 'bg-slate-100 dark:bg-white/15 text-slate-900 dark:text-white font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    )}
                  >
                    {b === 'traderepublic' ? 'Trade Rep.' : b}
                  </button>
                ))}
              </div>

              {/* Botón Imprimir / Guardar PDF */}
              <button
                type="button"
                onClick={handlePrint}
                title="Imprimir o guardar como PDF este informe X-Ray"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#2b2b2e] hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Imprimir / PDF</span>
              </button>

              {/* Botón Descargar Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                title="Descargar libro Excel (.xlsx) completo de cartera"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Excel</span>
              </button>

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors ml-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── KPI EXECUTIVE STRIP ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-4 bg-slate-100/60 dark:bg-[#18181a]/80 border-b border-slate-200/90 dark:border-white/[0.06] shrink-0 text-xs print:grid-cols-6 print:bg-white print:border-b">
            {/* 1. Valor Analizado */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#252528] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                Patrimonio X-Ray
              </span>
              <div className="font-mono font-bold text-sm sm:text-base text-slate-950 dark:text-white mt-0.5 truncate">
                {fmt.currency(summary.totalValue)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                {summary.numPositions} posiciones activas
              </span>
            </div>

            {/* 2. Score de Diversificación */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#252528] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                Salud de Cartera
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                  {summary.healthScore}/100
                </span>
                <span className="text-[10.5px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  {summary.healthScoreLabel}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                Score multivariable
              </span>
            </div>

            {/* 3. TER Medio Ponderado */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#252528] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                TER Medio Ponderado
              </span>
              <div className="font-mono font-bold text-sm sm:text-base text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                {summary.weightedTer.toFixed(2)}% <span className="text-[11px] font-normal text-slate-400">/año</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                Coste: {fmt.currency(summary.annualFeeCostEur)}/año
              </span>
            </div>

            {/* 4. Volatilidad Anualizada */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#252528] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                Volatilidad Estimada
              </span>
              <div className="font-mono font-bold text-sm sm:text-base text-slate-950 dark:text-white mt-0.5 truncate">
                ±{summary.expectedVolatility.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                Max Drawdown: {summary.maxDrawdown.toFixed(1)}%
              </span>
            </div>

            {/* 5. Sharpe Ratio */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#252528] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                Ratio de Sharpe
              </span>
              <div className="font-mono font-bold text-sm sm:text-base text-slate-950 dark:text-white mt-0.5 truncate">
                {summary.sharpeRatio.toFixed(2)}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block truncate">
                Eficiencia alta (&gt;1.0)
              </span>
            </div>

            {/* 6. PER Ponderado & Dividendo */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#252528] border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                PER Medio / Div. Yield
              </span>
              <div className="font-mono font-bold text-sm sm:text-base text-slate-950 dark:text-white mt-0.5 truncate">
                {summary.weightedPe.toFixed(1)}x <span className="text-[11px] font-normal text-slate-400">· {summary.dividendYieldEst.toFixed(2)}%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                P/VC: {summary.weightedPb.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* ── SUB-TABS NAVIGATION (Hidden in print) ────────────────────────── */}
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#1e1e20] shrink-0 overflow-x-auto no-scrollbar print:hidden">
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
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
                    active
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* ── MODAL BODY CONTENT ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:overflow-visible print:p-0 print:space-y-6">

            {/* TAB 1: OVERVIEW & STYLE BOX */}
            {(activeTab === 'overview' || activeTab === 'stylebox') && (
              <div className="space-y-6">
                {/* Grid 2 Columnas: Asignación de Activos + Style Box 3x3 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  
                  {/* Left: Asignación de Activos (40% / 5 cols) */}
                  <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#242427]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-violet-500" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Asignación Real de Activos
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Total {fmt.currency(summary.totalValue)}
                      </span>
                    </div>

                    {/* Stacked Allocation Progress Bar */}
                    <div className="mt-4">
                      <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-white/10 shadow-inner">
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
                    <div className="mt-4 space-y-2.5">
                      {assetAllocation.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs p-2 rounded-xl bg-white dark:bg-[#1e1e21] border border-slate-200/60 dark:border-white/[0.04]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                              {fmt.currency(item.value)}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white w-12 text-right">
                              {item.weight.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 text-[11.5px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                      💡 <strong>Estructura Patrimonial:</strong> Cartera con perfil marcadamente <strong>Crecimiento / Renta Variable</strong> ({assetAllocation.find((a) => a.id === 'equity')?.weight.toFixed(1)}%), complementada con reservas de liquidez y activos de cobertura.
                    </div>
                  </div>

                  {/* Right: Morningstar Style Box 3x3 (60% / 7 cols) */}
                  <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#242427]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Morningstar Equity Style Box™ (3x3)
                        </h3>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                        {styleBox.dominantLabel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Descomposición de la renta variable según capitalización de mercado (Large, Mid, Small) y estilo de inversión (Value, Blend, Growth).
                    </p>

                    {/* Matriz 3x3 Interactiva */}
                    <div className="mt-4 max-w-md mx-auto">
                      {/* Column Header Titles */}
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-1">
                        <div></div>
                        <div className="uppercase tracking-wider">Valor</div>
                        <div className="uppercase tracking-wider">Mixto</div>
                        <div className="uppercase tracking-wider">Crec.</div>
                      </div>

                      {/* Row 1: Large Cap */}
                      <div className="grid grid-cols-4 gap-1.5 mb-1.5 items-center">
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-right pr-2">
                          Grande
                        </div>
                        {/* Large Value */}
                        <div
                          className="h-16 rounded-xl border flex flex-col items-center justify-center p-1 transition-all"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.largeValue / 100)})`,
                            borderColor: styleBox.largeValue > 15 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                            {styleBox.largeValue.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">Large Value</span>
                        </div>
                        {/* Large Blend */}
                        <div
                          className="h-16 rounded-xl border flex flex-col items-center justify-center p-1 transition-all"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.largeBlend / 100)})`,
                            borderColor: styleBox.largeBlend > 15 ? 'rgba(99, 102, 241, 0.5)' : 'rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                            {styleBox.largeBlend.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">Large Blend</span>
                        </div>
                        {/* Large Growth */}
                        <div
                          className="h-16 rounded-xl border flex flex-col items-center justify-center p-1 transition-all"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.largeGrowth / 100)})`,
                            borderColor: styleBox.largeGrowth > 15 ? 'rgba(99, 102, 241, 0.6)' : 'rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                            {styleBox.largeGrowth.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">Large Growth</span>
                        </div>
                      </div>

                      {/* Row 2: Mid Cap */}
                      <div className="grid grid-cols-4 gap-1.5 mb-1.5 items-center">
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-right pr-2">
                          Mediana
                        </div>
                        {/* Mid Value */}
                        <div
                          className="h-14 rounded-xl border flex flex-col items-center justify-center p-1 transition-all"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.midValue / 100)})`,
                            borderColor: styleBox.midValue > 10 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                            {styleBox.midValue.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">Mid Value</span>
                        </div>
                        {/* Mid Blend */}
                        <div
                          className="h-14 rounded-xl border flex flex-col items-center justify-center p-1 transition-all"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.midBlend / 100)})`,
                            borderColor: styleBox.midBlend > 10 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                            {styleBox.midBlend.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">Mid Blend</span>
                        </div>
                        {/* Mid Growth */}
                        <div
                          className="h-14 rounded-xl border flex flex-col items-center justify-center p-1 transition-all"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.midGrowth / 100)})`,
                            borderColor: styleBox.midGrowth > 10 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                            {styleBox.midGrowth.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">Mid Growth</span>
                        </div>
                      </div>

                      {/* Row 3: Small Cap */}
                      <div className="grid grid-cols-4 gap-1.5 items-center">
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-right pr-2">
                          Pequeña
                        </div>
                        {/* Small Value */}
                        <div
                          className="h-14 rounded-xl border flex flex-col items-center justify-center p-1 transition-all"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.smallValue / 100)})`,
                            borderColor: styleBox.smallValue > 5 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                            {styleBox.smallValue.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">Small Value</span>
                        </div>
                        {/* Small Blend */}
                        <div
                          className="h-14 rounded-xl border flex flex-col items-center justify-center p-1 transition-all"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.smallBlend / 100)})`,
                            borderColor: styleBox.smallBlend > 5 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                            {styleBox.smallBlend.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">Small Blend</span>
                        </div>
                        {/* Small Growth */}
                        <div
                          className="h-14 rounded-xl border flex flex-col items-center justify-center p-1 transition-all"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${Math.max(0.06, styleBox.smallGrowth / 100)})`,
                            borderColor: styleBox.smallGrowth > 5 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                          }}
                        >
                          <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                            {styleBox.smallGrowth.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">Small Growth</span>
                        </div>
                      </div>
                    </div>

                    {/* Resumen del Centroide */}
                    <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {styleBox.summaryText}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LOOK-THROUGH TOP HOLDINGS */}
            {(activeTab === 'overview' || activeTab === 'holdings') && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        Mayores Compañías Subyacentes (Look-Through Holdings)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#1f1f22]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/90 dark:border-white/[0.06] bg-slate-50/80 dark:bg-[#252528] text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Compañía / Ticker</th>
                        <th className="py-2.5 px-3">Sector</th>
                        <th className="py-2.5 px-3">País</th>
                        <th className="py-2.5 px-3 text-right">Peso en Cartera</th>
                        <th className="py-2.5 px-3 text-right">Valor Efectivo</th>
                        <th className="py-2.5 px-3">Fondos Aportantes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {topHoldings.map((h, idx) => (
                        <tr
                          key={h.id}
                          className="hover:bg-slate-50/90 dark:hover:bg-white/[0.03] transition-colors group cursor-pointer"
                          onClick={() => setSelectedHolding(selectedHolding?.id === h.id ? null : h)}
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] w-8">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white text-xs bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                {h.ticker}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                {h.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className="inline-flex items-center gap-1 font-medium text-[11px]"
                              style={{ color: h.sectorColor }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: h.sectorColor }}
                              />
                              {h.sector}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            <span className="mr-1">{h.flag}</span> {h.country}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-14 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden hidden sm:block">
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
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-200">
                            {fmt.currency(h.portfolioValue)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {h.contributingFunds.slice(0, 2).map((cf, cIdx) => (
                                <span
                                  key={cIdx}
                                  title={`${cf.fundName}: aporta ${cf.fundWeightInHolding.toFixed(1)}%`}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5 truncate max-w-[130px]"
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
              </div>
            )}

            {/* TAB 3: GEOGRAFÍA & SECTORES VS BENCHMARKS */}
            {(activeTab === 'overview' || activeTab === 'geo_sectors') && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left: Geografía vs MSCI ACWI */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#242427]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Exposición Geográfica vs MSCI ACWI
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Benchmark Mundial
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {geographicExposure.map((geo) => (
                        <div key={geo.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <span>{geo.flag}</span>
                              <span>{geo.shortName}</span>
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-slate-500 dark:text-slate-400">
                                Ref: {geo.worldWeight.toFixed(1)}%
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {geo.portfolioWeight.toFixed(1)}%
                              </span>
                              <span
                                className={cn(
                                  'font-bold text-[10px] px-1 rounded',
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
                          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden relative">
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
                  </div>

                  {/* Right: Sectores & SuperSectores */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#242427]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-500" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Ponderación Sectorial vs MSCI World
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        11 Sectores
                      </span>
                    </div>

                    {/* SuperSectores Badges */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {superSectors.map((ss) => (
                        <div
                          key={ss.name}
                          className="p-2 rounded-xl border text-center"
                          style={{
                            borderColor: `${ss.color}40`,
                            backgroundColor: `${ss.color}10`,
                          }}
                        >
                          <span className="text-[10px] font-bold block" style={{ color: ss.color }}>
                            {ss.name}
                          </span>
                          <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                            {ss.weight.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            Ref: {ss.worldWeight.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Top Sectores */}
                    <div className="mt-4 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {sectorExposure.slice(0, 6).map((sec) => (
                        <div key={sec.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                              {sec.name}
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
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
                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, sec.portfolioWeight * 2.5)}%`, backgroundColor: sec.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AUDITORÍA Y RECOMENDACIONES */}
            {(activeTab === 'overview' || activeTab === 'audit') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Puntos Fuertes */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Puntos Fuertes de la Cartera</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Puntos de Atención */}
                <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 pb-2 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Puntos de Atención / Riesgo</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {watchpoints.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recomendaciones Operativas */}
                <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20">
                  <div className="flex items-center gap-2 pb-2 border-b border-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Recomendaciones Cuantitativas</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Footer Notice */}
            <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <span>
                Metodología cuantitativa Morningstar Look-Through agregada con pesos oficiales de fondos y ETFs.
              </span>
              <span>
                Generado: {report.generatedAt} · Moneda base: EUR (€)
              </span>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
