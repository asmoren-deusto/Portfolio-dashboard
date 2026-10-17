/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep (0% to 100% time reveal)
 * matching the visual delight of institutional financial terminal charts.
 * 
 * On mobile/touch devices, WebKit's RemoteLayerTree rasterizer can exhaust GPU memory
 * when animating clip-path across multiple layered Retina canvases. On touch/mobile,
 * we switch to a hardware-accelerated opacity fade to ensure zero crashes and 60fps fluidity.
 */

const isTouchOrMobile = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    /iPhone|iPad|iPod|Android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
  )
}

export function prepareChartForAnimation(container: HTMLElement | null) {
  if (!container) return
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  const table = container.querySelector('table')
  const canvas = container.querySelector('canvas')
  const paneDiv = (canvas?.closest('td')?.firstElementChild || canvas?.parentElement) as HTMLElement
  const target = (table || (paneDiv && paneDiv.tagName === 'DIV' ? paneDiv : container)) as HTMLElement

  if (target) {
    try {
      target.getAnimations?.().forEach(a => a.cancel())
    } catch {}

    if (isTouchOrMobile()) {
      target.style.opacity = '0.3'
    } else {
      target.style.clipPath = 'inset(0 100% 0 0)'
    }
  }
}

export function triggerChartAnimation(container: HTMLElement | null, duration = 1100) {
  if (!container) return

  // Respect user preference for reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // Find the primary chart element in lightweight-charts.
  const table = container.querySelector('table')
  const canvas = container.querySelector('canvas')
  const paneDiv = (canvas?.closest('td')?.firstElementChild || canvas?.parentElement) as HTMLElement
  const target = (table || (paneDiv && paneDiv.tagName === 'DIV' ? paneDiv : container)) as HTMLElement

  if (target && typeof target.animate === 'function') {
    try {
      target.getAnimations?.().forEach(a => a.cancel())
    } catch {}

    // On touch/mobile devices, use native GPU opacity compositing (avoids WebKit canvas clipPath crash)
    if (isTouchOrMobile()) {
      target.style.opacity = '0.3'
      const anim = target.animate(
        [
          { opacity: 0.3 },
          { opacity: 1 },
        ],
        {
          duration: 350,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          fill: 'forwards',
        }
      )

      let cleaned = false
      const cleanup = () => {
        if (cleaned) return
        cleaned = true
        try {
          target.style.opacity = ''
        } catch {}
      }

      anim.onfinish = cleanup
      anim.oncancel = cleanup
      setTimeout(cleanup, 400)
      return
    }

    // Desktop: Institutional terminal sweep reveal
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
