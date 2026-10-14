import React, { useState, useMemo, useEffect } from 'react'
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
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Coins,
  Calendar,
  Building2,
  Filter,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTransactions, usePositions, type Position } from '@/api/queries'
import { apiUrl } from '@/api/config'
import { useAppStore } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import { AuroraCard } from '~/components/ui/AuroraCard'
import { AuroraBadge } from '~/components/ui/AuroraBadge'
import { CountUp } from '~/components/ui/CountUp'

type TxType = 'all' | 'buy' | 'sell' | 'dividend' | 'transfer'

const TYPE_CONFIG: Record<string, { label: string; variant: 'gain' | 'loss' | 'accent' | 'warning'; icon: any }> = {
  buy: { label: 'Compra DCA', variant: 'gain', icon: ArrowUpRight },
  sell: { label: 'Venta', variant: 'loss', icon: ArrowDownRight },
  dividend: { label: 'Dividendo', variant: 'warning', icon: Coins },
  transfer: { label: 'Traspaso', variant: 'accent', icon: ArrowLeftRight },
}

const TYPE_TABS: { id: TxType; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'buy', label: 'Compras DCA' },
  { id: 'sell', label: 'Ventas' },
  { id: 'dividend', label: 'Dividendos' },
  { id: 'transfer', label: 'Traspasos' },
]

export function TransactionsPage() {
  const queryClient = useQueryClient()
  const { currentUser } = useAppStore()
  const userId = currentUser?.id || 'asier'

  const { data: transactions = [], isLoading: txLoading } = useTransactions()
  const { data: positions = [] } = usePositions()

  const [activeType, setActiveType] = useState<TxType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState('all')
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

  // Available brokers from transactions
  const brokers = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => {
      if (t.broker) set.add(t.broker)
    })
    return ['all', ...Array.from(set)]
  }, [transactions])

  // Filtered transactions
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return transactions.filter((t) => {
      if (activeType !== 'all' && t.type !== activeType) return false
      if (selectedBrokerFilter !== 'all' && t.broker?.toLowerCase() !== selectedBrokerFilter.toLowerCase()) return false
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
  }, [transactions, activeType, selectedBrokerFilter, searchQuery, positionMap])

  // Chronological Grouping by Month & Year for the DCA Timeline
  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: { monthTitle: string; totalNet: number; txs: typeof transactions } } = {}

    // Sort by date descending
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    sorted.forEach((tx) => {
      const d = new Date(tx.date)
      const monthYearKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthTitle = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      const capitalized = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)

      if (!groups[monthYearKey]) {
        groups[monthYearKey] = {
          monthTitle: capitalized,
          totalNet: 0,
          txs: [],
        }
      }

      groups[monthYearKey].txs.push(tx)
      if (tx.type === 'buy') groups[monthYearKey].totalNet += tx.amount
      else if (tx.type === 'sell') groups[monthYearKey].totalNet -= tx.amount
    })

    return Object.entries(groups)
  }, [filtered])

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
      const res = await fetch(apiUrl('/transactions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTx, user_id: userId }),
      })
      if (res.ok) {
        notify('¡Operación registrada con éxito!')
        setShowAddModal(false)
        invalidateAll()
      } else {
        const err = await res.json().catch(() => null)
        notify(err?.detail || 'Error al guardar la operación.', true)
      }
    } catch {
      notify('Error de conexión al guardar la operación.', true)
    }
  }

  // Handle deletion
  const handleDelete = async (e: React.MouseEvent, txId: string | number) => {
    e.stopPropagation()
    if (!window.confirm('¿Deseas eliminar esta transacción de tu cartera?')) return
    setIsDeleting(txId)
    try {
      const res = await fetch(apiUrl(`/transactions/${txId}`), { method: 'DELETE' })
      if (res.ok) {
        notify('Operación eliminada.')
        invalidateAll()
      } else {
        notify('Error al eliminar la operación.', true)
      }
    } catch {
      notify('Error de red al eliminar la operación.', true)
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ─────────────────────────────────────────────────────────────
          HEADER & ACTIONS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="au-eyebrow text-teal-400">REGISTRO & ESTRATEGIA DCA</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--au-text)] font-['Inter_Tight',sans-serif]">
            Operaciones y Movimientos
          </h1>
          <p className="text-xs sm:text-sm text-[var(--au-muted)] mt-0.5">
            Historial cronológico de aportaciones, compras DCA, ventas, dividendos y traspasos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--au-text)] bg-[var(--au-card)] border border-[var(--au-border)] hover:border-teal-500/40 hover:bg-[var(--au-card-hover)] transition-all shadow-sm active:scale-95"
          >
            <Upload size={14} className="text-teal-400" />
            <span>Importar Extracto</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 transition-all shadow-[0_0_20px_rgba(45,212,191,0.25)] active:scale-95"
          >
            <Plus size={15} />
            <span>Nueva Operación</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUMMARY KPI TILES (4 tiles)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AuroraCard className="p-4" hoverEffect>
          <div className="flex justify-between items-center text-xs font-semibold text-[var(--au-muted)]">
            <span>Inversión Neta</span>
            <TrendingUp size={15} className="text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[var(--au-text)] tabular-nums mt-1">
            <CountUp value={stats.netInvested} formatter={(v) => fmt.currency(v)} />
          </div>
          <span className="text-[11px] text-[var(--au-muted)] mt-1 block">
            Compras menos ventas efectuadas
          </span>
        </AuroraCard>

        <AuroraCard className="p-4" hoverEffect>
          <div className="flex justify-between items-center text-xs font-semibold text-[var(--au-muted)]">
            <span>Compras DCA</span>
            <Layers size={15} className="text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-teal-400 tabular-nums mt-1">
            <CountUp value={stats.totalBought} formatter={(v) => fmt.currency(v)} />
          </div>
          <span className="text-[11px] text-[var(--au-muted)] mt-1 block">
            {transactions.filter((t) => t.type === 'buy').length} compras registradas
          </span>
        </AuroraCard>

        <AuroraCard className="p-4" hoverEffect>
          <div className="flex justify-between items-center text-xs font-semibold text-[var(--au-muted)]">
            <span>Dividendos Cobrados</span>
            <Coins size={15} className="text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 tabular-nums mt-1">
            <CountUp value={stats.totalDivs} formatter={(v) => fmt.currency(v)} />
          </div>
          <span className="text-[11px] text-[var(--au-muted)] mt-1 block">
            Rentas pasivas acumuladas
          </span>
        </AuroraCard>

        <AuroraCard className="p-4" hoverEffect>
          <div className="flex justify-between items-center text-xs font-semibold text-[var(--au-muted)]">
            <span>Reembolsos / Ventas</span>
            <TrendingDown size={15} className="text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[var(--au-text)] tabular-nums mt-1">
            <CountUp value={stats.totalSold} formatter={(v) => fmt.currency(v)} />
          </div>
          <span className="text-[11px] text-[var(--au-muted)] mt-1 block">
            {transactions.filter((t) => t.type === 'sell').length} ventas ejecutadas
          </span>
        </AuroraCard>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FILTERS & SEARCH BAR
          ───────────────────────────────────────────────────────────── */}
      <AuroraCard className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Type Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] overflow-x-auto no-scrollbar">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveType(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                  activeType === tab.id
                    ? 'text-teal-400 font-bold bg-[var(--au-card-solid)] shadow-sm'
                    : 'text-[var(--au-muted)] hover:text-[var(--au-text)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--au-muted)]" />
            <input
              type="text"
              placeholder="Buscar por activo, ISIN o broker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[var(--au-chip)] border border-[var(--au-border)] text-[var(--au-text)] placeholder-[var(--au-muted)] focus:outline-none focus:border-teal-500/50"
            />
          </div>
        </div>

        {/* Broker Chips */}
        {brokers.length > 2 && (
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-[var(--au-muted)] mr-1">Broker:</span>
            {brokers.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBrokerFilter(b)}
                className={cn(
                  'px-2.5 py-0.5 rounded-md text-[11px] font-medium border transition-all',
                  selectedBrokerFilter === b
                    ? 'bg-teal-500/15 text-teal-400 border-teal-500/30 font-bold'
                    : 'bg-[var(--au-chip)] text-[var(--au-muted)] border-[var(--au-border)] hover:text-[var(--au-text)]'
                )}
              >
                {b === 'all' ? 'Todos' : b}
              </button>
            ))}
          </div>
        )}
      </AuroraCard>

      {/* ─────────────────────────────────────────────────────────────
          CHRONOLOGICAL DCA TIMELINE & MONTHLY LEDGER
          ───────────────────────────────────────────────────────────── */}
      {txLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin text-teal-400" />
          <p className="text-xs text-[var(--au-muted)]">Cargando libro de operaciones...</p>
        </div>
      ) : groupedByMonth.length === 0 ? (
        <AuroraCard className="py-16 text-center">
          <Layers size={32} className="mx-auto text-[var(--au-muted)] mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-[var(--au-text)]">No se han encontrado operaciones</h3>
          <p className="text-xs text-[var(--au-muted)] mt-1 max-w-sm mx-auto">
            No hay registros con los filtros seleccionados o todavía no has añadido movimientos a tu cartera.
          </p>
        </AuroraCard>
      ) : (
        <div className="space-y-6">
          {groupedByMonth.map(([monthKey, group]) => (
            <div key={monthKey} className="space-y-3">
              {/* Month Header Banner */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-teal-400" />
                  <span className="text-sm font-bold text-[var(--au-text)]">
                    {group.monthTitle}
                  </span>
                  <span className="text-[11px] text-[var(--au-muted)]">
                    ({group.txs.length} {group.txs.length === 1 ? 'operación' : 'operaciones'})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-[var(--au-muted)]">Aportación neta:</span>
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      group.totalNet >= 0 ? 'text-teal-400' : 'text-rose-400'
                    )}
                  >
                    {group.totalNet >= 0 ? '+' : ''}{fmt.currency(group.totalNet)}
                  </span>
                </div>
              </div>

              {/* Transaction list for this month */}
              <div className="space-y-2">
                {group.txs.map((tx) => {
                  const cfg = TYPE_CONFIG[tx.type] || { label: tx.type, variant: 'accent', icon: Layers }
                  const Icon = cfg.icon
                  const pos = positionMap.get(tx.isin)
                  const displayName = (tx as any).name || pos?.name || tx.isin

                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        if (pos) setSelectedPosition(pos)
                      }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl au-card au-card-hover border-[var(--au-border)] hover:border-teal-500/40 cursor-pointer transition-all gap-3"
                    >
                      {/* Left: Icon, Date, Asset & Broker */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Type Icon Badge */}
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105',
                            tx.type === 'buy' && 'bg-teal-500/10 border-teal-500/30 text-teal-400',
                            tx.type === 'sell' && 'bg-rose-500/10 border-rose-500/30 text-rose-400',
                            tx.type === 'dividend' && 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                            tx.type === 'transfer' && 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                          )}
                        >
                          <Icon size={18} />
                        </div>

                        {/* Asset info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-[var(--au-text)] truncate group-hover:text-teal-400 transition-colors">
                              {displayName}
                            </span>
                            <AuroraBadge variant={cfg.variant} size="sm">
                              {cfg.label}
                            </AuroraBadge>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[var(--au-muted)] mt-0.5">
                            <span>
                              {new Date(tx.date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span>•</span>
                            <span className="font-mono">{tx.isin}</span>
                            {tx.broker && (
                              <>
                                <span>•</span>
                                <span className="px-1.5 py-0.2 rounded bg-[var(--au-chip)] text-[10px] font-medium text-[var(--au-text-2)]">
                                  {tx.broker}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantities, Price, Total Amount & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 pl-13 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--au-border)]">
                        {/* Shares and Price */}
                        <div className="text-left sm:text-right text-[11px] font-mono text-[var(--au-muted)]">
                          {tx.shares ? (
                            <div>
                              <span>{tx.shares.toFixed(4)} part.</span>
                              {tx.price && <span> @ {fmt.currency(tx.price)}</span>}
                            </div>
                          ) : (
                            <span>Aportación directa</span>
                          )}
                          {tx.fees ? (
                            <span className="text-[10px] text-[var(--au-faint)] block">
                              Comisión: {fmt.currency(tx.fees)}
                            </span>
                          ) : null}
                        </div>

                        {/* Total Amount */}
                        <div className="text-right min-w-[90px]">
                          <span
                            className={cn(
                              'text-sm sm:text-base font-extrabold font-mono tabular-nums block',
                              tx.type === 'buy' ? 'text-teal-400' : tx.type === 'sell' ? 'text-rose-400' : 'text-[var(--au-text)]'
                            )}
                          >
                            {tx.type === 'buy' ? '+' : tx.type === 'sell' ? '-' : ''}
                            {fmt.currency(tx.amount)}
                          </span>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDelete(e, tx.id)}
                          disabled={isDeleting === tx.id}
                          className="p-1.5 rounded-lg text-[var(--au-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Eliminar operación"
                        >
                          {isDeleting === tx.id ? (
                            <Loader2 size={14} className="animate-spin text-rose-400" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS: ADD TRANSACTION & IMPORT EXTRACT
          ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddTransactionModal
          positions={positions}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTransaction}
        />
      )}

      {showImportModal && (
        <ImportExtractModal
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
      {selectedPosition && (
        <PositionDetailModal
          position={selectedPosition}
          onClose={() => setSelectedPosition(null)}
        />
      )}

      {/* Floating Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className={cn(
              'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold backdrop-blur-xl border',
              notification.error
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                : 'bg-emerald-950/90 text-emerald-200 border-teal-500/40'
            )}
          >
            {notification.error ? (
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ADD TRANSACTION MODAL
// ─────────────────────────────────────────────────────────────
function AddTransactionModal({
  positions,
  onClose,
  onSubmit,
}: {
  positions: Position[]
  onClose: () => void
  onSubmit: (tx: any) => Promise<void>
}) {
  const [type, setType] = useState<'buy' | 'sell' | 'dividend' | 'transfer'>('buy')
  const [isin, setIsin] = useState(positions[0]?.isin || '')
  const [customName, setCustomName] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10))
  const [broker, setBroker] = useState(positions[0]?.broker || 'MyInvestor')
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState(() => {
    const p = positions[0]
    return p?.current_price ? String(p.current_price) : ''
  })
  const [amount, setAmount] = useState('')
  const [fees, setFees] = useState('0')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-calculate amount when shares and price change
  useEffect(() => {
    const s = parseFloat(shares)
    const p = parseFloat(price)
    if (!isNaN(s) && !isNaN(p) && s > 0 && p > 0) {
      setAmount((s * p).toFixed(2))
    }
  }, [shares, price])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      alert('Por favor introduce un importe válido.')
      return
    }

    setIsSubmitting(true)
    const pos = positions.find((p) => p.isin === isin)
    const finalName = customName.trim() || pos?.name || isin

    await onSubmit({
      type,
      isin: isin.trim(),
      name: finalName,
      date,
      broker,
      shares: parseFloat(shares) || null,
      price: parseFloat(price) || null,
      amount: amt,
      fees: parseFloat(fees) || 0,
    })
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative z-10 w-full max-w-lg rounded-3xl au-card p-6 shadow-2xl border-[var(--au-border-strong)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--au-border)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <h3 className="text-base font-bold text-[var(--au-text)]">Registrar Nueva Operación</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--au-muted)] hover:text-[var(--au-text)] hover:bg-[var(--au-chip)]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Operation Type */}
          <div>
            <label className="block text-[var(--au-muted)] font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'buy', label: 'Compra DCA' },
                { id: 'sell', label: 'Venta' },
                { id: 'dividend', label: 'Dividendo' },
                { id: 'transfer', label: 'Traspaso' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id as any)}
                  className={cn(
                    'py-2 rounded-xl font-bold transition-all border',
                    type === t.id
                      ? 'bg-teal-500/20 text-teal-400 border-teal-500/40 shadow-sm'
                      : 'bg-[var(--au-chip)] text-[var(--au-muted)] border-[var(--au-border)] hover:text-[var(--au-text)]'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Selection */}
          <div>
            <label className="block text-[var(--au-muted)] font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
              Fondo de Inversión / Activo
            </label>
            <select
              value={isin}
              onChange={(e) => {
                setIsin(e.target.value)
                const found = positions.find((p) => p.isin === e.target.value)
                if (found?.current_price) setPrice(String(found.current_price))
              }}
              className="w-full px-3 py-2 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] text-[var(--au-text)] focus:outline-none focus:border-teal-500/50"
            >
              {positions.map((p) => (
                <option key={p.isin} value={p.isin} className="bg-[var(--au-card-solid)] text-[var(--au-text)]">
                  {p.name} ({p.isin})
                </option>
              ))}
              <option value="CUSTOM" className="bg-[var(--au-card-solid)] text-[var(--au-text)]">
                + Otro activo (introducir manualmente)
              </option>
            </select>
          </div>

          {isin === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--au-muted)] font-semibold mb-1">ISIN</label>
                <input
                  type="text"
                  placeholder="ES0123456789"
                  onChange={(e) => setIsin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] text-[var(--au-text)]"
                />
              </div>
              <div>
                <label className="block text-[var(--au-muted)] font-semibold mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Vanguard Global Stock..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] text-[var(--au-text)]"
                />
              </div>
            </div>
          )}

          {/* Date & Broker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--au-muted)] font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Fecha de Ejecución
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] text-[var(--au-text)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[var(--au-muted)] font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Broker / Entidad
              </label>
              <input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] text-[var(--au-text)] focus:outline-none"
              />
            </div>
          </div>

          {/* Shares, Price, Total Amount */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[var(--au-muted)] font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Participaciones
              </label>
              <input
                type="number"
                step="any"
                placeholder="12.3456"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] text-[var(--au-text)] font-mono"
              />
            </div>
            <div>
              <label className="block text-[var(--au-muted)] font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Precio (€)
              </label>
              <input
                type="number"
                step="any"
                placeholder="100.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)] text-[var(--au-text)] font-mono"
              />
            </div>
            <div>
              <label className="block text-[var(--au-muted)] font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Importe Total (€) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="1234.56"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--au-chip)] border border-teal-500/40 text-teal-400 font-bold font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--au-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--au-muted)] hover:text-[var(--au-text)] bg-[var(--au-chip)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 flex items-center gap-1.5 shadow-md active:scale-95"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              <span>Guardar en Cartera</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// IMPORT EXTRACT MODAL
// ─────────────────────────────────────────────────────────────
function ImportExtractModal({
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
  const [tab, setTab] = useState<'file' | 'text'>('file')
  const [pastedText, setPastedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(apiUrl(`/transactions/import-csv?user_id=${userId}`), {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        onSuccess(data.message || `Archivo ${file.name} importado correctamente.`)
      } else {
        onError(data.detail || 'Error al procesar el archivo.')
      }
    } catch {
      onError('Error de red al subir el archivo.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pastedText.trim()) {
      onError('Pega el extracto de texto antes de importar.')
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch(apiUrl('/transactions/import-text'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pastedText, user_id: userId }),
      })
      const data = await res.json()
      if (res.ok) {
        onSuccess(data.message || 'Operaciones procesadas e importadas con éxito.')
      } else {
        onError(data.detail || 'Error al procesar el texto.')
      }
    } catch {
      onError('Error de red al importar el texto.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isProcessing && onClose()}
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative z-10 w-full max-w-lg rounded-3xl au-card p-6 shadow-2xl border-[var(--au-border-strong)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--au-border)]">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-teal-400" />
            <h3 className="text-base font-bold text-[var(--au-text)]">Importar Extracto de Operaciones</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[var(--au-muted)] hover:text-[var(--au-text)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Import Mode Tabs */}
        <div className="flex items-center gap-2 mt-4 p-1 rounded-xl bg-[var(--au-chip)] border border-[var(--au-border)]">
          <button
            onClick={() => setTab('file')}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
              tab === 'file'
                ? 'bg-[var(--au-card-solid)] text-teal-400 font-bold shadow-sm'
                : 'text-[var(--au-muted)] hover:text-[var(--au-text)]'
            )}
          >
            <FileSpreadsheet size={14} />
            <span>Archivo CSV / Excel</span>
          </button>
          <button
            onClick={() => setTab('text')}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
              tab === 'text'
                ? 'bg-[var(--au-card-solid)] text-teal-400 font-bold shadow-sm'
                : 'text-[var(--au-muted)] hover:text-[var(--au-text)]'
            )}
          >
            <FileText size={14} />
            <span>Pegar Texto</span>
          </button>
        </div>

        <div className="mt-4">
          {tab === 'file' ? (
            <div className="border-2 border-dashed border-[var(--au-border-strong)] hover:border-teal-500/50 rounded-2xl p-8 text-center transition-all bg-[var(--au-chip)]">
              <FileSpreadsheet size={36} className="mx-auto text-teal-400 mb-2 opacity-80" />
              <p className="text-xs font-semibold text-[var(--au-text)]">
                Arrastra o selecciona tu archivo de movimientos
              </p>
              <p className="text-[11px] text-[var(--au-muted)] mt-1">
                Formatos compatibles: CSV, XLSX de MyInvestor, Indexa Capital, Trade Republic o Degiro
              </p>

              <label className="inline-block mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-500 hover:bg-teal-400 cursor-pointer shadow-md transition-all active:scale-95">
                {isProcessing ? 'Procesando archivo...' : 'Seleccionar archivo'}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <form onSubmit={handleTextSubmit} className="space-y-3">
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Pega aquí el texto copiado de tu banco o broker..."
                className="w-full p-3 rounded-2xl bg-[var(--au-chip)] border border-[var(--au-border)] text-xs font-mono text-[var(--au-text)] placeholder-[var(--au-muted)] focus:outline-none focus:border-teal-500/50"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--au-muted)] hover:text-[var(--au-text)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-500 hover:bg-teal-400 shadow-md"
                >
                  {isProcessing ? 'Procesando texto...' : 'Importar Movimientos'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
