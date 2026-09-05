import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  /*
    The site is a GitHub project page, so it is served out of a folder rather
    than a domain root — every emitted URL has to carry that folder. It is
    hardcoded rather than switched on the command, so that `dev`, `preview` and
    the deployed site all agree on where the app lives; the cost is that the dev
    server answers on `/Homm3GB_CombatBoard/` too, which is what Vite prints.
  */
  base: '/Homm3GB_CombatBoard/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./assets', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.spec.js'],
  },
})
