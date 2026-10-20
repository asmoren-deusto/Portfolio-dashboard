import React, { useState } from 'react'
import { ArrowLeftRight, BarChart3, Bitcoin, Coins, Droplets, Globe, Landmark, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    case 'ES=F':
      return <TrendingUp className="w-full h-full p-0.5 text-blue-600 dark:text-blue-400" />
    case '^IXIC':
    case 'NQ=F':
    case 'XLK':
      return <BarChart3 className="w-full h-full p-0.5 text-cyan-600 dark:text-cyan-400" />
    case 'URTH':
    case 'ACWI':
    case 'EEM':
      return <Globe className="w-full h-full p-0.5 text-teal-600 dark:text-teal-400" />
    case '^IBEX':
    case '^STOXX50E':
    case 'FEZ':
    case 'EXW1.DE':
    case 'MEUD.PA':
    case '^N225':
    case 'EWJ':
    case 'NIY=F':
      return <Landmark className="w-full h-full p-0.5 text-indigo-600 dark:text-indigo-400" />
    case 'COWZ':
    case 'EFV':
      return <TrendingUp className="w-full h-full p-0.5 text-emerald-600 dark:text-emerald-400" />
    case 'GC=F':
      return <Coins className="w-full h-full p-0.5 text-amber-600 dark:text-amber-400" />
    case 'SI=F':
      return <Coins className="w-full h-full p-0.5 text-slate-400 dark:text-slate-300" />
    case 'BZ=F':
    case 'CL=F':
      return <Droplets className="w-full h-full p-0.5 text-sky-600 dark:text-sky-400" />
    case 'BTC-EUR':
      return <Bitcoin className="w-full h-full p-0.5 text-orange-500" />
    case 'EURUSD=X':
    case 'EURJPY=X':
      return <ArrowLeftRight className="w-full h-full p-0.5 text-emerald-600 dark:text-emerald-400" />
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

export const ISharesLogo: React.FC<{ sizeClasses: string; className?: string; title?: string }> = ({
  sizeClasses,
  className = '',
  title = 'iShares by BlackRock',
}) => {
  return (
    <div
      className={`${sizeClasses} rounded-full bg-black flex items-center justify-center shrink-0 border border-white/20 shadow-xs overflow-hidden select-none ${className}`}
      title={title}
    >
      <svg viewBox="0 0 32 32" className="w-[90%] h-[90%]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="17"
          y="23.5"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="19"
          letterSpacing="-0.5"
        >
          <tspan fill="#FA3E3E">i</tspan>
          <tspan fill="#FFFFFF">S</tspan>
        </text>
      </svg>
    </div>
  )
}

export const AzvalorLogo: React.FC<{ sizeClasses: string; className?: string; title?: string }> = ({
  sizeClasses,
  className = '',
  title = 'Azvalor Asset Management',
}) => {
  return (
    <div
      className={`${sizeClasses} rounded-full bg-[#0b2144] flex items-center justify-center shrink-0 border border-blue-400/30 shadow-xs overflow-hidden select-none ${className}`}
      title={title}
    >
      <svg viewBox="0 0 32 32" className="w-[94%] h-[94%]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="16"
          y="22.5"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="700"
          fontSize="18"
          letterSpacing="-0.6"
          fill="#FFFFFF"
        >
          az<tspan fill="#38BDF8" fontWeight="700">V</tspan>
        </text>
      </svg>
    </div>
  )
}

export const CobasLogo: React.FC<{ sizeClasses: string; className?: string; title?: string }> = ({
  sizeClasses,
  className = '',
  title = 'Cobas Asset Management',
}) => {
  return (
    <div
      className={`${sizeClasses} rounded-full bg-[#681421] flex items-center justify-center shrink-0 border border-rose-300/30 shadow-xs overflow-hidden select-none ${className}`}
      title={title}
    >
      <svg viewBox="0 0 32 32" className="w-[96%] h-[96%]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="15"
          y="24.8"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="700"
          fontSize="25.5"
          letterSpacing="-0.5"
          fill="#FFFFFF"
        >
          C
        </text>
      </svg>
    </div>
  )
}

export const CompanyLogo: React.FC<CompanyLogoProps> = React.memo(({
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
    xs: 'w-[22px] h-[22px] text-[9.5px] font-bold',
    sm: 'w-[26px] h-[26px] text-[11px] font-bold',
    md: 'w-[34px] h-[34px] text-xs font-bold',
    lg: 'w-[42px] h-[42px] text-sm font-bold',
    xl: 'w-[50px] h-[50px] text-base font-bold',
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

  const isIShares =
    Boolean(cleanDomain?.includes('ishares')) ||
    (name || '').toLowerCase().includes('ishares') ||
    Boolean(ticker && ticker.toLowerCase().includes('ishares')) ||
    Boolean(isin && (isin === 'IE000QAZP7L2' || isin === 'IE000ZYRH0Q7'))

  const isAzvalor =
    Boolean(cleanDomain?.includes('azvalor')) ||
    (name || '').toLowerCase().includes('azvalor') ||
    Boolean(isin && isin === 'ES0112611001')

  const isCobas =
    Boolean(cleanDomain?.includes('cobas')) ||
    (name || '').toLowerCase().includes('cobas') ||
    Boolean(isin && isin === 'LU1598719752')

  // Direct high-fidelity vector rendering for core funds & asset managers
  if (isIShares) {
    return <ISharesLogo sizeClasses={sizeClasses} className={className} title={`${name} (iShares)`} />
  }

  if (isAzvalor) {
    return <AzvalorLogo sizeClasses={sizeClasses} className={className} title={`${name} (Azvalor)`} />
  }

  if (isCobas) {
    return <CobasLogo sizeClasses={sizeClasses} className={className} title={`${name} (Cobas)`} />
  }

  const roundedClass = 'rounded-full'
  const containerBg = 'bg-slate-100/90 dark:bg-[#252526] shadow-sm'
  const imgFit = 'object-cover scale-100'

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

  // Smart clean initials calculation (avoids showing country codes like ES0, LU1 from ISINs)
  const getCleanInitials = (): string => {
    if (ticker && ticker.length <= 5 && !ticker.includes('=')) {
      return ticker.slice(0, 3).toUpperCase()
    }
    const cleanName = (name || '').trim()
    if (cleanName) {
      const words = cleanName.split(/\s+/).filter((w) => w.length > 1 && !/^(el|la|los|las|de|del|in|and|the|fi|clase|fond|fund)$/i.test(w))
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return cleanName.slice(0, 3).toUpperCase()
    }
    return (ticker || isin || '').slice(0, 3).toUpperCase()
  }

  const initials = getCleanInitials()
  const fallbackStr = ticker || isin || name

  const handleError = () => {
    if (attempt < 2 && cleanDomain) {
      setAttempt((prev) => prev + 1)
      setLoaded(false)
    } else {
      setAttempt(3) // Switch to initials
    }
  }

  const marketIcon = getMarketIcon(ticker)

  if (marketIcon) {
    return (
      <div
        className={cn(
          sizeClasses,
          roundedClass,
          'bg-slate-100 flex items-center justify-center shrink-0 dark:bg-slate-800/90',
          className
        )}
        title={`${name} (${ticker})`}
      >
        {marketIcon}
      </div>
    )
  }

  if (attempt >= 3 || !currentSrc) {
    return (
      <div
        className={cn(
          sizeClasses,
          roundedClass,
          `bg-gradient-to-br ${getAvatarGradient(fallbackStr)} flex items-center justify-center font-bold tracking-tight text-white shadow-md shrink-0`,
          className
        )}
        title={`${name} (${fallbackStr})`}
      >
        {initials}
      </div>
    )
  }

  return (
    <div
      className={cn(
        sizeClasses,
        'relative',
        roundedClass,
        containerBg,
        'flex items-center justify-center overflow-hidden shrink-0 transition-all',
        className
      )}
    >
      <img
        src={currentSrc}
        alt={name}
        className={`w-full h-full ${imgFit} ${roundedClass} transition-all duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
      {!loaded && (
        <div className="absolute inset-0 bg-white/[0.04] animate-pulse rounded-full" />
      )}
    </div>
  )
})
