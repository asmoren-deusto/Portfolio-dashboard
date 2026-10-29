import React from 'react'
import { cn } from '@/lib/utils'

interface MiniDonutProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  color?: string
  active?: boolean
}

export const MiniDonut = React.memo(function MiniDonut({
  value,
  size = 24,
  strokeWidth = 3.2,
  className,
  color,
  active = false,
}: MiniDonutProps) {
  const clamped = Math.max(0, Math.min(100, value || 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn(
        'shrink-0 transition-transform duration-200 ease-out',
        active && 'scale-110',
        className
      )}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-slate-200/85 dark:stroke-white/[0.08]"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        stroke={color || undefined}
        style={{
          transition: 'stroke-dashoffset 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: active && color ? `drop-shadow(0 0 3px ${color}80)` : undefined,
        }}
        className={!color ? 'stroke-blue-500 dark:stroke-blue-400' : undefined}
      />
    </svg>
  )
})
