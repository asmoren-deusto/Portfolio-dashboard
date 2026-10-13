import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { useEffect } from 'react'
import { Menu, PanelLeftOpen } from 'lucide-react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { HeaderActions } from '@/components/layout/HeaderActions'
import { Header } from '@/components/layout/Header'
import { HeaderProvider } from '@/context/HeaderContext'
import { NavUpdateAlertModal } from '@/components/common/NavUpdateAlertModal'
import { AppLogo } from '@/components/ui/AppLogo'
import { MobileTabBar } from '@/components/layout/MobileTabBar'

import { useQueryClient } from '@tanstack/react-query'
import { fetchLatestNavAlert } from '@/api/queries'
import { isNativePlatform } from '@/api/config'

export function RootLayout() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const {
    theme,
    privacyMode,
    toggleMobileSidebar,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    currentUser,
    setNavAlertNotification,
  } = useAppStore()

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
    const targetColor = isDark ? '#1c1c1c' : '#ffffff'
    const themeMetas = document.querySelectorAll('meta[name="theme-color"]')
    if (themeMetas.length > 0) {
      themeMetas.forEach((meta) => meta.setAttribute('content', targetColor))
    }
  }, [theme])

  // Periodic Watcher for New NAVs detected by backend (checks every 45s, background scanner in backend runs every 10 min)
  useEffect(() => {
    if (!currentUser || currentUser.isDemo) return

    let isMounted = true
    const checkNavAlerts = async () => {
      try {
        const lastSeen = sessionStorage.getItem('last_seen_nav_alert_id')
        const res = await fetchLatestNavAlert(lastSeen)
        if (isMounted && res.has_update && res.alert) {
          const alert = res.alert
          const updatedCount = alert.updatedCount ?? alert.updated_count ?? 0
          if (alert.id && alert.id !== lastSeen && updatedCount > 0) {
            sessionStorage.setItem('last_seen_nav_alert_id', alert.id)
            // Trigger automatic UI refresh across all tabs
            await queryClient.invalidateQueries()
            // Show pop-up notification
            setNavAlertNotification({
              id: alert.id,
              timestamp: alert.timestamp || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              updatedCount,
              totalCount: alert.totalCount ?? alert.total_count ?? 0,
              items: alert.items || [],
              allCheckedItems: alert.allCheckedItems || alert.all_items || [],
            })
          }
        }
      } catch (err) {
        // Silently catch network errors
      }
    }

    checkNavAlerts()
    const timer = setInterval(checkNavAlerts, 45000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [currentUser, queryClient, setNavAlertNotification])

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
      <div className={`relative flex min-h-screen bg-[#f6f8fb] text-slate-800 dark:bg-[#1c1c1c] dark:text-slate-100 overflow-x-hidden selection:bg-blue-500/20 selection:text-blue-700 dark:selection:bg-[#264f78] dark:selection:text-white transition-colors duration-200${privacyMode ? ' privacy-mode' : ''}`}>
        {/* Refined ambient background lighting — subtle graphite and neutral cool haze */}
        <div className="pointer-events-none fixed top-0 left-1/4 w-[750px] h-[350px] bg-gradient-to-br from-blue-500/[0.05] via-indigo-500/[0.03] to-transparent blur-[140px] rounded-full -z-10 dark:from-slate-600/[0.04] dark:via-zinc-600/[0.02]" />
        <div className="pointer-events-none fixed top-1/3 right-4 w-[500px] h-[300px] bg-gradient-to-bl from-violet-500/[0.04] to-transparent blur-[130px] rounded-full -z-10 dark:from-slate-500/[0.03]" />

        <Sidebar />

        <div className={`flex flex-1 flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-0 max-w-full' : 'ml-0 md:ml-[230px] max-w-full md:max-w-[calc(100vw-230px)]'}`}>
          {/* Mobile / Collapsed Desktop Header Bar */}
          <header className={`sticky top-0 z-30 flex items-center justify-between px-4 pt-[max(0.625rem,env(safe-area-inset-top,0px))] pb-2.5 bg-white/95 dark:bg-[#191919]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] shadow-xs ${!sidebarCollapsed ? 'md:hidden' : ''}`}>
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
                <AppLogo size={28} />
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
          <main
            key={location.pathname}
            className={`animate-in-quick flex flex-1 flex-col gap-4 px-4 pt-4 md:px-7 md:pt-4 md:pb-6 ${
              isNativePlatform()
                ? 'pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(7rem+env(safe-area-inset-bottom,0px))]'
                : 'pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] sm:pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))]'
            }`}
          >
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>

        {/* Global Floating NAV Update Alert Window */}
        <NavUpdateAlertModal />

        {/* Native iOS / Mobile Bottom Tab Bar (shown exclusively inside native Capacitor app) */}
        {isNativePlatform() && <MobileTabBar />}
      </div>
    </HeaderProvider>
  )
}
