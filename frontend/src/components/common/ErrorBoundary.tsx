import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react'
import { isChunkLoadError } from '@/utils/lazyWithRetry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    // If it's a dynamic chunk error and we haven't reloaded yet, trigger an immediate seamless refresh
    if (isChunkLoadError(error)) {
      const pageKey = `chunk_eb_reload_${window.location.pathname}`
      const hasReloaded = sessionStorage.getItem(pageKey)
      if (!hasReloaded) {
        sessionStorage.setItem(pageKey, 'true')
        window.location.reload()
      }
    }
  }

  public handleReset = () => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload()
      return
    }
    this.setState({ hasError: false, error: null })
  }

  public handleHardReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isChunk = isChunkLoadError(this.state.error)

      return (
        <div className="flex flex-col items-center justify-center p-8 my-6 rounded-2xl bg-white/95 dark:bg-[#1e1e1e]/95 border border-slate-200 dark:border-white/10 text-center shadow-xl backdrop-blur-md">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
              isChunk
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}
          >
            {isChunk ? <Sparkles className="w-7 h-7 animate-pulse" /> : <AlertTriangle className="w-7 h-7" />}
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {isChunk ? 'Nueva versión de la plataforma disponible' : 'Ha ocurrido un problema al cargar esta vista'}
          </h3>

          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            {isChunk
              ? 'Se han actualizado los componentes de la aplicación. Haz clic abajo para recargar y sincronizar con la última versión.'
              : this.state.error?.message || 'Error inesperado en los componentes de la página.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              {isChunk ? 'Actualizar ahora' : 'Reintentar vista'}
            </button>

            {!isChunk && (
              <button
                onClick={this.handleHardReload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-medium text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                Recargar página
              </button>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
