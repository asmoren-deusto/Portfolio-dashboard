import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LayoutGrid, List, Search, ArrowDownUp } from 'lucide-react'
import { usePositions, usePortfolioSummary, type Position } from '@/api/queries'
import { cn } from '@/lib/utils'
import { BrokerTag, CardHeader, Delta, Glass, Monogram, PALETTE, PageHeader, Segmented, Skeleton, eur, pct, rise, signedEur, stagger, tone, ease } from '~/ui'

type Sort = 'value' | 'pnl' | 'day' | 'name'

function navAge(p: Position) {
  const d = p.price_date || p.last_updated
  if (!d) return { fresh: false, label: 'sin fecha' }
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  return { fresh: days <= 3, label: new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) }
}

export function PositionsPage() {
  const { data: positions = [], isLoading } = usePositions()
  const { data: summary } = usePortfolioSummary()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [sort, setSort] = useState<Sort>('value')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [open, setOpen] = useState<string | null>(params.get('q'))
  const [hoverCat, setHoverCat] = useState<string | null>(null)

  const cats = useMemo(() => {
    const m = new Map<string, number>()
    positions.forEach((p) => m.set(p.category || 'Otros', (m.get(p.category || 'Otros') ?? 0) + p.current_value))
    const total = [...m.values()].reduce((a, b) => a + b, 0) || 1
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, v], i) => ({ name, v, w: (v / total) * 100, color: PALETTE[i % PALETTE.length] }))
  }, [positions])
  const catColor = (c?: string | null) => cats.find((x) => x.name === (c || 'Otros'))?.color ?? 'var(--muted)'

  const list = useMemo(() => {
    const s = q.toLowerCase().trim()
    const f = positions.filter((p) => !s || p.name.toLowerCase().includes(s) || p.isin.toLowerCase().includes(s) || (p.category ?? '').toLowerCase().includes(s))
    const by: Record<Sort, (a: Position, b: Position) => number> = {
      value: (a, b) => b.current_value - a.current_value,
      pnl: (a, b) => b.unrealized_pnl_pct - a.unrealized_pnl_pct,
      day: (a, b) => (b.daily_change_pct ?? 0) - (a.daily_change_pct ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return [...f].sort(by[sort])
  }, [positions, q, sort])

  const totalVal = summary?.total_value ?? positions.reduce((a, p) => a + p.current_value, 0)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Cartera"
        title="Posiciones"
        subtitle={`${positions.length} activos · ${eur(totalVal, 0)} en cartera`}
        right={
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar fondo, ISIN…" className="input !pl-9 w-56" />
            </div>
            <Segmented id="pos-view" size="sm" value={view} onChange={setView} options={[{ label: <List size={14} />, value: 'list' }, { label: <LayoutGrid size={14} />, value: 'grid' }]} />
          </>
        }
      />

      {/* ── Allocation bar ──────────────────────────────────── */}
      <Glass className="p-5 mb-5">
        <CardHeader eyebrow="Asignación" title="Peso por categoría" />
        <div className="flex h-4 rounded-full overflow-hidden gap-[3px]" data-private>
          {cats.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ width: 0 }}
              animate={{ width: `${c.w}%`, opacity: hoverCat && hoverCat !== c.name ? 0.25 : 1 }}
              transition={{ duration: 1, delay: i * 0.06, ease }}
              onMouseEnter={() => setHoverCat(c.name)}
              onMouseLeave={() => setHoverCat(null)}
              className="h-full rounded-full first:rounded-l-full"
              style={{ background: `linear-gradient(90deg, ${c.color}, color-mix(in oklab, ${c.color} 60%, transparent))`, boxShadow: hoverCat === c.name ? `0 0 16px ${c.color}` : undefined }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
          {cats.map((c) => (
            <button key={c.name} onMouseEnter={() => setHoverCat(c.name)} onMouseLeave={() => setHoverCat(null)} onClick={() => setQ(q === c.name ? '' : c.name)} className={cn('flex items-center gap-2 text-[12px] transition', hoverCat && hoverCat !== c.name && 'opacity-40')}>
              <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
              <span className="text-[var(--text-2)]">{c.name}</span>
              <span className="num font-semibold">{pct(c.w, 1, false)}</span>
            </button>
          ))}
        </div>
      </Glass>

      {/* ── Sort ───────────────────────────────────────────── */}
      <motion.div variants={rise} className="flex items-center gap-2 mb-3 text-[12px] text-[var(--muted)]">
        <ArrowDownUp size={13} /> Ordenar
        <Segmented id="pos-sort" size="sm" value={sort} onChange={setSort} options={[{ label: 'Valor', value: 'value' }, { label: 'Plusvalía', value: 'pnl' }, { label: 'Hoy', value: 'day' }, { label: 'Nombre', value: 'name' }]} />
      </motion.div>

      {isLoading && !positions.length ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : view === 'list' ? (
        <Glass className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[minmax(0,2.4fr)_1fr_1fr_1.1fr_0.9fr_28px] gap-4 px-5 py-3 text-[11px] uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)]">
            <span>Activo</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Peso</span>
            <span className="text-right">Plusvalía</span>
            <span className="text-right">Hoy</span>
            <span />
          </div>
          <motion.ul layout>
            {list.map((p, i) => (
              <Row key={p.isin} p={p} i={i} open={open === p.isin} onToggle={() => setOpen(open === p.isin ? null : p.isin)} color={catColor(p.category)} />
            ))}
          </motion.ul>
        </Glass>
      ) : (
        <motion.div layout className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {list.map((p) => {
            const age = navAge(p)
            return (
              <Glass key={p.isin} lift layout className="p-5">
                <div className="flex items-start gap-3">
                  <Monogram name={p.name} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold leading-snug line-clamp-2">{p.name}</div>
                    <div className="flex items-center gap-2 mt-1"><BrokerTag broker={p.broker} /><span className="text-[10px] num text-[var(--faint)]">{p.isin}</span></div>
                  </div>
                </div>
                <div className="flex items-end justify-between mt-5" data-private>
                  <div>
                    <div className="num text-xl font-semibold">{eur(p.current_value)}</div>
                    <div className={cn('num text-[12px]', p.unrealized_pnl >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]')}>{signedEur(p.unrealized_pnl)} · {pct(p.unrealized_pnl_pct)}</div>
                  </div>
                  <Delta value={p.daily_change_pct} />
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: catColor(p.category) }} initial={{ width: 0 }} animate={{ width: `${Math.min(p.weight, 100)}%` }} transition={{ duration: 0.9, ease }} />
                </div>
                <div className="flex justify-between mt-2 text-[11px] text-[var(--muted)]">
                  <span className="num">{pct(p.weight, 1, false)} de la cartera</span>
                  <span className="flex items-center gap-1.5"><span className={cn('w-1.5 h-1.5 rounded-full', age.fresh ? 'bg-[var(--gain)]' : 'bg-[var(--warn)]')} />NAV {age.label}</span>
                </div>
              </Glass>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}

function Row({ p, i, open, onToggle, color }: { p: Position; i: number; open: boolean; onToggle: () => void; color: string }) {
  const age = navAge(p)
  return (
    <motion.li layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.035, 0.4), duration: 0.45, ease }} className="border-b border-[var(--line)] last:border-0">
      <button onClick={onToggle} className={cn('w-full grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,2.4fr)_1fr_1fr_1.1fr_0.9fr_28px] gap-4 items-center px-5 py-3.5 text-left transition hover:bg-[var(--surface-2)]', open && 'bg-[var(--surface-2)]')}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <Monogram name={p.name} />
            <span title={`NAV ${age.label}`} className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--surface-solid)]', age.fresh ? 'bg-[var(--gain)]' : 'bg-[var(--warn)]')} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">{p.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <BrokerTag broker={p.broker} />
              <span className="text-[10.5px] num text-[var(--faint)] hidden sm:inline">{p.isin}</span>
            </div>
          </div>
        </div>
        <div className="text-right md:hidden" data-private>
          <div className="num text-[13px] font-semibold">{eur(p.current_value, 0)}</div>
          <Delta value={p.daily_change_pct} className="mt-1" />
        </div>
        <div className="hidden md:block text-right num text-[13px] font-semibold" data-private>{eur(p.current_value)}</div>
        <div className="hidden md:flex items-center justify-end gap-2">
          <div className="w-14 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.min(p.weight * 2.5, 100)}%` }} transition={{ duration: 0.9, ease }} />
          </div>
          <span className="num text-[12px] w-12 text-right">{pct(p.weight, 1, false)}</span>
        </div>
        <div className={cn('hidden md:block text-right num text-[12.5px]', p.unrealized_pnl >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]')} data-private>
          <div className="font-semibold">{signedEur(p.unrealized_pnl, 0)}</div>
          <div className="text-[11px] opacity-80">{pct(p.unrealized_pnl_pct)}</div>
        </div>
        <div className="hidden md:flex justify-end"><Delta value={p.daily_change_pct} /></div>
        <ChevronDown size={16} className={cn('hidden md:block text-[var(--muted)] transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3" data-private>
              {[
                ['Participaciones', p.shares.toLocaleString('es-ES', { maximumFractionDigits: 4 })],
                ['Coste medio', eur(p.avg_cost, 4)],
                ['Precio actual', eur(p.current_price, 4)],
                ['Invertido', eur(p.invested_amount)],
                ['Plusvalía', signedEur(p.unrealized_pnl)],
                ['Hoy', signedEur(p.daily_change)],
                ['TER', p.ter != null ? pct(p.ter, 2, false) : '—'],
                ['Fecha NAV', age.label],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5">
                  <div className="text-[10.5px] text-[var(--muted)]">{k}</div>
                  <div className={cn('num text-[13px] font-semibold mt-0.5', k === 'Plusvalía' && `text-[var(--${tone(p.unrealized_pnl)})]`)}>{v}</div>
                </div>
              ))}
              {p.category && <div className="col-span-full text-[11.5px] text-[var(--muted)]">{p.category}{p.geo ? ` · ${p.geo}` : ''}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}
