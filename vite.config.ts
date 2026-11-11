import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs, so the build works under /maya-meal-prep/ on GitHub Pages.
  base: './',
  plugins: [react()],
})
