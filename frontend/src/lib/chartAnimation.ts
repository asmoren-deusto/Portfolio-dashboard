/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep (0% to 100% time reveal)
 * matching the visual delight of institutional financial terminal charts.
 */
export function triggerChartAnimation(container: HTMLElement | null, duration = 750) {
  if (!container) return

  // Respect user preference for reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // Find the primary plot pane in lightweight-charts.
  // Note: Lightweight Charts wraps pane canvases in a <div> inside a <td>.
  // CSS clip-path does NOT work on <td> (display: table-cell), so we MUST target the inner <div>!
  const canvas = container.querySelector('canvas')
  if (!canvas) return

  // In lightweight-charts, canvas is inside a div, which may be inside a td
  const paneDiv = (canvas.closest('td')?.firstElementChild || canvas.parentElement) as HTMLElement
  const target = (paneDiv && paneDiv.tagName === 'DIV' ? paneDiv : (canvas.parentElement || container)) as HTMLElement

  if (target && typeof target.animate === 'function') {
    try {
      target.getAnimations?.().forEach(a => a.cancel())
    } catch {}

    const anim = target.animate(
      [
        { clipPath: 'inset(0 100% 0 0)', opacity: 0.35 },
        { clipPath: 'inset(0 0% 0 0)', opacity: 1 },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards',
      }
    )

    const cleanup = () => {
      try {
        target.style.clipPath = ''
      } catch {}
    }

    anim.onfinish = cleanup
  }
}
