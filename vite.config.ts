import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    sourcemapIgnoreList(sourcePath) {
      // Ignore source map warnings for node_modules
      return sourcePath.includes('node_modules')
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress sourcemap warnings for dependencies
        if (warning.code === 'SOURCEMAP_ERROR') {
          return
        }
        warn(warning)
      }
    }
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision']
  }
})
