import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Fallback: if VITE_API_URL is not set at build time, use the Render URL.
    // This ensures production Vercel builds always point to the correct backend
    // even if the .env.production file is gitignored.
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'https://mock-interview-platfrom.onrender.com'
    ),
  }
})
