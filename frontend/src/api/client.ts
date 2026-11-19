/**
 * client.ts
 * Centralized API client wrapper with automatic Authorization header injection
 * and global 401 Unauthorized session expiration handling.
 */
import { apiUrl } from './config'
import { useAppStore } from '@/store/appStore'

let isHandling401 = false

/**
 * Global handler for 401 Unauthorized / session expiration.
 * Clears invalid credentials, logs out the user, and redirects cleanly to /login.
 */
export function handleUnauthorized() {
  if (typeof window === 'undefined') return
  if (isHandling401) return
  isHandling401 = true

  try {
    const activeUser = localStorage.getItem('portfolio_active_user_id')
    if (activeUser && activeUser !== 'demo') {
      localStorage.setItem('portfolio_last_user_id', activeUser)
    }
    localStorage.removeItem('portfolio_auth_token')
    localStorage.removeItem('portfolio_active_user_id')
    sessionStorage.setItem('portfolio_session_expired', 'true')
    useAppStore.getState().logout()
  } catch {}

  // If not already on /login, force redirect to login view
  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }

  setTimeout(() => {
    isHandling401 = false
  }, 2000)
}

/**
 * Standard fetch wrapper that automatically attaches the bearer auth token
 * and interceptively catches 401 Unauthorized responses.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('portfolio_auth_token') : null
  const headers = new Headers(options.headers || {})

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-cache, no-store')
  }

  const url = apiUrl(endpoint)
  const res = await fetch(url, {
    ...options,
    headers,
  })

  // Global 401 interceptor
  if (res.status === 401) {
    const isAuthLogin = endpoint.includes('/auth/login') || endpoint.includes('/auth/users')
    if (!isAuthLogin) {
      handleUnauthorized()
    }
  }

  return res
}
