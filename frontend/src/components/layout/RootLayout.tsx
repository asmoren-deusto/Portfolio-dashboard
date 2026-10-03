import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { useEffect } from 'react'
import { Menu, TrendingUp, PanelLeftOpen } from 'lucide-react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { HeaderActions } from '@/components/layout/HeaderActions'

export function RootLayout() {
  const location = useLocation()
  const { theme, privacyMode, toggleMobileSidebar, sidebarCollapsed, toggleSidebarCollapsed, currentUser } = useAppStore()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // If no user is logged in, redirect to /login
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className={`relative flex min-h-screen bg-[#f8fafc] text-slate-800 dark:bg-[#090d16] dark:text-slate-100 overflow-x-hidden selection:bg-blue-500/20 selection:text-blue-700 dark:selection:bg-blue-500/30 dark:selection:text-blue-200 transition-colors duration-200${privacyMode ? ' privacy-mode' : ''}`}>
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed top-0 left-1/3 w-[800px] h-[350px] bg-blue-500/[0.04] blur-[140px] rounded-full -z-10 dark:bg-blue-600/[0.04]" />
      <div className="pointer-events-none fixed top-1/4 right-10 w-[500px] h-[300px] bg-violet-500/[0.03] blur-[120px] rounded-full -z-10 dark:bg-violet-600/[0.03]" />

      <Sidebar />

      <div className={`flex flex-1 flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-0 max-w-full' : 'ml-0 md:ml-[230px] max-w-full md:max-w-[calc(100vw-230px)]'}`}>
        {/* Mobile / Collapsed Desktop Header Bar */}
        <header className={`sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-white/90 dark:bg-[#0f1424]/90 backdrop-blur-md border-b border-slate-200/90 dark:border-white/[0.08] ${!sidebarCollapsed ? 'md:hidden' : ''}`}>
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleMobileSidebar}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all"
              aria-label="Abrir menú"
              title="Abrir menú lateral"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                <TrendingUp size={16} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                Portfolio<span className="text-blue-600 dark:text-blue-400">Pro</span>
              </span>
            </div>
          </div>

          {/* Quick pin back button on desktop */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleSidebarCollapsed}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] transition-all"
              title="Fijar el panel lateral de nuevo"
            >
              <PanelLeftOpen size={14} />
              <span>Fijar panel</span>
            </button>
          </div>

          {/* User controls on Mobile in top sticky header */}
          <div className="flex md:hidden items-center">
            <HeaderActions compact />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 px-4 py-3 sm:px-6 sm:py-4 md:px-7 md:py-4.5">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
