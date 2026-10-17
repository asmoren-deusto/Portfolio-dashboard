/**
 * Helper to trigger fluid entrance & timeline sweep animations for lightweight-charts.
 * Animates the series canvas plot area with a left-to-right sweep reveal
 * matching the visual delight of institutional financial terminal charts.
 * 
 * Uses a pure GPU-accelerated translateX reveal overlay with an integrated glowing scanline.
 * 100% immune to engine-specific CSS table-cell clipping bugs and box-solving quirks in
 * Mozilla Firefox (Gecko), Safari (WebKit), and Chrome/Edge (Blink).
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
  const isDark = document.documentElement.classList.contains('dark')
  // Use solid card background (#1e1e1e in dark mode, #ffffff in light mode)
  // to avoid semi-transparent ghosting or oklab color-interpolation artifacts in Firefox
  return isDark ? '#1e1e1e' : '#ffffff'
}

export function prepareChartForAnimation(container: HTMLElement | null) {
  if (!container) return

  const target = getChartTarget(container)
  if (!target) return

  // Ensure target has relative positioning and overflow hidden for the translateX reveal
  if (window.getComputedStyle(target).position === 'static') {
    target.style.position = 'relative'
  }
  if (window.getComputedStyle(target).overflow !== 'hidden') {
    target.style.overflow = 'hidden'
  }

  // Remove existing curtains and cancel any running animations
  target.querySelectorAll('.chart-sweep-curtain').forEach((c) => {
    try {
      (c as any).getAnimations?.().forEach((a: any) => a.cancel())
      c.remove()
    } catch {}
  })

  const bg = getEffectiveBgColor(target)

  // Full-width curtain anchored at left: 0, top: 0, covering the canvas plot area
  const curtain = document.createElement('div')
  curtain.className = 'chart-sweep-curtain'
  curtain.style.position = 'absolute'
  curtain.style.top = '0'
  curtain.style.left = '0'
  curtain.style.width = '100%'
  curtain.style.height = '100%'
  curtain.style.backgroundColor = bg
  curtain.style.zIndex = '10'
  curtain.style.pointerEvents = 'none'
  curtain.style.transform = 'translateX(0%)'
  curtain.style.willChange = 'transform'

  // Glowing institutional scanline attached directly to the curtain's leading reveal edge
  const scanline = document.createElement('div')
  scanline.className = 'chart-sweep-scanline'
  scanline.style.position = 'absolute'
  scanline.style.left = '0'
  scanline.style.top = '0'
  scanline.style.bottom = '0'
  scanline.style.width = '32px'
  scanline.style.transform = 'translateX(-100%)'
  scanline.style.background =
    'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.28) 60%, rgba(147, 197, 253, 0.9) 100%)'
  scanline.style.boxShadow = '0 0 16px rgba(59, 130, 246, 0.45)'
  scanline.style.borderRight = '2px solid rgba(191, 219, 254, 0.95)'
  scanline.style.pointerEvents = 'none'

  curtain.appendChild(scanline)
  target.appendChild(curtain)
}

export function triggerChartAnimation(container: HTMLElement | null, duration = 1100) {
  if (!container) return

  const target = getChartTarget(container)
  if (!target) return

  if (window.getComputedStyle(target).overflow !== 'hidden') {
    target.style.overflow = 'hidden'
  }

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
    (curtain as any).getAnimations?.().forEach((a: any) => a.cancel())
  } catch {}

  // Web Animations API with pure GPU compositor transform: translateX
  if (typeof curtain.animate === 'function') {
    try {
      const anim = curtain.animate(
        [
          { transform: 'translateX(0%)' },
          { transform: 'translateX(100%)' },
        ],
        {
          duration,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      )

      anim.onfinish = cleanup
      anim.oncancel = cleanup

      // Safety timeout
      setTimeout(cleanup, duration + 100)
      return
    } catch (err) {
      console.warn('WAAPI curtain animation error, falling back to RAF:', err)
    }
  }

  // RequestAnimationFrame GPU fallback
  const startTime = performance.now()
  const cubicBezier = (t: number) => 1 - Math.pow(1 - t, 3)

  let rafId: number
  const step = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / duration)
    const eased = cubicBezier(progress)
    const tx = (100 * eased).toFixed(2)

    if (curtain) {
      curtain.style.transform = `translateX(${tx}%)`
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
  }, duration + 100)
}
