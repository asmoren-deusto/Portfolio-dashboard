import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/appStore'
import { refreshPortfolioPrices, prefetchAllBrokers } from '@/api/queries'

export function useRefreshPortfolio() {
  const {
    currentUser,
    period,
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

      // Record alert seen and manual refresh timestamp immediately to prevent race conditions with background polling
      const nowTs = Date.now()
      const alertId = refreshResult?.alert?.id || refreshResult?.alert_id || `nav_${nowTs}`
      try {
        localStorage.setItem('portfolio_last_seen_nav_alert_id', alertId)
        localStorage.setItem('portfolio_last_manual_refresh', String(nowTs))
      } catch {}

      // Present instant visible outcome of the manual refresh to the user
      if (refreshResult) {
        const updatedCount = refreshResult.updated_count ?? refreshResult.updatedCount ?? 0
        const items = refreshResult.updated_items || refreshResult.items || []
        const allItems = refreshResult.all_items || refreshResult.allCheckedItems || []

        setNavAlertNotification({
          id: alertId,
          timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          updatedCount,
          totalCount: refreshResult.count ?? (allItems.length || 9),
          items: updatedCount > 0 ? items : allItems.slice(0, 5),
          allCheckedItems: allItems,
        })
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['summary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['positions'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['performance'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['analytics'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['benchmark-comparison'], refetchType: 'active' }),
      ])
      // Instantly prefetch all entity data so switching between brokers has 0ms latency
      prefetchAllBrokers(queryClient, currentUser, period)
      triggerRefreshAnimation()
      setRefreshSuccess(true)
      setTimeout(() => setRefreshSuccess(false), 3000)
    } catch (err) {
      console.warn('Error fetching live NAVs:', err)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['summary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['positions'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['performance'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['analytics'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['benchmark-comparison'], refetchType: 'active' }),
      ])
      prefetchAllBrokers(queryClient, currentUser, period)
      triggerRefreshAnimation()
    } finally {
      setIsRefreshingPrices(false)
    }
  }, [currentUser, period, isRefreshingPrices, queryClient, setIsRefreshingPrices, triggerRefreshAnimation, setNavAlertNotification])

  return { handleRefresh, isRefreshingPrices, refreshSuccess }
}
