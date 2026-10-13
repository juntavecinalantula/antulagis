import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages: https://juntavecinalantula.github.io/antulagis/
  base: '/antulagis/',
  plugins: [react()],
  optimizeDeps: {
    // maplibre-gl emite su worker como módulo aparte; el optimizador de Vite
    // intenta pre-empaquetarlo y falla ("maplibre-gl-worker.mjs ... does not
    // exist in the optimize deps directory"). Excluirlo evita ese warning y
    // deja que el worker se resuelva tal cual lo publica la librería.
    exclude: ['maplibre-gl'],
  },
})
