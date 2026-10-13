import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Globe,
  Layers,
  TrendingUp,
  List,
} from 'lucide-react'
import { isNativePlatform } from '@/api/config'
import { cn } from '@/lib/utils'

interface TabItem {
  to: string
  icon: React.ElementType
  label: string
}

export const MobileTabBar: React.FC = () => {
  if (!isNativePlatform()) {
    return null
  }

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(10)
      } catch {
        // ignore if not supported
      }
    }
  }

  const TABS: TabItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Resumen' },
    { to: '/market', icon: Globe, label: 'Mercado' },
    { to: '/positions', icon: Layers, label: 'Cartera' },
    { to: '/analytics', icon: TrendingUp, label: 'Analítica' },
    { to: '/transactions', icon: List, label: 'Órdenes' },
  ]

  return (
    <nav
      aria-label="Navegación móvil inferior"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#161616]/96 backdrop-blur-xl border-t border-slate-200/85 dark:border-white/[0.08] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] px-2 pt-2 pb-[max(env(safe-area-inset-bottom,0px),14px)] select-none transition-all"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => triggerHaptic()}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 group',
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    className={cn(
                      'transition-transform duration-150',
                      isActive ? 'scale-108 text-blue-600 dark:text-blue-400' : 'group-hover:scale-105'
                    )}
                  />
                </div>
                <span className="text-[10px] tracking-tight mt-1 line-clamp-1">
                  {label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-3 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default MobileTabBar
