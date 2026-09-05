import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import BoardField from '../src/components/BoardField/BoardField.vue'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'
import {
  CUSTOM_SCOPE,
  addCustomAsset,
  clearCustomAssets,
} from '../src/components/BoardField/customAssets'
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
    const type = unit.slice(0, unit.indexOf('/'))
    await wrapper
      .get(`[data-testid="picker-group-${type}"] [data-testid="accordion-header"]`)
      .trigger('click')
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

const FIREWALL = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL
const QUICKSAND = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].QUICKSAND
const DAMAGE_1 = TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.COMMON].DAMAGE_1

/** Opens the picker over a cell and picks a token out of it. */
async function placeToken(wrapper, cellIndex, token) {
  await openTokens(wrapper, cellIndex)
  await wrapper.get(`[data-testid="token-picker-token-${token}"]`).trigger('click')
}

/** What the browser sends on its way out; a cancelled one puts up the prompt. */
function leavingThePage() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

const tokensIn = (cell) =>
  cell.findAll('[data-token]').map((node) => node.attributes('data-token'))

const POINTER = 7

/** The card in a cell, which is also its drag handle. */
const handleIn = (cell) => cell.get('[data-testid="card"]')

/**
 * Takes hold of the card in a cell. Nothing is in the air yet — the press has
 * to travel `DRAG_THRESHOLD_PX` before it counts as a drag.
 */
const grab = (wrapper, cellIndex) =>
  handleIn(cells(wrapper)[cellIndex]).trigger('pointerdown', {
    pointerId: POINTER,
    pointerType: 'mouse',
    button: 0,
    buttons: 1,
    clientX: 0,
    clientY: 0,
  })

/** A move of the pointer itself, which is what the page listens for. */
async function movePointer(wrapper, x, y = 0) {
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerId: POINTER,
      pointerType: 'mouse',
      buttons: 1,
      clientX: x,
      clientY: y,
    }),
  )
  await wrapper.vm.$nextTick()
}

/** Carries the pointer over a cell, which is how the board hit-tests the drop. */
const hover = (wrapper, cellIndex) => cells(wrapper)[cellIndex].trigger('pointermove')

async function release(wrapper) {
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: POINTER }))
  await wrapper.vm.$nextTick()
}

/** Press, carry past the threshold, hover the target and let go. */
async function dragCard(wrapper, from, to) {
  await grab(wrapper, from)
  await movePointer(wrapper, 40)
  await hover(wrapper, to)
  await release(wrapper)
}

const ghost = (wrapper) => wrapper.find('[data-testid="board-field-ghost"]')
const dropStates = (wrapper) =>
  cells(wrapper).map((cell) => cell.attributes('data-drop'))

// Every picker remembers where it was left; each test starts from a clean one.
beforeEach(clearPickerMemory)
beforeEach(clearCustomAssets)

/*
  A board listens for the page being closed for as long as it is mounted, and
  `window` outlives the test that mounted it — so each one is taken down again.
*/
enableAutoUnmount(afterEach)

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

  it('warns before the page goes, once there is a board to lose', async () => {
    const wrapper = mountField()
    expect(leavingThePage().defaultPrevented).toBe(false)

    await placeUnit(wrapper, 6, TITANS)
    expect(leavingThePage().defaultPrevented).toBe(true)
  })

  it('warns for tokens alone, and for a picture the user brought in', async () => {
    const wrapper = mountField()
    await placeToken(wrapper, 6, FIREWALL)
    expect(leavingThePage().defaultPrevented).toBe(true)

    wrapper.unmount()
    mountField()
    expect(leavingThePage().defaultPrevented).toBe(false)
    addCustomAsset(CUSTOM_SCOPE.UNITS, new File(['art'], 'hero.png', { type: 'image/png' }))
    expect(leavingThePage().defaultPrevented).toBe(true)
  })

  it('lays a custom picture down like any other card, art and all', async () => {
    const custom = addCustomAsset(
      CUSTOM_SCOPE.UNITS,
      new File(['art'], 'Angry Peasant.png', { type: 'image/png' }),
    )
    const wrapper = mountField()

    await cells(wrapper)[6].trigger('click')
    await wrapper.get(`[data-testid="picker-unit-${custom.id}"]`).trigger('click')

    const card = cardIn(cells(wrapper)[6])
    expect(card.attributes('data-unit')).toBe(custom.id)
    expect(card.get('img').attributes('alt')).toBe('Angry Peasant')
    expect(wrapper.emitted('update:units').at(-1)[0]).toEqual({ '2-3': custom.id })
  })

  it('lays the picked token on the cell it was picked for', async () => {
    const wrapper = mountField()
    await placeToken(wrapper, 6, FIREWALL)

    expect(tokensIn(cells(wrapper)[6])).toEqual([FIREWALL])
    expect(wrapper.findAll('[data-testid="board-field-tokens"]')).toHaveLength(1)
    expect(wrapper.emitted('update:tokens').at(-1)[0]).toEqual({ '2-3': [FIREWALL] })
  })

  it('stacks up to four tokens on one cell, and offers no more after that', async () => {
    const wrapper = mountField()
    for (const token of [FIREWALL, QUICKSAND, FIREWALL, QUICKSAND]) {
      await placeToken(wrapper, 0, token)
    }
    const cell = cells(wrapper)[0]

    expect(tokensIn(cell)).toEqual([FIREWALL, QUICKSAND, FIREWALL, QUICKSAND])
    expect(cell.find('[data-testid="board-field-add-token"]').exists()).toBe(false)
  })

  it('hides the centre hint once a cell carries a token', async () => {
    const wrapper = mountField()
    expect(cells(wrapper)[0].find('[data-testid="board-field-hint"]').exists()).toBe(true)

    await placeToken(wrapper, 0, FIREWALL)
    expect(cells(wrapper)[0].find('[data-testid="board-field-hint"]').exists()).toBe(false)

    // ...and brings it back when the last one comes off.
    await cells(wrapper)[0].get('[data-testid="board-field-token-remove-0"]').trigger('click')
    expect(cells(wrapper)[0].find('[data-testid="board-field-hint"]').exists()).toBe(true)
  })

  it('replaces the token that was clicked, from the same set it came from', async () => {
    const wrapper = mountField()
    await placeToken(wrapper, 0, FIREWALL)
    await placeToken(wrapper, 0, QUICKSAND)

    await cells(wrapper)[0].get('[data-testid="board-field-token-0"]').trigger('click')
    expect(wrapper.get('[data-testid="token-picker"]').attributes('aria-label')).toBe(
      'Choose a field token',
    )
    await wrapper.get(`[data-testid="token-picker-token-${QUICKSAND}"]`).trigger('click')

    // The first slot changed; the second is untouched, and nothing was added.
    expect(tokensIn(cells(wrapper)[0])).toEqual([QUICKSAND, QUICKSAND])
    expect(wrapper.emitted('place-token').at(-1)[0]).toMatchObject({ slot: 0, index: 0 })
  })

  it('takes a token off through its own cross, leaving the others in order', async () => {
    const wrapper = mountField()
    await placeToken(wrapper, 0, FIREWALL)
    await placeToken(wrapper, 0, QUICKSAND)

    await cells(wrapper)[0].get('[data-testid="board-field-token-remove-0"]').trigger('click')

    expect(tokensIn(cells(wrapper)[0])).toEqual([QUICKSAND])
    expect(wrapper.emitted('remove-token').at(-1)[0]).toMatchObject({
      row: 1,
      col: 1,
      slot: 0,
      token: FIREWALL,
    })
  })

  it('drops the cell from the model once its last token is gone', async () => {
    const wrapper = mountField()
    await placeToken(wrapper, 0, FIREWALL)
    await cells(wrapper)[0].get('[data-testid="board-field-token-remove-0"]').trigger('click')

    expect(wrapper.emitted('update:tokens').at(-1)[0]).toEqual({})
    expect(cells(wrapper)[0].find('[data-testid="board-field-tokens"]').exists()).toBe(false)
  })

  it('marks a unit with its own tokens, over the card', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)
    await placeToken(wrapper, 0, DAMAGE_1)

    const cell = cells(wrapper)[0]
    expect(tokensIn(cell)).toEqual([DAMAGE_1])
    expect(cardIn(cell).attributes('data-unit')).toBe(TITANS)
    // The swap hint would sit under them, so it stands down.
    expect(cell.find('[data-testid="board-field-hint"]').exists()).toBe(false)
  })

  it('takes the stack markers away with the stack they marked', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)
    await placeToken(wrapper, 0, DAMAGE_1)

    await cells(wrapper)[0].get('[data-testid="card-remove"]').trigger('click')

    // Bare ground is not a place a unit token may be.
    expect(cells(wrapper)[0].find('[data-testid="board-field-tokens"]').exists()).toBe(false)
    expect(wrapper.emitted('update:tokens').at(-1)[0]).toEqual({})
  })

  it('lets the parent own the tokens through v-model:tokens', async () => {
    const wrapper = mountField({ props: { tokens: { '1-1': [FIREWALL] } } })
    expect(tokensIn(cells(wrapper)[0])).toEqual([FIREWALL])

    await placeToken(wrapper, 1, QUICKSAND)
    expect(wrapper.emitted('update:tokens').at(-1)[0]).toEqual({
      '1-1': [FIREWALL],
      '1-2': [QUICKSAND],
    })
  })
  describe('dragging a card across the board', () => {
    it('carries the card into an empty cell', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await dragCard(wrapper, 0, 6)

      expect(cardIn(cells(wrapper)[0]).exists()).toBe(false)
      expect(cardIn(cells(wrapper)[6]).attributes('data-unit')).toBe(TITANS)
      expect(wrapper.emitted('update:units').at(-1)[0]).toEqual({ '2-3': TITANS })
      expect(wrapper.emitted('move').at(-1)[0]).toMatchObject({
        from: { index: 0, row: 1, col: 1 },
        to: { index: 6, row: 2, col: 3 },
        unit: TITANS,
      })
    })

    it('lands on a cell that holds nothing but tokens, and leaves them there', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await placeToken(wrapper, 6, FIREWALL)
      await dragCard(wrapper, 0, 6)

      const cell = cells(wrapper)[6]
      expect(cardIn(cell).attributes('data-unit')).toBe(TITANS)
      expect(tokensIn(cell)).toEqual([FIREWALL])
    })

    it('refuses a cell that already holds a card, leaving both where they were', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await placeUnit(wrapper, 6, ARCHANGELS)

      await grab(wrapper, 0)
      await movePointer(wrapper, 40)
      await hover(wrapper, 6)
      expect(cells(wrapper)[6].attributes('data-drop')).toBe('no')

      await release(wrapper)
      expect(cardIn(cells(wrapper)[0]).attributes('data-unit')).toBe(TITANS)
      expect(cardIn(cells(wrapper)[6]).attributes('data-unit')).toBe(ARCHANGELS)
      expect(wrapper.emitted('move')).toBeUndefined()
    })

    it('marks the cell under the pointer, and only that one', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await grab(wrapper, 0)
      await movePointer(wrapper, 40)

      await hover(wrapper, 6)
      expect(dropStates(wrapper).filter(Boolean)).toEqual(['ok'])
      expect(cells(wrapper)[6].attributes('data-drop')).toBe('ok')

      // The cell it came from is not a move, so it has nothing to say.
      await hover(wrapper, 0)
      expect(dropStates(wrapper).filter(Boolean)).toEqual([])
      await release(wrapper)
    })

    it('says nothing until the press has travelled far enough to be a drag', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await grab(wrapper, 0)

      await movePointer(wrapper, 3)
      expect(ghost(wrapper).exists()).toBe(false)
      expect(wrapper.get('[data-testid="board-field"]').classes()).not.toContain('is-dragging')

      await movePointer(wrapper, 40)
      expect(ghost(wrapper).exists()).toBe(true)
      await release(wrapper)
    })

    it('leaves a press that never moved to the picker', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)

      await grab(wrapper, 0)
      await movePointer(wrapper, 2)
      await release(wrapper)
      await cells(wrapper)[0].trigger('click')

      expect(picker(wrapper).exists()).toBe(true)
    })

    it('swallows the click a drop leaves behind', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await dragCard(wrapper, 0, 6)
      await cells(wrapper)[6].trigger('click')

      expect(picker(wrapper).exists()).toBe(false)
      // ...and the one after it is a click again.
      await cells(wrapper)[6].trigger('click')
      expect(picker(wrapper).exists()).toBe(true)
    })

    it('carries the stack markers with the stack', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await placeToken(wrapper, 0, DAMAGE_1)
      await dragCard(wrapper, 0, 6)

      expect(tokensIn(cells(wrapper)[6])).toEqual([DAMAGE_1])
      expect(cells(wrapper)[0].find('[data-testid="board-field-tokens"]').exists()).toBe(false)
      expect(wrapper.emitted('update:tokens').at(-1)[0]).toEqual({ '2-3': [DAMAGE_1] })
    })

    it('sets the markers down after whatever the cell already held', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await placeToken(wrapper, 0, DAMAGE_1)
      await placeToken(wrapper, 6, FIREWALL)
      await dragCard(wrapper, 0, 6)

      expect(tokensIn(cells(wrapper)[6])).toEqual([FIREWALL, DAMAGE_1])
    })

    it('takes no more than the four a cell holds', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      for (const token of [DAMAGE_1, DAMAGE_1, DAMAGE_1]) await placeToken(wrapper, 0, token)
      for (const token of [FIREWALL, QUICKSAND]) await placeToken(wrapper, 6, token)

      await dragCard(wrapper, 0, 6)
      expect(tokensIn(cells(wrapper)[6])).toEqual([FIREWALL, QUICKSAND, DAMAGE_1, DAMAGE_1])
    })

    it('shows the card being carried, and dims the place it left', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await grab(wrapper, 0)
      await movePointer(wrapper, 40, 25)

      expect(ghost(wrapper).attributes('data-unit')).toBe(TITANS)
      expect(ghost(wrapper).attributes('style')).toContain('translate3d(40px, 25px, 0)')
      expect(cardIn(cells(wrapper)[0]).classes()).toContain('is-carried')

      await release(wrapper)
      expect(ghost(wrapper).exists()).toBe(false)
    })

    it('drops nothing when the pointer is let go off the board', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await grab(wrapper, 0)
      await movePointer(wrapper, 40)
      await hover(wrapper, 6)
      await wrapper.get('[data-testid="board-field"]').trigger('pointerleave')
      await release(wrapper)

      expect(cardIn(cells(wrapper)[0]).attributes('data-unit')).toBe(TITANS)
      expect(wrapper.emitted('move')).toBeUndefined()
    })

    it('puts the card back on Escape', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await grab(wrapper, 0)
      await movePointer(wrapper, 40)
      await hover(wrapper, 6)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await wrapper.vm.$nextTick()
      expect(ghost(wrapper).exists()).toBe(false)

      await release(wrapper)
      expect(cardIn(cells(wrapper)[0]).attributes('data-unit')).toBe(TITANS)
      expect(wrapper.emitted('move')).toBeUndefined()
    })

    it('lets the card go when the pointer comes back with no button held', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await grab(wrapper, 0)
      await movePointer(wrapper, 40)

      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: POINTER,
          pointerType: 'mouse',
          buttons: 0,
          clientX: 80,
        }),
      )
      await wrapper.vm.$nextTick()

      expect(ghost(wrapper).exists()).toBe(false)
      expect(cardIn(cells(wrapper)[0]).attributes('data-unit')).toBe(TITANS)
    })

    it('does not take hold of the card by its own controls', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)

      const cross = cells(wrapper)[0].get('[data-testid="card-remove"]')
      await cross.trigger('pointerdown', { pointerId: POINTER, pointerType: 'mouse', button: 0 })
      await movePointer(wrapper, 40)
      expect(ghost(wrapper).exists()).toBe(false)

      await cross.trigger('click')
      expect(cardIn(cells(wrapper)[0]).exists()).toBe(false)
    })

    it('ignores anything but the left button', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      await handleIn(cells(wrapper)[0]).trigger('pointerdown', {
        pointerId: POINTER,
        pointerType: 'mouse',
        button: 2,
      })
      await movePointer(wrapper, 40)

      expect(ghost(wrapper).exists()).toBe(false)
    })

    it('keeps the board still while a card is carried over it', async () => {
      const wrapper = mountField()
      await placeUnit(wrapper, 0, TITANS)
      // `CombatBoard` skips its own pan for anything under `[data-no-drag]`.
      expect(handleIn(cells(wrapper)[0]).attributes('data-no-drag')).toBeDefined()
    })
  })
})

/*
  Reported from the app: after some fiddling, the first click on a cross or on
  the token plate did nothing and the second one worked. A drag that ended
  outside the grid was leaving the swallow armed, and it ate the next real
  click. These pin the behaviour down.
*/
describe('BoardField — the click a drag leaves behind', () => {
  /** Carries a card out of the grid and lets it go there. */
  async function dragOffTheField(wrapper, from) {
    await grab(wrapper, from)
    await movePointer(wrapper, 40)
    await wrapper.get('[data-testid="board-field"]').trigger('pointerleave')
    await release(wrapper)
  }

  /** What the browser sends after a drag that ended outside the field. */
  function clickOn(element) {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    element.dispatchEvent(event)
    return event
  }

  it('eats that click wherever it lands, not only inside the grid', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)
    await dragOffTheField(wrapper, 0)

    // The drag ended off the grid, so the click lands on an ancestor of the
    // field — which is exactly the one the old listener never saw.
    expect(clickOn(document.body).defaultPrevented).toBe(true)
  })

  it('lets the next click through once the leftover is gone', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)
    await dragOffTheField(wrapper, 0)
    clickOn(document.body)

    await cells(wrapper)[1].trigger('click')
    expect(picker(wrapper).exists()).toBe(true)
  })

  it('opens the token plate on the first click after such a drag', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)
    await dragOffTheField(wrapper, 0)
    clickOn(document.body)

    await openTokens(wrapper, 3)
    expect(tokenPicker(wrapper).exists()).toBe(true)
  })

  it('takes the cross on the first click after such a drag', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)
    await placeUnit(wrapper, 5, ARCHANGELS)
    await dragOffTheField(wrapper, 0)
    clickOn(document.body)

    await cells(wrapper)[5].get('[data-testid="card-remove"]').trigger('click')
    expect(cardIn(cells(wrapper)[5]).exists()).toBe(false)
  })

  it('gives up waiting when the drag left no click at all', async () => {
    const wrapper = mountField()
    await placeUnit(wrapper, 0, TITANS)
    // A touch drag sends no click of its own; nothing must be eaten later.
    await dragOffTheField(wrapper, 0)

    // The clock has to stay wound forward for both checks: going back to the
    // real one would put the release inside the window again.
    vi.useFakeTimers()
    try {
      vi.advanceTimersByTime(300)
      expect(clickOn(document.body).defaultPrevented).toBe(false)

      await cells(wrapper)[1].trigger('click')
      expect(picker(wrapper).exists()).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
