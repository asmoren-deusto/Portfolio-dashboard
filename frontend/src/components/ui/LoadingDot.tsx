import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingDotProps {
  className?: string
  title?: string
}

export function LoadingDot({ className, title = 'Actualizando...' }: LoadingDotProps) {
  return (
    <span className={cn('relative flex h-2 w-2 shrink-0', className)} title={title}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
    </span>
  )
}
