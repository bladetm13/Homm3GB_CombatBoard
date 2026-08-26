import { createRouter, createWebHistory } from 'vue-router'
import CombatBoardView from '../views/CombatBoardView.vue'

export const routes = [
  { path: '/', name: 'combat-board', component: CombatBoardView },
]

export function createAppRouter() {
  return createRouter({
    history: createWebHistory(),
    routes,
  })
}

export default createAppRouter()
