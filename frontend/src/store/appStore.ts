import { create } from 'zustand'
import {
  INITIAL_USER_PROFILES,
  type UserProfile,
  getUserProfileById,
  generateRealisticPerformanceSeries,
} from '@/lib/mockData'
import { hashPassword, verifyPassword } from '@/lib/security'

export type Period = '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y'
export type Theme = 'light' | 'dark'

interface AppState {
  // Period & Theme
  period: Period
  setPeriod: (p: Period) => void
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void

  // Mobile sidebar
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  toggleMobileSidebar: () => void

  // Mock toggle
  useMock: boolean
  setUseMock: (v: boolean) => void

  // User & Authentication
  currentUser: UserProfile | null
  users: UserProfile[]
  login: (userId: string, password?: string) => boolean
  logout: () => void
  switchUser: (userId: string, password?: string) => boolean
  createUser: (name: string, email: string, strategy: string, initialBalance?: number, password?: string) => UserProfile
  setUserPassword: (userId: string, newPassword: string) => boolean
  changePassword: (userId: string, oldPassword: string, newPassword: string) => { success: boolean; error?: string }
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }
}

const savedTheme =
  (typeof window !== 'undefined' ? (localStorage.getItem('theme') as Theme) : null) || 'light'
applyTheme(savedTheme)

// Load custom user profiles if saved
function getStoredUsers(): UserProfile[] {
  let list = INITIAL_USER_PROFILES
  if (typeof window === 'undefined') return list

  try {
    const raw = localStorage.getItem('portfolio_custom_users')
    if (raw) {
      const custom: UserProfile[] = JSON.parse(raw)
      list = [...INITIAL_USER_PROFILES, ...custom.filter((u) => u.id !== 'laura')]
    }
  } catch {
    // fallback
  }

  // Load custom password overrides (e.g. Asier Moreno custom password)
  try {
    const pwdRaw = localStorage.getItem('portfolio_user_passwords')
    if (pwdRaw) {
      const pwdMap: Record<string, { hash: string; salt: string }> = JSON.parse(pwdRaw)
      list = list.map((u) => {
        if (pwdMap[u.id]) {
          return {
            ...u,
            passwordHash: pwdMap[u.id].hash,
            passwordSalt: pwdMap[u.id].salt,
          }
        }
        return u
      })
    }
  } catch {
    // fallback
  }

  // Always exclude 'laura'
  return list.filter((u) => u.id !== 'laura')
}

// Load active user session (returns null if no session is cached)
function getStoredActiveUser(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const activeId = localStorage.getItem('portfolio_active_user_id')
    if (activeId === 'laura') {
      localStorage.removeItem('portfolio_active_user_id')
      return null
    }
    if (activeId) {
      const allUsers = getStoredUsers()
      const found = allUsers.find((u) => u.id === activeId)
      if (found) return found
    }
    return null
  } catch {
    return null
  }
}

const initialUser = getStoredActiveUser()

export const useAppStore = create<AppState>((set, get) => ({
  period: '1y',
  setPeriod: (period) => set({ period }),
  theme: savedTheme,
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme: Theme = state.theme === 'dark' ? 'light' : 'dark'
      applyTheme(nextTheme)
      return { theme: nextTheme }
    })
  },

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),

  useMock: initialUser?.isDemo ?? true,
  setUseMock: (useMock) => set({ useMock }),

  // Auth State
  currentUser: initialUser,
  users: getStoredUsers(),

  login: (userId: string, password?: string) => {
    const state = get()
    const target = state.users.find((u) => u.id === userId) || INITIAL_USER_PROFILES.find((u) => u.id === userId)
    if (!target) return false

    // Require and verify cryptographic salted password
    if (target.passwordHash && target.passwordSalt) {
      if (!password) return false
      const isValid = verifyPassword(password, target.passwordHash, target.passwordSalt)
      if (!isValid) return false
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolio_active_user_id', target.id)
    }

    set({
      currentUser: target,
      useMock: target.isDemo,
    })
    return true
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('portfolio_active_user_id')
    }
    set({
      currentUser: null,
    })
  },

  switchUser: (userId: string, password?: string) => {
    return get().login(userId, password)
  },

  createUser: (
    name: string,
    email: string,
    strategy: string,
    initialBalance = 50000,
    password = ''
  ) => {
    const id = `user-${Date.now()}`
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'US'

    const invested = Math.round(initialBalance * 0.85 * 100) / 100
    const pnl = Math.round((initialBalance - invested) * 100) / 100
    const pnlPct = Math.round((pnl / invested) * 10000) / 100

    const userSeries1y = generateRealisticPerformanceSeries(365, invested, initialBalance, Date.now() % 500)
    const userSeries5y = generateRealisticPerformanceSeries(1825, invested * 0.6, initialBalance, Date.now() % 500)

    // Hash password with cryptographically secure salt and 2000 rounds of key stretching
    const { hash, salt } = hashPassword(password || 'inversor1234')

    const newUser: UserProfile = {
      id,
      name,
      email,
      avatar: initials,
      role: 'Inversor Registrado',
      strategy: strategy || 'Cartera Personalizada',
      badge: 'Personal',
      broker: 'MyInvestor',
      isDemo: false,
      color: 'bg-indigo-600 text-white',
      bgGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      passwordSalt: salt,
      passwordHash: hash,
      summary: {
        total_value: initialBalance,
        total_invested: invested,
        total_pnl: pnl,
        total_pnl_pct: pnlPct,
        num_positions: 3,
        last_updated: new Date().toISOString(),
      },
      positions: [
        {
          isin: 'IE00B03HD191',
          name: 'Vanguard Global Stock Index Fund EUR Acc',
          ticker: 'VGSEI',
          domain: 'vanguard.com',
          category: 'Renta Variable Global',
          ter: 0.18,
          geo: 'Global',
          asset_type: 'fund',
          currency: 'EUR',
          shares: Math.round((initialBalance * 0.7) / 52.84),
          avg_cost: 44.5,
          current_price: 52.84,
          current_value: Math.round(initialBalance * 0.7 * 100) / 100,
          invested_amount: Math.round(invested * 0.7 * 100) / 100,
          unrealized_pnl: Math.round((initialBalance * 0.7 - invested * 0.7) * 100) / 100,
          unrealized_pnl_pct: pnlPct,
          weight: 70.0,
          last_updated: new Date().toISOString(),
        },
        {
          isin: 'IE00B18GC888',
          name: 'Vanguard Global Bond Index EUR Hedged',
          ticker: 'VGBIH',
          domain: 'vanguard.com',
          category: 'Renta Fija Global',
          ter: 0.15,
          geo: 'Global',
          asset_type: 'bond',
          currency: 'EUR',
          shares: Math.round((initialBalance * 0.2) / 36.1),
          avg_cost: 34.0,
          current_price: 36.1,
          current_value: Math.round(initialBalance * 0.2 * 100) / 100,
          invested_amount: Math.round(invested * 0.2 * 100) / 100,
          unrealized_pnl: Math.round((initialBalance * 0.2 - invested * 0.2) * 100) / 100,
          unrealized_pnl_pct: 6.2,
          weight: 20.0,
          last_updated: new Date().toISOString(),
        },
        {
          isin: 'ES0113900J37',
          name: 'Cuenta Remunerada Liquidez',
          ticker: 'CASH',
          domain: 'myinvestor.es',
          category: 'Liquidez',
          ter: 0.0,
          geo: 'Zona Euro',
          asset_type: 'fund',
          currency: 'EUR',
          shares: Math.round(initialBalance * 0.1 * 100) / 100,
          avg_cost: 1.0,
          current_price: 1.0,
          current_value: Math.round(initialBalance * 0.1 * 100) / 100,
          invested_amount: Math.round(initialBalance * 0.1 * 100) / 100,
          unrealized_pnl: 0,
          unrealized_pnl_pct: 0,
          weight: 10.0,
          last_updated: new Date().toISOString(),
        },
      ],
      analytics: {
        twr: 16.5,
        cagr: 11.2,
        volatility: 10.1,
        max_drawdown: -7.5,
        sharpe_ratio: 1.45,
        return_ytd: 12.8,
        return_1m: 1.4,
        return_3m: 3.9,
        return_6m: 7.8,
      },
      performance: {
        '1m': userSeries1y.slice(-30),
        '1mo': userSeries1y.slice(-30),
        '3m': userSeries1y.slice(-90),
        '3mo': userSeries1y.slice(-90),
        '6m': userSeries1y.slice(-180),
        '6mo': userSeries1y.slice(-180),
        '1y': userSeries1y,
        '2y': userSeries1y,
        '5y': userSeries5y,
        'ytd': userSeries1y,
        'max': userSeries5y,
      },
      transactions: [],
    }

    const state = get()
    const updatedUsers = [...state.users, newUser]

    if (typeof window !== 'undefined') {
      try {
        const customOnly = updatedUsers.filter((u) => !INITIAL_USER_PROFILES.some((p) => p.id === u.id))
        localStorage.setItem('portfolio_custom_users', JSON.stringify(customOnly))
        localStorage.setItem('portfolio_active_user_id', newUser.id)
      } catch {
        // storage limit
      }
    }

    set({
      users: updatedUsers,
      currentUser: newUser,
      useMock: false,
    })

    return newUser
  },

  changePassword: (userId: string, oldPassword: string, newPassword: string) => {
    const state = get()
    const target = state.users.find((u) => u.id === userId)
    if (!target) return { success: false, error: 'Usuario no encontrado.' }

    if (target.passwordHash && target.passwordSalt) {
      if (!verifyPassword(oldPassword, target.passwordHash, target.passwordSalt)) {
        return { success: false, error: 'La contraseña actual no es correcta.' }
      }
    }

    const { hash, salt } = hashPassword(newPassword)
    const updatedUser: UserProfile = {
      ...target,
      passwordHash: hash,
      passwordSalt: salt,
    }

    const updatedUsers = state.users.map((u) => (u.id === userId ? updatedUser : u))

    if (typeof window !== 'undefined') {
      try {
        const customOnly = updatedUsers.filter((u) => !INITIAL_USER_PROFILES.some((p) => p.id === u.id))
        localStorage.setItem('portfolio_custom_users', JSON.stringify(customOnly))
      } catch {
        // storage limit
      }
    }

    set({
      users: updatedUsers,
      currentUser: state.currentUser?.id === userId ? updatedUser : state.currentUser,
    })

    return { success: true }
  },

  setUserPassword: (userId: string, newPassword: string) => {
    const { hash, salt } = hashPassword(newPassword)
    const state = get()
    const target = state.users.find((u) => u.id === userId)
    if (!target) return false

    const updatedUser: UserProfile = {
      ...target,
      passwordHash: hash,
      passwordSalt: salt,
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('portfolio_user_passwords')
        const map = raw ? JSON.parse(raw) : {}
        map[userId] = { hash, salt }
        localStorage.setItem('portfolio_user_passwords', JSON.stringify(map))
        localStorage.setItem('portfolio_active_user_id', userId)
      } catch {
        // storage limit
      }
    }

    const updatedUsers = state.users.map((u) => (u.id === userId ? updatedUser : u))
    set({
      users: updatedUsers,
      currentUser: updatedUser,
      useMock: updatedUser.isDemo,
    })

    return true
  },
}))
