import React, { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  X,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { fmt } from '@/lib/utils'
import { useTransactions, usePositions, type Position } from '@/api/queries'
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
  const { data: initialTransactions = [] } = useTransactions()
  const { data: positions = [] } = usePositions()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeType, setActiveType] = useState<TxType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  // Sync initial transactions
  useEffect(() => {
    if (initialTransactions.length > 0 && transactions.length === 0) {
      setTransactions(initialTransactions)
    }
  }, [initialTransactions])

  // Map ISIN to position info for logos and names
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

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Handle adding new operation
  const handleAddTransaction = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev])
    setShowAddModal(false)
    notify('¡Operación registrada con éxito en la cartera!')
  }

  // Simulate CSV import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTimeout(() => {
      notify(`Archivo ${file.name} procesado correctamente. Datos sincronizados.`)
      setShowImportModal(false)
    }, 600)
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-[99999] flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs font-medium shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Header */}
      <Header
        title="Registro de Operaciones"
        subtitle="Historial de compras periódicas (DCA), ventas, dividendos e importación de extractos."
        badge="Histórico Completo"
        badgeColor="amber"
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/90 dark:bg-[#111625]/90 dark:hover:bg-[#151c2e] dark:text-slate-300 dark:hover:text-white dark:border-white/[0.08] dark:hover:border-white/20 text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>Importar CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Operación</span>
          </button>
        </div>
      </Header>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#111625]/85 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20">
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

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#111625]/85 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20">
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

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#111625]/85 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20">
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

        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/95 dark:bg-[#111625]/85 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/20">
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

      {/* Control Bar: Type Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Type tabs with sliding pill */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/95 dark:bg-[#111625]/90 border border-slate-200/90 dark:border-white/[0.07] backdrop-blur-md shadow-sm overflow-x-auto">
          {TYPE_TABS.map((tab) => {
            const active = activeType === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveType(tab.id)}
                className={`relative px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                  active ? 'text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="txTypeTab"
                    className="absolute inset-0 rounded-xl bg-blue-600/90 shadow-md shadow-blue-500/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por activo, ISIN o broker..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#111625]/90 border border-slate-200/90 dark:border-white/[0.08] focus:border-blue-500/50 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all shadow-sm"
          />
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500">
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
                      transition={{ delay: i * 0.02 }}
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
                            <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors truncate max-w-[260px]">
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
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {t.broker}
                        </span>
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

      {/* Import CSV Modal */}
      {showImportModal && (
        <ImportCsvModal
          fileRef={fileRef}
          onClose={() => setShowImportModal(false)}
          onUpload={handleFileUpload}
        />
      )}

      {/* Position Detail Modal */}
      <PositionDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
      />
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
  onAdd: (tx: Transaction) => void
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

    const newTx: Transaction = {
      id: `tx-custom-${Date.now()}`,
      isin,
      name: selectedPos?.name || isin,
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
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="relative z-10 w-full max-w-lg my-auto rounded-3xl bg-white dark:bg-[#0f1424] border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-800 dark:text-slate-100"
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
                      : 'bg-slate-50 dark:bg-[#141928] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/20'
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
                if (found) setPrice(String(found.current_price))
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
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
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-xs">
                Broker / Entidad
              </label>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
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
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
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
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
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
// Import CSV Modal (Portal)
// ----------------------------------------------------
function ImportCsvModal({
  fileRef,
  onClose,
  onUpload,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>
  onClose: () => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
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

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="relative z-10 w-full max-w-lg my-auto rounded-3xl bg-white dark:bg-[#0f1424] border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Importar Extracto de Broker</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sincroniza tus operaciones automáticamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-white/15 hover:border-blue-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-white/[0.01] hover:bg-blue-500/[0.02]"
          >
            <Upload className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-2 animate-bounce" />
            <p className="font-semibold text-slate-900 dark:text-white text-sm">Arrastra tu archivo CSV aquí o haz clic para subir</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Formatos soportados: CSV, XLSX o TXT de MyInvestor / Degiro</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.txt"
              className="hidden"
              onChange={onUpload}
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] space-y-2">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
              <AlertCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span>Plantillas compatibles:</span>
            </div>
            <ul className="text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside text-xs">
              <li>Extracto MyInvestor (Movimientos de fondos y cuentas)</li>
              <li>Historial de Transacciones Degiro (CSV estándar)</li>
              <li>Trade Republic (Extracto de cuenta en CSV)</li>
              <li>Formato estándar: Fecha, ISIN, Tipo, Títulos, Precio, Importe</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:text-slate-300 font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
