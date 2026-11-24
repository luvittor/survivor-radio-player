import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const apiTarget = loadEnv(mode, process.cwd(), 'RADIO_').RADIO_API_PROXY_TARGET

  return {
    base: '/player/',
    plugins: [react()],
    server: {
      proxy: apiTarget ? {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
      } : undefined,
    },
  }
})
