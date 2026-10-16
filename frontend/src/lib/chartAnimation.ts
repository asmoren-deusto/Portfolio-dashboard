/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep (0% to 100% time reveal)
 * matching the visual delight of institutional financial terminal charts.
 */
export function triggerChartAnimation(container: HTMLElement | null, duration = 850) {
  if (!container) return

  // Respect user preference for reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // Find the plot area (main series canvas) in lightweight-charts
  const plotCanvasWrapper = container.querySelector('table tr:first-child td:first-child') as HTMLElement | null
  const target = plotCanvasWrapper || container

  if (typeof target.animate === 'function') {
    target.animate(
      [
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)' },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      }
    )
  }
}


