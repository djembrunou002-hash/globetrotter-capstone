import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  optimizeDeps: command === 'serve' ? { exclude: ['maplibre-gl'] } : {},
  server: {
    host: true
  },
}))