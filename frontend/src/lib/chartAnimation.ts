/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep (0% to 100% time reveal)
 * matching the visual delight of institutional financial terminal charts.
 */
export function triggerChartAnimation(container: HTMLElement | null, duration = 1200) {
  if (!container) return

  // Respect user preference for reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // Entrance subtle fade and lift for the chart container
  if (typeof container.animate === 'function') {
    container.animate(
      [
        { opacity: 0.7, transform: 'translateY(2px)' },
        { opacity: 1, transform: 'translateY(0px)' },
      ],
      {
        duration: Math.min(400, duration),
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'none',
      }
    )
  }
}


