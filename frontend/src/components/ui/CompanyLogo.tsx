import React, { useState } from 'react'

interface CompanyLogoProps {
  ticker: string
  name: string
  logoUrl?: string
  domain?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

// Generate consistent, sophisticated gradient based on ticker letters
function getAvatarGradient(str: string): string {
  const gradients = [
    'from-blue-600 via-indigo-600 to-violet-700',
    'from-emerald-500 via-teal-600 to-cyan-700',
    'from-violet-600 via-purple-600 to-fuchsia-800',
    'from-amber-500 via-orange-600 to-rose-700',
    'from-rose-500 via-pink-600 to-purple-700',
    'from-cyan-500 via-sky-600 to-blue-700',
    'from-indigo-600 via-blue-600 to-sky-700',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % gradients.length
  return gradients[index]
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  ticker,
  name,
  logoUrl,
  domain,
  size = 'md',
  className = '',
}) => {
  // Step 0: logoUrl or Google favicon 128px
  // Step 1: Unavatar
  // Step 2: DuckDuckGo
  // Step 3: Initials fallback
  const [attempt, setAttempt] = useState<number>(0)
  const [loaded, setLoaded] = useState<boolean>(false)

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] font-bold',
    sm: 'w-7 h-7 text-xs font-bold',
    md: 'w-10 h-10 text-xs font-bold',
    lg: 'w-12 h-12 text-sm font-bold',
    xl: 'w-14 h-14 text-base font-bold',
  }[size]

  const imgPadding = {
    xs: 'p-0.5',
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
    xl: 'p-2.5',
  }[size]

  const cleanDomain = domain?.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  const getSource = (step: number) => {
    if (!cleanDomain && !logoUrl) return null
    if (step === 0) {
      if (logoUrl) return logoUrl
      if (cleanDomain) return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`
      return null
    }
    if (step === 1 && cleanDomain) {
      return `https://unavatar.io/${cleanDomain}`
    }
    if (step === 2 && cleanDomain) {
      return `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`
    }
    return null
  }

  const currentSrc = getSource(attempt)
  const initials = ticker.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || name.slice(0, 2).toUpperCase()

  const handleError = () => {
    if (attempt < 2 && cleanDomain) {
      setAttempt((prev) => prev + 1)
      setLoaded(false)
    } else {
      setAttempt(3) // Switch to initials
    }
  }

  const roundedClass = size === 'xs' ? 'rounded-lg' : 'rounded-xl'

  if (attempt >= 3 || !currentSrc) {
    return (
      <div
        className={`${sizeClasses} ${roundedClass} bg-gradient-to-br ${getAvatarGradient(ticker)} flex items-center justify-center font-bold tracking-tight text-white shadow-md ring-1 ring-white/15 shrink-0 ${className}`}
        title={`${name} (${ticker})`}
      >
        {initials}
      </div>
    )
  }

  return (
    <div
      className={`${sizeClasses} ${imgPadding} relative ${roundedClass} bg-slate-100/90 border border-slate-200/90 shadow-sm flex items-center justify-center overflow-hidden shrink-0 transition-all dark:bg-slate-800/90 dark:border-white/10 ${className}`}
    >
      <img
        src={currentSrc}
        alt={name}
        className={`w-full h-full object-contain ${size === 'xs' ? 'rounded-sm' : 'rounded-md'} transition-all duration-300 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
      {!loaded && (
        <div className="absolute inset-0 bg-white/[0.04] animate-pulse rounded-xl" />
      )}
    </div>
  )
}
