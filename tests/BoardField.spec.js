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

/**
 * Clicks a cell, then picks a unit out of the dialog it opens. The picker only
 * mounts the groups that are open, so the unit's own group is expanded first.
 */
async function placeUnit(wrapper, cellIndex, unit) {
  await cells(wrapper)[cellIndex].trigger('click')
  if (!wrapper.find(`[data-testid="picker-unit-${unit}"]`).exists()) {
    const group = Object.keys(UNITS).indexOf(unit.slice(0, unit.indexOf('/')))
    await wrapper.findAll('[data-testid="accordion-header"]')[group].trigger('click')
  }
  await wrapper.get(`[data-testid="picker-unit-${unit}"]`).trigger('click')
}

const cells = (wrapper) => wrapper.findAll('[data-testid="board-field-cell"]')

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
