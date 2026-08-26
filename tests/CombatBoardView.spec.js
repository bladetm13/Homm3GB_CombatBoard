import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CombatBoardView from '../src/views/CombatBoardView.vue'
import CombatBoard from '../src/components/CombatBoard.vue'
import BoardField from '../src/components/BoardField/BoardField.vue'

describe('CombatBoardView', () => {
  it('renders the board component', () => {
    const wrapper = mount(CombatBoardView, {
      global: { stubs: { CombatBoard: true } },
    })
    expect(wrapper.findComponent(CombatBoard).exists()).toBe(true)
  })

  it('puts the field inside the board, over the printed grid', () => {
    const wrapper = mount(CombatBoardView, { attachTo: document.body })
    const board = wrapper.get('[data-testid="combat-board"]')
    expect(board.findComponent(BoardField).exists()).toBe(true)
    expect(board.findAll('[data-testid="board-field-cell"]')).toHaveLength(20)
  })

  it('places its children inside the board, not next to it', () => {
    // The page is the parent, so it is the one that fills the board's slot —
    // which is exactly what a route-level <slot /> could never do.
    const Page = {
      components: { CombatBoard },
      template: `<CombatBoard><div class="unit-card">Archangel</div></CombatBoard>`,
    }
    const wrapper = mount(Page, { attachTo: document.body })
    const board = wrapper.get('[data-testid="combat-board"]')
    expect(board.find('.unit-card').exists()).toBe(true)
  })
})
