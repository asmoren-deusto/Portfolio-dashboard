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
  withGlow = true,
  animated = false,
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 40

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0 group select-none', className)}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* Soft Ambient Blue Glow */}
      {withGlow && (
        <div
          className={cn(
            'absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 blur-md opacity-50 transition-all duration-300',
            animated && 'group-hover:opacity-80 group-hover:scale-105'
          )}
          style={{ width: pixelSize, height: pixelSize }}
        />
      )}

      {/* SVG Icon Matching Exactly the Blue TrendingUp Squircle */}
      <svg
        viewBox="0 0 64 64"
        width={pixelSize}
        height={pixelSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('relative z-10 transition-transform duration-300 drop-shadow-sm', animated && 'group-hover:scale-105')}
      >
        <defs>
          <linearGradient id="logoBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="logoRimLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
          <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#1e3a8a" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Blue Squircle Base */}
        <rect
          x="3.5"
          y="3.5"
          width="57"
          height="57"
          rx="17"
          fill="url(#logoBlueGrad)"
          filter="url(#logoShadow)"
        />

        {/* Top Rim Highlight */}
        <rect
          x="3.5"
          y="3.5"
          width="57"
          height="57"
          rx="17"
          stroke="url(#logoRimLight)"
          strokeWidth="1.5"
        />

        {/* White Trending Up Arrow */}
        <g transform="translate(14, 14) scale(1.5)">
          <polyline
            points="22 7 13.5 15.5 8.5 10.5 2 17"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="16 7 22 7 22 13"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  )
}
export default AppLogo
