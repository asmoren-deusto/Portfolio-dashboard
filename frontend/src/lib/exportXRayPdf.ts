import React from 'react'
import { createRoot } from 'react-dom/client'
import { jsPDF } from 'jspdf'
import { toPng } from 'html-to-image'
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
 * en formato PNG lossless a 300 DPI y con preservación exacta de la relación de aspecto A4 (cero deformación).
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
      setTimeout(resolve, 400)
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
      container.style.width = '210mm'
      container.style.height = '297mm'
      container.style.boxSizing = 'border-box'
      const imgData = await toPng(container, {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        skipFonts: true,
      })
      const imgProps = pdf.getImageProperties(imgData)
      const pdfHeight = Math.min(297, (imgProps.height * 210) / imgProps.width)
      pdf.addImage(imgData, 'PNG', 0, 0, 210, pdfHeight, undefined, 'SLOW')
    } else {
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i]
        
        // Bloquear dimensiones exactas A4 (210mm x 297mm) para garantizar que los círculos y gráficos no se estiren verticalmente
        pageEl.style.width = '210mm'
        pageEl.style.height = '297mm'
        pageEl.style.minHeight = '297mm'
        pageEl.style.maxHeight = '297mm'
        pageEl.style.boxSizing = 'border-box'
        pageEl.style.overflow = 'hidden'

        const imgData = await toPng(pageEl, {
          pixelRatio: 3, // ~300 DPI Ultra Alta Resolución sin artefactos de compresión
          backgroundColor: '#ffffff',
          skipFonts: true,
          style: {
            boxShadow: 'none',
            border: 'none',
            borderRadius: '0',
            marginBottom: '0',
            width: '210mm',
            height: '297mm',
          },
        })

        if (i > 0) {
          pdf.addPage('a4', 'portrait')
        }

        // Relación de aspecto 1:1 matemáticamente exacta
        const imgProps = pdf.getImageProperties(imgData)
        const pdfWidth = 210
        const calculatedHeight = (imgProps.height * pdfWidth) / imgProps.width
        const pdfHeight = Math.min(297, calculatedHeight)

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'SLOW')
      }
    }

    pdf.save(filename)
  } finally {
    root.unmount()
    container.remove()
  }
}
