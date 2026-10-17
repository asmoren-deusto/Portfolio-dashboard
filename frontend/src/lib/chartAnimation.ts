/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep (0% to 100% time reveal)
 * matching the visual delight of institutional financial terminal charts.
 */

function getChartTarget(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null
  const canvas = container.querySelector('canvas')
  // paneDiv is the <div> element directly wrapping the canvas inside <td>
  const paneDiv = (canvas?.closest('td')?.firstElementChild || canvas?.parentElement) as HTMLElement
  if (paneDiv && paneDiv.tagName === 'DIV') {
    return paneDiv
  }
  const tvContainer = container.querySelector('.tv-lightweight-charts') as HTMLElement
  if (tvContainer) return tvContainer
  return container
}

export function prepareChartForAnimation(container: HTMLElement | null) {
  if (!container) return
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const target = getChartTarget(container)
  if (target) {
    try {
      target.getAnimations?.().forEach(a => a.cancel())
    } catch {}

    target.style.clipPath = 'inset(0 100% 0 0)'
  }
}

export function triggerChartAnimation(container: HTMLElement | null, duration = 1100) {
  if (!container) return

  // Respect user preference for reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const target = getChartTarget(container)

  if (target && typeof target.animate === 'function') {
    try {
      target.getAnimations?.().forEach(a => a.cancel())
    } catch {}

    // Immediately clip to avoid 1-frame flash of fully-rendered chart
    target.style.clipPath = 'inset(0 100% 0 0)'

    const anim = target.animate(
      [
        { clipPath: 'inset(0 100% 0 0)', opacity: 0.35 },
        { clipPath: 'inset(0 0% 0 0)', opacity: 1 },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards',
      }
    )

    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      try {
        target.style.clipPath = ''
      } catch {}
    }

    anim.onfinish = cleanup
    anim.oncancel = cleanup

    // Safety fallback: ensure clipPath is always cleared even if frame dropped
    setTimeout(cleanup, duration + 60)
  }
}

