import React, { useEffect, useRef, useState } from 'react'
import { useSpring, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number | null | undefined
  format?: (n: number) => string
  className?: string
  highlightOnChange?: boolean
  springConfig?: { stiffness?: number; damping?: number; mass?: number }
  'data-private'?: boolean | string
}

export function AnimatedNumber({
  value,
  format,
  className,
  highlightOnChange = true,
  springConfig = { stiffness: 100, damping: 22, mass: 0.8 },
  'data-private': dataPrivate = true,
}: AnimatedNumberProps) {
  const numericValue = typeof value === 'number' && !isNaN(value) ? value : 0
  const isAvailable = typeof value === 'number' && !isNaN(value)

  const spring = useSpring(numericValue, springConfig)
  const [displayStr, setDisplayStr] = useState<string>(() => {
    if (!isAvailable) return '—'
    return format ? format(numericValue) : numericValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  })

  const [highlightClass, setHighlightClass] = useState<string>('')
  const prevValueRef = useRef<number>(numericValue)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (!isAvailable) {
      setDisplayStr('—')
      return
    }

    if (isFirstRender.current) {
      isFirstRender.current = false
      spring.jump(numericValue)
      setDisplayStr(format ? format(numericValue) : numericValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      prevValueRef.current = numericValue
      return
    }

    // Directional highlight on change
    if (highlightOnChange && Math.abs(numericValue - prevValueRef.current) > 0.001) {
      const isPositive = numericValue > prevValueRef.current
      setHighlightClass(isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400')
      const timer = setTimeout(() => setHighlightClass(''), 800)
      prevValueRef.current = numericValue
      spring.set(numericValue)
      return () => clearTimeout(timer)
    }

    spring.set(numericValue)
    prevValueRef.current = numericValue
  }, [numericValue, isAvailable, format, highlightOnChange, spring])

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      if (!isAvailable) return
      setDisplayStr(
        format
          ? format(latest)
          : latest.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      )
    })
    return () => unsubscribe()
  }, [spring, format, isAvailable])

  if (!isAvailable) {
    return (
      <span data-private={dataPrivate} className={cn('tabular-nums', className)}>
        —
      </span>
    )
  }

  return (
    <motion.span
      data-private={dataPrivate}
      className={cn(
        'tabular-nums transition-colors duration-500 inline-block',
        highlightClass,
        className
      )}
    >
      {displayStr}
    </motion.span>
  )
}
