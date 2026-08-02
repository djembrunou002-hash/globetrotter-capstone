import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))

function copyMaplibreWorker() {
  return {
    name: 'copy-maplibre-worker',
    closeBundle() {
      const src = resolve(here, 'node_modules/maplibre-gl/dist')
      const out = resolve(here, 'dist/assets')
      mkdirSync(out, { recursive: true })
      for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        copyFileSync(resolve(src, f), resolve(out, f))
      }
    }
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), copyMaplibreWorker()],
  optimizeDeps: command === 'serve' ? { exclude: ['maplibre-gl'] } : {},
  server: {
    host: true
  },
}))