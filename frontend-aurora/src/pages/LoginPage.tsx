import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Unlock,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  PieChart,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useAppStore, type UserProfile } from '@/store/appStore'
import { APP_VERSION } from '@/version'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const navigate = useNavigate()
  const { users, currentUser, login } = useAppStore()

  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalAuthOpen, setModalAuthOpen] = useState(false)

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true })
    }
  }, [currentUser, navigate])

  const handleDemo = async () => {
    await login('demo')
    navigate('/', { replace: true })
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfile) return

    setIsSubmitting(true)
    setError(null)

    try {
      const ok = await login(selectedProfile.id, password)
      if (ok) {
        navigate('/', { replace: true })
      } else {
        setError('Contraseña incorrecta. Por favor, inténtalo de nuevo.')
      }
    } catch {
      setError('Error al conectar con el servidor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Find Asier or default non-demo user
  const realUser = users.find((u) => !u.isDemo) || users[0]

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text)] flex flex-col justify-between relative overflow-hidden select-none">
      {/* ── Background Ambient Glows (Stitch Spec) ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-12 left-1/4 w-72 h-72 bg-emerald-100/40 dark:bg-emerald-900/10 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* ── Top Bar ── */}
      <header className="w-full h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <TrendingUp size={18} />
          </div>
          <span className="font-headline-sm font-extrabold tracking-tight text-[var(--text)]">
            PortfolioPro
          </span>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Sistema Operativo • Datos en tiempo real</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span className="font-semibold text-[var(--text)]">SSL 256-bit</span>
        </div>
      </header>

      {/* ── Center Content: Espacio de Inversión ── */}
      <main className="w-full max-w-2xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
        {/* Title & Badge */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-sm mb-4">
            <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center">
              <TrendingUp size={12} />
            </div>
            <span className="font-bold text-[12px] text-[var(--text)]">PortfolioPro</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="font-mono text-[11px] text-[var(--muted)]">v{APP_VERSION}</span>
          </div>

          <h1 className="font-headline-xl text-[var(--text)] font-extrabold tracking-tight mb-2">
            Espacio de Inversión
          </h1>
          <p className="font-body-md text-[var(--muted)] max-w-lg">
            Gestiona y monitoriza tu cartera de inversiones, fondos indexados y rentabilidad en tiempo real.
          </p>
        </div>

        {/* Central Card */}
        <div className="w-full max-w-[620px] stitch-card shadow-xl overflow-hidden flex flex-col">
          {/* Top Segmented Header */}
          <div className="p-2 bg-[var(--surface-container-low)] border-b border-[var(--border-subtle)] flex items-center gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--surface-card)] shadow-sm text-blue-600 font-label-md text-[12px] font-bold">
              <span>Perfiles de Inversor</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10.5px]">
                2
              </span>
            </button>
          </div>

          <div className="p-6 md:p-8 flex flex-col gap-5">
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] font-bold uppercase tracking-wider">
              <span>Selecciona un perfil de inversor</span>
              <span className="text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Sincronizado
              </span>
            </div>

            {/* Profile 1: Usuario Demo */}
            <div className="group relative bg-[var(--surface-card)] hover:bg-blue-50/30 dark:hover:bg-blue-950/20 border border-[var(--border-subtle)] hover:border-blue-300 rounded-xl p-4 transition-all shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center font-headline-sm font-bold shadow-sm">
                  DM
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-[14px] text-[var(--text)]">Usuario Demo</span>
                    <span className="badge-demo !text-[10px] !py-0.2">Modo Demo</span>
                  </div>
                  <div className="text-[12px] text-[var(--muted)] flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-[var(--text)]">Cartera Indexada Moderada</span>
                    <span>•</span>
                    <span className="text-[11.5px]">Kutxabank / Scalable / Trade Rep.</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <PieChart size={12} className="text-blue-600" />
                      Estrategia 60/40
                    </span>
                    <span>•</span>
                    <span>4 Fondos indexados</span>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto shrink-0 flex justify-end">
                <button
                  onClick={handleDemo}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition-colors font-semibold text-[12.5px] shadow-sm"
                >
                  <span>Acceso Libre</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Profile 2: Asier Moreno */}
            <div className="group relative bg-[var(--surface-card)] hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 border border-[var(--border-subtle)] hover:border-emerald-300 rounded-xl p-4 transition-all shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 shrink-0 rounded-full bg-emerald-600 text-white flex items-center justify-center font-headline-sm font-bold shadow-sm">
                  AM
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-[14px] text-[var(--text)]">
                      {realUser ? realUser.name : 'Asier Moreno'}
                    </span>
                    <span className="badge-emerald !text-[10px] !py-0.2">Cuenta Principal</span>
                  </div>
                  <div className="text-[12px] text-[var(--muted)] flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-[var(--text)]">Cartera Indexada Global</span>
                    <span>•</span>
                    <span className="text-[11.5px]">MyInvestor</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-[var(--muted)]">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <ShieldCheck size={12} />
                      100% Renta Variable
                    </span>
                    <span>•</span>
                    <span>2FA Activo</span>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto shrink-0 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedProfile(realUser)
                    setModalAuthOpen(true)
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] text-[var(--text)] border border-[var(--border-subtle)] transition-colors font-semibold text-[12.5px] shadow-sm"
                >
                  <Lock size={15} className="text-[var(--muted)]" />
                  <span>Desbloquear</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Tip Callout */}
            <div className="p-3 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-[12px] text-[var(--muted)] flex items-start gap-2.5">
              <span className="text-[15px] shrink-0">💡</span>
              <p>
                Puedes alternar entre perfiles o carteras en cualquier momento desde el selector superior de la plataforma.
              </p>
            </div>

            {/* Security Guarantee */}
            <div className="pt-2 text-center text-[11.5px] text-[var(--muted)] flex flex-wrap items-center justify-center gap-2">
              <span className="flex items-center gap-1 text-[var(--text)] font-medium">
                <Lock size={12} className="text-emerald-600" />
                Cifrado de extremo a extremo
              </span>
              <span>•</span>
              <span>Acceso en modo lectura para mayor seguridad</span>
              <span>•</span>
              <span className="text-emerald-600 font-medium">Conexión verificada con MyInvestor</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer Benchmark Ticker ── */}
      <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--surface-card)] py-3 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-around gap-4 text-[12px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">MSCI World:</span>
            <span className="font-bold text-[var(--text)]">3.412,80</span>
            <span className="badge-emerald !text-[10px]">+0,82%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">S&P 500:</span>
            <span className="font-bold text-[var(--text)]">5.892,14</span>
            <span className="badge-emerald !text-[10px]">+1,15%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">Nasdaq 100:</span>
            <span className="font-bold text-[var(--text)]">20.485,30</span>
            <span className="badge-emerald !text-[10px]">+1,42%</span>
          </div>
        </div>
      </footer>

      {/* ── Password Authentication Modal ── */}
      <AnimatePresence>
        {modalAuthOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalAuthOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md stitch-card p-6 shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    AM
                  </div>
                  <div>
                    <h3 className="font-bold text-[14px] text-[var(--text)]">Desbloquear Cuenta Principal</h3>
                    <p className="text-[11px] text-[var(--muted)]">Introduce tu contraseña de acceso</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalAuthOpen(false)}
                  className="text-[var(--muted)] hover:text-[var(--text)] text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 text-[12px] flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleUnlock} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-[var(--text)]">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Introduce tu clave..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-[13px] text-[var(--text)] outline-none focus:border-blue-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAuthOpen(false)}
                    className="px-4 py-2 rounded-xl text-[12.5px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !password}
                    className="btn-stitch-primary !py-2 !px-5 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Verificando...' : 'Acceder'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
