import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  ShieldCheck,
  User,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  Wallet,
  PlusCircle,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { fmt } from '@/lib/utils'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { users, login, createUser, currentUser } = useAppStore()

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true })
    }
  }, [currentUser, navigate])

  const [activeTab, setActiveTab] = useState<'profiles' | 'form' | 'new'>('profiles')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New User Form State
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newStrategy, setNewStrategy] = useState('Cartera Indexada Global')
  const [newBalance, setNewBalance] = useState<number>(50000)

  const handleQuickLogin = (userId: string) => {
    setError(null)
    const success = login(userId)
    if (success) {
      navigate('/')
    } else {
      setError('No se pudo iniciar sesión con este perfil.')
    }
  }

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Por favor introduce tu correo electrónico.')
      return
    }

    // Match user by email or fallback to demo
    const found = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    )

    if (found) {
      login(found.id)
      navigate('/')
    } else if (email.toLowerCase().includes('demo')) {
      login('demo')
      navigate('/')
    } else {
      // Auto-create guest or log in with first available user
      login(users[0]?.id ?? 'demo')
      navigate('/')
    }
  }

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!newName.trim()) {
      setError('Por favor introduce un nombre para el inversor.')
      return
    }

    const created = createUser(
      newName.trim(),
      newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '')}@portfoliopro.app`,
      newStrategy,
      newBalance
    )

    if (created) {
      navigate('/')
    }
  }

  const handleFillDemoCreds = () => {
    setEmail('demo@portfoliopro.app')
    setPassword('demo1234')
    setError(null)
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50 dark:bg-[#080c16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed top-10 left-1/4 w-[600px] h-[300px] bg-blue-500/[0.05] dark:bg-blue-600/[0.07] blur-[130px] rounded-full -z-10" />
      <div className="pointer-events-none fixed bottom-10 right-1/4 w-[500px] h-[300px] bg-indigo-500/[0.04] dark:bg-indigo-600/[0.06] blur-[120px] rounded-full -z-10" />

      {/* Main Container */}
      <div className="w-full max-w-2xl">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-[#0f1424] border border-slate-200/90 dark:border-white/[0.08] shadow-sm mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight pr-2 text-slate-950 dark:text-white">
              Portfolio<span className="text-blue-600 dark:text-blue-400">Pro</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Espacio de Inversión
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
            Selecciona tu perfil de inversor o accede con tus credenciales para visualizar tu cartera en tiempo real.
          </p>
        </div>

        {/* Card Frame */}
        <div className="rounded-3xl bg-white/95 dark:bg-[#0f1424] border border-slate-200/90 dark:border-white/[0.08] shadow-xl dark:shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] p-1.5 gap-1">
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profiles'
                  ? 'bg-white dark:bg-[#151b2e] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-white/[0.08]'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <User size={15} />
              <span>Perfiles ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'form'
                  ? 'bg-white dark:bg-[#151b2e] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-white/[0.08]'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <KeyRound size={15} />
              <span>Credenciales</span>
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'new'
                  ? 'bg-white dark:bg-[#151b2e] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-white/[0.08]'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <PlusCircle size={15} />
              <span>Nuevo Perfil</span>
            </button>
          </div>

          <div className="p-5 sm:p-7">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: Fast Profile Selector */}
            {activeTab === 'profiles' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Selecciona un perfil guardado
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Acceso directo con un clic
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {users.map((u) => {
                    const isDemo = u.isDemo

                    return (
                      <div
                        key={u.id}
                        onClick={() => handleQuickLogin(u.id)}
                        className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                          isDemo
                            ? 'bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-transparent border-blue-300 dark:border-blue-500/30 hover:border-blue-500 dark:hover:border-blue-400 shadow-xs'
                            : 'bg-slate-50/80 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.06] hover:border-blue-500/50 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Avatar */}
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0 ring-1 ring-black/10 dark:ring-white/10"
                            style={{
                              background: u.bgGradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                              backgroundColor: '#059669',
                            }}
                          >
                            {u.avatar}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {u.name}
                              </h3>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  isDemo
                                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/30'
                                    : 'bg-slate-200/70 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-white/[0.1]'
                                }`}
                              >
                                {u.badge}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                              {u.strategy} • <span className="font-medium text-slate-700 dark:text-slate-300">{u.broker}</span>
                            </p>
                          </div>
                        </div>

                        {/* Right side access action */}
                        <div className="flex items-center gap-2.5 shrink-0 pl-2">
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors hidden sm:inline">
                            Acceder
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/[0.08] border border-slate-200/90 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-xs">
                            <ArrowRight size={14} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Helpful Note */}
                <div className="pt-2 text-center">
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-400">
                    💡 <strong className="text-slate-800 dark:text-slate-200">Usuario Demo</strong> incluye la cartera indexada completa con simulación estocástica realista de evolución patrimonial.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: Email & Password Form */}
            {activeTab === 'form' && (
              <form onSubmit={handleFormLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail size={13} className="text-blue-500" />
                    <span>Correo electrónico</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="demo@portfoliopro.app o asier@..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock size={13} className="text-blue-500" />
                      <span>Contraseña</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleFillDemoCreds}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Autocompletar demo
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <span>Iniciar Sesión</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}

            {/* TAB 3: Create New Profile */}
            {activeTab === 'new' && (
              <form onSubmit={handleCreateNewUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nombre del inversor
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ej: Carlos Santos"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Correo de contacto
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="carlos@ejemplo.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Estrategia de cartera
                    </label>
                    <input
                      type="text"
                      value={newStrategy}
                      onChange={(e) => setNewStrategy(e.target.value)}
                      placeholder="Ej: Boglehead Global / Dividendos"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Patrimonio inicial (€)</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                        {fmt.currency(newBalance)}
                      </span>
                    </label>
                    <input
                      type="number"
                      step={5000}
                      min={1000}
                      max={1000000}
                      value={newBalance}
                      onChange={(e) => setNewBalance(Number(e.target.value) || 10000)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle size={15} />
                  <span>Crear Perfil e Iniciar Sesión</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Security / Technology footer */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Datos locales protegidos</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-blue-500" />
            <span>Simulación estocástica activa</span>
          </span>
        </div>
      </div>
    </div>
  )
}
