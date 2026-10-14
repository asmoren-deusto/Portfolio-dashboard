import React, { useMemo, useState } from 'react'
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List as ListIcon,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePositions, usePortfolioSummary } from '@/api/queries'
import { useAppStore } from '@/store/appStore'
import { fmt, cn } from '@/lib/utils'
import { AuroraCard } from '~/components/ui/AuroraCard'
import { AuroraBadge } from '~/components/ui/AuroraBadge'
import { Sparkline } from '~/components/ui/Sparkline'

const CATEGORY_COLORS = [
  '#2dd4bf', // teal
  '#a78bfa', // violet
  '#38bdf8', // sky
  '#fbbf24', // amber
  '#ec4899', // pink
  '#60a5fa', // blue
  '#34d399', // emerald
  '#94a3b8', // slate
]

export function PositionsPage() {
  const { data: positions, isLoading } = usePositions()
  const { data: summary } = usePortfolioSummary()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [expandedIsin, setExpandedIsin] = useState<string | null>(null)

  // Categories list
  const categories = useMemo(() => {
    if (!positions) return ['Todos']
    const set = new Set<string>()
    positions.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['Todos', ...Array.from(set)]
  }, [positions])

  // Brokers list
  const brokers = useMemo(() => {
    if (!positions) return ['all']
    const set = new Set<string>()
    positions.forEach((p) => {
      if (p.broker) set.add(p.broker)
    })
    return ['all', ...Array.from(set)]
  }, [positions])

  // Filtered positions
  const filtered = useMemo(() => {
    if (!positions) return []
    return positions.filter((p) => {
      const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory
      const matchBroker = selectedBrokerFilter === 'all' || p.broker === selectedBrokerFilter
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.isin.toLowerCase().includes(q) ||
        (p.ticker && p.ticker.toLowerCase().includes(q))
      return matchCat && matchBroker && matchSearch
    })
  }, [positions, selectedCategory, selectedBrokerFilter, search])

  // Total value of filtered positions
  const filteredTotalValue = useMemo(() => {
    return filtered.reduce((acc, p) => acc + (p.current_value || 0), 0)
  }, [filtered])

  // Latest reporting NAV date across active positions
  const latestNavDate = useMemo(() => {
    if (!positions) return ''
    return positions.reduce((max, p) => {
      const d = p.price_date || p.last_updated
      return d && d > max ? d : max
    }, '')
  }, [positions])

  return (
    <div className="flex flex-col gap-6 au-rise">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP ASSET ALLOCATION BAR (STACKED)
          ───────────────────────────────────────────────────────────── */}
      <AuroraCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="au-title">Asignación de Activos</h3>
            <p className="text-[11px] text-[var(--au-muted)]">
              Distribución porcentual de los {positions?.length || 0} fondos y ETFs
            </p>
          </div>
          <span data-private className="au-num text-sm font-bold text-teal-400">
            {fmt.currency(summary?.total_value || filteredTotalValue)}
          </span>
        </div>

        {/* Stacked Allocation Progress Bar */}
        <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-[var(--au-chip)] p-0.5 border border-[var(--au-border)]">
          {positions?.map((p, idx) => {
            const widthPct = Math.max(p.weight || 0, 1.5)
            const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
            return (
              <div
                key={p.isin}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all group relative cursor-pointer"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
                title={`${p.name}: ${p.weight?.toFixed(1)}%`}
              />
            )
          })}
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center gap-3 mt-3.5">
          {positions?.slice(0, 6).map((p, idx) => (
            <div key={p.isin} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
              />
              <span className="text-[var(--au-text-2)] truncate max-w-[150px]">
                {p.name.replace('Fund', '').trim()}
              </span>
              <span className="au-num font-bold text-[var(--au-text)]">{p.weight?.toFixed(1)}%</span>
            </div>
          ))}
          {(positions?.length || 0) > 6 && (
            <span className="text-[11px] text-[var(--au-muted)] font-semibold">
              +{(positions?.length || 0) - 6} más
            </span>
          )}
        </div>
      </AuroraCard>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTERS, SEARCH AND VIEW TOGGLE
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--au-muted)]"
          />
          <input
            type="text"
            placeholder="Buscar por fondo, ISIN o ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="au-input pl-10"
          />
        </div>

        {/* Category Pills & View Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="au-seg">
            {categories.slice(0, 4).map((cat) => {
              const isSelected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  aria-pressed={isSelected}
                  className="au-seg-btn py-1 px-3 text-xs"
                >
                  {isSelected && <motion.div layoutId="posCatPill" className="au-seg-pill" />}
                  <span className="relative z-10">{cat}</span>
                </button>
              )
            })}
          </div>

          {/* List / Grid view switcher */}
          <div className="au-seg shrink-0">
            <button
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className="au-seg-btn p-1.5"
              title="Vista de tabla"
            >
              {viewMode === 'list' && <motion.div layoutId="viewModePill" className="au-seg-pill" />}
              <ListIcon size={16} className="relative z-10" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              className="au-seg-btn p-1.5"
              title="Vista de tarjetas"
            >
              {viewMode === 'grid' && <motion.div layoutId="viewModePill" className="au-seg-pill" />}
              <LayoutGrid size={16} className="relative z-10" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. POSITIONS TABLE VIEW
          ───────────────────────────────────────────────────────────── */}
      {viewMode === 'list' ? (
        <AuroraCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="au-table">
              <thead>
                <tr>
                  <th>Fondo / ISIN</th>
                  <th>Broker</th>
                  <th>Peso</th>
                  <th>Participaciones</th>
                  <th>Valor Actual</th>
                  <th>P/L Total</th>
                  <th>1D</th>
                  <th>30 Días</th>
                  <th>Fecha NAV</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const isExpanded = expandedIsin === p.isin
                  const isGain = p.unrealized_pnl >= 0
                  const isDailyGain = (p.daily_change || 0) >= 0
                  const isFresh = Boolean(latestNavDate && (p.price_date || p.last_updated) === latestNavDate)

                  // Mock sparkline trend for each row
                  const sparkTrend = [
                    (p.current_price || 10) * 0.95,
                    (p.current_price || 10) * 0.97,
                    (p.current_price || 10) * 0.96,
                    (p.current_price || 10) * 0.99,
                    (p.current_price || 10) * 1.01,
                    (p.current_price || 10),
                  ]

                  return (
                    <React.Fragment key={p.isin}>
                      <tr
                        onClick={() => setExpandedIsin(isExpanded ? null : p.isin)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isExpanded && 'bg-[var(--au-chip)]'
                        )}
                      >
                        {/* Name & ISIN */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border"
                              style={{
                                backgroundColor: `color-mix(in oklab, ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} 15%, transparent)`,
                                color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                                borderColor: `color-mix(in oklab, ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} 30%, transparent)`,
                              }}
                            >
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-[var(--au-text)] truncate max-w-[260px]">
                                {p.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-[var(--au-muted)] font-mono">
                                <span>{p.isin}</span>
                                {p.ter && <span>· TER: {p.ter}%</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Broker */}
                        <td>
                          <span className="au-chip text-[10px] uppercase font-bold">
                            {p.broker || 'MyInvestor'}
                          </span>
                        </td>

                        {/* Weight */}
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-[var(--au-chip)] overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(p.weight || 0, 100)}%`,
                                  backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                                }}
                              />
                            </div>
                            <span className="au-num text-xs font-bold">{p.weight?.toFixed(1)}%</span>
                          </div>
                        </td>

                        {/* Shares & Cost */}
                        <td>
                          <div className="au-num text-xs">
                            <p className="font-bold text-[var(--au-text)]">
                              {p.shares?.toFixed(3)}
                            </p>
                            <p className="text-[10px] text-[var(--au-muted)]">
                              Coste: {p.avg_cost?.toFixed(2)} €
                            </p>
                          </div>
                        </td>

                        {/* Current Value */}
                        <td>
                          <div data-private className="au-num text-xs">
                            <p className="font-bold text-[var(--au-text)]">
                              {fmt.currency(p.current_value)}
                            </p>
                            <p className="text-[10px] text-[var(--au-muted)]">
                              NAV: {p.current_price?.toFixed(2)} €
                            </p>
                          </div>
                        </td>

                        {/* P/L Total */}
                        <td>
                          <div
                            data-private
                            className={cn('au-num text-xs font-bold', isGain ? 'text-teal-400' : 'text-rose-400')}
                          >
                            <p>
                              {isGain ? '+' : ''}{fmt.currency(p.unrealized_pnl)}
                            </p>
                            <p className="text-[10px]">
                              {p.unrealized_pnl_pct >= 0 ? '+' : ''}
                              {p.unrealized_pnl_pct.toFixed(2)}%
                            </p>
                          </div>
                        </td>

                        {/* 1D Change */}
                        <td>
                          <AuroraBadge variant={isDailyGain ? 'gain' : 'loss'} size="sm">
                            <span data-private>
                              {p.daily_change_pct !== undefined && p.daily_change_pct !== null
                                ? `${p.daily_change_pct >= 0 ? '+' : ''}${p.daily_change_pct.toFixed(2)}%`
                                : '—'}
                            </span>
                          </AuroraBadge>
                        </td>

                        {/* Sparkline */}
                        <td className="w-24">
                          <div className="w-20">
                            <Sparkline
                              data={sparkTrend}
                              color={isGain ? '#2dd4bf' : '#fb7185'}
                              height={24}
                            />
                          </div>
                        </td>

                        {/* NAV Date & Freshness Dot */}
                        <td>
                          <div className="flex items-center gap-1.5 text-xs font-mono">
                            <span className={cn('au-live-dot', !isFresh && 'is-warn')} />
                            <span className="text-[var(--au-text-2)] text-[11px]">
                              {p.price_date || p.last_updated?.split('T')[0] || '—'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row Detail */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="bg-[var(--au-chip)]/40 p-4 border-b border-[var(--au-border)]">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono"
                            >
                              <div className="p-3 rounded-xl bg-[var(--au-card-solid)] border border-[var(--au-border)]">
                                <span className="text-[var(--au-muted)] block mb-1">Categoría</span>
                                <span className="font-bold text-[var(--au-text)]">{p.category || 'Renta Variable'}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-[var(--au-card-solid)] border border-[var(--au-border)]">
                                <span className="text-[var(--au-muted)] block mb-1">Geografía</span>
                                <span className="font-bold text-[var(--au-text)]">{p.geo || 'Global'}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-[var(--au-card-solid)] border border-[var(--au-border)]">
                                <span className="text-[var(--au-muted)] block mb-1">Gastos Corrientes (TER)</span>
                                <span className="font-bold text-teal-400">{p.ter || '0.18'}%</span>
                              </div>
                              <div className="p-3 rounded-xl bg-[var(--au-card-solid)] border border-[var(--au-border)]">
                                <span className="text-[var(--au-muted)] block mb-1">Divisa</span>
                                <span className="font-bold text-[var(--au-text)]">{p.currency || 'EUR'}</span>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </AuroraCard>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, idx) => {
            const isGain = p.unrealized_pnl >= 0
            const isDailyGain = (p.daily_change || 0) >= 0

            return (
              <AuroraCard key={p.isin} hoverEffect className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} 15%, transparent)`,
                          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                          borderColor: `color-mix(in oklab, ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} 30%, transparent)`,
                        }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-[var(--au-text)] truncate max-w-[190px]">
                          {p.name}
                        </h4>
                        <span className="text-[10px] text-[var(--au-muted)] font-mono">{p.isin}</span>
                      </div>
                    </div>
                    <span className="au-chip text-[10px] uppercase font-bold shrink-0">
                      {p.broker || 'MyInvestor'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[var(--au-muted)] text-[10px]">Valoración</span>
                      <p data-private className="au-num font-bold text-sm text-[var(--au-text)]">
                        {fmt.currency(p.current_value)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--au-muted)] text-[10px]">Rentabilidad</span>
                      <p
                        data-private
                        className={cn('au-num font-bold text-sm', isGain ? 'text-teal-400' : 'text-rose-400')}
                      >
                        {isGain ? '+' : ''}{p.unrealized_pnl_pct.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--au-border)] flex items-center justify-between">
                  <span className="text-[10px] text-[var(--au-muted)] font-mono">
                    Peso: <strong className="text-[var(--au-text)]">{p.weight?.toFixed(1)}%</strong>
                  </span>
                  <AuroraBadge variant={isDailyGain ? 'gain' : 'loss'} size="sm">
                    <span data-private>
                      {p.daily_change_pct !== undefined && p.daily_change_pct !== null
                        ? `${p.daily_change_pct >= 0 ? '+' : ''}${p.daily_change_pct.toFixed(2)}%`
                        : '—'}
                    </span>
                  </AuroraBadge>
                </div>
              </AuroraCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
