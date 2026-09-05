import { createRouter, createWebHistory } from 'vue-router'
import CombatBoardView from '../views/CombatBoardView.vue'

export const routes = [
  { path: '/', name: 'combat-board', component: CombatBoardView },
]

export function createAppRouter() {
  return createRouter({
    /*
      The folder the app is served out of — `/` in development, the repository's
      own folder on GitHub Pages. Vite fills it in from `base`. Without it the
      router would look for `/Homm3GB_CombatBoard/` among its routes, find
      nothing, and leave the page blank on a deploy that otherwise went fine.
    */
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
  })
}

export default createAppRouter()
