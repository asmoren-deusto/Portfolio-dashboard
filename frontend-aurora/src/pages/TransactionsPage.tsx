import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Coins,
  Calendar,
  Layers,
  Building2,
  TrendingUp,
  Download,
  Filter,
} from 'lucide-react'
import { useTransactions, usePositions, type Transaction } from '@/api/queries'
import { useAppStore } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'
import {
  Glass,
  PageHeader,
  CardHeader,
  Segmented,
  Delta,
  BrokerTag,
  Monogram,
  AnimatedNumber,
  eur,
  signedEur,
  pct,
  rise,
  stagger,
} from '~/ui'

type TxType = 'all' | 'buy' | 'sell' | 'dividend' | 'transfer'

const TYPE_CONFIG: Record<string, { label: string; icon: any; tone: 'gain' | 'loss' | 'accent' | 'warn' }> = {
  buy: { label: 'Compra DCA', icon: ArrowUpRight, tone: 'gain' },
  sell: { label: 'Venta', icon: ArrowDownRight, tone: 'loss' },
  dividend: { label: 'Dividendo', icon: Coins, tone: 'warn' },
  transfer: { label: 'Traspaso', icon: ArrowLeftRight, tone: 'accent' },
}

const TYPE_TABS: { id: TxType; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'buy', label: 'Compras' },
  { id: 'sell', label: 'Ventas' },
  { id: 'transfer', label: 'Traspasos' },
]

export function TransactionsPage() {
  const { currentUser } = useAppStore()
  const { data: txs = [], isLoading } = useTransactions()
  const { data: positions = [] } = usePositions()

  const [typeFilter, setTypeFilter] = useState<TxType>('all')
  const [selectedBroker, setSelectedBroker] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  // Map ISIN to readable name
  const nameMap = useMemo(() => {
    const map = new Map<string, string>()
    positions.forEach((p) => {
      if (p.isin) map.set(p.isin, p.name)
    })
    return map
  }, [positions])

  // Extract available brokers
  const brokers = useMemo(() => {
    const set = new Set<string>()
    txs.forEach((t) => {
      if (t.broker) set.add(t.broker)
    })
    return Array.from(set)
  }, [txs])

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return txs.filter((t) => {
      const matchesType = typeFilter === 'all' || t.type.toLowerCase() === typeFilter
      const matchesBroker =
        selectedBroker === 'ALL' ||
        (t.broker && t.broker.toLowerCase() === selectedBroker.toLowerCase())

      const q = search.toLowerCase().trim()
      const fundName = nameMap.get(t.isin) || t.isin || ''
      const matchesSearch =
        !q ||
        fundName.toLowerCase().includes(q) ||
        t.isin.toLowerCase().includes(q) ||
        (t.broker && t.broker.toLowerCase().includes(q))

      return matchesType && matchesBroker && matchesSearch
    })
  }, [txs, typeFilter, selectedBroker, search, nameMap])

  // Overall KPIs
  const stats = useMemo(() => {
    let totalBuys = 0
    let totalSells = 0
    let buyCount = 0

    txs.forEach((t) => {
      const type = t.type.toLowerCase()
      if (type === 'buy') {
        totalBuys += t.amount
        buyCount++
      } else if (type === 'sell') {
        totalSells += t.amount
      }
    })

    return {
      totalBuys,
      totalSells,
      netInvested: totalBuys - totalSells,
      totalCount: txs.length,
      buyCount,
    }
  }, [txs])

  // Group by Month (YYYY-MM)
  const groupedByMonth = useMemo(() => {
    const groups: { monthKey: string; monthLabel: string; items: Transaction[]; totalMonth: number }[] = []
    const map = new Map<string, Transaction[]>()

    filteredTxs.forEach((t) => {
      const key = t.date ? t.date.slice(0, 7) : 'Sin fecha'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    })

    // Sort by key descending
    const sortedKeys = Array.from(map.keys()).sort().reverse()

    sortedKeys.forEach((key) => {
      const items = map.get(key)!
      // Sort items within month by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      let totalMonth = 0
      items.forEach((t) => {
        if (t.type.toLowerCase() === 'buy') totalMonth += t.amount
        else if (t.type.toLowerCase() === 'sell') totalMonth -= t.amount
      })

      let monthLabel = key
      if (key !== 'Sin fecha') {
        const [y, m] = key.split('-')
        const d = new Date(parseInt(y), parseInt(m) - 1, 1)
        monthLabel = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        monthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
      }

      groups.push({
        monthKey: key,
        monthLabel,
        items,
        totalMonth,
      })
    })

    return groups
  }, [filteredTxs])

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <PageHeader
        eyebrow="HISTORIAL DE MOVIMIENTOS"
        title="Operaciones y aportaciones"
        subtitle="Registro completo de suscripciones DCA periódicas, compras, reembolsos y traspasos de fondos."
      />

      {/* ── KPI Summary Tiles ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Glass className="p-4 !rounded-2xl">
          <div className="text-[11px] text-[var(--muted)] font-medium">Aportado Bruto (Compras)</div>
          <div className="text-xl md:text-2xl font-bold num mt-1 text-[var(--text)]">
            <AnimatedNumber value={stats.totalBuys} prefix="" suffix=" €" />
          </div>
          <div className="text-[11px] text-[var(--gain)] mt-1 flex items-center gap-1">
            <ArrowUpRight size={12} />
            <span>{stats.buyCount} compras DCA</span>
          </div>
        </Glass>

        <Glass className="p-4 !rounded-2xl">
          <div className="text-[11px] text-[var(--muted)] font-medium">Reembolsos (Ventas)</div>
          <div className="text-xl md:text-2xl font-bold num mt-1 text-[var(--text)]">
            <AnimatedNumber value={stats.totalSells} prefix="" suffix=" €" />
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            {stats.totalSells > 0 ? 'Retiradas de capital' : 'Sin desinversiones'}
          </div>
        </Glass>

        <Glass className="p-4 !rounded-2xl">
          <div className="text-[11px] text-[var(--muted)] font-medium">Aportación Neta</div>
          <div className="text-xl md:text-2xl font-bold num mt-1 text-[var(--gain)]">
            <AnimatedNumber value={stats.netInvested} prefix="" suffix=" €" />
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">Capital neto en fondos</div>
        </Glass>

        <Glass className="p-4 !rounded-2xl">
          <div className="text-[11px] text-[var(--muted)] font-medium">Total Operaciones</div>
          <div className="text-xl md:text-2xl font-bold num mt-1 text-[var(--text)]">
            {stats.totalCount}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">Histórico auditado</div>
        </Glass>
      </div>

      {/* ── Controls: Type tabs, Broker chips & Search ─────────── */}
      <Glass className="p-3.5 !rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            id="txTypeFilter"
            options={TYPE_TABS.map((t) => ({ label: t.label, value: t.id }))}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TxType)}
            size="sm"
          />

          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-[var(--line)]">
            <button
              onClick={() => setSelectedBroker('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                selectedBroker === 'ALL'
                  ? 'bg-white/[0.1] text-[var(--text)] border border-[var(--line-strong)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              Todos
            </button>
            {brokers.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBroker(b)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize',
                  selectedBroker.toLowerCase() === b.toLowerCase()
                    ? 'bg-white/[0.1] text-[var(--text)] border border-[var(--line-strong)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="relative md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por fondo, ISIN…"
            className="w-full bg-[var(--surface-solid)] border border-[var(--line)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--gain)]"
          />
        </div>
      </Glass>

      {/* ── Timeline Grouped List ─────────────────────────────── */}
      <div className="space-y-6">
        {groupedByMonth.map((group) => (
          <div key={group.monthKey} className="space-y-2.5">
            {/* Month Header Banner */}
            <div className="flex items-center justify-between px-2 text-xs">
              <span className="font-semibold text-[var(--text)] flex items-center gap-2">
                <Calendar size={13} className="text-[var(--muted)]" />
                {group.monthLabel}
              </span>
              <span className="text-[var(--muted)] font-mono">
                Neto mes: <strong className="text-[var(--text)]">{eur(group.totalMonth)}</strong>
              </span>
            </div>

            {/* Transactions Cards for this month */}
            <div className="space-y-2">
              {group.items.map((t) => {
                const typeInfo = TYPE_CONFIG[t.type.toLowerCase()] || {
                  label: t.type,
                  icon: ArrowUpRight,
                  tone: 'gain' as const,
                }
                const Icon = typeInfo.icon
                const fundName = nameMap.get(t.isin) || t.isin
                const formattedDate = new Date(t.date).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })

                return (
                  <Glass
                    key={t.id}
                    className="p-3.5 !rounded-2xl flex items-center justify-between gap-4 hover:border-[var(--line-strong)] transition-all"
                  >
                    {/* Left: Type Icon + Asset Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                          typeInfo.tone === 'gain'
                            ? 'bg-[var(--gain)]/10 text-[var(--gain)] border-[var(--gain)]/20'
                            : typeInfo.tone === 'loss'
                            ? 'bg-[var(--loss)]/10 text-[var(--loss)] border-[var(--loss)]/20'
                            : 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                        )}
                      >
                        <Icon size={16} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-[var(--text)] truncate">
                            {fundName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-[var(--muted)] mt-0.5">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span className="font-mono">{t.shares.toFixed(4)} part.</span>
                          <span>•</span>
                          <span className="font-mono">NAV {eur(t.price, 4)}</span>
                          {t.broker && (
                            <>
                              <span>•</span>
                              <BrokerTag broker={t.broker} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Badge */}
                    <div className="text-right shrink-0">
                      <div
                        className={cn(
                          'text-base font-mono font-bold',
                          typeInfo.tone === 'gain'
                            ? 'text-[var(--text)]'
                            : typeInfo.tone === 'loss'
                            ? 'text-[var(--loss)]'
                            : 'text-[var(--accent)]'
                        )}
                      >
                        {typeInfo.tone === 'gain' ? '+' : typeInfo.tone === 'loss' ? '-' : ''}
                        {eur(t.amount)}
                      </div>
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--muted)]">
                        {typeInfo.label}
                      </div>
                    </div>
                  </Glass>
                )
              })}
            </div>
          </div>
        ))}

        {groupedByMonth.length === 0 && (
          <Glass className="p-12 !rounded-2xl text-center">
            <Layers className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
            <h3 className="text-base font-semibold text-[var(--text)]">No se encontraron operaciones</h3>
            <p className="text-xs text-[var(--muted)] mt-1">
              Prueba a cambiar el filtro de tipo de operación o la búsqueda.
            </p>
          </Glass>
        )}
      </div>
    </motion.div>
  )
}
