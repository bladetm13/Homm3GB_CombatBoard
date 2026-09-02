import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UnitPickerDialog from '../src/components/BoardField/UnitPickerDialog.vue'
import { UNITS, UNIT_TYPE, UNIT_TYPE_LABEL } from '../src/components/BoardField/constants'
import {
  CUSTOM_SCOPE,
  addCustomAsset,
  clearCustomAssets,
} from '../src/components/BoardField/customAssets'
import { clearPickerMemory } from '../src/components/BoardField/pickerMemory'

/**
 * The dialog teleports to `body` so the board's transform cannot reach it, and
 * VTU does not see teleported nodes in the wrapper's own tree — hence the stub.
 * The teleport itself is covered by its own test below.
 */
const open = () =>
  mount(UnitPickerDialog, {
    attachTo: document.body,
    global: { stubs: { teleport: true } },
  })

/*
  Every picker opens with a Custom section above its lists, so the unit groups
  start one section in; these two count from the first of them.
*/
const openGroup = (wrapper, index) =>
  wrapper.findAll('[data-testid="accordion-header"]')[index + 1].trigger('click')

const groupBodies = (wrapper) => wrapper.findAll('[data-testid="accordion-body"]').slice(1)

const groupTitles = (wrapper) =>
  wrapper.findAll('[data-testid="accordion-header"]').slice(1).map((h) => h.text())

afterEach(() => {
  document.body.innerHTML = ''
})

// Every picker remembers where it was left; each test starts from a clean one.
beforeEach(clearPickerMemory)
beforeEach(clearCustomAssets)

const image = (name) => new File(['art'], name, { type: 'image/png' })

describe('UnitPickerDialog', () => {
  it('teleports out of the board, into body', () => {
    const wrapper = mount(UnitPickerDialog, { attachTo: document.body })
    const panel = document.body.querySelector('[data-testid="picker"]')
    expect(panel).not.toBeNull()
    // Rendered outside the component's own element, i.e. really teleported.
    expect(wrapper.element.contains(panel)).toBe(false)
  })

  it('opens with a Custom section, above the towns and open', () => {
    const wrapper = open()
    const headers = wrapper.findAll('[data-testid="accordion-header"]')
    const bodies = wrapper.findAll('[data-testid="accordion-body"]')

    expect(headers[0].text()).toContain('Custom')
    expect(bodies[0].element.style.display).not.toBe('none')
    expect(wrapper.find('[data-testid="picker-custom-add"]').exists()).toBe(true)
  })

  it('offers a card the user brought in, and emits it like any other', async () => {
    const custom = addCustomAsset(CUSTOM_SCOPE.UNITS, image('Angry Peasant.png'))
    const wrapper = open()

    await wrapper.get(`[data-testid="picker-unit-${custom.id}"]`).trigger('click')
    expect(wrapper.emitted('select')).toEqual([[custom.id]])
  })

  it('lists one group per unit type, in the order of UNITS', () => {
    const wrapper = open()
    const titles = groupTitles(wrapper)
    const expected = Object.keys(UNITS).map((type) => UNIT_TYPE_LABEL[type])

    expect(titles).toHaveLength(expected.length)
    expected.forEach((label, i) => expect(titles[i]).toContain(label))
  })

  it('opens only the first group by default', () => {
    const wrapper = open()
    const bodies = groupBodies(wrapper)
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

  it('puts the group list inside a ScrollBox, which owns the scrollbar', () => {
    open()
    // Scroll behaviour itself is covered by ScrollBox.spec.js.
    expect(document.querySelectorAll('[data-testid="scrollbox"]')).toHaveLength(1)
    expect(document.querySelector('[data-testid="scrollbox-viewport"] .accordion')).not.toBeNull()
  })

  it('groups toggle independently', async () => {
    const wrapper = open()
    const bodies = groupBodies(wrapper)

    await openGroup(wrapper, 1)
    expect(bodies[0].element.style.display).not.toBe('none')
    expect(bodies[1].element.style.display).not.toBe('none')

    await openGroup(wrapper, 0)
    expect(bodies[0].element.style.display).toBe('none')
    expect(bodies[1].element.style.display).not.toBe('none')
  })

  it('marks every cell with the plus that says what the click does', () => {
    const wrapper = open()
    const castle = Object.values(UNITS[UNIT_TYPE.CASTLE])
    const hints = wrapper.findAll('.picker__add')

    expect(hints).toHaveLength(castle.length)
    // Inert, like the board's: the cell button around it takes the click.
    for (const hint of hints) expect(hint.attributes('aria-hidden')).toBe('true')
  })

  it('reads a card instead of picking it when the eye is clicked', async () => {
    const wrapper = open()
    const unit = UNITS[UNIT_TYPE.CASTLE].HALBERDIERS_FEW
    const cell = wrapper.get(`[data-testid="picker-unit-${unit}"]`)

    await cell.get('[data-testid="card-preview-open"]').trigger('click')

    expect(wrapper.find('[data-testid="card-preview"]').exists()).toBe(true)
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('closes the preview on Escape, and leaves the picker open under it', async () => {
    const wrapper = open()
    const unit = UNITS[UNIT_TYPE.CASTLE].HALBERDIERS_FEW
    await wrapper
      .get(`[data-testid="picker-unit-${unit}"] [data-testid="card-preview-open"]`)
      .trigger('click')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="card-preview"]').exists()).toBe(false)
    expect(wrapper.emitted('close')).toBeUndefined()

    // ...and the next Escape reaches the picker again.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('opens again with the groups the user left open', async () => {
    const first = open()
    await openGroup(first, 3)
    await openGroup(first, 0) // ...and Castle closed behind them.
    first.unmount()

    const second = open()
    const bodies = groupBodies(second)
    expect(bodies[0].element.style.display).toBe('none')
    expect(bodies[3].element.style.display).not.toBe('none')
    expect(bodies[1].element.style.display).toBe('none')
  })

  it('still mounts only what is open, however much is remembered', async () => {
    const first = open()
    await openGroup(first, 1)
    first.unmount()

    const second = open()
    const first_ = Object.values(UNITS[UNIT_TYPE.CASTLE])
    const second_ = Object.values(UNITS[Object.keys(UNITS)[1]])
    expect(second.findAll('[data-testid="card"]')).toHaveLength(first_.length + second_.length)
  })
})
