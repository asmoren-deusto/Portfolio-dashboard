import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global handler for Vite dynamic chunk preload errors (new deployment with new asset hashes)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected. Auto-reloading to fetch newest application assets...', event)
  const lastReload = parseInt(sessionStorage.getItem('vite_preload_ts') || '0', 10)
  if (Date.now() - lastReload > 8000) {
    sessionStorage.setItem('vite_preload_ts', Date.now().toString())
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
