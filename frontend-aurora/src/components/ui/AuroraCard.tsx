import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AuroraCardProps extends HTMLMotionProps<'div'> {
  title?: string
  subtitle?: string
  eyebrow?: string
  badge?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  hoverEffect?: boolean
}

export function AuroraCard({
  title,
  subtitle,
  eyebrow,
  badge,
  action,
  children,
  className,
  headerClassName,
  contentClassName,
  hoverEffect = false,
  ...props
}: AuroraCardProps) {
  const hasHeader = Boolean(title || subtitle || eyebrow || badge || action)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'au-card flex flex-col overflow-hidden',
        hoverEffect && 'au-card-hover hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex items-center justify-between px-5 pt-4 pb-2 border-b border-[var(--au-border)]',
            headerClassName
          )}
        >
          <div className="flex flex-col min-w-0 pr-2">
            {eyebrow && <span className="au-eyebrow mb-0.5">{eyebrow}</span>}
            <div className="flex items-center gap-2">
              {title && <h3 className="au-title truncate">{title}</h3>}
              {badge}
            </div>
            {subtitle && (
              <p className="text-[11px] text-[var(--au-muted)] truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn('p-5 flex-1 min-h-0', contentClassName)}>
        {children}
      </div>
    </motion.div>
  )
}
