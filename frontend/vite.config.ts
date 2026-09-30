import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages: https://juntavecinalantula.github.io/antulagis/
  base: '/antulagis/',
  plugins: [react()],
})
