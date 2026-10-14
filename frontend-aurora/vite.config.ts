import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Aurora reutiliza la capa de datos del frontend clásico SIN copiarla ni modificarla:
 *   @/…  → ../frontend/src   (api, store, lib, hooks — solo lectura)
 *   ~/…  → ./src             (UI nueva de Aurora)
 *
 * `dedupe` obliga a que los módulos compartidos (React, React Query, Zustand…) se resuelvan
 * desde los node_modules de Aurora aunque el import venga de un fichero de ../frontend,
 * evitando dos instancias de React en tiempo de ejecución.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../frontend/src'),
      '~': path.resolve(__dirname, './src'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'clsx',
      '@capacitor/core',
    ],
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 30000,
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
})
