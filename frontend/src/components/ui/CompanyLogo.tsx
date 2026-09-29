import React, { useState } from 'react'
import { ArrowLeftRight, BarChart3, Bitcoin, Coins, Droplets, Globe, Landmark, TrendingUp } from 'lucide-react'

interface CompanyLogoProps {
  ticker?: string
  isin?: string
  name: string
  logoUrl?: string | null
  domain?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const ISIN_DOMAINS: Record<string, string> = {
  'IE00BYX5NX33': 'fidelity.com',
  'IE00BYX5NH74': 'fidelity.com',
  'LU0261952682': 'fidelity.com',
  'IE00BYX5M476': 'fidelity.com',
  'LU1598719752': 'cobasam.com',
  'ES0112611001': 'azvalor.com',
  'LU0302296495': 'dnb.no',
  'IE000QAZP7L2': 'ishares.com',
  'IE000ZYRH0Q7': 'ishares.com',
  '0192#0011': 'indexacapital.com',
  '0201G': 'kutxabank.es',
  'LU0996182563': 'amundi.es',
  'LU2145461757': 'robeco.com',
  'IE00BM95B621': 'polarcapital.co.uk',
  'LU1623762843': 'carmignac.es',
}

function getMarketIcon(ticker?: string): React.ReactNode {
  switch (ticker) {
    case '^GSPC':
      return <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    case '^IXIC':
      return <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
    case 'URTH':
    case 'EEM':
      return <Globe className="w-5 h-5 text-teal-600 dark:text-teal-400" />
    case '^IBEX':
    case '^STOXX50E':
    case '^N225':
      return <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
    case 'GC=F':
      return <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" />
    case 'BZ=F':
      return <Droplets className="w-5 h-5 text-sky-600 dark:text-sky-400" />
    case 'BTC-EUR':
      return <Bitcoin className="w-5 h-5 text-orange-500" />
    case 'EURUSD=X':
    case 'EURJPY=X':
      return <ArrowLeftRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    default:
      return null
  }
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
  isin,
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

  let targetDomain = domain
  if (!targetDomain && isin && ISIN_DOMAINS[isin]) {
    targetDomain = ISIN_DOMAINS[isin]
  }
  if (!targetDomain) {
    const nl = (name || '').toLowerCase()
    if (nl.includes('indexa')) targetDomain = 'indexacapital.com'
    else if (nl.includes('cobas')) targetDomain = 'cobasam.com'
    else if (nl.includes('azvalor')) targetDomain = 'azvalor.com'
    else if (nl.includes('fidelity')) targetDomain = 'fidelity.com'
    else if (nl.includes('ishares') || nl.includes('blackrock')) targetDomain = 'ishares.com'
    else if (nl.includes('vanguard')) targetDomain = 'vanguard.com'
    else if (nl.includes('robeco')) targetDomain = 'robeco.com'
    else if (nl.includes('polar')) targetDomain = 'polarcapital.co.uk'
    else if (nl.includes('dnb')) targetDomain = 'dnb.no'
    else if (nl.includes('amundi')) targetDomain = 'amundi.es'
    else if (nl.includes('carmignac')) targetDomain = 'carmignac.es'
    else if (nl.includes('kutxabank') || nl.includes('baskepensiones')) targetDomain = 'kutxabank.es'
    else if (nl.includes('bbva')) targetDomain = 'bbva.es'
    else if (nl.includes('myinvestor')) targetDomain = 'myinvestor.es'
  }
  const cleanDomain = targetDomain?.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

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
  const fallbackStr = ticker || isin || name
  const initials = fallbackStr.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || name.slice(0, 2).toUpperCase()

  const handleError = () => {
    if (attempt < 2 && cleanDomain) {
      setAttempt((prev) => prev + 1)
      setLoaded(false)
    } else {
      setAttempt(3) // Switch to initials
    }
  }

  const roundedClass = size === 'xs' ? 'rounded-lg' : 'rounded-xl'
  const marketIcon = getMarketIcon(ticker)

  if (marketIcon) {
    return (
      <div
        className={`${sizeClasses} ${roundedClass} bg-slate-100 border border-slate-200/90 flex items-center justify-center shrink-0 dark:bg-slate-800/90 dark:border-white/10 ${className}`}
        title={`${name} (${ticker})`}
      >
        {marketIcon}
      </div>
    )
  }

  if (attempt >= 3 || !currentSrc) {
    return (
      <div
        className={`${sizeClasses} ${roundedClass} bg-gradient-to-br ${getAvatarGradient(fallbackStr)} flex items-center justify-center font-bold tracking-tight text-white shadow-md ring-1 ring-white/15 shrink-0 ${className}`}
        title={`${name} (${fallbackStr})`}
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
