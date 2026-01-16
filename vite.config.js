import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/sri-lanka-employment-predictor-UI/',
  server: {
    host: '0.0.0.0',  // Allow external access
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://192.168.1.6:8000',
        changeOrigin: true,
      }
    }
  }
})
