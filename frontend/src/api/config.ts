/**
 * config.ts
 * Centralized API endpoint resolver with automatic detection for native Capacitor iOS app.
 */

import { Capacitor } from '@capacitor/core'

export const DEFAULT_PRODUCTION_URL = 'https://portfolio.asiermoreno.es'

/**
 * Detects if currently executing inside the native iOS / Android Capacitor wrapper.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false

  const isStandalone =
    (window.navigator as any).standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)

  return (
    Capacitor.isNativePlatform() ||
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && window.location.port === '') ||
    Boolean(isStandalone)
  )
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '/api'

  // 1. Custom server URL stored in localStorage (optional override)
  try {
    const custom = localStorage.getItem('portfolio_server_url')
    if (custom) {
      const clean = custom.trim().replace(/\/+$/, '')
      return clean.endsWith('/api') ? clean : `${clean}/api`
    }
  } catch {}

  // 2. Vite environment variable (if set at build time)
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    const clean = envUrl.trim().replace(/\/+$/, '')
    return clean.endsWith('/api') ? clean : `${clean}/api`
  }

  // 3. Detect if running inside native Capacitor environment (iOS / Android)
  if (isNativePlatform()) {
    return `${DEFAULT_PRODUCTION_URL}/api`
  }

  // 4. Default relative URL for standard browser execution
  return '/api'
}

/**
 * Builds a full API URL given a path (e.g. '/portfolio/summary' or '/auth/login').
 */
export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl()
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  // If base already ends with /api and path starts with /api/, avoid duplicate prefix
  if (base.endsWith('/api') && path.startsWith('/api/')) {
    return `${base.slice(0, -4)}${path}`
  }
  return `${base}${path}`
}
