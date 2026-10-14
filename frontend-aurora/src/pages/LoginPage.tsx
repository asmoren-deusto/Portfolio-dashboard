import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Unlock,
  User,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Zap,
  Layers,
  Globe,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { type UserProfile } from '@/lib/mockData'
import { fmt, cn } from '@/lib/utils'
import { APP_VERSION } from '@/version'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    users,
    login,
    createUser,
    setUserPassword,
    currentUser,
    fetchUsersFromBackend,
  } = useAppStore()

  useEffect(() => {
    fetchUsersFromBackend()
  }, [fetchUsersFromBackend])

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true })
    }
  }, [currentUser, navigate])

  const preselectedUserId = (location.state as { selectedUserId?: string } | null)?.selectedUserId

  // Immediate login if demo profile preselected
  useEffect(() => {
    if (preselectedUserId === 'demo') {
      login('demo')
      navigate('/', { replace: true })
    }
  }, [preselectedUserId, login, navigate])

  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(() => {
    if (preselectedUserId && preselectedUserId !== 'demo') {
      return users.find((u) => u.id === preselectedUserId) || null
    }
    return null
  })

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Setup password mode (if profile has no password set yet)
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSelectProfile = (u: UserProfile) => {
    if (u.id === 'demo' || u.isDemo) {
      login('demo')
      navigate('/', { replace: true })
      return
    }

    setSelectedProfile(u)
    setPassword('')
    setError(null)
    setIsSettingPassword(!u.passwordHash)
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfile) return

    if (!password.trim()) {
      setError('Por favor introduce tu clave de acceso.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const ok = await login(selectedProfile.id, password)
      if (ok) {
        navigate('/', { replace: true })
      } else {
        setError('Contraseña incorrecta. Por favor, compruébala.')
      }
    } catch {
      setError('Error al conectar con el servidor de autenticación.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfile) return

    if (newPassword.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)
    try {
      await setUserPassword(selectedProfile.id, newPassword)
      await login(selectedProfile.id, newPassword)
      navigate('/', { replace: true })
    } catch {
      setError('Error al registrar la contraseña en el servidor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex bg-[#0B0F17] text-slate-100 overflow-hidden font-['Inter',sans-serif]">
      {/* Background Aurora glowing gradients */}
      <div className="au-aurora" aria-hidden="true" />
      <div className="au-grain" aria-hidden="true" />

      {/* ─────────────────────────────────────────────────────────────
          LEFT PANE: AUTHENTICATION CARD & PROFILE SELECTION
          ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full lg:w-[480px] xl:w-[540px] flex flex-col justify-between p-6 sm:p-10 lg:p-12 border-r border-white/[0.07] backdrop-blur-2xl bg-[#0b0f17]/80">
        {/* Top: Brand and Version */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-violet-500 p-0.5 shadow-lg shadow-teal-500/20">
              <div className="w-full h-full rounded-[10px] bg-[#0b0f17] flex items-center justify-center">
                <div className="w-4 h-4 rounded-sm bg-gradient-to-tr from-teal-400 to-violet-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight font-['Inter_Tight',sans-serif]">
                  Portfolio Aurora
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/25">
                  v{APP_VERSION}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Plataforma Patrimonial Privada</span>
            </div>
          </div>
        </div>

        {/* Center: Interactive Login Box */}
        <div className="my-auto py-8">
          <AnimatePresence mode="wait">
            {!selectedProfile ? (
              /* PROFILE PICKER VIEW */
              <motion.div
                key="profiles"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <span className="au-eyebrow text-teal-400">ACCESO SEGURO</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                    Selecciona tu perfil
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Elige el usuario para acceder a tu cuadro de mando y carteras en tiempo real.
                  </p>
                </div>

                <div className="space-y-3">
                  {users.map((u) => {
                    const isDemo = u.id === 'demo' || u.isDemo
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSelectProfile(u)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.08] hover:border-teal-500/40 transition-all group active:scale-98 text-left shadow-lg"
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Avatar */}
                          <div
                            className={cn(
                              'w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-md transition-transform group-hover:scale-105',
                              isDemo
                                ? 'bg-gradient-to-tr from-violet-500/30 to-purple-500/20 text-violet-300 border border-violet-500/30'
                                : 'bg-gradient-to-tr from-teal-500/30 to-emerald-500/20 text-teal-300 border border-teal-500/30'
                            )}
                          >
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full rounded-xl object-cover" />
                            ) : (
                              u.name.substring(0, 2).toUpperCase()
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-100 group-hover:text-teal-400 transition-colors">
                                {u.name}
                              </span>
                              {isDemo ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                  DEMO INMEDIATA
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                                  PROPIETARIO
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 block mt-0.5">
                              {isDemo ? 'Cartera indexada pública de prueba' : 'Cartera global real indexada'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-white/[0.04] group-hover:bg-teal-500/20 group-hover:text-teal-400 transition-all text-slate-400">
                          <ArrowRight size={16} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            ) : isSettingPassword ? (
              /* SET PASSWORD VIEW */
              <motion.div
                key="set-password"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Volver a perfiles</span>
                </button>

                <div>
                  <span className="au-eyebrow text-teal-400">CONFIGURACIÓN INICIAL</span>
                  <h2 className="text-2xl font-bold tracking-tight mt-1">
                    Protege tu perfil ({selectedProfile.name})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Crea una contraseña maestra para cifrar y proteger tu acceso en este navegador.
                  </p>
                </div>

                <form onSubmit={handleSavePassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      autoFocus
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Confirmar Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                    />
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
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 transition-all shadow-lg active:scale-98"
                  >
                    Guardar y Entrar al Dashboard
                  </button>
                </form>
              </motion.div>
            ) : (
              /* PASSWORD UNLOCK VIEW */
              <motion.div
                key="unlock"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Cambiar de perfil</span>
                </button>

                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500/30 to-emerald-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-base shadow-md">
                    {selectedProfile.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{selectedProfile.name}</h3>
                    <span className="text-xs text-slate-400">Sesión protegida por contraseña</span>
                  </div>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Contraseña de acceso
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-teal-400 hover:underline flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showPassword ? 'Ocultar' : 'Ver'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoFocus
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 font-mono"
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
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 transition-all shadow-[0_0_20px_rgba(45,212,191,0.25)] active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Unlock size={14} />
                    <span>Desbloquear Cartera</span>
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom: Local Security Notice */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-white/[0.07] pt-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-teal-400" />
            <span>Cifrado local y privacidad segura</span>
          </span>
          <span>FastAPI + SQLite</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANE: AMBIENT AURORA SHOWCASE & DASHBOARD PREVIEW
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-slate-950 via-[#0B0F17] to-slate-900">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />

        {/* Top Right Tag */}
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Sistema en directo • Datos sincronizados</span>
          </div>
        </div>

        {/* Hero Concept Showcase */}
        <div className="max-w-lg my-auto space-y-8">
          <div>
            <span className="au-eyebrow text-teal-400">DISEÑO AURORA • BANCA PRIVADA</span>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white mt-2 font-['Inter_Tight',sans-serif] leading-tight">
              Control patrimonial inteligente y sin fricciones.
            </h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Diseñado para inversores indexados y carteras globales: cálculo exacto de plusvalías,
              simulador de sesión intradía con futuros, y analítica de riesgo de última generación.
            </p>
          </div>

          {/* Mini Feature Highlights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/[0.07] backdrop-blur-md">
              <TrendingUp size={20} className="text-teal-400 mb-2" />
              <div className="font-bold text-xs text-white">Simulador Intradía</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Estimación en tiempo real antes del cierre de NAVs.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/[0.07] backdrop-blur-md">
              <Globe size={20} className="text-violet-400 mb-2" />
              <div className="font-bold text-xs text-white">Mercados Mundiales</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mapa de sesiones globales y cotizaciones en directo.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/[0.07] backdrop-blur-md">
              <Layers size={20} className="text-sky-400 mb-2" />
              <div className="font-bold text-xs text-white">Estrategia DCA</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Seguimiento de aportaciones mensuales periódicas.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.035] border border-white/[0.07] backdrop-blur-md">
              <Sparkles size={20} className="text-amber-400 mb-2" />
              <div className="font-bold text-xs text-white">Riesgo & Métricas</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ratios de Sharpe, Sortino y correlación con benchmarks.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 font-mono">
          Portfolio Dashboard Aurora Edition • Build 2026.10
        </div>
      </div>
    </div>
  )
}
