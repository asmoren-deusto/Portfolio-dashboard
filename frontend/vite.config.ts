import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lightweight-charts')) return 'vendor-lw-charts'
            if (id.includes('recharts')) return 'vendor-recharts'
            if (id.includes('framer-motion')) return 'vendor-framer-motion'
            if (id.includes('lucide-react')) return 'vendor-lucide'
            if (id.includes('@tanstack')) return 'vendor-tanstack'
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        '**/dist/**',
        '**/.git/**',
        '**/.chats/**',
        '**/node_modules/**',
        '**/backend/**',
        '**/data/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 30000,
        configure: (proxy) => {
          proxy.on('error', (_err, req, res) => {
            // Silenciar error ruidoso en consola durante el arranque/reinicio
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ detail: 'Backend reconectando...' }))
            }
          })
        },
      },
    },
  },
})
