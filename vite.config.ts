import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/player/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://survivor:18081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
