import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  TrendingUp,
  ShieldCheck,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  Unlock,
  Mail,
  PlusCircle,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { type UserProfile } from '@/lib/mockData'
import { fmt } from '@/lib/utils'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { users, login, createUser, currentUser } = useAppStore()

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true })
    }
  }, [currentUser, navigate])

  const preselectedUserId = (location.state as { selectedUserId?: string } | null)?.selectedUserId

  const [activeTab, setActiveTab] = useState<'profiles' | 'form' | 'new'>('profiles')
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(() => {
    if (preselectedUserId) {
      return users.find((u) => u.id === preselectedUserId) || null
    }
    return null
  })

  // Profile Unlock State
  const [profilePassword, setProfilePassword] = useState('')
  const [showProfilePassword, setShowProfilePassword] = useState(false)

  // Direct Credential Login State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New User Form State
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newStrategy, setNewStrategy] = useState('Cartera Indexada Global')
  const [newBalance, setNewBalance] = useState<number>(50000)
  const [newPassword, setNewPassword] = useState('')
  const [newConfirmPassword, setNewConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Clear errors when switching tabs
  const handleTabChange = (tab: 'profiles' | 'form' | 'new') => {
    setActiveTab(tab)
    setError(null)
  }

  const handleSelectProfile = (u: UserProfile) => {
    setSelectedProfile(u)
    setProfilePassword('')
    setError(null)
  }

  const handleBackToProfiles = () => {
    setSelectedProfile(null)
    setProfilePassword('')
    setError(null)
  }

  // Handle password unlock for selected profile
  const handleUnlockProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedProfile) return

    if (!profilePassword.trim()) {
      setError('Por favor introduce la contraseña del perfil.')
      return
    }

    const success = login(selectedProfile.id, profilePassword)
    if (success) {
      navigate('/')
    } else {
      setError('Contraseña incorrecta. Por favor, compruébala.')
    }
  }

  // Handle form login (email + password)
  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Por favor introduce tu correo electrónico.')
      return
    }

    if (!password) {
      setError('Por favor introduce tu contraseña.')
      return
    }

    const found = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    )

    if (!found) {
      setError('No existe ninguna cuenta registrada con este correo electrónico.')
      return
    }

    const success = login(found.id, password)
    if (success) {
      navigate('/')
    } else {
      setError('Contraseña incorrecta para el perfil ' + found.name + '.')
    }
  }

  // Handle create new profile with secure password
  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!newName.trim()) {
      setError('Por favor introduce un nombre para el inversor.')
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres por seguridad.')
      return
    }

    if (newPassword !== newConfirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.')
      return
    }

    const created = createUser(
      newName.trim(),
      newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '')}@portfoliopro.app`,
      newStrategy,
      newBalance,
      newPassword
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
            Espacio de Inversión Seguro
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
            Acceso protegido con cifrado criptográfico con sal y key-stretching para salvaguardar tus posiciones financieras.
          </p>
        </div>

        {/* Card Frame */}
        <div className="rounded-3xl bg-white/95 dark:bg-[#0f1424] border border-slate-200/90 dark:border-white/[0.08] shadow-xl dark:shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] p-1.5 gap-1">
            <button
              onClick={() => handleTabChange('profiles')}
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
              onClick={() => handleTabChange('form')}
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
              onClick={() => handleTabChange('new')}
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
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: Fast Profile Selector with Password Unlock */}
            {activeTab === 'profiles' && (
              <div>
                {!selectedProfile ? (
                  /* Profile List View */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Selecciona un perfil para desbloquear
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Lock size={12} className="text-emerald-500" />
                        Acceso protegido
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {users.map((u) => {
                        const isDemo = u.isDemo

                        return (
                          <div
                            key={u.id}
                            onClick={() => handleSelectProfile(u)}
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
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors hidden sm:inline flex items-center gap-1">
                                <Lock size={12} />
                                Desbloquear
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
                        🔒 Las carteras requieren contraseña criptográfica para asegurar la privacidad del patrimonio.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Profile Unlock Prompt */
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={handleBackToProfiles}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                      <ArrowLeft size={14} />
                      <span>Volver a la selección de perfiles</span>
                    </button>

                    {/* Selected User Header Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base text-white shadow-sm shrink-0"
                          style={{
                            background: selectedProfile.bgGradient || 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                            backgroundColor: '#059669',
                          }}
                        >
                          {selectedProfile.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="font-bold text-base text-slate-950 dark:text-white truncate">
                              {selectedProfile.name}
                            </h2>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
                              {selectedProfile.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {selectedProfile.email}
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:block text-right">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block">Estrategia</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{selectedProfile.strategy}</span>
                      </div>
                    </div>

                    {/* Unlock Form */}
                    <form onSubmit={handleUnlockProfile} className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Lock size={13} className="text-blue-500" />
                            <span>Contraseña de acceso para este perfil</span>
                          </label>

                          {selectedProfile.isDemo ? (
                            <button
                              type="button"
                              onClick={() => {
                                setProfilePassword('demo1234')
                                setError(null)
                              }}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Autocompletar (demo1234)
                            </button>
                          ) : selectedProfile.id === 'asier' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setProfilePassword('asier1234')
                                setError(null)
                              }}
                              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              Autocompletar (asier1234)
                            </button>
                          ) : selectedProfile.id === 'laura' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setProfilePassword('laura1234')
                                setError(null)
                              }}
                              className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                            >
                              Autocompletar (laura1234)
                            </button>
                          ) : null}
                        </div>

                        <div className="relative">
                          <input
                            type={showProfilePassword ? 'text' : 'password'}
                            value={profilePassword}
                            onChange={(e) => setProfilePassword(e.target.value)}
                            placeholder="Introduce la contraseña para desbloquear..."
                            autoFocus
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowProfilePassword(!showProfilePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showProfilePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                      >
                        <Unlock size={14} />
                        <span>Desbloquear Cartera</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Direct Email & Password Form */}
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
                    placeholder="demo@portfoliopro.app o asier@portfoliopro.app"
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

            {/* TAB 3: Create New Profile with Encrypted Password */}
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

                {/* Secure Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock size={12} className="text-emerald-500" />
                      <span>Contraseña maestra</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock size={12} className="text-emerald-500" />
                      <span>Confirmar contraseña</span>
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newConfirmPassword}
                      onChange={(e) => setNewConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Cryptographic Protection Banner */}
                <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <Shield size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                      Almacenamiento Criptográfico FIPS 180-4
                    </p>
                    <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                      Tu contraseña nunca se guarda en texto plano: se deriva con un salt aleatorio único de 16 bytes y 2.000 iteraciones de key-stretching para máxima protección.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle size={15} />
                  <span>Crear Perfil Seguro e Iniciar Sesión</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Security / Technology footer */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Cifrado SHA-256 + Salt activo</span>
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
