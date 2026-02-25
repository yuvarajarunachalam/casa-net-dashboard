import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vercel builds from the dashboard/ folder root
  build: {
    outDir: 'dist'
  }
})
