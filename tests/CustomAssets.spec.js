import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomAssets from '../src/components/BoardField/CustomAssets.vue'
import {
  CUSTOM_SCOPE,
  addCustomAsset,
  clearCustomAssets,
} from '../src/components/BoardField/customAssets'

const file = (name = 'my-hero.png') => new File(['picture'], name, { type: 'image/png' })

const open = (scope = CUSTOM_SCOPE.UNITS, testid = 'picker') =>
  mount(CustomAssets, { props: { scope, testid } })

/** What the browser's file dialog would hand back, had one really opened. */
async function pick(wrapper, picked = file()) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [picked], configurable: true })
  await input.trigger('change')
}

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

    expect(plate.attributes('aria-label')).toBe('Add a custom image')
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
