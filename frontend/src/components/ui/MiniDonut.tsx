import React from 'react'

interface MiniDonutProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function MiniDonut({ value, size = 24, strokeWidth = 3.5, className }: MiniDonutProps) {
  const clamped = Math.max(0, Math.min(100, value || 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-slate-200 dark:stroke-white/[0.08]"
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
        className="stroke-blue-500 dark:stroke-blue-400 transition-all duration-500"
      />
    </svg>
  )
}
