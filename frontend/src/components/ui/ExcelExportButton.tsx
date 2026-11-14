/**
 * ExcelExportButton.tsx
 * Botón interactivo con icono de Excel y feedback visual para descargar informes
 * de cartera en formato nativo .xlsx.
 */
import React, { useState } from 'react'
import { FileSpreadsheet, Loader2, Check } from 'lucide-react'
import { downloadExcelReport, type ExportType } from '@/api/export'
import { useAppStore } from '@/store/appStore'

interface ExcelExportButtonProps {
  type: ExportType
  broker?: string
  period?: string
  label?: string
  iconOnly?: boolean
  className?: string
  size?: 'xs' | 'sm' | 'md'
  title?: string
}

export const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  type,
  broker,
  period,
  label,
  iconOnly = false,
  className = '',
  size = 'sm',
  title,
}) => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const storeBroker = useAppStore((s) => s.selectedBroker)
  const storePeriod = useAppStore((s) => s.period)

  const effectiveBroker = broker ?? storeBroker
  const effectivePeriod = period ?? storePeriod

  const defaultTitles: Record<ExportType, string> = {
    positions: 'Descargar posiciones en Excel (.xlsx) con métricas, precios y costes',
    performance: 'Descargar serie histórica de rentabilidades día a día en Excel (.xlsx)',
    transactions: 'Descargar historial de operaciones en Excel (.xlsx)',
    full: 'Descargar informe completo de cartera en Excel (.xlsx)',
  }

  const defaultLabels: Record<ExportType, string> = {
    positions: 'Exportar Excel',
    performance: 'Excel Día a Día',
    transactions: 'Exportar Excel',
    full: 'Informe Excel',
  }

  const tooltip = title || defaultTitles[type]
  const displayLabel = label ?? defaultLabels[type]

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return

    setLoading(true)
    setSuccess(false)
    try {
      await downloadExcelReport(type, {
        broker: effectiveBroker,
        period: effectivePeriod,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2200)
    } catch (err) {
      console.error('Error al exportar a Excel:', err)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px] gap-1 rounded-lg',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-xl',
    md: 'px-3 py-2 text-sm gap-2 rounded-xl',
  }[size]

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      title={tooltip}
      aria-label={tooltip}
      className={`group relative inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none border border-slate-200/90 dark:border-white/[0.08] bg-white hover:bg-emerald-50/60 dark:bg-[#252528] dark:hover:bg-emerald-500/10 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-500/40 shadow-xs active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
      ) : success ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
      )}

      {!iconOnly && (
        <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
          {loading ? 'Generando...' : success ? '¡Descargado!' : displayLabel}
        </span>
      )}
    </button>
  )
}

export default ExcelExportButton
