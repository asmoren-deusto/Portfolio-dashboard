import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { OverviewPage } from '@/pages/OverviewPage'
import { PositionsPage } from '@/pages/PositionsPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { MarketPage } from '@/pages/MarketPage'
import { LoginPage } from '@/pages/LoginPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true,             element: <OverviewPage /> },
      { path: 'market',          element: <MarketPage /> },
      { path: 'positions',       element: <PositionsPage /> },
      { path: 'analytics',       element: <AnalyticsPage /> },
      { path: 'transactions',    element: <TransactionsPage /> },
      { path: 'assets',          element: <MarketPage /> },
      { path: '*',               element: <Navigate to="/" /> },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
