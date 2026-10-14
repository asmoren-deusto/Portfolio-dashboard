import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
  formatter?: (value: number) => string
}

export function CountUp({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  duration = 0.6,
  className,
  formatter,
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValue = useRef(value)

  useEffect(() => {
    const start = prevValue.current
    const end = value
    if (start === end) return

    const startTime = performance.now()
    const durationMs = duration * 1000

    let animationFrameId: number

    const update = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * ease

      setDisplayValue(current)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(update)
      } else {
        prevValue.current = end
        setDisplayValue(end)
      }
    }

    animationFrameId = requestAnimationFrame(update)

    return () => cancelAnimationFrame(animationFrameId)
  }, [value, duration])

  if (formatter) {
    return <span className={className}>{formatter(displayValue)}</span>
  }

  const formatted = displayValue.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
