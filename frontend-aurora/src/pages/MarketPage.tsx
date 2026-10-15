import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  Columns2,
  Zap,
  Flame,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  ReferenceLine,
  Tooltip,
} from 'recharts'
import {
  useMarketIndices,
  useMarketQuotes,
  useSimulatedPortfolio,
  type MarketStock,
} from '@/api/queries'
import { fmt, cn } from '@/lib/utils'
import { CompanyLogo } from '@/components/ui/CompanyLogo'
import { StockDetailModal } from '@/components/market/StockDetailModal'
import { MarketHeatmap } from '@/components/market/MarketHeatmap'
import {
  Glass,
  PageHeader,
  Segmented,
  Delta,
  AnimatedNumber,
  pct,
  signedEur,
  stagger,
  useNow,
} from '~/ui'
import { ChartTooltip } from './OverviewPage'

const INDEX_TABS = [
  { id: 'TICKER', label: 'Ticker Principal' },
  { id: 'Todos', label: 'Todos los Mercados' },
  { id: 'ETFs', label: 'ETFs Cartera' },
  { id: 'SP500', label: 'S&P 500' },
  { id: 'NASDAQ', label: 'NASDAQ 100' },
  { id: 'IBEX', label: 'IBEX 35' },
  { id: 'EUROSTOXX', label: 'Euro Stoxx 50' },
  { id: 'COMMODITIES', label: 'Materias Primas' },
  { id: 'CRYPTO', label: 'Cripto' },
  { id: 'FOREX', label: 'Divisas' },
]

type ViewMode = 'split' | 'heatmap' | 'grid' | 'table'

interface SessionInfo {
  name: string
  city: string
  flag: string
  openUtc: number
  closeUtc: number
  tz: string
}

const SESSIONS: SessionInfo[] = [
  { name: 'Tokio', city: 'Asia / Pacífico', flag: '🇯🇵', openUtc: 0, closeUtc: 6, tz: 'Asia/Tokyo' },
  { name: 'Europa', city: 'Madrid / Frankfurt', flag: '🇪🇺', openUtc: 8, closeUtc: 16.5, tz: 'Europe/Madrid' },
  { name: 'Nueva York', city: 'Wall Street', flag: '🇺🇸', openUtc: 14.5, closeUtc: 21, tz: 'America/New_York' },
]

export function MarketPage() {
  const [selectedIndex, setSelectedIndex] = useState<string>('TICKER')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [selectedStock, setSelectedStock] = useState<MarketStock | null>(null)
  const now = useNow(15000)

  const isTickerUniverse = selectedIndex === 'TICKER'
  const { data: tickerData } = useMarketIndices()
  const { data: quoteData } = useMarketQuotes(
    selectedIndex,
    !isTickerUniverse
  )
  const { data: sim } = useSimulatedPortfolio('1d')

  const stocks: MarketStock[] = useMemo(() => {
    if (isTickerUniverse) {
      return (tickerData?.indices ?? []).map((s) => ({
        ...s,
        ticker: s.ticker || '',
        name: s.name || s.ticker || '',
        price: s.price ?? 0,
        change: s.change ?? 0,
        change_pct: s.change_pct ?? 0,
        day_high: s.day_high ?? s.price,
        day_low: s.day_low ?? s.price,
        volume: s.volume ?? 0,
        currency: s.currency || 'USD',
        sector: s.sector || 'Índice de Mercado',
        index: s.index || [s.name || ''],
      })) as MarketStock[]
    }
    return quoteData?.stocks ?? []
  }, [isTickerUniverse, tickerData, quoteData])

  const filteredStocks = useMemo(() => {
    let list = stocks
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.ticker.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.sector && s.sector.toLowerCase().includes(q))
      )
    }
    return list
  }, [stocks, searchQuery])

  // Sessions calculation
  const currentUtcHour = now.getUTCHours() + now.getUTCMinutes() / 60
  const isWeekend = now.getUTCDay() === 0 || now.getUTCDay() === 6

  const sessionStatus = useMemo(() => {
    return SESSIONS.map((s) => {
      let isOpen = false
      let label = 'Cerrado'
      if (!isWeekend) {
        if (currentUtcHour >= s.openUtc && currentUtcHour < s.closeUtc) {
          isOpen = true
          label = 'Sesión Abierta'
        } else if (
          s.name === 'Nueva York' &&
          currentUtcHour >= 9 &&
          currentUtcHour < 14.5
        ) {
          label = 'Pre-Mercado'
        } else if (
          s.name === 'Nueva York' &&
          currentUtcHour >= 21 &&
          currentUtcHour < 24
        ) {
          label = 'Post-Mercado'
        }
      }
      const localTime = new Intl.DateTimeFormat('es-ES', {
        timeZone: s.tz,
        hour: '2-digit',
        minute: '2-digit',
      }).format(now)

      return { ...s, isOpen, label, localTime }
    })
  }, [currentUtcHour, isWeekend, now])

  const fx = sim?.summary.fx_info
  const eurPct = fx?.simulated_eur_pct ?? sim?.summary.simulated_daily_pct ?? 0
  const eurAmt = fx?.simulated_eur_amount ?? sim?.summary.simulated_daily_amount ?? 0

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <PageHeader
        eyebrow="MERCADOS MUNDIALES & INTRADÍA"
        title="Pulso del mercado"
        subtitle="Cotizaciones en directo, mapa de sesiones globales y simulador de impacto en tu cartera con efecto divisa EUR/USD."
      />

      {/* ── Global Sessions Bar ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sessionStatus.map((s) => (
          <Glass key={s.name} className="p-3.5 !rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl select-none">{s.flag}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text)]">{s.name}</span>
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      s.isOpen
                        ? 'bg-[var(--gain)] animate-pulse shadow-[0_0_8px_var(--gain)]'
                        : s.label.includes('Pre') || s.label.includes('Post')
                        ? 'bg-[var(--warn)] shadow-[0_0_8px_var(--warn)]'
                        : 'bg-[var(--line-strong)]'
                    )}
                  />
                </div>
                <div className="text-[11px] text-[var(--muted)]">{s.city}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-semibold text-[var(--text)]">{s.localTime}</div>
              <div
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider',
                  s.isOpen
                    ? 'text-[var(--gain)]'
                    : s.label.includes('Pre') || s.label.includes('Post')
                    ? 'text-[var(--warn)]'
                    : 'text-[var(--muted)]'
                )}
              >
                {s.label}
              </div>
            </div>
          </Glass>
        ))}
      </div>

      {/* ── Market Indices Ribbon ─────────────────────────────── */}
      <div className="overflow-x-auto no-scrollbar pb-1 -mx-2 px-2">
        <div className="flex items-center gap-2.5 min-w-max">
          {(tickerData?.indices ?? []).slice(0, 10).map((idx) => {
            const isForex = idx.ticker === 'EURUSD=X' || idx.ticker?.includes('=X')
            const displayPrice = isForex
              ? (idx.price ?? 0).toFixed(4)
              : fmt.price(idx.price, idx.currency)
            return (
              <Glass
                key={idx.ticker}
                onClick={() => setSelectedStock(idx as MarketStock)}
                className="p-2.5 px-3.5 !rounded-xl cursor-pointer hover:border-[var(--line-strong)] transition-all flex items-center gap-3 min-w-[170px]"
              >
                <CompanyLogo ticker={idx.ticker} name={idx.name} domain={idx.domain} size="sm" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[var(--text)] truncate">{idx.name}</div>
                  <div className="text-[11px] font-mono font-bold text-[var(--text-2)]">{displayPrice}</div>
                </div>
                <div className="ml-auto">
                  <Delta value={idx.change_pct} kind="pct" className="!text-[10px] !px-1.5 !py-0.5" />
                </div>
              </Glass>
            )
          })}
        </div>
      </div>

      {/* ── Intraday Portfolio Impact Card ────────────────────── */}
      <Glass className="p-6 !rounded-[24px]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-[var(--line)]">
          <div>
            <div className="flex items-center gap-2 eyebrow mb-1">
              <Zap size={13} className="text-[var(--warn)]" />
              <span>Simulador Intradía en Tiempo Real</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text)]">
              Impacto estimado en tu cartera hoy
            </h2>
            <p className="text-[12px] text-[var(--muted)] mt-1 max-w-xl">
              Ponderación en vivo de tus fondos mediante ETFs institucionales y futuros 24h, ajustado
              por divisa EUR/USD.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Net Estimated Return in EUR */}
            <div className="p-3 px-4 rounded-2xl bg-[var(--surface-solid)] border border-[var(--line)]">
              <div className="text-[11px] text-[var(--muted)] font-medium">Estimación neta (EUR)</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  className={cn(
                    'display text-2xl font-bold num',
                    eurPct >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'
                  )}
                >
                  <AnimatedNumber value={eurPct} signed suffix="%" />
                </span>
                <span className="text-xs font-mono text-[var(--muted)]">
                  {signedEur(eurAmt)}
                </span>
              </div>
            </div>

            {/* EUR/USD Exchange Rate Pill */}
            {fx && (
              <div className="p-3 px-4 rounded-2xl bg-[var(--surface-solid)] border border-[var(--line)]" title="Tipo de cambio EUR/USD oficial sincronizado">
                <div className="text-[11px] text-[var(--muted)] font-medium flex items-center justify-between gap-3">
                  <span>Divisa EUR/USD</span>
                  <Delta value={fx.eur_usd_change_pct} kind="pct" className="!text-[9px] !px-1.5 !py-0" />
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-mono font-bold text-[var(--text)]">
                    {fx.eur_usd_rate.toFixed(4)} $
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">
                    Impacto: {fx.fx_contribution_pct >= 0 ? '+' : ''}{fx.fx_contribution_pct.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Intraday Chart */}
        <div className="pt-5">
          <div className="h-[220px] w-full -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sim?.chart_points ?? []} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
                <defs>
                  <linearGradient id="simMarketFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={eurPct >= 0 ? 'var(--gain)' : 'var(--loss)'}
                      stopOpacity={0.3}
                    />
                    <stop offset="100%" stopColor="transparent" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <ReferenceLine y={0} stroke="var(--line-strong)" strokeDasharray="3 3" />
                <Tooltip
                  content={<ChartTooltip fmt={{ value: (v: number) => pct(v) }} />}
                  labelFormatter={(_: any, p: any) => p?.[0]?.payload?.label}
                />
                <Area
                  type="monotone"
                  dataKey="simulated_pct"
                  name="Simulado EUR"
                  stroke={eurPct >= 0 ? 'var(--gain)' : 'var(--loss)'}
                  strokeWidth={2.2}
                  fill="url(#simMarketFill)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Glass>

      {/* ── Universe Explorer Header & Controls ───────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <Segmented
            id="marketTabs"
            options={INDEX_TABS.map((t) => ({ label: t.label, value: t.id }))}
            value={selectedIndex}
            onChange={(v) => setSelectedIndex(v)}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar acción, índice o ticker…"
              className="w-full bg-[var(--surface-solid)] border border-[var(--line)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--gain)]"
            />
          </div>

          <Segmented
            id="viewModes"
            options={[
              { label: <Columns2 size={14} />, value: 'split' },
              { label: <LayoutGrid size={14} />, value: 'grid' },
              { label: <ListIcon size={14} />, value: 'table' },
              { label: <Flame size={14} />, value: 'heatmap' },
            ]}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            size="sm"
          />
        </div>
      </div>

      {/* ── Content View Modes ────────────────────────────────── */}
      {viewMode === 'heatmap' ? (
        <Glass className="p-5 !rounded-2xl">
          <MarketHeatmap stocks={filteredStocks} onSelectStock={(s) => setSelectedStock(s)} />
        </Glass>
      ) : viewMode === 'table' ? (
        <Glass className="p-0 !rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)] font-medium">
                  <th className="py-3 px-4">Activo / Empresa</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4 text-right">Precio</th>
                  <th className="py-3 px-4 text-right">Variación Hoy</th>
                  <th className="py-3 px-4 text-right">Rango 24h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filteredStocks.map((s) => {
                  const isForex = s.ticker === 'EURUSD=X' || s.ticker.includes('=X')
                  const priceStr = isForex ? (s.price ?? 0).toFixed(4) : fmt.price(s.price, s.currency)
                  const safePrice = s.price ?? 0
                  const high = s.day_high ?? safePrice ?? 1
                  const low = s.day_low ?? safePrice ?? 0
                  const pctRange = high > low ? Math.min(100, Math.max(0, ((safePrice - low) / (high - low)) * 100)) : 50

                  return (
                    <tr
                      key={s.ticker}
                      onClick={() => setSelectedStock(s)}
                      className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <CompanyLogo ticker={s.ticker} name={s.name} domain={s.domain} size="sm" />
                          <div>
                            <div className="font-semibold text-[var(--text)]">{s.name}</div>
                            <div className="text-[11px] font-mono text-[var(--muted)]">{s.ticker}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)]">{s.sector || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[var(--text)]">
                        {priceStr}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Delta value={s.change_pct} kind="pct" />
                      </td>
                      <td className="py-3 px-4 text-right w-44">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-[10px] font-mono text-[var(--muted)]">
                            {isForex ? low.toFixed(3) : low.toFixed(1)}
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-[var(--line-strong)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--gain)] rounded-full"
                              style={{ width: `${pctRange}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-[var(--muted)]">
                            {isForex ? high.toFixed(3) : high.toFixed(1)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Glass>
      ) : (
        /* Grid / Split View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredStocks.map((s) => {
            const isForex = s.ticker === 'EURUSD=X' || s.ticker.includes('=X')
            const priceStr = isForex ? (s.price ?? 0).toFixed(4) : fmt.price(s.price, s.currency)
            const safePrice = s.price ?? 0
            const high = s.day_high ?? safePrice ?? 1
            const low = s.day_low ?? safePrice ?? 0
            const pctRange = high > low ? Math.min(100, Math.max(0, ((safePrice - low) / (high - low)) * 100)) : 50

            return (
              <Glass
                key={s.ticker}
                onClick={() => setSelectedStock(s)}
                className="p-4 !rounded-2xl cursor-pointer hover:border-[var(--line-strong)] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CompanyLogo ticker={s.ticker} name={s.name} domain={s.domain} size="md" />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-[var(--text)] truncate group-hover:text-[var(--gain)] transition-colors">
                          {s.name}
                        </h4>
                        <div className="text-[11px] font-mono text-[var(--muted)]">{s.ticker}</div>
                      </div>
                    </div>
                    <Delta value={s.change_pct} kind="pct" />
                  </div>

                  <div className="mt-3">
                    <div className="text-xl font-mono font-bold text-[var(--text)]">{priceStr}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      Cierre ant: {isForex ? (s.prev_close ?? 0).toFixed(4) : fmt.price(s.prev_close, s.currency)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--line)]">
                  <div className="flex items-center justify-between text-[10px] text-[var(--muted)] mb-1">
                    <span>Mín: {isForex ? low.toFixed(4) : low.toFixed(2)}</span>
                    <span>Máx: {isForex ? high.toFixed(4) : high.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--line-strong)] overflow-hidden">
                    <div className="h-full bg-[var(--gain)] rounded-full" style={{ width: `${pctRange}%` }} />
                  </div>
                </div>
              </Glass>
            )
          })}
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────── */}
      {selectedStock && (
        <StockDetailModal stock={selectedStock} onClose={() => setSelectedStock(null)} />
      )}
    </motion.div>
  )
}
