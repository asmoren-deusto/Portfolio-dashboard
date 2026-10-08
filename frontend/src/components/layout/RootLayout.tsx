import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { useEffect } from 'react'
import { Menu, TrendingUp, PanelLeftOpen } from 'lucide-react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { HeaderActions } from '@/components/layout/HeaderActions'
import { Header } from '@/components/layout/Header'
import { HeaderProvider } from '@/context/HeaderContext'

export function RootLayout() {
  const location = useLocation()
  const { theme, privacyMode, toggleMobileSidebar, sidebarCollapsed, toggleSidebarCollapsed, currentUser } = useAppStore()

  useEffect(() => {
    const isDark = theme === 'dark'
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }

    // Sync theme-color for iOS Safari / Chrome Mobile
    const targetColor = isDark ? '#181922' : '#ffffff'
    const themeMetas = document.querySelectorAll('meta[name="theme-color"]')
    if (themeMetas.length > 0) {
      themeMetas.forEach((meta) => meta.setAttribute('content', targetColor))
    }
  }, [theme])

  // If no user is logged in, redirect to /login
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  const getPageMeta = () => {
    const path = location.pathname.toLowerCase()
    if (path === '/' || path === '/overview') {
      return {
        title: 'Visión General',
        subtitle: currentUser?.strategy || 'Resumen ejecutivo del patrimonio, evolución de rentabilidad y asignación global.',
      }
    }
    if (path.startsWith('/positions')) {
      return {
        title: 'Posiciones de Cartera',
        subtitle: 'Seguimiento detallado de activos con rentabilidad latente, peso relativo y desglose por coste.',
      }
    }
    if (path.startsWith('/analytics')) {
      return {
        title: 'Analítica y Riesgo',
        subtitle: 'Métricas cuantitativas, rentabilidad ponderada en el tiempo (TWR) y perfil de volatilidad.',
      }
    }
    if (path.startsWith('/market') || path.startsWith('/assets')) {
      return {
        title: 'Mercado Global',
        subtitle: 'Cotizaciones en directo de megacaps, índices globales y valores del S&P 500 e IBEX 35.',
      }
    }
    if (path.startsWith('/transactions')) {
      return {
        title: 'Registro de Operaciones',
        subtitle: 'Historial de compras periódicas (DCA), reembolsos, traspasos e importación de extractos.',
      }
    }
    return {
      title: 'Portfolio Dashboard',
      subtitle: undefined,
    }
  }

  const pageMeta = getPageMeta()

  return (
    <HeaderProvider>
      <div className={`relative flex min-h-screen bg-[#f6f8fb] text-slate-800 dark:bg-[#1d1f26] dark:text-slate-100 overflow-x-hidden selection:bg-blue-500/20 selection:text-blue-700 dark:selection:bg-blue-500/30 dark:selection:text-blue-200 transition-colors duration-200${privacyMode ? ' privacy-mode' : ''}`}>
        {/* Refined ambient background lighting — subtle graphite and neutral cool haze */}
        <div className="pointer-events-none fixed top-0 left-1/4 w-[750px] h-[350px] bg-gradient-to-br from-blue-500/[0.05] via-indigo-500/[0.03] to-transparent blur-[140px] rounded-full -z-10 dark:from-slate-600/[0.04] dark:via-zinc-600/[0.02]" />
        <div className="pointer-events-none fixed top-1/3 right-4 w-[500px] h-[300px] bg-gradient-to-bl from-violet-500/[0.04] to-transparent blur-[130px] rounded-full -z-10 dark:from-slate-500/[0.03]" />

        <Sidebar />

        <div className={`flex flex-1 flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-0 max-w-full' : 'ml-0 md:ml-[230px] max-w-full md:max-w-[calc(100vw-230px)]'}`}>
          {/* Mobile / Collapsed Desktop Header Bar */}
          <header className={`sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-white/90 dark:bg-[#181922]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] shadow-xs ${!sidebarCollapsed ? 'md:hidden' : ''}`}>
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
                <span className="font-bold text-sm tracking-tight text-slate-950 dark:text-white">
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

            {/* Controls on Mobile in top sticky header */}
            <div className="flex md:hidden items-center">
              <HeaderActions compact showPeriod hideUser />
            </div>
          </header>

          {/* Persistent Top Header (Never unmounts, never flickers during route animations) */}
          <div className="px-4 pt-3 sm:px-6 sm:pt-4 md:px-7 md:pt-4">
            <Header
              title={pageMeta.title}
              subtitle={pageMeta.subtitle}
            />
          </div>

          {/* Page Content Animation (KPIs, Charts, Tables fade in quickly without header flickering) */}
          <main key={location.pathname} className="animate-in-quick flex flex-1 flex-col gap-4 px-4 pt-4 pb-3 sm:px-6 sm:pt-4 sm:pb-4 md:px-7 md:pt-4 md:pb-4.5">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </HeaderProvider>
  )
}
