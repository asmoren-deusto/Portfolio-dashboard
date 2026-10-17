/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep reveal
 * matching the visual delight of institutional financial terminal charts.
 * 
 * Uses a GPU-accelerated curtain-reveal overlay with an integrated glowing scanline.
 * 100% immune to engine-specific CSS table-cell clipping bugs in Mozilla Firefox (Gecko),
 * Safari (WebKit), and Chrome/Edge (Blink).
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

function getEffectiveBgColor(element: HTMLElement | null): string {
  let el: HTMLElement | null = element
  while (el && el !== document.documentElement && el !== document.body) {
    const s = window.getComputedStyle(el).backgroundColor
    if (s && s !== 'transparent' && s !== 'rgba(0, 0, 0, 0)') {
      return s
    }
    el = el.parentElement
  }
  const isDark = document.documentElement.classList.contains('dark')
  return isDark ? '#181f2b' : '#ffffff'
}

export function prepareChartForAnimation(container: HTMLElement | null) {
  if (!container) return
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const target = getChartTarget(container)
  if (!target) return

  // Ensure target has relative positioning for the absolute curtain overlay
  if (window.getComputedStyle(target).position === 'static') {
    target.style.position = 'relative'
  }

  // Remove any stale clip-path properties that cause table-cell bugs in Firefox Gecko
  target.style.removeProperty('clip-path')
  target.style.removeProperty('-webkit-clip-path')
  target.style.clipPath = ''

  // Remove existing curtains if any
  target.querySelectorAll('.chart-sweep-curtain').forEach((c) => c.remove())

  const bg = getEffectiveBgColor(target)

  const curtain = document.createElement('div')
  curtain.className = 'chart-sweep-curtain'
  curtain.style.position = 'absolute'
  curtain.style.top = '0'
  curtain.style.right = '0'
  curtain.style.bottom = '0'
  curtain.style.width = '100%'
  curtain.style.backgroundColor = bg
  curtain.style.zIndex = '4'
  curtain.style.pointerEvents = 'none'
  curtain.style.willChange = 'width'
  curtain.style.overflow = 'visible'

  // Glowing institutional scanline attached directly to the curtain's leading edge
  const scanline = document.createElement('div')
  scanline.className = 'chart-sweep-scanline'
  scanline.style.position = 'absolute'
  scanline.style.left = '0'
  scanline.style.top = '0'
  scanline.style.bottom = '0'
  scanline.style.width = '28px'
  scanline.style.transform = 'translateX(-100%)'
  scanline.style.background =
    'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.28) 70%, rgba(147, 197, 253, 0.85) 100%)'
  scanline.style.boxShadow = '0 0 16px rgba(59, 130, 246, 0.45)'
  scanline.style.borderRight = '1.5px solid rgba(191, 219, 254, 0.95)'
  scanline.style.pointerEvents = 'none'

  curtain.appendChild(scanline)
  target.appendChild(curtain)
}

export function triggerChartAnimation(container: HTMLElement | null, duration = 1100) {
  if (!container) return
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const target = getChartTarget(container)
  if (!target) return

  // Remove any stale clip-path properties
  target.style.removeProperty('clip-path')
  target.style.removeProperty('-webkit-clip-path')
  target.style.clipPath = ''

  let curtain = target.querySelector('.chart-sweep-curtain') as HTMLElement | null
  if (!curtain) {
    prepareChartForAnimation(container)
    curtain = target.querySelector('.chart-sweep-curtain') as HTMLElement | null
  }
  if (!curtain) return

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    try {
      curtain?.remove()
    } catch {}
  }

  // Cancel any prior animations on curtain
  try {
    curtain.getAnimations?.().forEach((a) => a.cancel())
  } catch {}

  if (typeof curtain.animate === 'function') {
    try {
      const anim = curtain.animate(
        [
          { width: '100%', opacity: 1 },
          { width: '0%', opacity: 1 },
        ],
        {
          duration,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          fill: 'forwards',
        }
      )

      anim.onfinish = cleanup
      anim.oncancel = cleanup

      // Safety timeout
      setTimeout(cleanup, duration + 60)
      return
    } catch (err) {
      console.warn('WAAPI curtain animation error, falling back to RAF:', err)
    }
  }

  // RequestAnimationFrame fallback
  const startTime = performance.now()
  const cubicBezier = (t: number) => 1 - Math.pow(1 - t, 3)

  let rafId: number
  const step = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / duration)
    const eased = cubicBezier(progress)
    const remainingWidth = (100 * (1 - eased)).toFixed(2)

    if (curtain) {
      curtain.style.width = `${remainingWidth}%`
    }

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
