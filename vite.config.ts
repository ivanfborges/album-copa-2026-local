import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['jspdf'],
  },
  build: {
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }

          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor'
          }

          if (id.includes('node_modules/dexie')) {
            return 'db-vendor'
          }

          if (id.includes('node_modules/jspdf')) {
            return 'pdf-vendor'
          }
        },
      },
    },
  },
})
