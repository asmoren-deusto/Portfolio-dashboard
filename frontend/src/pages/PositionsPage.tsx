import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
} from 'lucide-react'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { AssetBadge, PnlBadge } from '@/components/ui/Badge'
import { PositionDetailModal } from '@/components/positions/PositionDetailModal'
import { fmt } from '@/lib/utils'
import { usePositions } from '@/api/queries'
import type { Position } from '@/lib/mockData'

type AssetFilter = 'all' | 'fund' | 'etf' | 'stock'
type SortField = 'current_value' | 'unrealized_pnl_pct' | 'unrealized_pnl' | 'name' | 'weight'
type SortDir = 1 | -1

const FILTER_TABS: { id: AssetFilter; label: string }[] = [
  { id: 'all', label: 'Todos los Activos' },
  { id: 'fund', label: 'Fondos Indexados' },
  { id: 'etf', label: 'ETFs' },
  { id: 'stock', label: 'Acciones' },
]

export function PositionsPage() {
  const { data: positions = [], isLoading } = usePositions()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<AssetFilter>('all')
  const [sortField, setSortField] = useState<SortField>('current_value')
  const [sortDir, setSortDir] = useState<SortDir>(-1)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)

  // Summary Metrics
  const stats = useMemo(() => {
    if (positions.length === 0) return null
    const totalValue = positions.reduce((sum, p) => sum + p.current_value, 0)
    const totalInvested = positions.reduce((sum, p) => sum + p.invested_amount, 0)
    const totalPnl = totalValue - totalInvested
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
    const gainers = positions.filter((p) => p.unrealized_pnl >= 0).length
    const losers = positions.filter((p) => p.unrealized_pnl < 0).length

    // Weighted average TER
    const weightedTer = positions.reduce((sum, p) => {
      const ter = (p as any).ter ?? 0.15
      return sum + ter * (p.weight / 100)
    }, 0)

    return { totalValue, totalInvested, totalPnl, totalPnlPct, gainers, losers, weightedTer }
  }, [positions])

  // Filter and sort
  const filteredPositions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return [...positions]
      .filter((p) => {
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
      {/* Unified Header */}
      <Header
        title="Posiciones de Cartera"
        subtitle="Seguimiento detallado de activos con rentabilidad latente, peso relativo y desglose por coste."
        badge="MyInvestor + Global"
        badgeColor="emerald"
      />

      {/* Summary KPI Highlights */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Valor Total */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm dark:bg-[#111625]/85 dark:border-white/[0.07] dark:shadow-lg dark:shadow-black/20">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <span>Valor Total Cartera</span>
              <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white mt-1">
              {fmt.currency(stats.totalValue)}
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
              Coste invertido: <span className="text-slate-900 dark:text-slate-200 font-mono font-bold">{fmt.currency(stats.totalInvested)}</span>
            </div>
          </div>

          {/* Plusvalía Latente */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm dark:bg-[#111625]/85 dark:border-white/[0.07] dark:shadow-lg dark:shadow-black/20">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <span>Ganancia Latente Total</span>
              {stats.totalPnl >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              )}
            </div>
            <div
              className={`text-2xl font-bold font-mono mt-1 ${
                stats.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {stats.totalPnl >= 0 ? '+' : ''}
              {fmt.currency(stats.totalPnl)}
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
              Rentabilidad:{' '}
              <span
                className={`font-bold font-mono ${
                  stats.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {stats.totalPnl >= 0 ? '+' : ''}
                {stats.totalPnlPct.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Estado de Activos */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm dark:bg-[#111625]/85 dark:border-white/[0.07] dark:shadow-lg dark:shadow-black/20">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <span>Distribución Rentabilidad</span>
              <PieChart className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white mt-1">
              {positions.length} <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">posiciones</span>
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.gainers} en verde</span> •{' '}
              <span className="text-rose-600 dark:text-rose-400 font-bold">{stats.losers} en rojo</span>
            </div>
          </div>

          {/* TER Medio Ponderado */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm dark:bg-[#111625]/85 dark:border-white/[0.07] dark:shadow-lg dark:shadow-black/20">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <span>Comisión Media (TER)</span>
              <Percent className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {stats.weightedTer.toFixed(2)}%
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5">
              Ponderado por volumen de cartera
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Asset Tabs, Search, Sort & View Mode */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-sm dark:bg-[#111625]/90 dark:border-white/[0.07] overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`relative px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                  active ? 'text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="posTypeTab"
                    className="absolute inset-0 rounded-xl bg-blue-600 shadow-md shadow-blue-500/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
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
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-xs shadow-sm dark:bg-[#111625]/90 dark:border-white/[0.08] dark:text-white dark:placeholder-slate-500 transition-all"
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
              className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer transition-all dark:bg-[#111625]/90 dark:border-white/[0.08] dark:text-slate-300"
            >
              <option value="current_value">Ordenar: Mayor Valor</option>
              <option value="unrealized_pnl_pct">Ordenar: Mayor Ganancia %</option>
              <option value="unrealized_pnl">Ordenar: Mayor Ganancia €</option>
              <option value="name">Ordenar: Nombre (A-Z)</option>
              <option value="weight">Ordenar: Mayor Peso</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-sm dark:bg-[#111625]/90 dark:border-white/[0.08]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Vista de Tabla"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
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
                    Precio NAV
                  </th>
                  <SortHeader field="current_value" label="Valor Actual" right />
                  <th className="border-b border-slate-200/90 dark:border-white/[0.05] px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Invertido
                  </th>
                  <SortHeader field="unrealized_pnl" label="P&L €" right />
                  <SortHeader field="unrealized_pnl_pct" label="P&L %" right />
                  <SortHeader field="weight" label="Peso %" right />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-slate-500">
                        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500 dark:border-white/10" />
                        <p className="mt-3 text-xs">Cargando posiciones...</p>
                      </td>
                    </tr>
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
                    filteredPositions.map((p, i) => (
                      <motion.tr
                        key={p.isin}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelectedPosition(p)}
                        className="group border-b border-slate-100 hover:bg-slate-50/80 dark:border-white/[0.03] dark:hover:bg-white/[0.035] cursor-pointer last:border-0 transition-colors"
                      >
                        {/* Activo / Logo */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <CompanyLogo
                              ticker={p.ticker || p.isin.slice(0, 4)}
                              name={p.name}
                              domain={p.domain}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-300 transition-colors truncate max-w-[280px]">
                                {p.name}
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-400 font-medium">
                                <span>{p.isin}</span>
                                {p.ticker && (
                                  <>
                                    <span>•</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{p.ticker}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="px-4 py-3.5">
                          <AssetBadge type={p.asset_type} />
                        </td>

                        {/* Participaciones */}
                        <td className="px-4 py-3.5 text-right tabular-nums font-mono text-slate-800 dark:text-slate-200 font-medium">
                          {fmt.num(p.shares)}
                        </td>

                        {/* Coste medio */}
                        <td className="px-4 py-3.5 text-right tabular-nums font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {fmt.currency(p.avg_cost)}
                        </td>

                        {/* Precio actual */}
                        <td className="px-4 py-3.5 text-right tabular-nums font-mono text-slate-900 dark:text-slate-100 font-bold">
                          {fmt.currency(p.current_price)}
                        </td>

                        {/* Valor Actual */}
                        <td className="px-4 py-3.5 text-right tabular-nums font-mono font-bold text-slate-900 dark:text-white">
                          {fmt.currency(p.current_value)}
                        </td>

                        {/* Invertido */}
                        <td className="px-4 py-3.5 text-right tabular-nums font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {fmt.currency(p.invested_amount)}
                        </td>

                        {/* P&L € */}
                        <td className="px-4 py-3.5 text-right font-mono">
                          <PnlBadge value={p.unrealized_pnl} />
                        </td>

                        {/* P&L % */}
                        <td className="px-4 py-3.5 text-right font-mono">
                          <PnlBadge value={p.unrealized_pnl_pct} suffix="%" />
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
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Grid Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredPositions.map((p, i) => (
              <motion.div
                key={p.isin}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedPosition(p)}
                className="group relative rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-blue-400 hover:shadow-md dark:bg-[#111625]/90 dark:border-white/[0.07] dark:hover:border-blue-500/40 p-5 shadow-black/20 hover:shadow-blue-500/5 transition-all cursor-pointer backdrop-blur-md flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Logo & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyLogo
                        ticker={p.ticker || p.isin.slice(0, 4)}
                        name={p.name}
                        domain={p.domain}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-300 transition-colors truncate">
                          {p.name}
                        </h3>
                        <p className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {p.isin}
                        </p>
                      </div>
                    </div>
                    <AssetBadge type={p.asset_type} />
                  </div>

                  {/* Main Value and Gain */}
                  <div className="mt-5 flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Valoración</div>
                      <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                        {fmt.currency(p.current_value)}
                      </div>
                    </div>
                    <div className="text-right">
                      <PnlBadge value={p.unrealized_pnl_pct} suffix="%" />
                      <div
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
                      <span className="text-slate-900 dark:text-slate-200 font-bold">{fmt.num(p.shares)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-medium block">Precio NAV:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-bold">{fmt.currency(p.current_price)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-medium block">Coste Medio:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-bold">{fmt.currency(p.avg_cost)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 font-medium block">Invertido:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-bold">{fmt.currency(p.invested_amount)}</span>
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
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Position Detail Modal */}
      <PositionDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}
