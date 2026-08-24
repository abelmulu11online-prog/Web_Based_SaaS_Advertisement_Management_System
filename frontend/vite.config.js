import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Use import.meta.dirname (Vite 8+ / Node 22+) with a fallback for older Node
const dir = import.meta.dirname ?? new URL('.', import.meta.url).pathname

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Path aliases — import from '@/' instead of '../../'
  resolve: {
    alias: {
      '@': resolve(dir, 'src'),
      '@components': resolve(dir, 'src/components'),
      '@features': resolve(dir, 'src/features'),
      '@pages': resolve(dir, 'src/pages'),
      '@services': resolve(dir, 'src/services'),
      '@hooks': resolve(dir, 'src/hooks'),
      '@context': resolve(dir, 'src/context'),
      '@utils': resolve(dir, 'src/utils'),
      '@constants': resolve(dir, 'src/constants'),
      '@types': resolve(dir, 'src/types'),
    },
  },

  // Dev server config
  server: {
    port: 5173,
    // Proxy API calls to the backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // Preview (production build) server
  preview: {
    port: 4173,
  },
})
