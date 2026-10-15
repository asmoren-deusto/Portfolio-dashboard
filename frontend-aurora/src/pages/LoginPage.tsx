import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Globe,
  Layers,
  AlertCircle,
  ArrowLeft,
  User,
} from 'lucide-react'
import { useAppStore, type UserProfile } from '@/store/appStore'
import { APP_VERSION } from '@/version'
import { AuroraBackground } from '~/Shell'
import { Glass, Delta, AnimatedNumber } from '~/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const { users, currentUser, login } = useAppStore()

  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true })
    }
  }, [currentUser, navigate])

  const handleSelectProfile = (profile: UserProfile) => {
    setSelectedProfile(profile)
    setPassword('')
    setError(null)
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
      setError('Error al conectar con el servidor de autenticación.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDemo = async () => {
    await login('demo')
    navigate('/', { replace: true })
  }

  return (
    <div className="relative min-h-dvh flex flex-col lg:flex-row bg-[#0B0F17] text-white overflow-hidden select-none">
      <AuroraBackground />

      {/* ── Left Pane: Login Card ───────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 z-10 max-w-xl mx-auto lg:mx-0 w-full">
        {/* Top: Logo & Version */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--gain)] to-[var(--accent)] flex items-center justify-center shadow-[0_0_24px_rgba(45,212,191,0.35)]">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white font-mono">PortfolioPro</span>
              <span className="text-[10px] text-[var(--gain)] block font-semibold uppercase tracking-wider">
                Aurora Edition
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[var(--muted)] px-2.5 py-1 rounded-full bg-white/[0.04] border border-[var(--line)]">
            v{APP_VERSION}
          </span>
        </div>

        {/* Center: Auth Box */}
        <div className="my-auto py-8">
          <AnimatePresence mode="wait">
            {!selectedProfile ? (
              /* Profile Selector */
              <motion.div
                key="select-profile"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Bienvenido de nuevo
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--muted)] mt-1.5 leading-relaxed">
                    Selecciona tu perfil de inversión para desbloquear el panel patrimonial.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {users.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleSelectProfile(profile)}
                      className="w-full p-4 rounded-2xl glass hover:border-[var(--gain)]/60 text-left transition-all duration-200 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[var(--gain)]/20 to-[var(--accent)]/20 text-[var(--gain)] border border-[var(--gain)]/30 flex items-center justify-center font-bold text-sm">
                          {profile.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white group-hover:text-[var(--gain)] transition-colors">
                            {profile.name}
                          </h3>
                          <span className="text-xs text-[var(--muted)]">Inversor Titular</span>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[var(--muted)] group-hover:text-[var(--gain)] group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleDemo}
                    className="w-full py-3 rounded-2xl font-semibold text-xs text-[var(--muted)] hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-[var(--line)] transition-all flex items-center justify-center gap-2"
                  >
                    <User size={14} />
                    <span>Explorar en Modo Demo (Invitado)</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Password Unlock */
              <motion.div
                key="unlock-form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Cambiar de perfil</span>
                </button>

                <div className="flex items-center gap-3.5 p-4 rounded-2xl glass">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[var(--gain)]/30 to-[var(--accent)]/20 text-[var(--gain)] border border-[var(--gain)]/30 flex items-center justify-center font-bold text-base shadow-md">
                    {selectedProfile.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{selectedProfile.name}</h3>
                    <span className="text-xs text-[var(--muted)]">Sesión protegida por contraseña</span>
                  </div>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-[var(--text-2)]">
                        Contraseña de acceso
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-[var(--gain)] hover:underline flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showPassword ? 'Ocultar' : 'Ver'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoFocus
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-[var(--line-strong)] text-xs text-white placeholder-[var(--muted)] focus:outline-none focus:border-[var(--gain)] font-mono"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-[var(--gain)] to-emerald-400 hover:brightness-110 transition-all shadow-[0_0_24px_rgba(45,212,191,0.3)] active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Unlock size={14} />
                    <span>Desbloquear Cartera</span>
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom: Security Notice */}
        <div className="flex items-center justify-between text-[11px] text-[var(--muted)] border-t border-[var(--line)] pt-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-[var(--gain)]" />
            <span>Cifrado local y privacidad segura</span>
          </span>
          <span>FastAPI + SQLite</span>
        </div>
      </div>

      {/* ── Right Pane: Showcase (Desktop) ──────────────────────── */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-[#0B0F17] via-slate-950 to-[#0B0F17]">
        <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-[var(--gain)]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-[var(--accent)]/15 blur-3xl pointer-events-none" />

        <div className="flex justify-end">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-[var(--line)] text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[var(--gain)] animate-pulse" />
            <span>Sistema en directo • Datos sincronizados</span>
          </div>
        </div>

        <div className="max-w-lg my-auto space-y-8">
          <div>
            <span className="eyebrow text-[var(--gain)]">DISEÑO AURORA • BANCA PRIVADA</span>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white mt-2 leading-tight">
              Control patrimonial inteligente y sin fricciones.
            </h1>
            <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
              Diseñado para carteras indexadas y fondos globales: cálculo exacto de plusvalías al céntimo,
              simulador intradía con futuros 24h y analítica de riesgo institucional.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <Glass className="p-4 !rounded-2xl">
              <TrendingUp size={20} className="text-[var(--gain)] mb-2" />
              <div className="font-bold text-xs text-white">Simulador Intradía</div>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Estimación en vivo antes del cierre oficial de NAVs.
              </p>
            </Glass>

            <Glass className="p-4 !rounded-2xl">
              <Globe size={20} className="text-[var(--accent)] mb-2" />
              <div className="font-bold text-xs text-white">Mercados Mundiales</div>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Mapa de sesiones globales y cotizaciones en directo.
              </p>
            </Glass>

            <Glass className="p-4 !rounded-2xl">
              <Layers size={20} className="text-sky-400 mb-2" />
              <div className="font-bold text-xs text-white">Estrategia DCA</div>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Control de compras periódicas automáticas.
              </p>
            </Glass>

            <Glass className="p-4 !rounded-2xl">
              <Sparkles size={20} className="text-amber-400 mb-2" />
              <div className="font-bold text-xs text-white">Riesgo & Métricas</div>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Sharpe, Sortino y comparativa con benchmarks globales.
              </p>
            </Glass>
          </div>
        </div>

        <div className="text-xs text-[var(--muted)] font-mono">
          Portfolio Dashboard Aurora Edition • Build 2026.10
        </div>
      </div>
    </div>
  )
}
