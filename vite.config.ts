import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { handleApiRequest } from './server.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'muszaknaplo-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/api/')) return next()
        void handleApiRequest(request, response).catch((error: unknown) => {
          console.error('API request failed:', error)
          if (!response.headersSent) {
            response.statusCode = 500
            response.end(JSON.stringify({ error: 'Internal server error' }))
          } else {
            response.destroy(error instanceof Error ? error : new Error(String(error)))
          }
        })
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/api/')) return next()
        void handleApiRequest(request, response).catch((error: unknown) => {
          console.error('API request failed:', error)
          if (!response.headersSent) {
            response.statusCode = 500
            response.end(JSON.stringify({ error: 'Internal server error' }))
          } else {
            response.destroy(error instanceof Error ? error : new Error(String(error)))
          }
        })
      })
    },
  }],
})
