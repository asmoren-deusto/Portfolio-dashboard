import React from 'react'
import { createRoot } from 'react-dom/client'
import { jsPDF } from 'jspdf'
import { toJpeg } from 'html-to-image'
import { MorningstarXRayDocument } from '@/components/analytics/MorningstarXRayDocument'
import { buildPortfolioXRayReport } from '@/lib/xrayEngine'
import type { Position } from '@/api/queries'

export interface ExportPdfOptions {
  positions: Position[]
  broker?: string
  clientName?: string
}

/**
 * Genera y descarga directamente el documento oficial Morningstar Portfolio X-Ray (5 páginas A4)
 * sin abrir diálogos de impresión y con soporte 100% nativo para colores oklch de Tailwind v4.
 */
export async function downloadXRayPdf({
  positions,
  broker = 'all',
  clientName = 'Inversor',
}: ExportPdfOptions): Promise<void> {
  const brokerLabel =
    broker === 'all'
      ? 'Todas las Entidades (Consolidado)'
      : broker === 'myinvestor'
      ? 'MyInvestor'
      : broker === 'indexa'
      ? 'Indexa Capital'
      : broker === 'traderepublic'
      ? 'Trade Republic'
      : broker

  const report = buildPortfolioXRayReport(positions, broker)

  const container = document.createElement('div')
  container.id = 'xray-pdf-temp-container'
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '210mm'
  container.style.backgroundColor = '#ffffff'
  container.style.zIndex = '-9999'
  container.style.pointerEvents = 'none'
  document.body.appendChild(container)

  const root = createRoot(container)

  try {
    // Renderizar el documento offscreen y dar margen al DOM para calcular estilos
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(MorningstarXRayDocument, {
          report,
          brokerLabel,
          clientName,
        })
      )
      setTimeout(resolve, 350)
    })

    const dateStr = new Date().toISOString().slice(0, 10)
    const entitySuffix = broker !== 'all' ? `_${broker}` : '_Consolidado'
    const filename = `Morningstar_Portfolio_XRay${entitySuffix}_${dateStr}.pdf`

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    })

    const pages = Array.from(container.querySelectorAll<HTMLElement>('.print-page'))

    if (pages.length === 0) {
      const imgData = await toJpeg(container, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
      })
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
    } else {
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i]
        const imgData = await toJpeg(pageEl, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
          style: {
            boxShadow: 'none',
            border: 'none',
            borderRadius: '0',
            marginBottom: '0',
          },
        })
        if (i > 0) {
          pdf.addPage('a4', 'portrait')
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
      }
    }

    pdf.save(filename)
  } finally {
    root.unmount()
    container.remove()
  }
}
