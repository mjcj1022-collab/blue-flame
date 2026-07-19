import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base on build so the bundle works at any path (GitHub Pages
// subpath, Netlify root, or a drag-drop deploy); '/' for local dev.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], r3f: ['@react-three/fiber', '@react-three/drei'] }
      }
    },
    chunkSizeWarningLimit: 1200
  }
}))
