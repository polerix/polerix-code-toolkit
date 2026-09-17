import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // Or '/repo-name/' for GitHub Pages
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // Add secondary pages as needed:
        // app: resolve(__dirname, 'app.html')
      },
    },
  },
})
