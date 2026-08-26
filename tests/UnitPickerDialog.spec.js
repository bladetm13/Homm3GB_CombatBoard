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

  it('opens every group by default', () => {
    const wrapper = open()
    const bodies = wrapper.findAll('[data-testid="accordion-body"]')
    expect(bodies).toHaveLength(Object.keys(UNITS).length)
    for (const body of bodies) expect(body.element.style.display).not.toBe('none')
  })

  it('renders every unit as a card, in enum order within a group', () => {
    const wrapper = open()
    expect(wrapper.findAll('[data-testid="card"]')).toHaveLength(243)

    const castle = Object.values(UNITS[UNIT_TYPE.CASTLE])
    const rendered = wrapper
      .findAll(`[data-testid^="picker-unit-castle/"]`)
      .map((n) => n.attributes('data-testid').replace('picker-unit-', ''))
    expect(rendered).toEqual(castle)
  })

  it('emits the unit that was clicked', async () => {
    const wrapper = open()
    const unit = UNITS[UNIT_TYPE.TOWER].TITANS_FEW
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

  it('groups can be collapsed independently', async () => {
    const wrapper = open()
    const headers = wrapper.findAll('[data-testid="accordion-header"]')
    const bodies = wrapper.findAll('[data-testid="accordion-body"]')

    await headers[0].trigger('click')
    expect(bodies[0].element.style.display).toBe('none')
    expect(bodies[1].element.style.display).not.toBe('none')
  })
})
