import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Static preview build: everything (JS, CSS, fonts) inlined so it can ship as one HTML file.
export default defineConfig({
  plugins: [react()],
  define: { 'import.meta.env.VITE_DEMO': JSON.stringify('1') },
  build: {
    outDir: 'dist-demo',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
