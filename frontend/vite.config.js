import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev, /api/* is proxied to FastAPI so the browser never needs the backend URL or any key.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
