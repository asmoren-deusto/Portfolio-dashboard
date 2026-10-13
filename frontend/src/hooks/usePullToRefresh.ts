import { useEffect, useState, useRef } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  disabled?: boolean
  threshold?: number
}

export function usePullToRefresh({
  onRefresh,
  disabled = false,
  threshold = 65,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const startYRef = useRef(0)
  const canPullRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const hasVibratedRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (disabled) return

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        startYRef.current = e.touches[0].clientY
        canPullRef.current = true
        hasVibratedRef.current = false
      } else {
        canPullRef.current = false
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPullRef.current) return
      if (window.scrollY > 0) {
        canPullRef.current = false
        pullDistanceRef.current = 0
        setPullDistance(0)
        setIsPulling(false)
        return
      }

      const currentY = e.touches[0].clientY
      const diff = currentY - startYRef.current

      if (diff > 0) {
        // Friction damping
        const distance = Math.min(diff * 0.45, 95)
        pullDistanceRef.current = distance
        setPullDistance(distance)
        setIsPulling(true)

        if (distance >= threshold && !hasVibratedRef.current) {
          hasVibratedRef.current = true
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate?.(12)
          }
        }
      } else {
        pullDistanceRef.current = 0
        setPullDistance(0)
        setIsPulling(false)
        hasVibratedRef.current = false
      }
    }

    const handleTouchEnd = async () => {
      if (!canPullRef.current) return
      canPullRef.current = false
      hasVibratedRef.current = false

      const currentDistance = pullDistanceRef.current
      if (currentDistance >= threshold) {
        setIsPulling(false)
        pullDistanceRef.current = 0
        setPullDistance(0)
        try {
          await onRefreshRef.current()
        } catch (err) {
          console.warn('Error during pull to refresh:', err)
        }
      } else {
        pullDistanceRef.current = 0
        setPullDistance(0)
        setIsPulling(false)
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [disabled, threshold])

  return { pullDistance, isPulling }
}
