import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true,       // Expose ke semua network interface (LAN/WiFi) agar HP bisa scan QR
    port: 5173,
    strictPort: false,
  },
})
