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
      {/* Dynamic ambient backdrop glow */}
      {withGlow && (
        <div
          className={cn(
            'absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/30 via-blue-600/30 to-violet-600/30 blur-md opacity-70 transition-all duration-500',
            animated && 'group-hover:opacity-100 group-hover:scale-110'
          )}
          style={{ width: pixelSize, height: pixelSize }}
        />
      )}

      {/* SVG Icon */}
      <svg
        viewBox="0 0 64 64"
        width={pixelSize}
        height={pixelSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('relative z-10 drop-shadow-sm transition-transform duration-300', animated && 'group-hover:scale-105')}
      >
        <defs>
          <linearGradient id="appLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0f1d" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          <linearGradient id="appLogoBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.75" />
          </linearGradient>

          <linearGradient id="appLogoSurge" x1="10%" y1="100%" x2="90%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>

          <linearGradient id="appLogoFold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          <linearGradient id="appLogoGlass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>

          <radialGradient id="appLogoRadial" cx="50%" cy="35%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <filter id="appLogoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#020617" floodOpacity="0.7" />
          </filter>

          <filter id="appLogoBloom" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="16"
          fill="url(#appLogoBg)"
          stroke="url(#appLogoBorder)"
          strokeWidth="1.5"
        />

        <rect x="3" y="3" width="58" height="28" rx="15" fill="url(#appLogoGlass)" />

        <circle cx="34" cy="28" r="18" fill="url(#appLogoRadial)" />

        <path
          d="M26 15 C37 15 47 21 47 31 C47 39 39 44 28 44 C25 44 23 43 21 42"
          fill="none"
          stroke="url(#appLogoFold)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
          filter="url(#appLogoShadow)"
        />

        <path
          d="M19 49 L19 23 C19 18 24 15 29 15 L37 15"
          fill="none"
          stroke="url(#appLogoSurge)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#appLogoShadow)"
        />

        <path
          d="M19 41 L31 29 L41 33 L51 17"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#appLogoBloom)"
        />

        <polygon points="51,17 43,18 47,24" fill="#34d399" />
        <circle cx="51" cy="17" r="2.5" fill="#ffffff" />
      </svg>
    </div>
  )
}
export default AppLogo
