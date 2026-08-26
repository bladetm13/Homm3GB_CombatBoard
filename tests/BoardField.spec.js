import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BoardField from '../src/components/BoardField/BoardField.vue'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'

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

/** Clicks a cell, then picks a unit out of the dialog it opens. */
async function placeUnit(wrapper, cellIndex, unit) {
  await cells(wrapper)[cellIndex].trigger('click')
  await wrapper.get(`[data-testid="picker-unit-${unit}"]`).trigger('click')
}

const cells = (wrapper) => wrapper.findAll('[data-testid="board-field-cell"]')

describe('BoardField', () => {
  it('lays out a 4x5 grid by default', () => {
    const wrapper = mountField()
    expect(cells(wrapper)).toHaveLength(20)

    const style = wrapper.get('[data-testid="board-field"]').attributes('style')
    expect(style).toContain('--field-cols: 4')
    expect(style).toContain('--field-rows: 5')
  })

  it('fills the box it is placed in', () => {
    const wrapper = mountField()
    // The size comes from CSS (100%/100%), so assert the contract that matters:
    // the field sets no intrinsic width or height of its own.
    const style = wrapper.get('[data-testid="board-field"]').attributes('style')
    expect(style).not.toMatch(/(^|;)\s*(width|height):/)
  })

  it('takes its dimensions from props', () => {
    const wrapper = mountField({ props: { cols: 3, rows: 2 } })
    expect(cells(wrapper)).toHaveLength(6)
  })

  it('numbers cells row by row, 1-based', () => {
    const wrapper = mountField({ props: { cols: 4, rows: 5 } })
    const all = cells(wrapper)
    const at = (i) => [Number(all[i].attributes('data-row')), Number(all[i].attributes('data-col'))]

    expect(at(0)).toEqual([1, 1])
    expect(at(3)).toEqual([1, 4])
    expect(at(4)).toEqual([2, 1])
    expect(at(19)).toEqual([5, 4])
  })

  it('hands row, col and index to the cell slot', () => {
    const wrapper = mountField({
      props: { cols: 2, rows: 2 },
      slots: { default: '<template #default="{ row, col, index }"><i>{{ row }}:{{ col }}:{{ index }}</i></template>' },
    })
    expect(wrapper.findAll('i').map((n) => n.text())).toEqual(['1:1:0', '1:2:1', '2:1:2', '2:2:3'])
  })

  it('renders slotted content inside the matching cell', () => {
    const wrapper = mountField({
      props: { cols: 2, rows: 2 },
      slots: { default: '<template #default="{ row, col }"><b v-if="row === 2 && col === 1">unit</b></template>' },
    })
    const owner = wrapper.get('b').element.parentElement
    expect(owner.dataset.row).toBe('2')
    expect(owner.dataset.col).toBe('1')
  })

  it('emits the clicked cell', async () => {
    const wrapper = mountField({ props: { cols: 4, rows: 5 } })
    await cells(wrapper)[6].trigger('click')
    expect(wrapper.emitted('cell-click')).toHaveLength(1)
    expect(wrapper.emitted('cell-click')[0][0]).toMatchObject({ index: 6, row: 2, col: 3 })
  })

  it('outlines cells only in debug mode', () => {
    expect(mountField().get('[data-testid="board-field"]').classes()).not.toContain('is-debug')
    expect(
      mountField({ props: { debug: true } }).get('[data-testid="board-field"]').classes(),
    ).toContain('is-debug')
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
})
