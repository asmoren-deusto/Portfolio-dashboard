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

  // Find the plot area (main series canvas wrapper) in lightweight-charts
  const canvas = container.querySelector('canvas')
  const target = (canvas?.closest('td') || canvas?.parentElement || container) as HTMLElement

  if (target && typeof target.animate === 'function') {
    try {
      target.getAnimations?.().forEach(a => a.cancel())
    } catch {}

    const anim = target.animate(
      [
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 -6px 0 0)' },
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
        anim.cancel()
      } catch {}
    }

    anim.onfinish = cleanup
    anim.oncancel = cleanup
  }
}


