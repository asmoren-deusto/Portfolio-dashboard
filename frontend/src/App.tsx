import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { OverviewPage } from '@/pages/OverviewPage'

const MarketPage = lazy(() => import('@/pages/MarketPage').then(m => ({ default: m.MarketPage })))
const PositionsPage = lazy(() => import('@/pages/PositionsPage').then(m => ({ default: m.PositionsPage })))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage').then(m => ({ default: m.TransactionsPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))

function PageLoadingFallback() {
  return (
    <div className="w-full flex-1 flex flex-col gap-4 animate-pulse pt-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04]" />
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5, // 5 minutes cache freshness
      gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    },
  },
})

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true,          element: <OverviewPage /> },
      { path: 'market',       element: <Suspense fallback={<PageLoadingFallback />}><MarketPage /></Suspense> },
      { path: 'positions',    element: <Suspense fallback={<PageLoadingFallback />}><PositionsPage /></Suspense> },
      { path: 'analytics',    element: <Suspense fallback={<PageLoadingFallback />}><AnalyticsPage /></Suspense> },
      { path: 'transactions', element: <Suspense fallback={<PageLoadingFallback />}><TransactionsPage /></Suspense> },
      { path: 'assets',       element: <Suspense fallback={<PageLoadingFallback />}><MarketPage /></Suspense> },
      { path: '*',            element: <Navigate to="/" /> },
    ],
  },
  {
    path: '/login',
    element: <Suspense fallback={<PageLoadingFallback />}><LoginPage /></Suspense>,
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
