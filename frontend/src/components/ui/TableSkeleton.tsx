import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TableSkeletonRowsProps {
  rows?: number
  cols?: number
  hasLogo?: boolean
  colWidths?: string[]
  className?: string
}

export function TableSkeletonRows({
  rows = 5,
  cols = 8,
  hasLogo = true,
  colWidths = [],
  className,
}: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr
          key={rIdx}
          className={cn(
            'border-b border-slate-100 dark:border-white/[0.03] transition-colors',
            className
          )}
        >
          {Array.from({ length: cols }).map((_, cIdx) => {
            const isFirst = cIdx === 0
            const isLast = cIdx === cols - 1
            const width = colWidths[cIdx] || (isFirst ? 'w-48 sm:w-64' : isLast ? 'w-14' : 'w-20')

            return (
              <td key={cIdx} className="px-4 py-3.5">
                {isFirst && hasLogo ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl skeleton-shimmer shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="h-3.5 rounded-md skeleton-shimmer w-3/4" />
                      <div className="h-2.5 rounded-md skeleton-shimmer w-2/5" />
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'h-3.5 rounded-md skeleton-shimmer',
                      cIdx > 1 ? 'ml-auto' : '',
                      width
                    )}
                  />
                )}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

interface TableTopLoadingProps {
  isFetching?: boolean
  color?: string
}

export function TableTopLoading(_props?: TableTopLoadingProps) {
  return null
}

interface CardSkeletonGridProps {
  count?: number
  className?: string
}

export function CardSkeletonGrid({ count = 6, className }: CardSkeletonGridProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 bg-white/95 dark:bg-[#1e1e1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 rounded skeleton-shimmer w-3/4" />
              <div className="h-3 rounded skeleton-shimmer w-1/3" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
            <div className="space-y-1.5">
              <div className="h-2.5 rounded skeleton-shimmer w-1/2" />
              <div className="h-4 rounded skeleton-shimmer w-3/4" />
            </div>
            <div className="space-y-1.5 text-right">
              <div className="h-2.5 rounded skeleton-shimmer w-1/2 ml-auto" />
              <div className="h-4 rounded skeleton-shimmer w-3/4 ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
