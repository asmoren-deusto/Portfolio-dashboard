/**
 * ExcelExportButton.tsx
 * Botón pill estándar con icono verde de Excel y texto uniforme para descargar
 * informes de cartera en formato nativo Microsoft Excel (.xlsx).
 */
import React, { useState } from 'react'
import { FileSpreadsheet, Loader2, Check, AlertCircle } from 'lucide-react'
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
  label = 'Excel',
  iconOnly = false,
  className = '',
  size = 'sm',
  title,
}) => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
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

  const tooltip = title || defaultTitles[type]
  const displayLabel = label || 'Excel'

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return

    setLoading(true)
    setSuccess(false)
    setErrorMsg(null)
    try {
      await downloadExcelReport(type, {
        broker: effectiveBroker,
        period: effectivePeriod,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2400)
    } catch (err: any) {
      console.error('Error al exportar a Excel:', err)
      setErrorMsg(err?.message || 'Error al exportar')
      setTimeout(() => setErrorMsg(null), 3500)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    xs: 'h-7 px-2 text-[11px] gap-1.5 rounded-lg',
    sm: 'h-8 px-2.5 text-xs gap-1.5 rounded-lg',
    md: 'h-9 px-3 text-xs gap-2 rounded-lg',
  }[size]

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      title={errorMsg || tooltip}
      aria-label={tooltip}
      className={`group relative inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none border border-slate-200/90 dark:border-white/[0.08] bg-white hover:bg-emerald-50/60 dark:bg-[#252528] dark:hover:bg-emerald-500/10 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-500/40 shadow-2xs active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : success ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : errorMsg ? (
        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
      ) : (
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform" />
      )}

      {!iconOnly && (
        <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
          {loading ? 'Generando...' : success ? '¡Listo!' : errorMsg ? 'Reintentar' : displayLabel}
        </span>
      )}
    </button>
  )
}

export default ExcelExportButton
