import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '../src/router/index.js'
import CombatBoardView from '../src/views/CombatBoardView.vue'

const combatRoute = routes.find((route) => route.name === 'combat-board')

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

describe('router', () => {
  it('exposes a single page, the combat board', () => {
    // Asserted against `routes` rather than a hardcoded path, so moving the
    // page does not break the test.
    expect(routes).toHaveLength(1)
    expect(combatRoute).toBeDefined()
    expect(combatRoute.component).toBe(CombatBoardView)
  })

  it('resolves the combat board route', async () => {
    const router = makeRouter()
    await router.push(combatRoute.path)
    expect(router.currentRoute.value.name).toBe('combat-board')
    expect(router.currentRoute.value.matched).toHaveLength(1)
  })

  it('has no unreachable routes', () => {
    const router = makeRouter()
    for (const route of routes) {
      expect(router.resolve(route.path).matched).not.toHaveLength(0)
    }
  })
})
