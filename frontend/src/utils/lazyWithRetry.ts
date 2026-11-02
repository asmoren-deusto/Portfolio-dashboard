import { lazy, type ComponentType } from 'react'

/**
 * Checks whether an error is due to a missing or failed dynamic chunk import
 * (typically happens when a new release is deployed and old hashes are 404).
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const msg = String((error as { message?: string })?.message || error || '').toLowerCase()
  const name = String((error as { name?: string })?.name || '')
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('failed to fetch') ||
    name === 'ChunkLoadError'
  )
}

/**
 * Wraps dynamic React component imports with automatic retry & reload logic.
 * When a chunk fails to load due to a new release/hash mismatch, it automatically reloads the page
 * (with a sessionStorage guard to prevent infinite loops) to fetch the fresh bundle.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | { [key: string]: any }>,
  namedExport?: string
) {
  return lazy(async () => {
    const pageKey = `chunk_retry_${window.location.pathname}`
    try {
      const module = await factory()
      // If loading succeeded, clear the retry flag for this path
      try {
        sessionStorage.removeItem(pageKey)
      } catch {
        // Safe fallback in restricted environments
      }
      const component = namedExport
        ? ((module as Record<string, any>)[namedExport] || (module as { default?: T }).default)
        : ((module as { default?: T }).default || module)
      return { default: component as T }
    } catch (error: unknown) {
      if (isChunkLoadError(error)) {
        let hasRefreshed = false
        try {
          hasRefreshed = !!sessionStorage.getItem(pageKey)
        } catch {
          // Safe fallback
        }

        if (!hasRefreshed) {
          try {
            sessionStorage.setItem(pageKey, 'true')
          } catch {
            // Safe fallback
          }
          // Force reload to get the latest index.html and newly hashed assets
          window.location.reload()
          // Return an unresolved promise to keep React suspended while the browser navigates
          return new Promise<{ default: T }>(() => {})
        }
      }
      throw error
    }
  })
}

