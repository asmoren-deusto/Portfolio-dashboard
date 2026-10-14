import { useId } from 'react'

interface SparklineProps {
  data: number[]
  width?: number | string
  height?: number
  color?: string
  gradientId?: string
  strokeWidth?: number
  className?: string
  filled?: boolean
}

export function Sparkline({
  data,
  width = '100%',
  height = 36,
  color = '#2dd4bf',
  strokeWidth = 1.75,
  className,
  filled = true,
}: SparklineProps) {
  const uniqueId = useId()
  const gradId = `spark-grad-${uniqueId.replace(/:/g, '')}`

  if (!data || data.length < 2) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center text-[10px] text-[var(--au-faint)]"
      >
        —
      </div>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const paddingY = 4
  const usableHeight = height - paddingY * 2
  const stepX = 100 / (data.length - 1)

  const points = data.map((val, idx) => {
    const x = idx * stepX
    const normalizedY = (val - min) / range
    const y = height - paddingY - normalizedY * usableHeight
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const pathD = `M ${points.join(' L ')}`
  const fillD = `${pathD} L 100,${height} L 0,${height} Z`

  return (
    <div className={className} style={{ width, height }}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {filled && (
          <path d={fillD} fill={`url(#${gradId})`} />
        )}

        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
