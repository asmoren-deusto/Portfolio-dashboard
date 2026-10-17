/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep (0% to 100% time reveal)
 * matching the visual delight of institutional financial terminal charts.
 * Fully compatible across Firefox (Gecko), Chrome/Edge (Blink), and Safari (WebKit).
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
      target.getAnimations?.().forEach((a) => a.cancel())
    } catch {}

    // Fully-specified percentage units for 100% cross-browser compatibility (Firefox Gecko, WebKit, Blink)
    target.style.setProperty('clip-path', 'inset(0% 100% 0% 0%)')
    target.style.setProperty('-webkit-clip-path', 'inset(0% 100% 0% 0%)')
    target.style.clipPath = 'inset(0% 100% 0% 0%)'
    target.style.willChange = 'clip-path'
    target.style.transform = 'translateZ(0)'
  }
}

export function triggerChartAnimation(container: HTMLElement | null, duration = 1100) {
  if (!container) return

  // Respect user preference for reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const target = getChartTarget(container)
  if (!target) return

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    try {
      target.style.removeProperty('clip-path')
      target.style.removeProperty('-webkit-clip-path')
      target.style.clipPath = ''
      target.style.willChange = ''
      target.style.transform = ''
      target.style.removeProperty('opacity')
    } catch {}
  }

  try {
    target.getAnimations?.().forEach((a) => a.cancel())
  } catch {}

  // Immediately clip and promote compositor layer in Firefox/Safari/Chrome
  target.style.setProperty('clip-path', 'inset(0% 100% 0% 0%)')
  target.style.setProperty('-webkit-clip-path', 'inset(0% 100% 0% 0%)')
  target.style.clipPath = 'inset(0% 100% 0% 0%)'
  target.style.willChange = 'clip-path'
  target.style.transform = 'translateZ(0)'

  if (typeof target.animate === 'function') {
    try {
      const anim = target.animate(
        [
          {
            clipPath: 'inset(0% 100% 0% 0%)',
            'clip-path': 'inset(0% 100% 0% 0%)',
            '-webkit-clip-path': 'inset(0% 100% 0% 0%)',
            opacity: 0.35,
          },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            'clip-path': 'inset(0% 0% 0% 0%)',
            '-webkit-clip-path': 'inset(0% 0% 0% 0%)',
            opacity: 1,
          },
        ],
        {
          duration,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          fill: 'forwards',
        }
      )

      anim.onfinish = cleanup
      anim.oncancel = cleanup

      // Safety fallback: ensure clipPath is always cleared even if frame dropped
      setTimeout(cleanup, duration + 60)
      return
    } catch (err) {
      console.warn('WAAPI clip-path animation failed, falling back to JS RAF animation:', err)
    }
  }

  // Robust requestAnimationFrame fallback for any browser/environment where WAAPI on clip-path is unsupported
  const startTime = performance.now()
  const cubicBezier = (t: number) => {
    return 1 - Math.pow(1 - t, 3)
  }

  let rafId: number
  const step = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / duration)
    const eased = cubicBezier(progress)
    const remainingRight = (100 * (1 - eased)).toFixed(2)

    target.style.setProperty('clip-path', `inset(0% ${remainingRight}% 0% 0%)`)
    target.style.setProperty('-webkit-clip-path', `inset(0% ${remainingRight}% 0% 0%)`)
    target.style.clipPath = `inset(0% ${remainingRight}% 0% 0%)`
    target.style.opacity = `${0.35 + 0.65 * eased}`

    if (progress < 1) {
      rafId = requestAnimationFrame(step)
    } else {
      cleanup()
    }
  }

  rafId = requestAnimationFrame(step)
  setTimeout(() => {
    cancelAnimationFrame(rafId)
    cleanup()
  }, duration + 60)
}
