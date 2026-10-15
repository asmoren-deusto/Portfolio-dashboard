/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep (0% to 100% time reveal)
 * matching the visual delight of institutional financial terminal charts.
 */
export function triggerChartAnimation(container: HTMLElement | null, duration = 1400) {
  if (!container) return

  // Respect user preference for reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // 1. Entrance subtle lift for the entire chart container
  if (typeof container.animate === 'function') {
    container.animate(
      [
        { opacity: 0.6, transform: 'translateY(3px)' },
        { opacity: 1, transform: 'translateY(0px)' },
      ],
      {
        duration: 400,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'none',
      }
    )
  }

  // 2. Slower, fluid left-to-right sweep for the plot area (the main curve canvas in the table)
  // In lightweight-charts, the main plot pane is the first cell of the first row
  const plotCell = (
    container.querySelector('table tr:first-child > td:first-child') ||
    container.querySelector('table td:first-child') ||
    container.querySelector('.tv-lightweight-charts canvas')?.parentElement ||
    container.querySelector('canvas')?.parentElement
  ) as HTMLElement | null

  if (!plotCell) return

  const targetEl = (plotCell.firstElementChild as HTMLElement) || plotCell

  // Cancel any existing animation on this element
  if (typeof targetEl.getAnimations === 'function') {
    targetEl.getAnimations().forEach((a) => a.cancel())
  }

  requestAnimationFrame(() => {
    if (typeof targetEl.animate === 'function') {
      const anim = targetEl.animate(
        [
          { clipPath: 'inset(0 100% 0 0)', opacity: 0.2 },
          { clipPath: 'inset(0 0% 0 0)', opacity: 1 },
        ],
        {
          duration,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      )

      anim.onfinish = () => {
        try {
          targetEl.style.clipPath = ''
          targetEl.style.opacity = ''
        } catch {}
      }
    }
  })
}

