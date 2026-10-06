/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep (0% to 100% time reveal)
 * matching the visual delight of Recharts donut and bar animations.
 */
export function triggerChartAnimation(container: HTMLElement | null, duration = 850) {
  if (!container) return

  // Respect user preference for reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // 1. Entrance fade & lift for the entire chart container
  if (typeof container.animate === 'function') {
    container.animate(
      [
        { opacity: 0.35, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0px)' },
      ],
      {
        duration: 350,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'none',
      }
    )
  }

  // 2. Timeline sweep for the plot area (the series curves canvas in the table)
  const plotCell = (
    container.querySelector('table tr:first-child td:nth-child(2)') ||
    container.querySelector('table td:nth-child(2)') ||
    container.querySelector('table td:first-child')
  ) as HTMLElement | null

  if (plotCell && typeof plotCell.animate === 'function') {
    const anim = plotCell.animate(
      [
        { clipPath: 'inset(0 100% 0 0)', opacity: 0.2 },
        { clipPath: 'inset(0 0% 0 0)', opacity: 1 },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'none',
      }
    )

    anim.onfinish = () => {
      try {
        plotCell.style.clipPath = ''
        plotCell.style.opacity = ''
      } catch {}
    }
  }
}

