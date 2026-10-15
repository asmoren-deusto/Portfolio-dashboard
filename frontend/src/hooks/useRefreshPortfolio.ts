import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/appStore'
import { refreshPortfolioPrices } from '@/api/queries'

export function useRefreshPortfolio() {
  const {
    currentUser,
    isRefreshingPrices,
    setIsRefreshingPrices,
    triggerRefreshAnimation,
  } = useAppStore()
  const queryClient = useQueryClient()
  const [refreshSuccess, setRefreshSuccess] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (isRefreshingPrices) return
    setIsRefreshingPrices(true)
    setRefreshSuccess(false)

    try {
      const userId = currentUser?.id || 'asier'
      let refreshResult: any = null

      if (!currentUser?.isDemo) {
        refreshResult = await refreshPortfolioPrices(userId)
      } else {
        // Simulated response for demo mode
        refreshResult = {
          status: 'ok',
          count: 5,
          updated_count: 2,
          updated_items: [
            {
              isin: '0192#0011',
              name: 'Indexa Más Rentabilidad Acciones EPSV',
              broker: 'indexa',
              price: 18.4523,
              price_date: new Date().toISOString().split('T')[0],
              previous_price: 18.388,
              previous_date: '2026-10-06',
              diff: 0.0643,
              diff_pct: 0.35,
              is_updated: true,
            },
            {
              isin: 'IE00BYX5NX33',
              name: 'Fidelity MSCI World Index Fund EUR P Acc',
              broker: 'myinvestor',
              price: 42.152,
              price_date: new Date().toISOString().split('T')[0],
              previous_price: 42.203,
              previous_date: '2026-10-06',
              diff: -0.051,
              diff_pct: -0.12,
              is_updated: true,
            },
          ],
          all_items: [],
        }
      }

      // Record alert seen and manual refresh timestamp immediately to prevent race conditions with background polling
      const nowTs = Date.now()
      const alertId = refreshResult?.alert?.id || refreshResult?.alert_id || `nav_${nowTs}`
      try {
        localStorage.setItem('portfolio_last_seen_nav_alert_id', alertId)
        localStorage.setItem('portfolio_last_manual_refresh', String(nowTs))
      } catch {}

      await queryClient.invalidateQueries()
      triggerRefreshAnimation()
      setRefreshSuccess(true)
      setTimeout(() => setRefreshSuccess(false), 3000)
    } catch (err) {
      console.warn('Error fetching live NAVs:', err)
      await queryClient.invalidateQueries()
      triggerRefreshAnimation()
    } finally {
      setIsRefreshingPrices(false)
    }
  }, [currentUser, isRefreshingPrices, queryClient, setIsRefreshingPrices, triggerRefreshAnimation])

  return { handleRefresh, isRefreshingPrices, refreshSuccess }
}
