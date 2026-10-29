import React, { createContext, useContext, useCallback } from 'react'
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
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
  }, [])

  return (
    <CardContext.Provider value={{ loading }}>
      <div
        onMouseMove={handleMouseMove}
        className={cn(
          'group/card relative rounded-[22px] overflow-hidden transition-[border-color,box-shadow,background-color] duration-200 ease-out cursor-card',
          'bg-gradient-to-b from-white via-white/98 to-slate-50/70 border border-slate-200/80 shadow-card hover:shadow-card-hover hover:border-slate-300/90',
          'dark:bg-gradient-to-b dark:from-[#212124] dark:via-[#1e1e20] dark:to-[#18181a] dark:border-white/[0.08] dark:hover:border-white/[0.16]',
          glass && 'backdrop-blur-md',
          className
        )}
      >
        {/* Interactive zero-rerender cursor spotlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
          style={{
            background:
              'radial-gradient(480px circle at var(--mouse-x, 50%) var(--mouse-y, 0%), rgba(59, 130, 246, 0.035), transparent 60%)',
          }}
        />
        {/* Subtle shine line at top */}
        <div className="pointer-events-none absolute -top-px inset-x-6 h-px bg-gradient-to-r from-transparent via-slate-900/[0.08] dark:via-white/[0.18] to-transparent z-10" />
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
    <h2 className={cn('text-[15px] font-semibold text-slate-900 dark:text-white tracking-[-0.02em] flex items-center gap-2 font-inter translate-y-[1px]', className)}>
      <span>{children}</span>
      {isUpdating && <LoadingDot />}
    </h2>
  )
}
