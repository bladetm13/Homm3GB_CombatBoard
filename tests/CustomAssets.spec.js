import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CustomAssets from '../src/components/BoardField/CustomAssets.vue'
import {
  CUSTOM_SCOPE,
  addCustomAsset,
  clearCustomAssets,
} from '../src/components/BoardField/customAssets'

const file = (name = 'my-hero.png') => new File(['picture'], name, { type: 'image/png' })

/*
  On the page rather than beside it: a carry listens on `window`, and the click
  it has to eat only reaches one from a tree the document actually holds.
*/
const open = (scope = CUSTOM_SCOPE.UNITS, testid = 'picker') =>
  mount(CustomAssets, { attachTo: document.body, props: { scope, testid } })

/** What the browser's file dialog would hand back, had one really opened. */
async function pick(wrapper, ...picked) {
  const files = picked.length ? picked : [file()]
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
}

/** One pointer, spelled out the way a real one arrives; see `BoardField.spec`. */
const POINTER = 1

/** The pictures the section shows, in the order it shows them. */
const platesIn = (wrapper) =>
  wrapper.findAll('[data-custom-id]').map((plate) => plate.attributes('data-custom-id'))

const gripIn = (wrapper, id, testid = 'picker') =>
  wrapper.get(`[data-testid="${testid}-custom-move-${id}"]`)

/** Takes hold of a picture by its grip. Nothing is in the air yet. */
const grab = (grip, init = {}) =>
  grip.trigger('pointerdown', {
    pointerId: POINTER,
    pointerType: 'mouse',
    button: 0,
    buttons: 1,
    isPrimary: true,
    clientX: 0,
    clientY: 0,
    ...init,
  })

/** A move of the pointer itself, which is what the page listens for. */
async function movePointer(x, y = 0) {
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerId: POINTER,
      pointerType: 'mouse',
      buttons: 1,
      clientX: x,
      clientY: y,
    }),
  )
  await nextTick()
}

async function release() {
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: POINTER }))
  await nextTick()
}

/** Press, carry past the threshold, hold over another plate and let go. */
async function carry(wrapper, from, onto, testid = 'picker') {
  await grab(gripIn(wrapper, from, testid))
  await movePointer(40)
  if (onto) await wrapper.get(`[data-custom-id="${onto}"]`).trigger('pointermove')
  await release()
}

const ghost = () => document.body.querySelector('[data-testid="picker-custom-ghost"]')

enableAutoUnmount(afterEach)
afterEach(clearCustomAssets)

describe('CustomAssets', () => {
  it('is a section of its own, headed Custom', () => {
    const wrapper = open()
    expect(wrapper.get('[data-testid="accordion-header"]').text()).toContain('Custom')
    expect(wrapper.get('[data-testid="picker-group-custom"]').exists()).toBe(true)
  })

  it('offers an empty card-shaped plate with a plus, and nothing else at first', () => {
    const wrapper = open()
    const plate = wrapper.get('[data-testid="picker-custom-add"]')

    expect(plate.attributes('aria-label')).toBe('Add custom images')
    expect(plate.find('svg').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="picker-unit-"]')).toHaveLength(0)
    expect(wrapper.get('[data-testid="accordion-header"]').text()).toContain('0')
  })

  it('shapes the plate like the thing it files — a card, or a token', () => {
    expect(open().get('.custom__grid').classes()).toContain('custom__grid--cards')

    for (const scope of [CUSTOM_SCOPE.FIELD_TOKENS, CUSTOM_SCOPE.UNIT_TOKENS]) {
      expect(open(scope, 'token-picker').get('.custom__grid').classes()).toContain(
        'custom__grid--tokens',
      )
    }
  })

  it('says what shape a picture should be, and that it is kept in the tab only', () => {
    const cards = open().get('[data-testid="picker-custom-info"]').text()
    expect(cards).toContain('2090×2900')
    expect(cards).toContain('209 : 290')
    expect(cards).toMatch(/reload forgets them/)

    const tokens = open(CUSTOM_SCOPE.UNIT_TOKENS, 'token-picker')
      .get('[data-testid="token-picker-custom-info"]')
      .text()
    expect(tokens).toContain('256×256')
    expect(tokens).toContain('square')
  })

  it('takes any image the browser can read, through the plate', async () => {
    const wrapper = open()
    const input = wrapper.get('input[type="file"]')
    expect(input.attributes('accept')).toBe('image/*')

    const clicked = vi.spyOn(input.element, 'click')
    await wrapper.get('[data-testid="picker-custom-add"]').trigger('click')
    expect(clicked).toHaveBeenCalled()
  })

  it('shows a picked picture in the section, named after its file', async () => {
    const wrapper = open()
    await pick(wrapper, file('Angry Peasant.png'))

    const entry = wrapper.get('[data-testid="picker-unit-custom/units/1"]')
    expect(entry.get('[data-testid="card"] img').attributes('alt')).toBe('Angry Peasant')
    expect(wrapper.get('[data-testid="accordion-header"]').text()).toContain('1')
  })

  it('files a whole batch at once, in the order the dialog handed it over', async () => {
    const wrapper = open()
    await pick(wrapper, file('Imp.png'), file('Gog.png'), file('Efreet.png'))

    const alt = (id) =>
      wrapper.get(`[data-testid="picker-unit-custom/units/${id}"] [data-testid="card"] img`)
        .attributes('alt')

    expect([alt(1), alt(2), alt(3)]).toEqual(['Imp', 'Gog', 'Efreet'])
    expect(wrapper.get('[data-testid="accordion-header"]').text()).toContain('3')
  })

  it('emits a picked picture the way the built-in lists emit theirs', async () => {
    const wrapper = open()
    await pick(wrapper)
    await wrapper.get('[data-testid="picker-unit-custom/units/1"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['custom/units/1']])
  })

  it('names a token entry the token picker’s way, and draws it flat', async () => {
    const wrapper = open(CUSTOM_SCOPE.FIELD_TOKENS, 'token-picker')
    await pick(wrapper, file('Lava.png'))

    const entry = wrapper.get('[data-testid="token-picker-token-custom/field_tokens/1"]')
    expect(entry.get('img').attributes('alt')).toBe('Lava')
    // A token is not a card: no preview eye, no removal cross.
    expect(entry.find('[data-testid="card"]').exists()).toBe(false)

    await entry.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['custom/field_tokens/1']])
  })

  it('takes a picture back off the list through its cross', async () => {
    const wrapper = open()
    await pick(wrapper, file('Angry Peasant.png'))

    const cross = wrapper.get('[data-testid="picker-custom-remove-custom/units/1"]')
    expect(cross.attributes('aria-label')).toBe('Remove Angry Peasant')

    await cross.trigger('click')
    expect(wrapper.find('[data-testid="picker-unit-custom/units/1"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="accordion-header"]').text()).toContain('0')
    // The cross removes; it never picks what it removed.
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('crosses a token off the same way, leaving the rest of the list alone', async () => {
    const wrapper = open(CUSTOM_SCOPE.UNIT_TOKENS, 'token-picker')
    await pick(wrapper, file('Poison.png'))
    await pick(wrapper, file('Lava.png'))

    await wrapper
      .get('[data-testid="token-picker-custom-remove-custom/unit_tokens/1"]')
      .trigger('click')

    const left = wrapper.findAll('[data-testid^="token-picker-token-"]')
    expect(left).toHaveLength(1)
    expect(left[0].attributes('data-testid')).toBe(
      'token-picker-token-custom/unit_tokens/2',
    )
  })

  it('carries a picture to the plate it is let go over', async () => {
    const wrapper = open()
    await pick(wrapper, file('Imp.png'), file('Gog.png'), file('Efreet.png'))

    await carry(wrapper, 'custom/units/1', 'custom/units/3')

    expect(platesIn(wrapper)).toEqual([
      'custom/units/2',
      'custom/units/3',
      'custom/units/1',
    ])
    // The grip carries; it never picks what it carried.
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('lifts a ghost past the threshold, and marks the plate it would take', async () => {
    const wrapper = open()
    await pick(wrapper, file('Imp.png'), file('Gog.png'))
    const plate = (id) => wrapper.get(`[data-custom-id="${id}"]`)

    await grab(gripIn(wrapper, 'custom/units/1'))
    // A press that has not travelled is still a press, not a carry.
    await movePointer(2)
    expect(ghost()).toBe(null)

    await movePointer(40)
    expect(ghost()).not.toBe(null)
    expect(plate('custom/units/1').attributes('data-carried')).toBe('true')

    await plate('custom/units/2').trigger('pointermove')
    expect(plate('custom/units/2').attributes('data-drop')).toBe('ok')
    // The plate it came from is never a place to put it back into.
    expect(plate('custom/units/1').attributes('data-drop')).toBeUndefined()

    await release()
    expect(ghost()).toBe(null)
  })

  it('puts the picture back when it is let go over nothing', async () => {
    const wrapper = open()
    await pick(wrapper, file('Imp.png'), file('Gog.png'))

    await grab(gripIn(wrapper, 'custom/units/1'))
    await movePointer(40)
    await wrapper.get(`[data-custom-id="custom/units/2"]`).trigger('pointermove')
    // Off the grid entirely: there is no place under the pointer to take.
    await wrapper.get('.custom__grid').trigger('pointerleave')
    await release()

    expect(platesIn(wrapper)).toEqual(['custom/units/1', 'custom/units/2'])
  })

  it('eats the click a carry that ends where it began leaves behind', async () => {
    const wrapper = open()
    await pick(wrapper, file('Imp.png'), file('Gog.png'))

    await carry(wrapper, 'custom/units/1', 'custom/units/1')
    await wrapper.get('[data-custom-id="custom/units/1"]').trigger('click')

    expect(platesIn(wrapper)).toEqual(['custom/units/1', 'custom/units/2'])
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('moves a picture one place along for whoever is on a keyboard', async () => {
    const wrapper = open(CUSTOM_SCOPE.FIELD_TOKENS, 'token-picker')
    await pick(wrapper, file('Lava.png'), file('Poison.png'))
    const grip = gripIn(wrapper, 'custom/field_tokens/1', 'token-picker')
    expect(grip.attributes('aria-label')).toBe('Move Lava')

    await grip.trigger('keydown.right')
    expect(platesIn(wrapper)).toEqual([
      'custom/field_tokens/2',
      'custom/field_tokens/1',
    ])

    await grip.trigger('keydown.left')
    expect(platesIn(wrapper)).toEqual([
      'custom/field_tokens/1',
      'custom/field_tokens/2',
    ])

    // The ends of the list are the ends of it: nothing falls off either one.
    await grip.trigger('keydown.left')
    expect(platesIn(wrapper)).toEqual([
      'custom/field_tokens/1',
      'custom/field_tokens/2',
    ])
  })

  it('shows only what was filed under its own scope', async () => {
    addCustomAsset(CUSTOM_SCOPE.UNIT_TOKENS, file())
    const wrapper = open(CUSTOM_SCOPE.FIELD_TOKENS, 'token-picker')
    expect(wrapper.findAll('[data-testid^="token-picker-token-"]')).toHaveLength(0)

    await pick(wrapper)
    expect(wrapper.findAll('[data-testid^="token-picker-token-"]')).toHaveLength(1)
  })

  it('keeps what was added while the dialog was shut', async () => {
    const first = open()
    await pick(first)
    first.unmount()

    expect(open().findAll('[data-testid^="picker-unit-"]')).toHaveLength(1)
  })

  it('reports its own open and close, so the picker can remember it', async () => {
    const wrapper = open()
    await wrapper.get('[data-testid="accordion-header"]').trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([[false]])
  })
})
