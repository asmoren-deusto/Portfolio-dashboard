import React, { useState } from 'react'
import { Target, Edit3, Check, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmt } from '@/lib/utils'
import { usePortfolioGoal, useUpdatePortfolioGoal } from '@/api/queries'

interface GoalProgressBarProps {
  currentValue: number
  className?: string
}

export function GoalProgressBar({ currentValue, className }: GoalProgressBarProps) {
  const { data: goal } = usePortfolioGoal()
  const updateGoal = useUpdatePortfolioGoal()

  const [isEditing, setIsEditing] = useState(false)
  const [inputVal, setInputVal] = useState<string>('')

  const targetAmount = goal?.target_amount && goal.target_amount > 0 ? goal.target_amount : 100000
  const progressPct = Math.min(100, Math.max(0, (currentValue / targetAmount) * 100))
  const remaining = Math.max(0, targetAmount - currentValue)
  const isCompleted = currentValue >= targetAmount

  const handleStartEdit = () => {
    setInputVal(targetAmount.toString())
    setIsEditing(true)
  }

  const handleSave = () => {
    const parsed = parseFloat(inputVal.replace(/[^\d.]/g, ''))
    if (!isNaN(parsed) && parsed > 0) {
      updateGoal.mutate({ target_amount: parsed })
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setIsEditing(false)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border transition-all duration-300',
        'bg-slate-900/60 dark:bg-white/[0.03] border-slate-700/50 dark:border-white/[0.08]',
        'p-3.5 sm:p-4 backdrop-blur-md',
        className
      )}
    >
      {/* Decorative subtle ambient light */}
      <div
        className="pointer-events-none absolute -top-10 left-1/4 h-20 w-48 rounded-full bg-emerald-500/15 blur-2xl dark:bg-emerald-500/10"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-2.5">
        {/* Top row: Label + progress text + Edit trigger */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]">
          <div className="flex items-center gap-2 font-medium text-slate-300 dark:text-slate-200">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Target size={12} className="stroke-[2.5]" />
            </span>
            <span className="font-semibold tracking-wide text-slate-200 dark:text-white">
              {isCompleted ? '¡Objetivo superado!' : `${progressPct.toFixed(1)}% del camino`}
            </span>
            <span className="text-slate-400 dark:text-slate-400">hacia</span>
            <span className="font-bold font-mono text-emerald-400 dark:text-emerald-300" data-private>
              {fmt.currency(targetAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted ? (
              <span className="text-slate-400 dark:text-slate-400 font-mono text-xs" data-private>
                Faltan <strong className="text-slate-200 dark:text-slate-100 font-semibold">{fmt.currency(remaining)}</strong>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                <Sparkles size={11} /> Meta alcanzada
              </span>
            )}

            {!isEditing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                title="Modificar objetivo patrimonial"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded-md hover:bg-white/[0.06]"
              >
                <Edit3 size={11} />
                <span className="hidden sm:inline">Modificar meta</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Edit inline box if active */}
        {isEditing && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/80 border border-emerald-500/40 animate-in fade-in zoom-in-95 duration-150">
            <span className="text-xs text-slate-300 pl-1 font-medium">Nueva meta (€):</span>
            <input
              type="number"
              step="5000"
              autoFocus
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-[120px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              placeholder="100000"
            />
            <div className="flex items-center gap-1">
              {[75000, 100000, 150000, 200000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInputVal(preset.toString())}
                  className="hidden md:inline-block px-1.5 py-0.5 text-[10px] rounded bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 transition-colors"
                >
                  {preset / 1000}k
                </button>
              ))}
              <button
                type="button"
                onClick={handleSave}
                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                title="Guardar"
              >
                <Check size={13} className="stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                title="Cancelar"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Progress bar track */}
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90 dark:bg-white/[0.08] border border-white/[0.05]">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              isCompleted
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-indigo-400 shadow-[0_0_8px_rgba(16,185,129,0.35)]'
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
