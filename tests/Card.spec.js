import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Card from '../src/components/BoardField/Card.vue'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'

const UNIT = UNITS[UNIT_TYPE.TOWER].TITANS_FEW
const FOIL_UNIT = UNITS[UNIT_TYPE.TOWER].TITANS_PACK

/** The preview teleports to body, so it is stubbed out of the way by default. */
const mountCard = (props) =>
  mount(Card, {
    attachTo: document.body,
    props: { unit: UNIT, ...props },
    global: { stubs: { teleport: true } },
  })

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Card', () => {
  it('renders the artwork the unit points at', () => {
    const wrapper = mount(Card, { props: { unit: UNIT } })
    const img = wrapper.get('img')
    expect(img.attributes('src')).toContain('titans_few')
    expect(img.attributes('alt')).toBe('Titans Few')
    expect(img.attributes('draggable')).toBe('false')
  })

  it('has no remove control unless removable', () => {
    const wrapper = mount(Card, { props: { unit: UNIT } })
    expect(wrapper.find('[data-testid="card-remove"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="card"]').classes()).not.toContain('is-removable')
  })

  it('shows the remove control when removable', () => {
    const wrapper = mount(Card, { props: { unit: UNIT, removable: true } })
    expect(wrapper.get('[data-testid="card"]').classes()).toContain('is-removable')
    expect(wrapper.get('[data-testid="card-remove"]').attributes('aria-label')).toBe(
      'Remove Titans Few',
    )
  })

  it('leaves a non-pack card without the foil overlay', () => {
    const wrapper = mount(Card, { props: { unit: UNIT } })
    expect(wrapper.get('[data-testid="card"]').classes()).not.toContain('is-foil')
    expect(wrapper.find('[data-testid="card-foil"]').exists()).toBe(false)
  })

  it('gives a pack card a foil overlay masked by its own artwork', () => {
    const wrapper = mount(Card, { props: { unit: FOIL_UNIT } })
    expect(wrapper.get('[data-testid="card"]').classes()).toContain('is-foil')
    const foil = wrapper.get('[data-testid="card-foil"]')
    // Decorative: the artwork's alt text already names the unit.
    expect(foil.attributes('aria-hidden')).toBe('true')
    expect(foil.attributes('style')).toContain(wrapper.get('img').attributes('src'))
  })

  it('emits remove without letting the click reach the cell underneath', async () => {
    const cellClick = []
    const wrapper = mount(
      {
        components: { Card },
        template: `<div @click="onCell"><Card :unit="unit" removable @remove="onRemove" /></div>`,
        data: () => ({ unit: UNIT }),
        methods: {
          onCell: () => cellClick.push('cell'),
          onRemove: () => cellClick.push('remove'),
        },
      },
      { attachTo: document.body },
    )

    await wrapper.get('[data-testid="card-remove"]').trigger('click')
    // Only the remove handler ran: the cell must not also open its picker.
    expect(cellClick).toEqual(['remove'])
  })

  it('carries the eye whether or not it is removable', () => {
    expect(mountCard().get('[data-testid="card-preview-open"]').attributes('aria-label')).toBe(
      'Preview Titans Few',
    )
    expect(mountCard({ removable: true }).find('[data-testid="card-preview-open"]').exists()).toBe(
      true,
    )
  })

  it('opens the card at full size from the eye, and closes it again', async () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-testid="card-preview"]').exists()).toBe(false)

    await wrapper.get('[data-testid="card-preview-open"]').trigger('click')
    const preview = wrapper.get('[data-testid="card-preview"]')
    expect(preview.get('img').attributes('src')).toContain('titans_few')

    await wrapper.get('[data-testid="card-preview-close"]').trigger('click')
    expect(wrapper.find('[data-testid="card-preview"]').exists()).toBe(false)
  })

  it('opens the preview without letting the click reach the cell underneath', async () => {
    const clicks = []
    const wrapper = mount(
      {
        components: { Card },
        template: `<div @click="clicks.push('cell')"><Card :unit="unit" /></div>`,
        data: () => ({ unit: UNIT, clicks }),
      },
      { attachTo: document.body, global: { stubs: { teleport: true } } },
    )

    await wrapper.get('[data-testid="card-preview-open"]').trigger('click')
    expect(clicks).toEqual([])
    expect(wrapper.find('[data-testid="card-preview"]').exists()).toBe(true)
  })
})
