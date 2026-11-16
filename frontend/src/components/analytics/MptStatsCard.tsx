import React from 'react'
import { Card } from '@/components/ui/Card'
import { ShieldCheck, TrendingUp, Info } from 'lucide-react'
import type { XRayMptStats } from '@/lib/xrayEngine'

interface MptStatsCardProps {
  stats?: XRayMptStats
}

export const MptStatsCard: React.FC<MptStatsCardProps> = ({
  stats = {
    volatility3y: 11.02,
    volatility5y: 12.61,
    meanReturn3y: 21.53,
    meanReturn5y: 15.36,
    sharpeRatio3y: 1.71,
    sharpeRatio5y: 1.06,
    alpha3y: 19.58,
    alpha5y: 19.22,
    beta3y: 30.05,
    beta5y: 46.07,
    rSquared3y: 0.14,
    rSquared5y: 0.29,
    infoRatio3y: 1.86,
    infoRatio5y: 1.09,
    trackingError3y: 10.96,
    trackingError5y: 12.48,
  },
}) => {
  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Estadísticas MPT Institucionales (Modern Portfolio Theory)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Métricas avanzadas de generación de alfa, correlación con benchmark y eficiencia
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hidden sm:inline-block">
            Benchmark: Moneda Base EUR
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Col 1: Rentabilidad y Riesgo */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-2.5 text-xs">
            <span className="font-bold text-slate-900 dark:text-white block border-b border-slate-200/60 dark:border-white/10 pb-1 text-xs">
              Métricas Clásicas de Riesgo
            </span>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-white/5">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Volatilidad Anualizada</span>
                <span className="text-[10.5px] text-slate-400">Desviación estándar de los retornos</span>
              </div>
              <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                <span>3a: ±{stats.volatility3y.toFixed(2)}%</span>
                <span className="block text-[11px] font-normal text-slate-400">5a: ±{stats.volatility5y.toFixed(2)}%</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-white/5">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Media Aritmética Anual</span>
                <span className="text-[10.5px] text-slate-400">Retorno medio anualizado</span>
              </div>
              <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <span>3a: +{stats.meanReturn3y.toFixed(2)}%</span>
                <span className="block text-[11px] font-normal text-slate-400">5a: +{stats.meanReturn5y.toFixed(2)}%</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Ratio de Sharpe</span>
                <span className="text-[10.5px] text-slate-400">Exceso de retorno por unidad de volatilidad</span>
              </div>
              <div className="text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                <span>3a: {stats.sharpeRatio3y.toFixed(2)}</span>
                <span className="block text-[11px] font-normal text-slate-400">5a: {stats.sharpeRatio5y.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Col 2: MPT (Alfa, Beta, R2, Info Ratio) */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-2.5 text-xs">
            <span className="font-bold text-slate-900 dark:text-white block border-b border-slate-200/60 dark:border-white/10 pb-1 text-xs">
              Métricas MPT vs Benchmark
            </span>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-white/5">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Alfa de Jensen (3a)</span>
                <span className="text-[10.5px] text-slate-400">Retorno generado por encima del esperado</span>
              </div>
              <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <span>+{stats.alpha3y.toFixed(2)}%</span>
                <span className="block text-[11px] font-normal text-slate-400">5a: +{stats.alpha5y.toFixed(2)}%</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-white/5">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Ratio de Información</span>
                <span className="text-[10.5px] text-slate-400">Eficiencia activa / Tracking Error</span>
              </div>
              <div className="text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                <span>3a: {stats.infoRatio3y.toFixed(2)}</span>
                <span className="block text-[11px] font-normal text-slate-400">5a: {stats.infoRatio5y.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Tracking Error</span>
                <span className="text-[10.5px] text-slate-400">Desviación estándar de diferencias con Ref.</span>
              </div>
              <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                <span>3a: {stats.trackingError3y.toFixed(2)}%</span>
                <span className="block text-[11px] font-normal text-slate-400">5a: {stats.trackingError5y.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
export default MptStatsCard

