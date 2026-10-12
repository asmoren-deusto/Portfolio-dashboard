import React from 'react'
import { cn } from '@/lib/utils'

interface AppLogoProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  withGlow?: boolean
  animated?: boolean
}

const SIZE_MAP = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className,
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 40

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0 select-none', className)}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* Clean Flat Subtle Squircle SVG */}
      <svg
        viewBox="0 0 64 64"
        width={pixelSize}
        height={pixelSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 block"
      >
        <defs>
          <linearGradient id="logoFlatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Flat Subtle Blue Squircle Base */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="16"
          fill="url(#logoFlatGrad)"
        />

        {/* White Trending Up Arrow */}
        <g transform="translate(14, 14) scale(1.5)">
          <polyline
            points="22 7 13.5 15.5 8.5 10.5 2 17"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="16 7 22 7 22 13"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  )
}

export default AppLogo
