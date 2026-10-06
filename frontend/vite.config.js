import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Ports are chosen to stay clear of common defaults (5173, 8000); override with COUNCIL_WEB_PORT / COUNCIL_API_URL.
const webPort = Number(process.env.COUNCIL_WEB_PORT || 5288)
const apiUrl = process.env.COUNCIL_API_URL || 'http://localhost:8787'

// In dev, /api/* is proxied to FastAPI so the browser never needs the backend URL or any key.
export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: { port: webPort, strictPort: true },
})
