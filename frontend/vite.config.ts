import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev, Django on :8000 serves the API, the admin login (used by /inbox) and its static files.
const django = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': django,
      '/media': django,
      '/admin': django,
      '/static': django,
    },
  },
})
