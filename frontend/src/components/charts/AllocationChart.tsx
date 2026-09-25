import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { PALETTE, fmt } from '@/lib/utils'
import type { Position } from '@/lib/mockData'
import { motion } from 'framer-motion'

interface AllocationChartProps {
  positions: Position[]
  mode?: 'asset' | 'type'
}

const TYPE_LABELS: Record<string, string> = {
  fund: 'Fondos',
  etf: 'ETFs',
  stock: 'Acciones',
  bond: 'Bonos',
  crypto: 'Cripto',
}



export function AllocationChart({ positions, mode = 'asset' }: AllocationChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  let data: { name: string; fullName: string; value: number; pct: number }[]

  if (mode === 'type') {
    const groups: Record<string, number> = {}
    positions.forEach((p) => {
      groups[p.asset_type] = (groups[p.asset_type] ?? 0) + p.current_value
    })
    const total = Object.values(groups).reduce((s, v) => s + v, 0)
    data = Object.entries(groups).map(([k, v]) => {
      const label = TYPE_LABELS[k] ?? k
      return {
        name: label,
        fullName: label,
        value: v,
        pct: total > 0 ? (v / total) * 100 : 0,
      }
    })
  } else {
    data = positions.map((p) => ({
      name: p.name,
      fullName: p.name,
      value: p.current_value,
      pct: p.weight,
    }))
  }

  const total = data.reduce((s, d) => s + d.value, 0)
  const hoveredItem = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null

  return (
    <div className="flex flex-col gap-3">
      {/* Donut Chart Container */}
      <div className="relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={245}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={74}
              outerRadius={106}
              paddingAngle={2.5}
              dataKey="value"
              strokeWidth={0}
              animationBegin={0}
              animationDuration={600}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={PALETTE[i % PALETTE.length]}
                  opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.4}
                  style={{
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease',
                    filter: hoveredIndex === i ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))' : 'none',
                  }}
                />
              ))}
            </Pie>

          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center px-4 max-w-[134px]">
          {hoveredItem ? (
            <>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate w-full">
                {hoveredItem.name}
              </span>
              <span className="text-lg font-bold text-slate-950 dark:text-white tabular-nums tracking-tight">
                {fmt.currency(hoveredItem.value)}
              </span>
              <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                {hoveredItem.pct.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                Total
              </span>
              <span className="text-xl font-bold text-slate-950 dark:text-slate-100 tabular-nums tracking-tight">
                {fmt.currency(total)}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {data.length} {mode === 'asset' ? 'posiciones' : 'tipos'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend in 2 columns */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-0.5 pt-0.5">
        {data.map((d, i) => {
          const isHovered = hoveredIndex === i
          const isOtherHovered = hoveredIndex !== null && !isHovered

          return (
            <motion.div
              key={d.name + i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: isOtherHovered ? 0.45 : 1, y: 0 }}
              transition={{ duration: 0.15 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
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
                {d.pct.toFixed(1)}%
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
