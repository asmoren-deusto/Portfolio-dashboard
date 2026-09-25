import { create } from 'zustand'

export type Period = '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y'
export type Theme = 'light' | 'dark'

interface AppState {
  period: Period
  setPeriod: (p: Period) => void
  useMock: boolean
  setUseMock: (v: boolean) => void
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  toggleMobileSidebar: () => void
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

// Default to 'light' as explicitly requested by user
const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem('theme') as Theme : null) || 'light'
applyTheme(savedTheme)

export const useAppStore = create<AppState>((set) => ({
  period: '1y',
  setPeriod: (period) => set({ period }),
  useMock: true,
  setUseMock: (useMock) => set({ useMock }),
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
}))
