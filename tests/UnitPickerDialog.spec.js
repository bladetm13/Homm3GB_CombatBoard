import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UnitPickerDialog from '../src/components/BoardField/UnitPickerDialog.vue'
import { UNITS, UNIT_TYPE, UNIT_TYPE_LABEL } from '../src/components/BoardField/constants'

/**
 * The dialog teleports to `body` so the board's transform cannot reach it, and
 * VTU does not see teleported nodes in the wrapper's own tree — hence the stub.
 * The teleport itself is covered by its own test below.
 */
const open = () =>
  mount(UnitPickerDialog, { attachTo: document.body, global: { stubs: { teleport: true } } })

const openGroup = (wrapper, index) =>
  wrapper.findAll('[data-testid="accordion-header"]')[index].trigger('click')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('UnitPickerDialog', () => {
  it('teleports out of the board, into body', () => {
    const wrapper = mount(UnitPickerDialog, { attachTo: document.body })
    const panel = document.body.querySelector('[data-testid="picker"]')
    expect(panel).not.toBeNull()
    // Rendered outside the component's own element, i.e. really teleported.
    expect(wrapper.element.contains(panel)).toBe(false)
  })

  it('lists one group per unit type, in the order of UNITS', () => {
    const wrapper = open()
    const titles = wrapper.findAll('[data-testid="accordion-header"]').map((h) => h.text())
    const expected = Object.keys(UNITS).map((type) => UNIT_TYPE_LABEL[type])

    expect(titles).toHaveLength(expected.length)
    expected.forEach((label, i) => expect(titles[i]).toContain(label))
  })

  it('opens only the first group by default', () => {
    const wrapper = open()
    const bodies = wrapper.findAll('[data-testid="accordion-body"]')
    expect(bodies).toHaveLength(Object.keys(UNITS).length)
    expect(bodies[0].element.style.display).not.toBe('none')
    for (const body of bodies.slice(1)) expect(body.element.style.display).toBe('none')
  })

  it('renders cards only for the groups that have been opened', async () => {
    const wrapper = open()
    const castle = Object.values(UNITS[UNIT_TYPE.CASTLE])

    // Only the first group is mounted, so the other ~230 images are never fetched.
    expect(wrapper.findAll('[data-testid="card"]')).toHaveLength(castle.length)

    await openGroup(wrapper, 1)
    const second = Object.values(UNITS[Object.keys(UNITS)[1]])
    expect(wrapper.findAll('[data-testid="card"]')).toHaveLength(castle.length + second.length)
  })

  it('renders every unit of an open group as a card, in enum order', () => {
    const wrapper = open()
    const castle = Object.values(UNITS[UNIT_TYPE.CASTLE])
    const rendered = wrapper
      .findAll(`[data-testid^="picker-unit-castle/"]`)
      .map((n) => n.attributes('data-testid').replace('picker-unit-', ''))
    expect(rendered).toEqual(castle)
  })

  it('defers image loading for the cards it does render', () => {
    const img = open().get('[data-testid="card"] img')
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('emits the unit that was clicked', async () => {
    const wrapper = open()
    const unit = UNITS[UNIT_TYPE.TOWER].TITANS_FEW
    await openGroup(wrapper, Object.keys(UNITS).indexOf(UNIT_TYPE.TOWER))
    await wrapper.get(`[data-testid="picker-unit-${unit}"]`).trigger('click')
    expect(wrapper.emitted('select')).toEqual([[unit]])
  })

  it('closes on a click outside the panel', async () => {
    const wrapper = open()
    await wrapper.get('[data-testid="picker-backdrop"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('stays open when the click lands inside the panel', async () => {
    const wrapper = open()
    await wrapper.get('[data-testid="picker"]').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('closes on the close button and on Escape', async () => {
    const wrapper = open()
    await wrapper.get('[data-testid="picker-close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('groups toggle independently', async () => {
    const wrapper = open()
    const bodies = wrapper.findAll('[data-testid="accordion-body"]')

    await openGroup(wrapper, 1)
    expect(bodies[0].element.style.display).not.toBe('none')
    expect(bodies[1].element.style.display).not.toBe('none')

    await openGroup(wrapper, 0)
    expect(bodies[0].element.style.display).toBe('none')
    expect(bodies[1].element.style.display).not.toBe('none')
  })
})
