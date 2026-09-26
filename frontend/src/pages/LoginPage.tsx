import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  TrendingUp,
  User,
  ArrowRight,
  ArrowLeft,
  Lock,
  Unlock,
  Mail,
  PlusCircle,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Key,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { type UserProfile } from '@/lib/mockData'
import { fmt } from '@/lib/utils'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { users, login, createUser, setUserPassword, changePassword, currentUser } = useAppStore()

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

  // Mode for setting/changing password on a profile
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('')
  const [showProfileCurrentPassword, setShowProfileCurrentPassword] = useState(false)
  const [profileNewPassword, setProfileNewPassword] = useState('')
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('')
  const [showProfileNewPassword, setShowProfileNewPassword] = useState(false)

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
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('')
  const [showNewUserPassword, setShowNewUserPassword] = useState(false)

  // When selectedProfile changes, check if it already has a password set
  const handleSelectProfile = (u: UserProfile) => {
    setSelectedProfile(u)
    setProfilePassword('')
    setProfileCurrentPassword('')
    setProfileNewPassword('')
    setProfileConfirmPassword('')
    setError(null)
    // If the profile has no password set (like Asier initially), open setup mode
    setIsSettingPassword(!u.passwordHash)
  }

  const handleBackToProfiles = () => {
    setSelectedProfile(null)
    setProfilePassword('')
    setProfileCurrentPassword('')
    setProfileNewPassword('')
    setProfileConfirmPassword('')
    setIsSettingPassword(false)
    setError(null)
  }

  const handleTabChange = (tab: 'profiles' | 'form' | 'new') => {
    setActiveTab(tab)
    setError(null)
  }

  // Handle password unlock for existing password
  const handleUnlockProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedProfile) return

    if (!profilePassword.trim()) {
      setError('Por favor introduce la contraseña.')
      return
    }

    const success = login(selectedProfile.id, profilePassword)
    if (success) {
      navigate('/')
    } else {
      setError('Contraseña incorrecta. Por favor, compruébala.')
    }
  }

  // Handle setting a custom password for a profile (e.g. Asier Moreno)
  const handleSaveProfilePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedProfile) return

    // If profile already has a password, verify current password first!
    if (selectedProfile.passwordHash) {
      if (!profileCurrentPassword) {
        setError('Por favor introduce tu contraseña actual para confirmar tu identidad.')
        return
      }

      if (!profileNewPassword || profileNewPassword.length < 4) {
        setError('La nueva contraseña debe tener al menos 4 caracteres.')
        return
      }

      if (profileNewPassword !== profileConfirmPassword) {
        setError('Las nuevas contraseñas no coinciden. Por favor, revísalas.')
        return
      }

      const res = changePassword(selectedProfile.id, profileCurrentPassword, profileNewPassword)
      if (!res.success) {
        setError(res.error || 'La contraseña actual no es correcta.')
        return
      }

      navigate('/')
      return
    }

    // Initial password configuration (first time setup)
    if (!profileNewPassword || profileNewPassword.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.')
      return
    }

    if (profileNewPassword !== profileConfirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, revísalas.')
      return
    }

    const ok = setUserPassword(selectedProfile.id, profileNewPassword)
    if (ok) {
      navigate('/')
    } else {
      setError('No se pudo guardar la contraseña. Inténtalo de nuevo.')
    }
  }

  // Handle direct form login (email + password)
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

  // Handle create new profile
  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!newName.trim()) {
      setError('Por favor introduce un nombre para el inversor.')
      return
    }

    if (!newUserPassword || newUserPassword.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.')
      return
    }

    if (newUserPassword !== newUserConfirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    const created = createUser(
      newName.trim(),
      newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '')}@portfoliopro.app`,
      newStrategy,
      newBalance,
      newUserPassword
    )

    if (created) {
      navigate('/')
    }
  }

  const handleFillDemoCreds = () => {
    setEmail('demo@portfoliopro.app')
    setPassword('')
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
            Gestiona y monitoriza tu cartera de inversiones, fondos indexados y rentabilidad en tiempo real.
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

            {/* TAB 1: Profile Selector with Password Unlock */}
            {activeTab === 'profiles' && (
              <div>
                {!selectedProfile ? (
                  /* Profile List View */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Selecciona un perfil de inversor
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

                            {/* Right side action button */}
                            <div className="flex items-center gap-2 shrink-0 pl-2">
                              {isDemo ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100/90 dark:bg-blue-500/20 border border-blue-200/90 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all text-xs font-semibold shadow-xs">
                                  <span>Acceso Libre</span>
                                  <ArrowRight size={13} className="shrink-0 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.08] border border-slate-200/90 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all text-xs font-semibold shadow-xs">
                                  <Lock size={13} className="shrink-0" />
                                  <span>Desbloquear</span>
                                  <ArrowRight size={13} className="shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Helpful Note */}
                    <div className="pt-2 text-center">
                      <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                        💡 Puedes alternar entre perfiles o carteras en cualquier momento desde el menú superior.
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

                    {/* Form: Setting a new password OR entering existing password */}
                    {isSettingPassword ? (
                      /* SETUP PASSWORD MODE (for Asier Moreno on initial setup or password reset) */
                      <form onSubmit={handleSaveProfilePassword} className="space-y-4 pt-1">
                        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-500/20 text-xs text-blue-800 dark:text-blue-300">
                          <p className="font-semibold text-blue-900 dark:text-blue-200">
                            {selectedProfile.passwordHash ? 'Modificar contraseña de acceso' : 'Crea tu contraseña de acceso'}
                          </p>
                          <p className="text-[11.5px] mt-0.5 text-blue-700 dark:text-blue-300/80">
                            {selectedProfile.passwordHash
                              ? 'Introduce tu contraseña actual para confirmar tu identidad antes de establecer la nueva.'
                              : `Introduce la contraseña que utilizarás para entrar en la cartera de ${selectedProfile.name}.`}
                          </p>
                        </div>

                        {selectedProfile.passwordHash && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Contraseña actual
                            </label>
                            <div className="relative">
                              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type={showProfileCurrentPassword ? 'text' : 'password'}
                                value={profileCurrentPassword}
                                onChange={(e) => setProfileCurrentPassword(e.target.value)}
                                placeholder="Tu contraseña actual..."
                                autoFocus
                                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => setShowProfileCurrentPassword(!showProfileCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                {showProfileCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Nueva contraseña
                          </label>
                          <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type={showProfileNewPassword ? 'text' : 'password'}
                              value={profileNewPassword}
                              onChange={(e) => setProfileNewPassword(e.target.value)}
                              placeholder="Mínimo 4 caracteres..."
                              autoFocus={!selectedProfile.passwordHash}
                              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowProfileNewPassword(!showProfileNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {showProfileNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Confirmar nueva contraseña
                          </label>
                          <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type={showProfileNewPassword ? 'text' : 'password'}
                              value={profileConfirmPassword}
                              onChange={(e) => setProfileConfirmPassword(e.target.value)}
                              placeholder="Repite la nueva contraseña..."
                              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          {selectedProfile.passwordHash && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsSettingPassword(false)
                                setProfileCurrentPassword('')
                                setProfileNewPassword('')
                                setProfileConfirmPassword('')
                                setError(null)
                              }}
                              className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] text-xs font-semibold transition-colors"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="submit"
                            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={15} />
                            <span>{selectedProfile.passwordHash ? 'Actualizar Contraseña y Acceder' : 'Guardar Contraseña y Acceder'}</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* UNLOCK MODE (for existing password) */
                      <form onSubmit={handleUnlockProfile} className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Contraseña de acceso
                            </label>

                            {selectedProfile.isDemo && (
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
                            )}
                          </div>

                          <div className="relative">
                            {/* Icon strictly on the left inside the input */}
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type={showProfilePassword ? 'text' : 'password'}
                              value={profilePassword}
                              onChange={(e) => setProfilePassword(e.target.value)}
                              placeholder="Introduce tu contraseña..."
                              autoFocus
                              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
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

                        {/* Submit button: unlock icon on the left */}
                        <button
                          type="submit"
                          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                        >
                          <Unlock size={15} />
                          <span>Desbloquear Cartera</span>
                        </button>

                        {/* Change / Reset password option */}
                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingPassword(true)
                              setError(null)
                            }}
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                          >
                            <Key size={12} />
                            <span>Modificar contraseña</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Direct Email & Password Form */}
            {activeTab === 'form' && (
              <form onSubmit={handleFormLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="demo@portfoliopro.app o asier@portfoliopro.app"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Contraseña
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
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
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
                  <Unlock size={15} />
                  <span>Iniciar Sesión</span>
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

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type={showNewUserPassword ? 'text' : 'password'}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showNewUserPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type={showNewUserPassword ? 'text' : 'password'}
                        value={newUserConfirmPassword}
                        onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
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

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>PortfolioPro v2.4</span>
          <span>•</span>
          <span>Plataforma de Inversión y Análisis de Carteras</span>
        </div>
      </div>
    </div>
  )
}
