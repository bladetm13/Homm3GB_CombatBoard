import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CardPreviewDialog from '../src/components/BoardField/CardPreviewDialog.vue'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'

const UNIT = UNITS[UNIT_TYPE.TOWER].TITANS_FEW
const FOIL_UNIT = UNITS[UNIT_TYPE.TOWER].TITANS_PACK

const open = (unit = UNIT) =>
  mount(CardPreviewDialog, {
    attachTo: document.body,
    props: { unit },
    global: { stubs: { teleport: true } },
  })

afterEach(() => {
  document.body.innerHTML = ''
})

describe('CardPreviewDialog', () => {
  it('teleports out of the board, into body', () => {
    const wrapper = mount(CardPreviewDialog, { attachTo: document.body, props: { unit: UNIT } })
    const panel = document.body.querySelector('[data-testid="card-preview"]')
    expect(panel).not.toBeNull()
    expect(wrapper.element.contains(panel)).toBe(false)
  })

  it('shows the artwork at full size, named', () => {
    const wrapper = open()
    const img = wrapper.get('[data-testid="card-preview"] img')

    expect(img.attributes('src')).toContain('titans_few')
    expect(img.attributes('alt')).toBe('Titans Few')
    // Eager: the point of opening it is to read it now.
    expect(img.attributes('loading')).toBeUndefined()
    expect(wrapper.get('[data-testid="card-preview"]').attributes('aria-label')).toBe('Titans Few')
    expect(wrapper.text()).toContain('Titans Few')
  })

  it('closes on the backdrop, on the close button and on Escape', async () => {
    const wrapper = open()
    await wrapper.get('[data-testid="card-preview-backdrop"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.get('[data-testid="card-preview-close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(2)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('ignores keys that are not Escape', () => {
    const wrapper = open()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('keeps a pack card holographic at full size', () => {
    const wrapper = open(FOIL_UNIT)
    const foil = wrapper.get('[data-testid="card-foil"]')

    // Masked by the very artwork it is laid over, so the two stay in register.
    expect(foil.attributes('style')).toContain(wrapper.get('img').attributes('src'))
    expect(foil.attributes('aria-hidden')).toBe('true')
  })

  it('leaves a plain card plain', () => {
    expect(open().find('[data-testid="card-foil"]').exists()).toBe(false)
  })
})
