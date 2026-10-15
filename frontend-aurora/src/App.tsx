import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { Shell } from './Shell'
import { OverviewPage } from './pages/OverviewPage'
import { PositionsPage } from './pages/PositionsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { MarketPage } from './pages/MarketPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { LoginPage } from './pages/LoginPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchIntervalInBackground: true,
    },
  },
})

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'market', element: <MarketPage /> },
      { path: 'positions', element: <PositionsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
