/**
 * export.ts
 * Utilidad cliente para descargar informes de cartera en formato Microsoft Excel nativo (.xlsx).
 */
import { apiUrl } from './config'

export type ExportType = 'positions' | 'performance' | 'transactions' | 'full'

export interface ExportOptions {
  broker?: string
  period?: string
  defaultFilename?: string
}

/**
 * Solicita la generación de un libro Excel al backend y dispara la descarga en el navegador.
 */
export async function downloadExcelReport(
  type: ExportType,
  options?: ExportOptions
): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('portfolio_auth_token') : null
  const broker = options?.broker && options.broker !== 'all' ? options.broker : undefined
  const period = options?.period || 'all'

  const params = new URLSearchParams()
  if (broker) params.append('broker', broker)
  if (type === 'performance' || type === 'full') {
    params.append('period', period)
  }
  if (token) {
    params.append('token', token)
  }

  let endpoint = '/portfolio/export/positions-excel'
  if (type === 'performance') endpoint = '/portfolio/export/performance-excel'
  else if (type === 'transactions') endpoint = '/portfolio/export/transactions-excel'
  else if (type === 'full') endpoint = '/portfolio/export/full-portfolio-excel'

  const fullUrl = `${apiUrl(endpoint)}?${params.toString()}`

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(fullUrl, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    throw new Error(`Error ${res.status}: no se ha podido generar el archivo Excel`)
  }

  // Extraer nombre de archivo desde Content-Disposition
  let filename = options?.defaultFilename
  const disposition = res.headers.get('content-disposition')
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/)
    if (match && match[1]) {
      filename = match[1]
    }
  }

  if (!filename) {
    const today = new Date().toISOString().slice(0, 10)
    const label = type === 'positions' ? 'Posiciones' : type === 'performance' ? 'Historico_Rendimiento' : type === 'transactions' ? 'Operaciones' : 'Informe_Completo'
    filename = `Cartera_${label}_${today}.xlsx`
  }

  const blob = await res.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
}
