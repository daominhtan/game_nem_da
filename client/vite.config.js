import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/colyseus': {
        target: 'ws://localhost:2567',
        ws: true
      }
    }
  }
})
