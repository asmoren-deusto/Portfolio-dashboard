import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
  delay?: number
}

export function Card({ children, className, glass = true }: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-200',
        'bg-white/95 border border-slate-200/90 shadow-sm shadow-slate-900/5 hover:border-slate-300',
        'dark:bg-[#111625]/90 dark:border-white/[0.08] dark:shadow-xl dark:shadow-black/20 dark:hover:border-white/[0.14]',
        glass && 'backdrop-blur-md',
        className
      )}
    >
      {/* Subtle shine line at top */}
      <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent dark:via-white/10" />
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between px-5 sm:px-6 pt-3.5 pb-2.5 border-b border-slate-100 dark:border-white/[0.04]', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-[15px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2', className)}>
      {children}
    </h2>
  )
}
