import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  cacheDir: 'node_modules/.vite',
  plugins: [react(), ...(mode === 'development' ? [inspectAttr()] : [])],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase')) return 'supabase-vendor'
          if (id.includes('recharts')) return 'charts-vendor'
          if (id.includes('@radix-ui')) return 'ui-vendor'
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
