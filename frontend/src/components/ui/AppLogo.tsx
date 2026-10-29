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
  const uid = React.useId().replace(/:/g, '')

  return (
    <div
      className={cn(
        'group/logo relative inline-flex items-center justify-center shrink-0 select-none transition-transform duration-200 ease-out hover:scale-[1.03]',
        className
      )}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <svg
        viewBox="0 0 64 64"
        width={pixelSize}
        height={pixelSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 block"
      >
        <defs>
          <linearGradient id={`logoBg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id={`logoArea-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Modern Squircle Base */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="16"
          fill={`url(#logoBg-${uid})`}
        />

        {/* Subtle Inner Glass Rim */}
        <rect
          x="2.75"
          y="2.75"
          width="58.5"
          height="58.5"
          rx="15.25"
          stroke="#ffffff"
          strokeOpacity="0.22"
          strokeWidth="1.2"
        />

        {/* Dynamic Area Fill + Trend Curve */}
        <g transform="translate(14, 14) scale(1.5)">
          <path
            d="M2 17 L8.5 10.5 L13.5 15.5 L22 7 L22 20 L2 20 Z"
            fill={`url(#logoArea-${uid})`}
          />
          <polyline
            points="22 7 13.5 15.5 8.5 10.5 2 17"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="16 7 22 7 22 13"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Subtle glowing apex node */}
          <circle
            cx="22"
            cy="7"
            r="1.9"
            fill="#93c5fd"
            className="svg-pulse-ring"
          />
        </g>
      </svg>
    </div>
  )
}

export default AppLogo
