import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BoardField from '../src/components/BoardField/BoardField.vue'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'
import { clearPickerMemory } from '../src/components/BoardField/pickerMemory'
import {
  TOKENS,
  TOKEN_CATEGORY,
  TOKEN_SCOPE,
} from '../src/components/BoardField/tokenConstants'

const TITANS = UNITS[UNIT_TYPE.TOWER].TITANS_FEW
const ARCHANGELS = UNITS[UNIT_TYPE.CASTLE].ARCHANGELS_PACK

/** The picker teleports to body, so it is stubbed out of the way by default. */
const mountField = (options = {}) =>
  mount(BoardField, {
    attachTo: document.body,
    global: { stubs: { teleport: true } },
    ...options,
  })

const picker = (wrapper) => wrapper.find('[data-testid="picker"]')
const cardIn = (cell) => cell.find('[data-testid="card"]')

/**
 * Picks a unit out of an already open dialog. The picker only mounts the groups
 * that are open, so the unit's own group is expanded first.
 */
async function pickUnit(wrapper, unit) {
  if (!wrapper.find(`[data-testid="picker-unit-${unit}"]`).exists()) {
    const group = Object.keys(UNITS).indexOf(unit.slice(0, unit.indexOf('/')))
    await wrapper.findAll('[data-testid="accordion-header"]')[group].trigger('click')
  }
  await wrapper.get(`[data-testid="picker-unit-${unit}"]`).trigger('click')
}

/** Clicks a cell, then picks a unit out of the dialog it opens. */
async function placeUnit(wrapper, cellIndex, unit) {
  await cells(wrapper)[cellIndex].trigger('click')
  await pickUnit(wrapper, unit)
}

const cells = (wrapper) => wrapper.findAll('[data-testid="board-field-cell"]')

const tokenPicker = (wrapper) => wrapper.find('[data-testid="token-picker"]')

/** Opens the token picker over a cell through that cell's own plate. */
const openTokens = (wrapper, cellIndex) =>
  cells(wrapper)[cellIndex].get('[data-testid="board-field-add-token"]').trigger('click')

// Every picker remembers where it was left; each test starts from a clean one.
beforeEach(clearPickerMemory)

describe('BoardField', () => {
  it('lays out a 4x5 grid, matching the grid printed on the artwork', () => {
    const all = cells(mountField())
    expect(all).toHaveLength(20)

    const rows = new Set(all.map((c) => c.attributes('data-row')))
    const cols = new Set(all.map((c) => c.attributes('data-col')))
    expect([...rows]).toEqual(['1', '2', '3', '4', '5'])
    expect([...cols]).toEqual(['1', '2', '3', '4'])
  })

  it('fills the box it is placed in', () => {
    const wrapper = mountField()
    // The size comes from CSS (100%/100%), so assert the contract that matters:
    // the field sets no intrinsic width or height of its own.
    const style = wrapper.get('[data-testid="board-field"]').attributes('style') ?? ''
    expect(style).not.toMatch(/(^|;)\s*(width|height):/)
  })

  it('numbers cells row by row, 1-based', () => {
    const wrapper = mountField()
    const all = cells(wrapper)
    const at = (i) => [Number(all[i].attributes('data-row')), Number(all[i].attributes('data-col'))]

    expect(at(0)).toEqual([1, 1])
    expect(at(3)).toEqual([1, 4])
    expect(at(4)).toEqual([2, 1])
    expect(at(19)).toEqual([5, 4])
  })

  it('hands row, col and index to the cell slot', () => {
    const wrapper = mountField({
      slots: { default: '<template #default="{ row, col, index }"><i>{{ row }}:{{ col }}:{{ index }}</i></template>' },
    })
    const rendered = wrapper.findAll('i').map((n) => n.text())
    expect(rendered).toHaveLength(20)
    expect(rendered.slice(0, 5)).toEqual(['1:1:0', '1:2:1', '1:3:2', '1:4:3', '2:1:4'])
    expect(rendered.at(-1)).toBe('5:4:19')
  })

  it('renders slotted content inside the matching cell', () => {
    const wrapper = mountField({
      slots: { default: '<template #default="{ row, col }"><b v-if="row === 2 && col === 1">unit</b></template>' },
    })
    const owner = wrapper.get('b').element.parentElement
    expect(owner.dataset.row).toBe('2')
    expect(owner.dataset.col).toBe('1')
  })

  it('emits the clicked cell', async () => {
    const wrapper = mountField()
    await cells(wrapper)[6].trigger('click')
    expect(wrapper.emitted('cell-click')).toHaveLength(1)
    expect(wrapper.emitted('cell-click')[0][0]).toMatchObject({ index: 6, row: 2, col: 3 })
  })

  it('tags each cell with its row and column, which is what the CSS nudges into place', () => {
    const all = cells(mountField())
    expect(all[0].classes()).toEqual(expect.arrayContaining(['board-field__cell', 'row-1', 'col-1']))
    expect(all[6].classes()).toEqual(expect.arrayContaining(['row-2', 'col-3']))
    expect(all[19].classes()).toEqual(expect.arrayContaining(['row-5', 'col-4']))
  })

  it('opens the picker only after a cell is clicked', async () => {
    const wrapper = mountField()
    expect(picker(wrapper).exists()).toBe(false)

    await cells(wrapper)[6].trigger('click')
    expect(picker(wrapper).exists()).toBe(true)
    expect(wrapper.emitted('cell-click')[0][0]).toMatchObject({ index: 6, row: 2, col: 3 })
  })

  it('closes the picker without placing anything', async () => {
    const wrapper = mountField()
    await cells(wrapper)[0].trigger('click')
    await wrapper.get('[data-testid="picker-backdrop"]').trigger('click')

    expect(picker(wrapper).exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="card"]')).toHaveLength(0)
  })

  it('puts the picked unit in the cell that was clicked', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 6, TITANS)

    const cell = cells(wrapper)[6]
    expect(cardIn(cell).attributes('data-unit')).toBe(TITANS)
    // Only that cell gets a card, and the picker closes behind it.
    expect(wrapper.findAll('[data-testid="card"]')).toHaveLength(1)
    expect(picker(wrapper).exists()).toBe(false)
    expect(wrapper.emitted('place')[0][0]).toMatchObject({ index: 6, row: 2, col: 3, unit: TITANS })
  })

  it('keeps separate cells independent', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)
    await placeUnit(wrapper, 19, ARCHANGELS)

    expect(cardIn(cells(wrapper)[0]).attributes('data-unit')).toBe(TITANS)
    expect(cardIn(cells(wrapper)[19]).attributes('data-unit')).toBe(ARCHANGELS)
    expect(wrapper.findAll('[data-testid="card"]')).toHaveLength(2)
  })

  it('replaces the unit when the same cell is picked again', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 3, TITANS)
    await placeUnit(wrapper, 3, ARCHANGELS)

    expect(cardIn(cells(wrapper)[3]).attributes('data-unit')).toBe(ARCHANGELS)
    expect(wrapper.findAll('[data-testid="card"]')).toHaveLength(1)
  })

  it('makes cards on the field removable', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 2, TITANS)
    expect(cardIn(cells(wrapper)[2]).classes()).toContain('is-removable')
    expect(cells(wrapper)[2].find('[data-testid="card-remove"]').exists()).toBe(true)
  })

  it('removes a card through its cross, leaving the others alone', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 2, TITANS)
    await placeUnit(wrapper, 5, ARCHANGELS)

    await cells(wrapper)[2].get('[data-testid="card-remove"]').trigger('click')

    expect(cardIn(cells(wrapper)[2]).exists()).toBe(false)
    expect(cardIn(cells(wrapper)[5]).attributes('data-unit')).toBe(ARCHANGELS)
    expect(wrapper.emitted('remove')[0][0]).toMatchObject({ row: 1, col: 3, unit: TITANS })
  })

  it('reads a card on the board without opening the picker over it', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 2, TITANS)
    await cells(wrapper)[2].get('[data-testid="card-preview-open"]').trigger('click')

    expect(wrapper.get('[data-testid="card-preview"] img').attributes('src')).toContain(
      'titans_few',
    )
    expect(picker(wrapper).exists()).toBe(false)
    expect(wrapper.emitted('cell-click')).toHaveLength(1)
  })

  it('does not reopen the picker when the cross is clicked', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 2, TITANS)
    await cells(wrapper)[2].get('[data-testid="card-remove"]').trigger('click')
    expect(picker(wrapper).exists()).toBe(false)
  })

  it('lets the parent own placement through v-model:units', async () => {
    const wrapper = mountField({ props: { units: { '1-1': TITANS } } })
    expect(cardIn(cells(wrapper)[0]).attributes('data-unit')).toBe(TITANS)

    await placeUnit(wrapper, 1, ARCHANGELS)
    expect(wrapper.emitted('update:units').at(-1)[0]).toEqual({
      '1-1': TITANS,
      '1-2': ARCHANGELS,
    })
  })

  it('hands the placed unit to the cell slot', async () => {
    const wrapper = mountField({
      props: { units: { '1-1': TITANS } },
      slots: { default: '<template #default="{ unit }"><em>{{ unit ?? "-" }}</em></template>' },
    })
    expect(wrapper.findAll('em').map((n) => n.text())[0]).toBe(TITANS)
    expect(wrapper.findAll('em').map((n) => n.text())[1]).toBe('-')
  })
  it('hints at every cell, and offers a token plate on every cell', () => {
    const wrapper = mountField()
    expect(wrapper.findAll('[data-testid="board-field-hint"]')).toHaveLength(20)
    expect(wrapper.findAll('[data-testid="board-field-add-token"]')).toHaveLength(20)
  })

  it('keeps the hint out of the pointer\'s way — the cell itself takes the click', () => {
    const hint = mountField().get('[data-testid="board-field-hint"]')
    expect(hint.element.tagName).toBe('SPAN')
    expect(hint.attributes('aria-hidden')).toBe('true')
  })

  it('offers a plus on bare ground and swap arrows over a card', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 6, TITANS)
    const hintIn = (i) => cells(wrapper)[i].get('[data-testid="board-field-hint"]')

    expect(hintIn(6).attributes('data-hint')).toBe('swap')
    expect(hintIn(6).find('.board-field__swap').exists()).toBe(true)
    expect(hintIn(6).find('.board-field__plus').exists()).toBe(false)

    expect(hintIn(5).attributes('data-hint')).toBe('add')
    expect(hintIn(5).find('.board-field__plus').exists()).toBe(true)

    const hints = wrapper.findAll('[data-testid="board-field-hint"]')
    expect(hints.filter((h) => h.attributes('data-hint') === 'swap')).toHaveLength(1)
  })

  it('goes back to the plus once the card is taken off', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 6, TITANS)
    await cells(wrapper)[6].get('[data-testid="card-remove"]').trigger('click')

    const hint = cells(wrapper)[6].get('[data-testid="board-field-hint"]')
    expect(hint.attributes('data-hint')).toBe('add')
  })

  it('keeps the token plate on a cell that already holds a unit', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 6, TITANS)
    expect(cells(wrapper)[6].find('[data-testid="board-field-add-token"]').exists()).toBe(true)
  })

  it('names the token plate in words, not just an icon', () => {
    expect(mountField().get('[data-testid="board-field-add-token"]').text()).toBe('Add token')
  })

  it('opens the token picker from the circle, not the unit picker', async () => {
    const wrapper = mountField()
    await openTokens(wrapper, 6)

    expect(tokenPicker(wrapper).exists()).toBe(true)
    expect(picker(wrapper).exists()).toBe(false)
    expect(wrapper.emitted('cell-click')).toHaveLength(1)
    expect(wrapper.emitted('cell-click')[0][0]).toMatchObject({ index: 6, row: 2, col: 3 })
  })

  it('closes the token picker again', async () => {
    const wrapper = mountField()
    await openTokens(wrapper, 0)
    await wrapper.get('[data-testid="token-picker-backdrop"]').trigger('click')

    expect(tokenPicker(wrapper).exists()).toBe(false)
  })

  it('offers board effects over an empty cell', async () => {
    const wrapper = mountField()
    await openTokens(wrapper, 0)

    const firewall = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL
    expect(wrapper.get('[data-testid="token-picker"]').attributes('aria-label')).toBe(
      'Choose a field token',
    )
    expect(wrapper.find(`[data-testid="token-picker-token-${firewall}"]`).exists()).toBe(true)
  })

  it('offers stack markers over a cell that holds a unit', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)
    await openTokens(wrapper, 0)

    const damage = TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.COMMON].DAMAGE_1
    expect(wrapper.get('[data-testid="token-picker"]').attributes('aria-label')).toBe(
      'Choose a unit token',
    )
    expect(wrapper.find(`[data-testid="token-picker-token-${damage}"]`).exists()).toBe(true)
  })

  it('follows the cell, not the last one opened, when the scope changes', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)

    await openTokens(wrapper, 0)
    await wrapper.get('[data-testid="token-picker-close"]').trigger('click')
    await openTokens(wrapper, 1)

    expect(wrapper.get('[data-testid="token-picker"]').attributes('aria-label')).toBe(
      'Choose a field token',
    )
  })

  it('hands the picked token to the cell it was opened over, and closes', async () => {
    const wrapper = mountField()
    const firewall = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL
    await openTokens(wrapper, 6)
    await wrapper.get(`[data-testid="token-picker-token-${firewall}"]`).trigger('click')

    expect(wrapper.emitted('place-token')[0][0]).toMatchObject({
      index: 6,
      row: 2,
      col: 3,
      token: firewall,
    })
    expect(tokenPicker(wrapper).exists()).toBe(false)
  })

  it('leaves the units alone when a token is picked', async () => {
    const wrapper = mountField()
    const firewall = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL
    await openTokens(wrapper, 0)
    await wrapper.get(`[data-testid="token-picker-token-${firewall}"]`).trigger('click')

    expect(wrapper.findAll('[data-testid="card"]')).toHaveLength(0)
    expect(wrapper.emitted('place')).toBeUndefined()
    expect(wrapper.emitted('update:units')).toBeUndefined()
  })
})
