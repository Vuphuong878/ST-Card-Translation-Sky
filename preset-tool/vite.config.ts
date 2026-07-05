import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Fixed port so the Hub can embed this tool at a stable iframe URL.
    port: 5175,
    strictPort: true,
  },
})
