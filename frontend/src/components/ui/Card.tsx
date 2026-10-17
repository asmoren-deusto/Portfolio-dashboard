import React, { createContext, useContext } from 'react'
import { cn } from '@/lib/utils'
import { LoadingDot } from '@/components/ui/LoadingDot'

export { LoadingDot }

interface CardContextValue {
  loading?: boolean
}

export const CardContext = createContext<CardContextValue>({ loading: false })

interface CardProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
  delay?: number
  loading?: boolean
}

export function Card({ children, className, glass = false, loading = false }: CardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    el.style.setProperty('--mouse-opacity', '1')
  }

  const handleMouseLeave = () => {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--mouse-opacity', '0')
  }

  return (
    <CardContext.Provider value={{ loading }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative rounded-2xl overflow-hidden transition-[border-color,box-shadow,background-color] duration-200 ease-out cursor-card',
          'bg-white/95 border border-slate-200/80 shadow-card hover:shadow-card-hover hover:border-slate-300/90',
          'dark:bg-[#1e1e1e]/96 dark:border-white/[0.08] dark:hover:border-white/[0.15]',
          glass && 'backdrop-blur-md',
          className
        )}
      >
        {/* Subtle interactive spotlight glow on hover (zero React re-renders) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 z-0"
          style={{
            opacity: 'var(--mouse-opacity, 0)',
            background: 'radial-gradient(350px circle at var(--mouse-x, -1000px) var(--mouse-y, -1000px), rgba(59, 130, 246, 0.06), transparent 75%)',
          }}
        />
        {/* Subtle shine line at top */}
        <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-900/[0.06] to-transparent dark:via-white/[0.12] z-10" />
        <div className="relative z-10 flex flex-col flex-1 min-h-0 w-full h-full">
          {children}
        </div>
      </div>
    </CardContext.Provider>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between px-5 sm:px-6 pt-3.5 pb-2.5 border-b border-slate-100 dark:border-white/[0.05]', className)}>
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className,
  loading,
}: {
  children: React.ReactNode
  className?: string
  loading?: boolean
}) {
  const ctx = useContext(CardContext)
  const isUpdating = loading !== undefined ? loading : ctx.loading

  return (
    <h2 className={cn('text-[15px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2', className)}>
      <span>{children}</span>
      {isUpdating && <LoadingDot />}
    </h2>
  )
}
