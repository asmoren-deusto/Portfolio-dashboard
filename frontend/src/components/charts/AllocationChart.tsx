import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { PALETTE, fmt } from '@/lib/utils'
import type { Position } from '@/lib/mockData'

interface AllocationChartProps {
  positions: Position[]
  mode?: 'asset' | 'type' | 'broker'
  showLegend?: boolean
  hoveredIsin?: string | null
  onHoverIsin?: (isin: string | null) => void
}

const TYPE_LABELS: Record<string, string> = {
  fund: 'Fondos',
  etf: 'ETFs',
  stock: 'Acciones',
  bond: 'Bonos',
  crypto: 'Cripto',
}

export function AllocationChart({
  positions,
  mode = 'asset',
  showLegend = false,
  hoveredIsin = null,
  onHoverIsin,
}: AllocationChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const chartHeight = showLegend ? 235 : 285
  const innerRadius = showLegend ? 72 : 86
  const outerRadius = showLegend ? 104 : 122
  const centerMaxW = showLegend ? 'max-w-[126px]' : 'max-w-[140px]'

  if (!positions || positions.length === 0) {
    return (
      <div
        style={{ height: chartHeight }}
        className="flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm"
      >
        Sin datos de asignación
      </div>
    )
  }

  let data: {
    isin?: string
    key?: string
    name: string
    fullName: string
    value: number
    pct: number
  }[]

  if (mode === 'type') {
    const groups: Record<string, number> = {}
    positions.forEach((p) => {
      const type = p.asset_type || 'fund'
      groups[type] = (groups[type] ?? 0) + (p.current_value ?? 0)
    })
    const totalGroup = Object.values(groups).reduce((s, v) => s + v, 0)
    data = Object.entries(groups).map(([k, v]) => {
      const label = TYPE_LABELS[k] ?? k
      return {
        key: k,
        name: label,
        fullName: label,
        value: v,
        pct: totalGroup > 0 ? (v / totalGroup) * 100 : 0,
      }
    })
  } else if (mode === 'broker') {
    const groups: Record<string, number> = {}
    positions.forEach((p) => {
      const broker = p.broker || 'Otros'
      groups[broker] = (groups[broker] ?? 0) + (p.current_value ?? 0)
    })
    const totalGroup = Object.values(groups).reduce((s, v) => s + v, 0)
    data = Object.entries(groups).map(([k, v]) => ({
      key: k,
      name: k,
      fullName: k,
      value: v,
      pct: totalGroup > 0 ? (v / totalGroup) * 100 : 0,
    }))
  } else {
    data = positions.map((p) => ({
      isin: p.isin,
      name: p.name || p.isin,
      fullName: p.name || p.isin,
      value: p.current_value ?? 0,
      pct: p.weight ?? 0,
    }))
  }

  const total = data.reduce((s, d) => s + (d.value ?? 0), 0)
  if (total <= 0) {
    return (
      <div
        style={{ height: chartHeight }}
        className="flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm"
      >
        Sin datos de asignación
      </div>
    )
  }

  // Resolve external hovered index from hoveredIsin
  let externalIndex = -1
  if (hoveredIsin) {
    if (mode === 'asset') {
      externalIndex = data.findIndex((d) => d.isin === hoveredIsin)
    } else {
      const pos = positions.find((p) => p.isin === hoveredIsin)
      const targetType = pos?.asset_type || 'fund'
      externalIndex = data.findIndex((d) => d.key === targetType)
    }
  }

  const activeIndex = hoveredIndex !== null ? hoveredIndex : (externalIndex >= 0 ? externalIndex : null)
  const hoveredItem = activeIndex !== null && data[activeIndex] ? data[activeIndex] : null

  return (
    <div className="flex flex-col gap-3 min-w-0 w-full">
      {/* Donut Chart Container */}
      <div
        style={{ height: chartHeight }}
        className="relative flex items-center justify-center w-full min-w-0"
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2.5}
              dataKey="value"
              strokeWidth={0}
              animationBegin={0}
              animationDuration={500}
              onMouseEnter={(_, index) => {
                setHoveredIndex(index)
                if (onHoverIsin && data[index]) {
                  onHoverIsin(data[index].isin ?? null)
                }
              }}
              onMouseLeave={() => {
                setHoveredIndex(null)
                if (onHoverIsin) {
                  onHoverIsin(null)
                }
              }}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.isin || d.name || i}
                  fill={PALETTE[i % PALETTE.length]}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                  style={{
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease',
                    filter: activeIndex === i ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))' : 'none',
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3 z-10">
          <div className={`${centerMaxW} flex flex-col items-center justify-center`}>
            {hoveredItem ? (
              <>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate w-full">
                  {hoveredItem.name}
                </span>
                <span data-private className="text-xl font-bold text-slate-950 dark:text-white tabular-nums tracking-tight my-0.5">
                  {fmt.currency(hoveredItem.value)}
                </span>
                <span data-private className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                  {(hoveredItem.pct ?? 0).toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                  Total
                </span>
                <span data-private className="text-2xl font-bold text-slate-950 dark:text-slate-100 tabular-nums tracking-tight my-0.5">
                  {fmt.currency(total)}
                </span>
                <span data-private className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {data.length} {mode === 'asset' ? 'posiciones' : 'tipos'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend in 2 columns */}
      {showLegend && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-0.5 pt-0.5">
          {data.map((d, i) => {
            const isHovered = activeIndex === i
            const isOtherHovered = activeIndex !== null && !isHovered

            return (
              <div
                key={d.name + i}
                onMouseEnter={() => {
                  setHoveredIndex(i)
                  if (onHoverIsin && d.isin) onHoverIsin(d.isin)
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null)
                  if (onHoverIsin) onHoverIsin(null)
                }}
                style={{ opacity: isOtherHovered ? 0.45 : 1, transition: 'opacity 0.15s ease' }}
                className={`flex items-center gap-1.5 py-1 px-1.5 rounded-lg transition-colors cursor-pointer ${
                  isHovered
                    ? 'bg-slate-100/90 dark:bg-white/10 ring-1 ring-slate-200/90 dark:ring-white/10'
                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}
              >
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-full transition-transform"
                  style={{
                    background: PALETTE[i % PALETTE.length],
                    transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                  }}
                />
                <span
                  title={d.fullName || d.name}
                  className={`flex-1 truncate text-xs transition-colors ${
                    isHovered
                      ? 'font-bold text-slate-900 dark:text-white'
                      : 'font-medium text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {d.name}
                </span>
                <span
                  className={`tabular-nums font-mono text-xs shrink-0 transition-colors ${
                    isHovered
                      ? 'font-bold text-blue-600 dark:text-blue-400'
                      : 'font-semibold text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {(d.pct ?? 0).toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
