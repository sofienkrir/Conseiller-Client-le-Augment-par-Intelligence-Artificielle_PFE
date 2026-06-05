import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          // GET /chat = refresh navigateur → servir index.html (SPA routing)
          // POST /chat = appel API → proxier vers FastAPI
          if (req.method === 'GET') return '/index.html';
        },
      },
      '/history': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          // GET sans Authorization = navigation SPA → servir index.html
          // GET avec Authorization = appel API → proxier vers FastAPI
          if (req.method === 'GET' && !req.headers['authorization']) {
            return '/index.html';
          }
        },
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/transcribe': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/upload_pdf': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/shared_pdfs': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})