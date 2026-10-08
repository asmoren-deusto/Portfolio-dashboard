import React, { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Plus,
  Search,
  Layers,
  DollarSign,
  TrendingUp,
  TrendingDown,
  X,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { fmt, cn } from '@/lib/utils'
import { useTransactions, usePositions, type Position } from '@/api/queries'
import { useAppStore } from '@/store/appStore'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import type { Transaction } from '@/lib/mockData'

type TxType = 'all' | 'buy' | 'sell' | 'dividend' | 'transfer'

const TYPE_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  buy: { label: 'Compra DCA', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: '↑' },
  sell: { label: 'Venta', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: '↓' },
  dividend: { label: 'Dividendo', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: '💰' },
  transfer: { label: 'Traspaso', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: '↔' },
}

const TYPE_TABS: { id: TxType; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'buy', label: 'Compras' },
  { id: 'sell', label: 'Ventas' },
  { id: 'dividend', label: 'Dividendos' },
  { id: 'transfer', label: 'Traspasos' },
]

export function TransactionsPage() {
  const queryClient = useQueryClient()
  const { currentUser } = useAppStore()
  const userId = currentUser?.id || 'asier'

  const { data: transactions = [] } = useTransactions()
  const { data: positions = [] } = usePositions()

  const [activeType, setActiveType] = useState<TxType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [notification, setNotification] = useState<{ text: string; error?: boolean } | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | number | null>(null)


  const positionMap = useMemo(() => {
    const map = new Map<string, Position>()
    positions.forEach((p) => {
      map.set(p.isin, p)
    })
    return map
  }, [positions])

  // Summary Metrics
  const stats = useMemo(() => {
    const totalOps = transactions.length
    const totalBought = transactions.filter((t) => t.type === 'buy').reduce((s, t) => s + t.amount, 0)
    const totalSold = transactions.filter((t) => t.type === 'sell').reduce((s, t) => s + t.amount, 0)
    const totalDivs = transactions.filter((t) => t.type === 'dividend').reduce((s, t) => s + t.amount, 0)
    const netInvested = totalBought - totalSold

    return { totalOps, totalBought, totalSold, totalDivs, netInvested }
  }, [transactions])

  // Filtered transactions
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return transactions.filter((t) => {
      if (activeType !== 'all' && t.type !== activeType) return false
      if (q) {
        const name = (t as any).name || positionMap.get(t.isin)?.name || ''
        const isin = t.isin || ''
        const broker = t.broker || ''
        return (
          name.toLowerCase().includes(q) ||
          isin.toLowerCase().includes(q) ||
          broker.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [transactions, activeType, searchQuery, positionMap])

  const notify = (text: string, error = false) => {
    setNotification({ text, error })
    setTimeout(() => setNotification(null), 4000)
  }

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['positions'] })
    queryClient.invalidateQueries({ queryKey: ['summary'] })
    queryClient.invalidateQueries({ queryKey: ['performance'] })
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  // Handle manual addition
  const handleAddTransaction = async (newTx: any) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTx, user_id: userId }),
      })
      if (res.ok) {
        notify('¡Operación registrada con éxito en la cartera!')
        setShowAddModal(false)
        invalidateAll()
      } else {
        const err = await res.json().catch(() => null)
        notify(err?.detail || 'Error al guardar la operación.', true)
      }
    } catch {
      notify('Error de red al guardar la operación.', true)
    }
  }

  // Handle deletion
  const handleDelete = async (e: React.MouseEvent, txId: string | number) => {
    e.stopPropagation()
    if (!window.confirm('¿Deseas eliminar esta transacción de tu cartera?')) return
    setIsDeleting(txId)
    try {
      const res = await fetch(`/api/transactions/${txId}`, { method: 'DELETE' })
      if (res.ok) {
        notify('Operación eliminada.')
        invalidateAll()
      } else {
        notify('Error al eliminar la operación.', true)
      }
    } catch {
      notify('Error de conexión al eliminar la operación.', true)
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-8">

      {/* Summary KPI Highlights */}
      <div data-private className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20 cursor-card">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <span>Total Operaciones</span>
            <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white mt-1">
            {stats.totalOps} <span className="text-xs font-normal text-slate-600 dark:text-slate-400">registradas</span>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
            Frecuencia continua y DCA
          </div>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20 cursor-card">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <span>Inversión Neta Total</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white mt-1">
            {fmt.currency(stats.netInvested)}
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
            Compras: <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{fmt.currency(stats.totalBought)}</span>
          </div>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20 cursor-card">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <span>Dividendos Percibidos</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {fmt.currency(stats.totalDivs)}
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
            Rentas pasivas acumuladas
          </div>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/96 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20 cursor-card">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <span>Reembolsos / Ventas</span>
            <TrendingDown className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-950 dark:text-slate-200 mt-1">
            {fmt.currency(stats.totalSold)}
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
            Liquidez recuperada
          </div>
        </div>
      </div>

      {/* Control Bar: Type Tabs, Actions & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        {/* Type tabs with sliding pill */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/95 dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm overflow-x-auto">
          {TYPE_TABS.map((tab) => {
            const active = activeType === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveType(tab.id)}
                className={`relative px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                  active ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="txTypeTab"
                    className="absolute inset-0 rounded-xl bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Action Buttons & Search Input */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#252526] dark:hover:bg-[#2a2d2e] dark:text-slate-300 dark:hover:text-white dark:border-white/[0.08] dark:hover:border-white/20 text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>Importar Extracto</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Operación</span>
          </button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por activo, ISIN o broker..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#252526] border border-slate-200/90 dark:border-white/[0.08] focus:border-blue-500/50 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table Card */}
      <Card className="overflow-hidden" delay={0.15}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.8px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.05] bg-slate-50/70 dark:bg-white/[0.01]">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Fecha
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Activo
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Tipo
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Títulos
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Precio NAV
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Importe Total
                </th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Entidad / Broker
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 w-12">
                  
                </th>
              </tr>
            </thead>
            <tbody data-private>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No hay operaciones con este criterio</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Prueba a seleccionar otra pestaña o limpiar la búsqueda.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => {
                  const conf = TYPE_CONFIG[t.type] ?? TYPE_CONFIG.buy
                  const assetInfo = positionMap.get(t.isin)
                  const displayName = (t as any).name || assetInfo?.name || t.isin

                  return (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      onClick={() => {
                        if (assetInfo) setSelectedPosition(assetInfo)
                      }}
                      className={`group border-b border-slate-100 dark:border-white/[0.03] transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.035] last:border-0 ${
                        assetInfo ? 'cursor-pointer' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                        {fmt.dateShort(t.date)}
                      </td>

                      {/* Asset / Logo */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <CompanyLogo
                            ticker={assetInfo?.ticker || t.isin.slice(0, 4)}
                            name={displayName}
                            domain={assetInfo?.domain}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-white transition-colors truncate max-w-[260px]">
                              {displayName}
                            </div>
                            <div className="font-mono text-xs text-slate-600 dark:text-slate-400 font-medium">{t.isin}</div>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${conf.cls}`}
                        >
                          <span>{conf.icon}</span>
                          <span>{conf.label}</span>
                        </span>
                      </td>

                      {/* Shares */}
                      <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {t.shares > 0 ? fmt.num(t.shares) : '—'}
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3.5 text-right font-mono text-slate-500 dark:text-slate-400">
                        {t.price > 0 ? fmt.currency(t.price) : '—'}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {fmt.currency(t.amount)}
                      </td>

                      {/* Broker */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={cn(
                          "inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold uppercase tracking-wider border",
                          t.broker === 'bbva'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
                            : t.broker === 'indexa'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                        )}>
                          {({ bbva: 'BBVA', indexa: 'Indexa Capital', kutxabank: 'Kutxabank', scalable: 'Scalable', traderepublic: 'Trade Republic' } as Record<string, string>)[t.broker] ?? 'MyInvestor'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={(e) => handleDelete(e, t.id)}
                          disabled={isDeleting === t.id}
                          title="Eliminar operación"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          {isDeleting === t.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Nueva Operación Modal */}
      {showAddModal && (
        <AddTransactionModal
          positions={positions}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTransaction}
        />
      )}

      {/* Import Extracto Modal */}
      {showImportModal && (
        <ImportExtractoModal
          userId={userId}
          onClose={() => setShowImportModal(false)}
          onSuccess={(msg) => {
            notify(msg)
            setShowImportModal(false)
            invalidateAll()
          }}
          onError={(msg) => notify(msg, true)}
        />
      )}

      {/* Position Detail Modal */}
      <PositionDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-[99999] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-medium border ${
              notification.error
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
            }`}
          >
            {notification.error ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ----------------------------------------------------
// Add Transaction Modal (Portal)
// ----------------------------------------------------
function AddTransactionModal({
  positions,
  onClose,
  onAdd,
}: {
  positions: any[]
  onClose: () => void
  onAdd: (tx: any) => void
}) {
  const [type, setType] = useState<'buy' | 'sell' | 'dividend' | 'transfer'>('buy')
  const [isin, setIsin] = useState(positions[0]?.isin || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [shares, setShares] = useState('10')
  const [price, setPrice] = useState('100')
  const [broker, setBroker] = useState('MyInvestor')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = orig
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const selectedPos = positions.find((p) => p.isin === isin)
  const calcAmount = (parseFloat(shares) || 0) * (parseFloat(price) || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isin) return

    const newTx = {
      isin,
      asset_name: selectedPos?.name || isin,
      type,
      date,
      shares: parseFloat(shares) || 0,
      price: parseFloat(price) || 0,
      amount: calcAmount,
      broker: broker.toLowerCase(),
    }
    onAdd(newTx)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="relative z-10 w-full max-w-lg my-auto rounded-3xl bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Registrar Operación</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Añade una compra periódica, dividendo o venta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Tipo de Operación */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-xs">
              Tipo de Operación
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'buy', label: 'Compra' },
                { id: 'sell', label: 'Venta' },
                { id: 'dividend', label: 'Dividendo' },
                { id: 'transfer', label: 'Traspaso' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id as any)}
                  className={`py-2 text-center rounded-xl font-semibold transition-all border ${
                    type === t.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-[#252526] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activo / Fondo */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-xs">
              Activo / Fondo de Inversión
            </label>
            <select
              value={isin}
              onChange={(e) => {
                setIsin(e.target.value)
                const found = positions.find((p) => p.isin === e.target.value)
                if (found && found.current_price) setPrice(String(found.current_price))
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#252526] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
            >
              {positions.map((p) => (
                <option key={p.isin} value={p.isin}>
                  {p.name} ({p.isin})
                </option>
              ))}
            </select>
          </div>

          {/* Fecha & Broker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-xs">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#252526] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-xs">
                Broker / Entidad
              </label>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#252526] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
              >
                <option value="MyInvestor">MyInvestor</option>
                <option value="Degiro">Degiro</option>
                <option value="Trade Republic">Trade Republic</option>
                <option value="Interactive Brokers">Interactive Brokers</option>
                <option value="Indexa Capital">Indexa Capital</option>
              </select>
            </div>
          </div>

          {/* Títulos & Precio NAV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-xs">
                Participaciones / Títulos
              </label>
              <input
                type="number"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#252526] border border-slate-200 dark:border-white/[0.08] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-xs">
                Precio NAV Unitario (€)
              </label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#252526] border border-slate-200 dark:border-white/[0.08] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Total calculado */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Importe Total Calculado:</span>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {fmt.currency(calcAmount)}
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:text-slate-300 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              Guardar Operación
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  )
}

// ----------------------------------------------------
// Import Extracto Modal with Dual Tabs (File & Text)
// ----------------------------------------------------
function ImportExtractoModal({
  userId,
  onClose,
  onSuccess,
  onError,
}: {
  userId: string
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [tab, setTab] = useState<'text' | 'file'>('text')
  const [pastedText, setPastedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) onClose()
    }
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = orig
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, isProcessing])

  // Handle Text Submission
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pastedText.trim()) {
      onError('Por favor, pega el texto de las operaciones antes de importar.')
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch('/api/transactions/import-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pastedText, user_id: userId }),
      })
      const data = await res.json()
      if (res.ok) {
        onSuccess(data.message || `${data.imported} operaciones importadas con éxito.`)
      } else {
        onError(data.detail || 'Error al procesar el texto.')
      }
    } catch {
      onError('Error de red al importar el texto.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/transactions/import-csv?user_id=${userId}`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        onSuccess(data.message || `Archivo ${file.name} procesado correctamente.`)
      } else {
        onError(data.detail || 'Error al procesar el archivo CSV/Excel.')
      }
    } catch {
      onError('Error de conexión al subir el archivo.')
    } finally {
      setIsProcessing(false)
      if (e.target) e.target.value = ''
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isProcessing && onClose()}
        className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="relative z-10 w-full max-w-xl my-auto rounded-3xl bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Importar Extracto de Broker</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincroniza tus operaciones de MyInvestor, Degiro o Trade Republic
              </p>
            </div>
          </div>
          <button
            onClick={() => !isProcessing && onClose()}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mt-4 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              tab === 'text'
                ? 'bg-white dark:bg-[#2d2d2d] dark:border dark:border-white/10 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pegar Texto Web (Recomendado)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              tab === 'file'
                ? 'bg-white dark:bg-[#2d2d2d] dark:border dark:border-white/10 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Archivo (CSV / Excel)</span>
          </button>
        </div>

        {/* Tab 1: Paste Web Text */}
        {tab === 'text' && (
          <form onSubmit={handleTextSubmit} className="mt-4 space-y-3.5 text-xs">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" />
                <div>
                  <p className="font-semibold text-xs">Detecta compras, ventas y traspasos automáticamente:</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Entra en MyInvestor Web &gt; Inversión &gt; Órdenes de Fondos, selecciona con el ratón el listado y pégalo aquí. Reconoce estados ('Finalizada'), importes y participaciones.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Texto copiado de MyInvestor:
              </label>
              <textarea
                rows={9}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Ejemplo:&#10;10/07/2026&#10;Suscripción por Traspaso Interno&#10;116,72 €&#10;Azvalor Internacional FI&#10;Finalizada&#10;0,345743 participaciones..."
                className="w-full p-3 font-mono text-xs rounded-2xl bg-slate-50 dark:bg-[#252526] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {pastedText.length > 0 ? `${pastedText.length} caracteres listos` : 'Sin contenido'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:text-slate-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !pastedText.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isProcessing ? 'Procesando...' : 'Importar Operaciones'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: File Upload (CSV/Excel) */}
        {tab === 'file' && (
          <div className="mt-4 space-y-4 text-xs">
            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-white/15 hover:border-blue-500/50 dark:hover:border-white/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100/50 dark:hover:bg-white/[0.03]"
            >
              {isProcessing ? (
                <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-2 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-2 animate-bounce" />
              )}
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {isProcessing ? 'Analizando y extrayendo archivo...' : 'Arrastra tu archivo CSV o haz clic para subir'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                Formatos soportados: CSV, XLSX, XLS o TXT de MyInvestor / Degiro
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt,.tsv"
                className="hidden"
                disabled={isProcessing}
                onChange={handleFileUpload}
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] space-y-1.5">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                <AlertCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Formatos compatibles:</span>
              </div>
              <ul className="text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside text-xs">
                <li>Extracto MyInvestor (CSV / Excel con Fecha, ISIN, Importe, Participaciones)</li>
                <li>Historial de Transacciones Degiro (CSV estándar)</li>
                <li>Trade Republic (Extracto de cuenta en CSV)</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:text-slate-300 font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  )
}
