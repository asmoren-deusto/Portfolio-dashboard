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
    setNavAlertNotification,
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

      await queryClient.invalidateQueries()
      triggerRefreshAnimation()
      setRefreshSuccess(true)
      setTimeout(() => setRefreshSuccess(false), 3000)

      if (refreshResult) {
        const updatedItems = refreshResult.updated_items || []
        const allItems = refreshResult.all_items || []
        const totalCount = refreshResult.count || allItems.length || updatedItems.length
        const alertId = refreshResult.alert?.id || `nav_${Date.now()}`

        try {
          localStorage.setItem('portfolio_last_seen_nav_alert_id', alertId)
        } catch {}

        setNavAlertNotification({
          id: alertId,
          timestamp: refreshResult.alert?.timestamp || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          updatedCount: updatedItems.length,
          totalCount,
          items: updatedItems.length > 0 ? updatedItems : allItems.slice(0, 4),
          allCheckedItems: allItems,
        })
      }
    } catch (err) {
      console.warn('Error fetching live NAVs:', err)
      await queryClient.invalidateQueries()
      triggerRefreshAnimation()
    } finally {
      setIsRefreshingPrices(false)
    }
  }, [currentUser, isRefreshingPrices, queryClient, setIsRefreshingPrices, setNavAlertNotification, triggerRefreshAnimation])

  return { handleRefresh, isRefreshingPrices, refreshSuccess }
}
