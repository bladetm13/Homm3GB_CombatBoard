import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import CombatBoardView from '../src/views/CombatBoardView.vue'
import BoardTools from '../src/components/BoardTools.vue'
import CombatBoard from '../src/components/CombatBoard.vue'
import BoardField from '../src/components/BoardField/BoardField.vue'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'
import { TOKENS, TOKEN_CATEGORY, TOKEN_SCOPE } from '../src/components/BoardField/tokenConstants'

const TITANS = UNITS[UNIT_TYPE.TOWER].TITANS_FEW
const FIREWALL = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL

// A mounted field listens for the page being closed; `window` outlives it.
enableAutoUnmount(afterEach)

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

  it('hangs the board tools beside the zoom widget, outside the transform', () => {
    const wrapper = mount(CombatBoardView, { attachTo: document.body })
    const tools = wrapper.getComponent(BoardTools)

    expect(wrapper.find('[data-testid="zoom-readout"]').exists()).toBe(true)
    // Inside the board would mean panned, zoomed and dragged along with it.
    expect(wrapper.get('[data-testid="combat-board"]').element.contains(tools.element)).toBe(false)
  })

  it('lays an imported board out on the field', async () => {
    const wrapper = mount(CombatBoardView, { attachTo: document.body })

    wrapper.getComponent(BoardTools).vm.$emit('import', {
      units: { '1-1': TITANS },
      tokens: { '1-2': [FIREWALL] },
    })
    await wrapper.vm.$nextTick()

    const cells = wrapper.findAll('[data-testid="board-field-cell"]')
    expect(cells[0].get('[data-testid="card"]').attributes('data-unit')).toBe(TITANS)
    expect(cells[1].get('[data-token]').attributes('data-token')).toBe(FIREWALL)
  })

  it('hands the board it holds to the tools, for them to write out', async () => {
    const wrapper = mount(CombatBoardView, { attachTo: document.body })
    wrapper.getComponent(BoardTools).vm.$emit('import', { units: { '1-1': TITANS }, tokens: {} })
    await wrapper.vm.$nextTick()

    expect(wrapper.getComponent(BoardTools).props('units')).toEqual({ '1-1': TITANS })
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
