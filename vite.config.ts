import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    // VITE_SERVER_URL: only set when frontend and API are on different origins (e.g. remote deploy).
    // Leave unset in dev — vite proxies /api and /terminal to the Express server.
    ...(process.env.VITE_SERVER_URL
      ? { 'import.meta.env.VITE_SERVER_URL': JSON.stringify(process.env.VITE_SERVER_URL) }
      : {}),
  },
  plugins: [react()],
  root: 'src',
  base: './',
  build: {
    outDir: '../build',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.html'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.SERVER_PORT ?? '3001'}`,
        changeOrigin: true,
        bypass(req) {
          // Don't proxy Vite HMR source files like /api/index.ts, /api/web.ts
          if (req.url && /\.(ts|tsx|js|jsx|css|html|json|map)(\?|$)/.test(req.url)) {
            return req.url
          }
        },
      },
      '/terminal': {
        target: `ws://localhost:${process.env.SERVER_PORT ?? '3001'}`,
        ws: true,
      },
    },
  },
})
