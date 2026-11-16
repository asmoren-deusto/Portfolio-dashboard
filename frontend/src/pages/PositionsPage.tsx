import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  PieChart,
  Percent,
  SlidersHorizontal,
  ExternalLink,
  Globe,
  ScanSearch,
} from 'lucide-react'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { AssetBadge, BrokerBadge, PnlBadge } from '@/components/ui/Badge'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import { PortfolioAttributionCard } from '@/components/analytics/PortfolioAttributionCard'
import { TableSkeletonRows, CardSkeletonGrid } from '@/components/ui/TableSkeleton'
import { ExcelExportButton } from '@/components/ui/ExcelExportButton'
import { fmt, cn, getConsensusNavDate, formatAssetDisplayName, getExpectedNavHour, isPositionPendingNavUpdate } from '@/lib/utils'
import { initializeBaselineSeenNavs } from '@/lib/navAlertTracker'
import { isNativePlatform } from '@/api/config'
import { usePositions, usePortfolioSummary, useAnalytics } from '@/api/queries'
import type { Position } from '@/lib/mockData'

type AssetFilter = 'all' | 'fund' | 'epsv' | 'bond' | 'etc' | 'etf' | 'stock'
type SortField = 'current_value' | 'unrealized_pnl_pct' | 'unrealized_pnl' | 'name' | 'weight'
type SortDir = 1 | -1

const FILTER_TABS: { id: AssetFilter; label: string }[] = [
  { id: 'all', label: 'Todos los Activos' },
  { id: 'fund', label: 'Fondos Indexados' },
  { id: 'epsv', label: 'Planes EPSV' },
  { id: 'bond', label: 'Bonos / Renta Fija' },
  { id: 'etc', label: 'ETC / Oro' },
  { id: 'etf', label: 'ETFs' },
  { id: 'stock', label: 'Acciones' },
]

export function PositionsPage() {
  const { data: positions = [], isLoading, isFetching } = usePositions()
  const { data: summary } = usePortfolioSummary()
  const { data: analytics } = useAnalytics()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<AssetFilter>('all')
  const [sortField, setSortField] = useState<SortField>('current_value')
  const [sortDir, setSortDir] = useState<SortDir>(-1)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)

  const latestNavDate = useMemo(() => {
    return getConsensusNavDate(positions, analytics?.latest_nav_date)
  }, [positions, analytics?.latest_nav_date])

  // Summary Metrics
  const stats = useMemo(() => {
    if (positions.length === 0 && !summary) return null
    const validPositions = positions.filter(
      (p) => p.isin !== 'TR_TRANSFER' && !p.isin.startsWith('TR_') && p.name !== 'Cartera Trade Republic'
    )
    const posTotal = validPositions.reduce((sum, p) => sum + (p.current_value || 0), 0)
    const posInvested = validPositions.reduce((sum, p) => sum + (p.invested_amount || 0), 0)
    const totalValue = posTotal > 0 ? posTotal : (summary?.total_value ?? 0)
    const totalInvested = posInvested > 0 ? posInvested : (summary?.total_invested ?? 0)
    const totalPnl = totalValue - totalInvested
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
    const gainers = validPositions.filter((p) => p.unrealized_pnl >= 0).length
    const losers = validPositions.filter((p) => p.unrealized_pnl < 0).length

    // Weighted average TER calculated rigorously across positions with official TER
    let validWeightSum = 0
    const weightedTerSum = positions.reduce((sum, p) => {
      const ter = (p as any).ter
      if (ter !== null && ter !== undefined && typeof ter === 'number' && ter > 0) {
        validWeightSum += p.weight
        return sum + ter * (p.weight / 100)
      }
      return sum
    }, 0)
    const weightedTer = validWeightSum > 0 ? (weightedTerSum / (validWeightSum / 100)) : null

    return { totalValue, totalInvested, totalPnl, totalPnlPct, gainers, losers, weightedTer }
  }, [positions, summary])

  // Initialize baseline seen NAVs so opening the app doesn't trigger historic alerts
  useEffect(() => {
    if (positions && positions.length > 0) {
      initializeBaselineSeenNavs(positions)
    }
  }, [positions])

  // Filter and sort

  const filteredPositions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return [...positions]
      .filter((p) => {
        // Never include Cartera Trade Republic or 0-value placeholder transfer positions
        if (p.isin === 'TR_TRANSFER' || p.isin.startsWith('TR_') || p.name === 'Cartera Trade Republic') return false
        // Asset type filter
        if (activeFilter !== 'all' && p.asset_type !== activeFilter) return false
        // Search query
        if (q) {
          const matchName = p.name.toLowerCase().includes(q)
          const matchIsin = p.isin.toLowerCase().includes(q)
          const matchTicker = (p.ticker || '').toLowerCase().includes(q)
          return matchName || matchIsin || matchTicker
        }
        return true
      })
      .sort((a, b) => {
        const va = (a as any)[sortField] ?? -Infinity
        const vb = (b as any)[sortField] ?? -Infinity
        if (typeof va === 'string') return va.localeCompare(vb) * sortDir
        return (va - vb) * sortDir
      })
  }, [positions, activeFilter, searchQuery, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSortField(field)
      setSortDir(-1)
    }
  }

  const SortHeader = ({ field, label, right = false }: { field: SortField; label: string; right?: boolean }) => (
    <th
      onClick={() => handleSort(field)}
      className={`cursor-pointer select-none border-b border-slate-200/90 dark:border-white/[0.05] px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
        sortField === field
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
      } ${right ? 'text-right' : 'text-left'}`}
    >
      <span className={`inline-flex items-center gap-1.5 ${right ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown
          size={12}
          className={sortField === field ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}
        />
      </span>
    </th>
  )

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Summary KPI Highlights */}

      {/* Summary KPI Highlights */}
      {stats && (
        <div data-private className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <KpiCard
            hoverGlow
            label="Valor Total Cartera"
            value={fmt.currency(stats.totalValue)}
            sub={`Coste invertido: ${fmt.currency(stats.totalInvested)}`}
            tag="Patrimonio"
            tagColor="blue"
            borderAccent="blue"
            icon={<Layers size={15} className="text-blue-500 dark:text-blue-400" />}
            iconBg="bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400"
          />

          <KpiCard
            hoverGlow
            label="Ganancia Latente Total"
            value={`${stats.totalPnl >= 0 ? '+' : ''}${fmt.currency(stats.totalPnl)}`}
            valueColor={stats.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
            tag={`${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnlPct.toFixed(2)}%`}
            tagColor={stats.totalPnl >= 0 ? 'emerald' : 'rose'}
            borderAccent={stats.totalPnl >= 0 ? 'emerald' : 'rose'}
            sub={`Rentabilidad: ${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnlPct.toFixed(2)}%`}
            icon={stats.totalPnl >= 0 ? <TrendingUp size={15} className="text-emerald-500 dark:text-emerald-400" /> : <TrendingDown size={15} className="text-rose-500 dark:text-rose-400" />}
            iconBg={stats.totalPnl >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400'}
          />

          <KpiCard
            hoverGlow
            label="Distribución Rentabilidad"
            value={`${positions.length} posiciones`}
            sub={`${stats.gainers} en verde • ${stats.losers} en rojo`}
            tag={`${stats.gainers}/${positions.length} verdes`}
            tagColor={stats.gainers >= stats.losers ? 'emerald' : 'amber'}
            borderAccent="indigo"
            icon={<PieChart size={15} className="text-indigo-500 dark:text-indigo-400" />}
            iconBg="bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-400"
          />

          <KpiCard
            hoverGlow
            label="Comisión Media (TER)"
            value={stats.weightedTer !== null ? `${stats.weightedTer.toFixed(2)}%` : '—'}
            valueColor="text-amber-500 dark:text-amber-400"
            sub="Ponderado por volumen de cartera"
            tag="Coste anual"
            tagColor="amber"
            borderAccent="amber"
            icon={<Percent size={15} className="text-amber-500 dark:text-amber-400" />}
            iconBg="bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400"
          />
        </div>
      )}

      {/* Mapa Cuadrante Peso vs Retorno, Atribución P&L e Impacto TER */}
      {positions.length > 0 && (
        <PortfolioAttributionCard
          positions={positions}
          onSelectPosition={(p) => setSelectedPosition(p)}
          defaultTab="quadrant"
        />
      )}

      {/* Control Bar: Asset Tabs, Search, Sort & View Mode */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-[#1e1e20] border border-slate-200/80 dark:border-white/[0.08] shadow-card overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
                  active
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                )}
              >
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Search, Sort and View Mode */}
        <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, ticker o ISIN..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-xs shadow-sm dark:bg-[#252526] dark:border-white/[0.08] dark:text-white dark:placeholder-slate-500 transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as SortField)
                setSortDir(-1)
              }}
              className="h-8 appearance-none pl-3 pr-7 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer transition-all dark:bg-[#252526] dark:border-white/[0.08] dark:text-slate-300"
            >
              <option value="current_value">Ordenar: Mayor Valor</option>
              <option value="unrealized_pnl_pct">Ordenar: Mayor Ganancia %</option>
              <option value="unrealized_pnl">Ordenar: Mayor Ganancia €</option>
              <option value="name">Ordenar: Nombre (A-Z)</option>
              <option value="weight">Ordenar: Mayor Peso</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Link to Diversification Analysis */}
          <Link
            to="/analytics?tab=diversification"
            className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all shadow-2xs shrink-0"
            title="Comparar diversificación geográfica y sectorial con respecto a la capitalización mundial"
          >
            <Globe className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span className="hidden sm:inline">Diagnóstico vs Mundo</span>
            <span className="sm:hidden">Mundo</span>
          </Link>

          {/* Botón Informe X-Ray */}
          <Link
            to="/xray"
            className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Generar Informe X-Ray Completo (Morningstar Look-Through)"
          >
            <ScanSearch className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Informe X-Ray</span>
            <span className="sm:hidden">X-Ray</span>
          </Link>

          {/* Exportar a Excel */}
          <ExcelExportButton
            type="positions"
            label="Excel"
            title="Descargar posiciones en Excel (.xlsx) con costes, valores liquidativos y rentabilidades"
          />

          {/* View Toggle */}
          <div className="h-8 flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 shadow-2xs dark:bg-[#252526] dark:border-white/[0.08] shrink-0">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setViewMode('table')}
              className={`h-7 w-7 flex items-center justify-center relative rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Vista de Tabla"
            >
              {viewMode === 'table' && (
                <motion.div
                  layoutId="positionsViewModePill"
                  className="absolute inset-0 rounded-md bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-xs"
                  transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                />
              )}
              <List className="w-4 h-4 relative z-10" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setViewMode('grid')}
              className={`h-7 w-7 flex items-center justify-center relative rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Vista de Tarjetas"
            >
              {viewMode === 'grid' && (
                <motion.div
                  layoutId="positionsViewModePill"
                  className="absolute inset-0 rounded-lg bg-white dark:bg-[#333333] dark:border dark:border-white/10 shadow-sm"
                  transition={{ type: 'spring', bounce: 0.12, duration: 0.26 }}
                />
              )}
              <LayoutGrid className="w-4 h-4 relative z-10" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {viewMode === 'table' ? (
        <Card className="overflow-hidden relative">
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-[13.8px]">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/80 dark:border-white/[0.05] dark:bg-white/[0.01]">
                  <SortHeader field="name" label="Activo / Fondo" />
                  <th className="border-b border-slate-200/90 dark:border-white/[0.05] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Tipo
                  </th>
                  <th className="border-b border-slate-200/90 dark:border-white/[0.05] px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Títulos
                  </th>
                  <th className="border-b border-slate-200/90 dark:border-white/[0.05] px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Coste Medio
                  </th>
                  <th className="border-b border-slate-200/90 dark:border-white/[0.05] px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Precio / NAV
                  </th>
                  <SortHeader field="current_value" label={isNativePlatform() ? 'Valor' : 'Valor Actual'} right />
                  <th className="border-b border-slate-200/90 dark:border-white/[0.05] px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Invertido
                  </th>
                  <SortHeader field="unrealized_pnl" label="P&L €" right />
                  <SortHeader field="unrealized_pnl_pct" label="P&L %" right />
                  <SortHeader field="weight" label="Peso %" right />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeletonRows rows={7} cols={10} />
                ) : filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-20 text-center">
                      <div className="max-w-xs mx-auto text-center space-y-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No se encontraron posiciones</p>
                        <p className="text-xs text-slate-500">Prueba a cambiar el filtro de búsqueda o categoría.</p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline pt-2 inline-block"
                          >
                            Limpiar búsqueda
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((p) => {
                    const pDate = p.price_date || p.last_updated
                    const isUpdated = Boolean(latestNavDate && pDate && pDate >= latestNavDate)
                    const isPendingNav = isPositionPendingNavUpdate(p, latestNavDate)
                    return (
                      <tr
                        key={p.isin}
                        onClick={() => setSelectedPosition(p)}
                          title={isUpdated ? `Actualizado con último NAV (${p.price_date || p.last_updated})` : `Pendiente de nuevo NAV (último: ${p.price_date || p.last_updated})`}
                          className="group border-b border-slate-100 hover:bg-slate-50/80 dark:border-white/[0.03] dark:hover:bg-white/[0.035] cursor-pointer last:border-0 transition-colors"
                        >
                        {/* Activo / Logo */}
                        <td className="px-4 py-3.5 relative">
                          {isUpdated && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r-full bg-blue-500/80 dark:bg-blue-400/80 pointer-events-none"
                            />
                          )}
                          <div className="flex items-center gap-3">
                            <CompanyLogo
                              isin={p.isin}
                              ticker={p.ticker || p.isin.slice(0, 4)}
                              name={p.name}
                              domain={p.domain}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-white transition-colors truncate max-w-[280px]">
                                {formatAssetDisplayName(p.name, true)}
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-400 font-medium">
                                <span>{p.isin}</span>
                                {p.ticker && (
                                  <>
                                    <span>•</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{p.ticker}</span>
                                  </>
                                )}
                                <BrokerBadge broker={p.broker} className="ml-1" />
                                {(() => {
                                  const isLive = p.asset_type === 'etc' || p.asset_type === 'etf' || p.asset_type === 'stock' || p.isin === 'IE00B4ND3602' || p.isin === 'US67066G1040'
                                  if (isLive) {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10.5px] font-semibold ml-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Tiempo Real
                                      </span>
                                    )
                                  }
                                  if (!p.price_date && !p.last_updated) return null
                                  return (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-mono ml-1",
                                        isUpdated
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                          : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/[0.06]"
                                      )}
                                      title={isUpdated ? "Valor liquidativo al día con el último cierre de mercado" : "Pendiente de publicación del nuevo valor liquidativo por la gestora"}
                                    >
                                      <span
                                        className={cn(
                                          "w-1.5 h-1.5 rounded-full",
                                          isUpdated ? "bg-emerald-500" : "bg-amber-500"
                                        )}
                                      />
                                      NAV {new Date(p.price_date || p.last_updated!).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                      {isUpdated ? " · Al día" : " · Pendiente"}
                                    </span>
                                  )
                                })()}
                                {p.asset_type === 'epsv' && (
                                  <span data-private className="ml-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-violet-100/90 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
                                    DCA 416,66 €/mes (día 7)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <AssetBadge type={p.asset_type} />

                          </div>
                        </td>

                        {/* Participaciones */}
                        <td data-private className="px-4 py-3.5 text-right tabular-nums font-mono text-slate-800 dark:text-slate-200 font-medium">
                          {fmt.num(p.shares)}
                        </td>

                        {/* Coste medio */}
                        <td data-private className="px-4 py-3.5 text-right tabular-nums font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {fmt.currency(p.avg_cost)}
                        </td>

                        {/* Precio actual */}
                        <td className="px-4 py-3.5 text-right tabular-nums font-mono text-slate-900 dark:text-slate-100 font-bold">
                          <div>
                            {fmt.price(
                              p.current_price,
                              p.currency || 'EUR',
                              p.current_price && (p.current_price * 100) % 1 !== 0 ? 3 : 2
                            )}
                          </div>
                          {(() => {
                            const isLive = p.asset_type === 'etc' || p.asset_type === 'etf' || p.asset_type === 'stock' || p.isin === 'IE00B4ND3602' || p.isin === 'US67066G1040'
                            if (isLive) {
                              return (
                                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-end gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>{p.quote_time ? `Hoy ${p.quote_time}` : 'Tiempo real'}</span>
                                </div>
                              )
                            }
                            const raw = p.price_date || p.last_updated
                            if (!raw) return null
                            const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw
                            return <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{dateOnly}</div>
                          })()}
                        </td>

                        {/* Valor Actual */}
                        <td data-private className="px-4 py-3.5 text-right tabular-nums font-mono font-bold text-slate-900 dark:text-white">
                          {fmt.currency(p.current_value)}
                        </td>

                        {/* Invertido */}
                        <td data-private className="px-4 py-3.5 text-right tabular-nums font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {fmt.currency(p.invested_amount)}
                        </td>

                        {/* P&L € */}
                        <td data-private className="px-4 py-3.5 text-right font-mono">
                          <PnlBadge value={p.unrealized_pnl} />
                        </td>

                        {/* P&L % */}
                        <td data-private className="px-4 py-3.5 text-right font-mono">
                          <PnlBadge value={p.unrealized_pnl_pct} suffix="%" />
                          {p.irr !== undefined && p.irr !== null && (
                            <div className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono font-semibold mt-0.5" title="TIR anualizada ponderada por flujos">
                              TIR {p.irr >= 0 ? '+' : ''}{p.irr}%
                            </div>
                          )}
                        </td>

                        {/* Peso % */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-14 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                style={{ width: `${Math.min(p.weight, 100)}%` }}
                              />
                            </div>
                            <span className="w-12 text-right tabular-nums font-mono text-slate-800 dark:text-slate-200 font-bold text-xs">
                              {p.weight.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )})
                  )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Grid Mode */
        isLoading ? (
          <CardSkeletonGrid count={6} />
        ) : filteredPositions.length === 0 ? (
          <div className="py-20 text-center">
            <div className="max-w-xs mx-auto text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No se encontraron posiciones</p>
              <p className="text-xs text-slate-500">Prueba a cambiar el filtro de búsqueda o categoría.</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline pt-2 inline-block"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredPositions.map((p, i) => {
                const pDate = p.price_date || p.last_updated
                const isUpdated = Boolean(latestNavDate && pDate && pDate >= latestNavDate)
                const isPendingNav = isPositionPendingNavUpdate(p, latestNavDate)
                return (
                  <motion.div
                    key={p.isin}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.02, 0.25) }}
                    onClick={() => setSelectedPosition(p)}
                    title={isUpdated ? `Actualizado con último NAV (${p.price_date || p.last_updated})` : `Pendiente de nuevo NAV (último: ${p.price_date || p.last_updated})`}
                    className="group relative rounded-2xl bg-gradient-to-b from-white via-white/98 to-slate-50/70 hover:to-white border border-slate-200/80 shadow-card hover:shadow-card-hover hover:border-blue-400/70 dark:bg-gradient-to-b dark:from-[#212124] dark:via-[#1e1e20] dark:to-[#18181a] dark:hover:from-[#26262a] dark:border-white/[0.08] dark:hover:border-white/20 p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
                  >
                    {/* Top subtle shine line */}
                    <div className="pointer-events-none absolute -top-px inset-x-5 h-px bg-gradient-to-r from-transparent via-slate-900/[0.08] dark:via-white/[0.18] to-transparent z-10" />
                  {isUpdated && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-3 bottom-3 w-[2.5px] rounded-r-full bg-blue-500/80 dark:bg-blue-400/80 pointer-events-none"
                    />
                  )}
                <div>
                  {/* Top Bar with Logo & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyLogo
                        isin={p.isin}
                        ticker={p.ticker || p.isin.slice(0, 4)}
                        name={p.name}
                        domain={p.domain}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-white transition-colors truncate">
                          {formatAssetDisplayName(p.name, true)}
                        </h3>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          <span>{p.isin}</span>
                          <BrokerBadge broker={p.broker} className="shrink-0" />
                          {p.asset_type === 'epsv' && (
                            <span data-private className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-violet-100/90 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 shrink-0">
                              DCA 416,66 € (día 7)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <AssetBadge type={p.asset_type} />

                    </div>
                  </div>

                  {/* Main Value and Gain */}
                  <div className="mt-5 flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Valoración</div>
                      <div data-private className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                        {fmt.currency(p.current_value)}
                      </div>
                    </div>
                    <div className="text-right">
                      <PnlBadge value={p.unrealized_pnl_pct} suffix="%" />
                      <div
                        data-private
                        className={`text-xs font-mono font-bold mt-0.5 ${
                          p.unrealized_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {p.unrealized_pnl >= 0 ? '+' : ''}
                        {fmt.currency(p.unrealized_pnl)}
                      </div>
                    </div>
                  </div>

                  {/* Breakdown details */}
                  <div className="mt-4 grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/90 dark:bg-white/[0.02] dark:border-white/[0.04] text-xs font-mono">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-medium block">Títulos:</span>
                      <span data-private className="text-slate-900 dark:text-slate-200 font-bold">{fmt.num(p.shares)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-medium block">
                        {p.asset_type === 'etc' || p.asset_type === 'etf' || p.asset_type === 'stock' || p.isin === 'IE00B4ND3602' || p.isin === 'US67066G1040' ? 'Cotización:' : 'Precio NAV:'}
                      </span>
                      <span className="text-slate-900 dark:text-slate-200 font-bold">
                        {fmt.price(
                          p.current_price,
                          p.currency || 'EUR',
                          p.current_price && (p.current_price * 100) % 1 !== 0 ? 3 : 2
                        )}
                      </span>
                      {(() => {
                        const isLive = p.asset_type === 'etc' || p.asset_type === 'etf' || p.asset_type === 'stock' || p.isin === 'IE00B4ND3602' || p.isin === 'US67066G1040'
                        if (isLive) {
                          return (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {p.quote_time ? `Hoy ${p.quote_time}` : 'Tiempo Real'}
                            </span>
                          )
                        }
                        const raw = p.price_date || p.last_updated
                        if (!raw) return null
                        const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw
                        return (
                          <span className={cn(
                            "text-[11px] block font-medium mt-0.5",
                            isUpdated ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                          )}>
                            ({dateOnly}{isUpdated ? ' · Al día' : ' · Pendiente'})
                          </span>
                        )
                      })()}
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-medium block">Coste Medio:</span>
                      <span data-private className="text-slate-900 dark:text-slate-200 font-bold">{fmt.currency(p.avg_cost)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-medium block">Invertido:</span>
                      <span data-private className="text-slate-900 dark:text-slate-200 font-bold">{fmt.currency(p.invested_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Weight Bar footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 flex-1 mr-3">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Peso:</span>
                    <div className="h-2 flex-1 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{ width: `${Math.min(p.weight, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-mono text-slate-900 dark:text-slate-200 font-bold">{p.weight.toFixed(1)}%</span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    ))}

      {/* Position Detail Modal */}
      <PositionDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}

export default PositionsPage
