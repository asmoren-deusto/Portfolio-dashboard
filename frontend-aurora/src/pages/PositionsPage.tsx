import { useMemo, useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  Download,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Clock,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react'
import { usePositions, usePortfolioSummary, useAnalytics } from '@/api/queries'
import { cn } from '@/lib/utils'

export function PositionsPage() {
  const { data: positions = [], isLoading } = usePositions()
  const { data: summary } = usePortfolioSummary()
  const { data: analytics } = useAnalytics()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedBroker, setSelectedBroker] = useState<string>('all')
  const [rebalanceModal, setRebalanceModal] = useState(false)

  // Extract unique brokers
  const brokers = useMemo(() => {
    const set = new Set<string>()
    positions.forEach((p) => {
      if (p.broker) set.add(p.broker)
    })
    return Array.from(set)
  }, [positions])

  // Category counts
  const categoryCounts = useMemo(() => {
    let rv = 0
    let rf = 0
    let liq = 0
    positions.forEach((p) => {
      const c = (p.category || p.asset_type || '').toLowerCase()
      if (/fija|bono|bond/i.test(c)) rf++
      else if (/monet|liq|cash|efectivo/i.test(c)) liq++
      else rv++
    })
    return { all: positions.length, rv, rf, liq }
  }, [positions])

  // Filtered positions
  const filtered = useMemo(() => {
    return positions.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.isin.toLowerCase().includes(search.toLowerCase()) ||
        (p.broker && p.broker.toLowerCase().includes(search.toLowerCase()))

      const c = (p.category || p.asset_type || '').toLowerCase()
      let matchesCat = true
      if (selectedCategory === 'rv') matchesCat = !/fija|bono|bond|monet|liq|cash|efectivo/i.test(c)
      else if (selectedCategory === 'rf') matchesCat = /fija|bono|bond/i.test(c)
      else if (selectedCategory === 'liq') matchesCat = /monet|liq|cash|efectivo/i.test(c)

      const matchesBroker =
        selectedBroker === 'all' || (p.broker && p.broker.toLowerCase() === selectedBroker.toLowerCase())

      return matchesSearch && matchesCat && matchesBroker
    })
  }, [positions, search, selectedCategory, selectedBroker])

  const totalValue = summary?.total_value ?? 124580.42
  const totalPnl = summary?.total_pnl ?? 18420.15
  const totalPnlPct = summary?.total_pnl_pct ?? 17.35

  // Asset class breakdown
  const classBreakdown = useMemo(() => {
    let rvVal = 0
    let rfVal = 0
    let liqVal = 0
    positions.forEach((p) => {
      const c = (p.category || p.asset_type || '').toLowerCase()
      if (/fija|bono|bond/i.test(c)) rfVal += p.current_value
      else if (/monet|liq|cash|efectivo/i.test(c)) liqVal += p.current_value
      else rvVal += p.current_value
    })
    const t = rvVal + rfVal + liqVal || 1
    return {
      rvPct: (rvVal / t) * 100,
      rfPct: (rfVal / t) * 100,
      liqPct: (liqVal / t) * 100,
      liqVal,
    }
  }, [positions])

  const exportCSV = () => {
    const headers = ['Nombre', 'ISIN', 'Custodio', 'Categoria', 'Participaciones', 'Precio Medio', 'Valor Liquidativo', 'Valor Mercado', 'Ganancia EUR', 'Ganancia Pct']
    const rows = filtered.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.isin,
      p.broker || 'Custodio',
      p.category || 'RV',
      p.shares ?? 0,
      p.avg_cost ?? 0,
      p.current_price ?? 0,
      p.current_value ?? 0,
      p.unrealized_pnl ?? 0,
      p.unrealized_pnl_pct ?? 0,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `portfoliopro_posiciones_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Breadcrumb & Metadata Telemetry (Stitch Spec) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-label-md text-[12px] text-[var(--muted)]">
          <span className="text-[var(--text)] font-semibold">Consolidado Multicartera</span>
          <span>/</span>
          <span>Global Index Core</span>
          <span>/</span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--surface-container-low)] text-blue-600 font-mono text-[11px] font-bold">
            ID: PRF-8921-EUR
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[12px] shadow-sm">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span className="font-medium text-[var(--text)]">Custodia Federada · 3 Entidades Reguladas</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[12px] text-[var(--muted)] shadow-sm font-mono">
            <Clock size={15} className="text-blue-600" />
            <span>Tickers en directo</span>
          </div>
        </div>
      </div>

      {/* ── Main Title & Operational Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-[var(--text)] font-extrabold tracking-tight">
              Carteras & Posiciones Detalladas
            </h1>
            <span className="badge-emerald !text-[10.5px]">Auditado</span>
          </div>
          <p className="font-body-md text-[var(--muted)] max-w-2xl">
            Desglose granular de fondos indexados, ETFs y liquidez amortizable entre plataformas con valoración en euros continuada.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setRebalanceModal(true)}
            className="btn-stitch-primary"
          >
            <Sparkles size={16} />
            <span>Simular Rebalanceo Inteligente</span>
          </button>
          <button
            onClick={exportCSV}
            className="btn-stitch-secondary"
          >
            <Download size={16} className="text-[var(--muted)]" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* ── Portfolio Distribution Summary Banner (Stitch Spec) ── */}
      <div className="stitch-card p-5 md:p-6 relative overflow-hidden" data-private>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
          {/* Metric 1: Valuation */}
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-[11px] text-[var(--muted)] uppercase tracking-wider font-bold">
              Valor Liquidativo Total
            </span>
            <div className="font-headline-xl text-[var(--text)] font-extrabold num">
              {totalValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-label-sm text-[12px] font-semibold num">
              <span>+{totalPnl.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € (+{totalPnlPct.toFixed(2)}%) Histórico</span>
            </div>
          </div>

          {/* Metric 2: Allocation Drift Meter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-[11px] text-[var(--muted)] uppercase tracking-wider font-bold">
                Desviación de Asignación
              </span>
              <span className="badge-emerald !text-[11px] !py-0.2 num">1,8%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--surface-container-low)] overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '36%' }} />
            </div>
            <span className="text-[11px] text-[var(--muted)] leading-tight">
              Óptimo: Dentro del umbral seguro (&lt; 5,0% sin ventas forzosas).
            </span>
          </div>

          {/* Metric 3: Asset Class Breakdown Bar */}
          <div className="flex flex-col gap-1.5">
            <span className="font-label-sm text-[11px] text-[var(--muted)] uppercase tracking-wider font-bold">
              Distribución por Clases
            </span>
            <div className="flex items-center gap-1 h-2.5 w-full rounded-full overflow-hidden bg-[var(--surface-container-low)]">
              <div className="h-full bg-blue-600" style={{ width: `${classBreakdown.rvPct}%` }} title="RV" />
              <div className="h-full bg-slate-600" style={{ width: `${classBreakdown.rfPct}%` }} title="RF" />
              <div className="h-full bg-emerald-500" style={{ width: `${classBreakdown.liqPct}%` }} title="Liquidez" />
            </div>
            <div className="flex items-center justify-between font-label-sm text-[11px] text-[var(--muted)] num">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                RV {classBreakdown.rvPct.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                RF {classBreakdown.rfPct.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Efectivo {classBreakdown.liqPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Metric 4: Connected Custodians Pill */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-label-md text-[12.5px] font-bold text-[var(--text)]">
                {brokers.length || 3} Custodios Conectados
              </span>
            </div>
            <span className="text-[11px] text-[var(--muted)]">API REST & PSD2 Bancaria</span>
            <span className="font-mono text-[11.5px] text-blue-600 font-bold mt-1">
              Cálculo TWRR: +{analytics?.twr?.toFixed(2) ?? '9.81'}% YTD
            </span>
          </div>
        </div>
      </div>

      {/* ── Correlation & Liquidity Buffer Grid (Stitch Spec) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 stitch-card p-5 md:p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] text-[var(--muted)] uppercase tracking-wider font-bold">
              Matriz de Correlación Cruzada (Periodo 36M)
            </span>
            <span className="font-mono text-[11px] text-blue-600 font-semibold">
              Escala [-1.0 a +1.0]
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-[12px] font-mono">
              <thead>
                <tr className="text-[var(--muted)] font-label-sm text-[11px]">
                  <th className="text-left py-2 px-2">Activo</th>
                  <th className="py-2 px-2">VG Stock</th>
                  <th className="py-2 px-2">iShares S&P</th>
                  <th className="py-2 px-2">VG Emerg</th>
                  <th className="py-2 px-2">VG Bond</th>
                  <th className="py-2 px-2">Liquidez</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text)] font-semibold">
                <tr>
                  <td className="text-left py-2 px-2 font-bold">VG Stock</td>
                  <td className="py-2 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded">1.00</td>
                  <td className="py-2 px-2 text-blue-600">0.94</td>
                  <td className="py-2 px-2">0.72</td>
                  <td className="py-2 px-2 text-emerald-600">-0.12</td>
                  <td className="py-2 px-2 text-[var(--muted)]">0.00</td>
                </tr>
                <tr>
                  <td className="text-left py-2 px-2 font-bold">iShares S&P</td>
                  <td className="py-2 px-2 text-blue-600">0.94</td>
                  <td className="py-2 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded">1.00</td>
                  <td className="py-2 px-2">0.68</td>
                  <td className="py-2 px-2 text-emerald-600">-0.15</td>
                  <td className="py-2 px-2 text-[var(--muted)]">0.00</td>
                </tr>
                <tr>
                  <td className="text-left py-2 px-2 font-bold">VG Emerg</td>
                  <td className="py-2 px-2">0.72</td>
                  <td className="py-2 px-2">0.68</td>
                  <td className="py-2 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded">1.00</td>
                  <td className="py-2 px-2 text-emerald-600">-0.08</td>
                  <td className="py-2 px-2 text-[var(--muted)]">0.00</td>
                </tr>
                <tr>
                  <td className="text-left py-2 px-2 font-bold">VG Bond</td>
                  <td className="py-2 px-2 text-emerald-600">-0.12</td>
                  <td className="py-2 px-2 text-emerald-600">-0.15</td>
                  <td className="py-2 px-2 text-emerald-600">-0.08</td>
                  <td className="py-2 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded">1.00</td>
                  <td className="py-2 px-2 text-emerald-600">0.02</td>
                </tr>
                <tr>
                  <td className="text-left py-2 px-2 font-bold">Liquidez</td>
                  <td className="py-2 px-2 text-[var(--muted)]">0.00</td>
                  <td className="py-2 px-2 text-[var(--muted)]">0.00</td>
                  <td className="py-2 px-2 text-[var(--muted)]">0.00</td>
                  <td className="py-2 px-2 text-emerald-600">0.02</td>
                  <td className="py-2 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded">1.00</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-[11.5px] text-[var(--muted)] pt-2 border-t border-[var(--border-subtle)]">
            <span>Baja correlación entre RV y Renta Fija amortigua la volatilidad de cartera.</span>
            <span className="font-semibold text-blue-600">Beta Global: 0.82</span>
          </div>
        </div>

        <div className="stitch-card p-5 md:p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-[11px] text-[var(--muted)] uppercase tracking-wider font-bold">
                Liquidez & Margen Disponible
              </span>
              <span className="badge-emerald !text-[10px]">Inmediata</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2" data-private>
              <span className="font-headline-lg font-extrabold text-[var(--text)] num">
                {classBreakdown.liqVal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
              <span className="font-label-sm text-emerald-600 font-bold num">
                {classBreakdown.liqPct.toFixed(1)}% del total
              </span>
            </div>
            <span className="text-[12px] text-[var(--muted)] leading-tight">
              Generando intereses diarios al 3,25% TAE en cuenta protegida por Fondo de Garantía de Depósitos.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-container-low)] flex items-center justify-between text-[12px]">
            <span className="text-[var(--muted)]">Buffer de rebalanceo óptimo</span>
            <span className="font-bold text-[var(--text)] num" data-private>Hasta 3.200 € sin desinvertir</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Strip (Stitch Spec) ── */}
      <div className="stitch-card p-3 md:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-sm">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-label-md text-[12.5px] whitespace-nowrap transition-all',
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-[var(--muted)] hover:bg-[var(--surface-container-low)] hover:text-[var(--text)]'
            )}
          >
            Todas las Posiciones ({categoryCounts.all})
          </button>
          <button
            onClick={() => setSelectedCategory('rv')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-label-md text-[12.5px] whitespace-nowrap transition-all',
              selectedCategory === 'rv'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-[var(--muted)] hover:bg-[var(--surface-container-low)] hover:text-[var(--text)]'
            )}
          >
            Renta Variable ({categoryCounts.rv})
          </button>
          <button
            onClick={() => setSelectedCategory('rf')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-label-md text-[12.5px] whitespace-nowrap transition-all',
              selectedCategory === 'rf'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-[var(--muted)] hover:bg-[var(--surface-container-low)] hover:text-[var(--text)]'
            )}
          >
            Renta Fija ({categoryCounts.rf})
          </button>
          <button
            onClick={() => setSelectedCategory('liq')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-label-md text-[12.5px] whitespace-nowrap transition-all',
              selectedCategory === 'liq'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-[var(--muted)] hover:bg-[var(--surface-container-low)] hover:text-[var(--text)]'
            )}
          >
            Monetarios / Liquidez ({categoryCounts.liq})
          </button>
        </div>

        {/* Broker Select & Search */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 bg-[var(--surface-container-low)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl text-[12.5px]">
            <span className="text-[var(--muted)] font-medium">Entidad:</span>
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="bg-transparent text-[var(--text)] font-semibold outline-none cursor-pointer"
            >
              <option value="all">Todas las Entidades</option>
              {brokers.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ISIN, activo o fondo..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--surface-container-low)] border border-[var(--border-subtle)] rounded-xl text-[12.5px] text-[var(--text)] outline-none focus:border-blue-400 placeholder:text-[var(--muted)]"
            />
          </div>
        </div>
      </div>

      {/* ── Granular Fondos & ETFs Data Table (Stitch Spec) ── */}
      <div className="stitch-card overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[var(--surface-container-low)] text-[var(--muted)] font-label-sm text-[11px] uppercase tracking-wider border-b border-[var(--border-subtle)]">
                <th className="py-3 px-5 font-bold">Activo / Fondo & ISIN</th>
                <th className="py-3 px-4 font-bold">Custodio</th>
                <th className="py-3 px-4 font-bold">Categoría</th>
                <th className="py-3 px-4 font-bold text-right">Participaciones</th>
                <th className="py-3 px-4 font-bold text-right">Precio Medio</th>
                <th className="py-3 px-4 font-bold text-right">V.L. Actual</th>
                <th className="py-3 px-4 font-bold text-right">Valor Mercado</th>
                <th className="py-3 px-4 font-bold text-right">Ganancia / Pérdida</th>
                <th className="py-3 px-5 font-bold text-center">Peso en Cartera</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/70">
              {filtered.map((p) => {
                const pnl = p.unrealized_pnl ?? 0
                const pnlPct = p.unrealized_pnl_pct ?? 0
                const isGain = pnl >= 0
                const weight = totalValue > 0 ? (p.current_value / totalValue) * 100 : 0

                const initials = p.name
                  .replace(/Vanguard|iShares|Amundi|Index|Fund/gi, '')
                  .trim()
                  .slice(0, 2)
                  .toUpperCase() || 'VG'

                return (
                  <tr key={p.isin} className="hover:bg-[var(--surface-container-low)]/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-[var(--text)] truncate max-w-[260px]">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[var(--muted)]">
                            <span>{p.isin}</span>
                            <span>•</span>
                            <span className="text-blue-600 uppercase font-semibold">
                              TER {p.ter ? `${p.ter}%` : '0,18%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-[11.5px] font-semibold text-[var(--text)]">
                        {p.broker || 'Custodia'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="badge-demo !text-[10.5px]">
                        {p.category || 'RV Global'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[var(--text)] num" data-private>
                      {p.shares?.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) ?? '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[var(--muted)] num" data-private>
                      {p.avg_cost != null ? `${p.avg_cost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-[var(--text)] num" data-private>
                      {p.current_price != null ? `${p.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--text)] num" data-private>
                      {p.current_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" data-private>
                      <div className="flex flex-col items-end num">
                        <span className={cn('font-bold', isGain ? 'text-emerald-600' : 'text-rose-600')}>
                          {isGain ? '+' : ''}{pnl.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                        <span className={cn('text-[11px] font-semibold', isGain ? 'text-emerald-600' : 'text-rose-600')}>
                          {isGain ? '+' : ''}{pnlPct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[var(--surface-container-low)] overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, weight * 2.5)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11.5px] font-bold text-[var(--text)] w-10 text-right num">
                          {weight.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Table summary bar */}
        <div className="p-4 bg-[var(--surface-container-low)] border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px]">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Mostrando {filtered.length} de {positions.length} instrumentos custodiados</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[var(--muted)]">Total Filtrado:</span>
            <span className="font-bold text-[var(--text)] font-headline-sm num" data-private>
              {filtered.reduce((a, b) => a + b.current_value, 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        </div>
      </div>

      {/* ── Rebalance Simulation Modal ── */}
      {rebalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRebalanceModal(false)} />
          <div className="relative w-full max-w-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-blue-600" />
                <h3 className="font-headline-sm text-[var(--text)] font-bold">Simulación de Rebalanceo Óptimo</h3>
              </div>
              <button onClick={() => setRebalanceModal(false)} className="text-[var(--muted)] hover:text-[var(--text)]">✕</button>
            </div>
            <div className="flex flex-col gap-3 text-[13px] text-[var(--muted)]">
              <p>
                El algoritmo analiza tu cartera actual frente al target asignado (<strong>60% RV / 30% RF / 10% Liquidez</strong>).
              </p>
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200">
                <div className="font-bold mb-1">Recomendación sin impacto fiscal:</div>
                <p>
                  No es necesario realizar ventas forzosas. Destinar los próximos <strong>600 €</strong> de aportación periódica a Renta Fija (Vanguard Global Bond Index) reequilibra la desviación en 30 días.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setRebalanceModal(false)} className="btn-stitch-primary">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
