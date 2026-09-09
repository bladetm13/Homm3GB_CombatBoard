import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Card from '../src/components/BoardField/Card.vue'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'

const UNIT = UNITS[UNIT_TYPE.TOWER].TITANS_FEW
const FOIL_UNIT = UNITS[UNIT_TYPE.TOWER].TITANS_PACK
/** A neutral: one card, one printing, and so nothing to be flipped to. */
const LONE_UNIT = UNITS[UNIT_TYPE.NEUTRAL_AZURE].AZURE_DRAGONS

/** The preview teleports to body, so it is stubbed out of the way by default. */
const mountCard = (props) =>
  mount(Card, {
    attachTo: document.body,
    props: { unit: UNIT, ...props },
    global: { stubs: { teleport: true } },
  })

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Half the turn, which is the whole of what `Card` times. */
const HALF_TURN_MS = 130

const art = (wrapper) => wrapper.get('img').attributes('src')
const classesOf = (wrapper) => wrapper.get('[data-testid="card"]').classes()

/** Clicks the arrow, then hands back the card the board would have laid down. */
async function turnOver(wrapper, to) {
  await wrapper.get('[data-testid="card-flip"]').trigger('click')
  await wrapper.setProps({ unit: to })
}

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

  it('has no flip control unless flippable', () => {
    expect(mountCard().find('[data-testid="card-flip"]').exists()).toBe(false)
    expect(mountCard({ removable: true }).find('[data-testid="card-flip"]').exists()).toBe(false)
  })

  it('offers the other printing of the card, and names it', () => {
    const flip = mountCard({ flippable: true }).get('[data-testid="card-flip"]')
    expect(flip.attributes('data-flip-to')).toBe(FOIL_UNIT)
    expect(flip.attributes('aria-label')).toBe('Flip Titans Few to Titans Pack')
  })

  it('leaves a card with no other printing without a flip control', () => {
    // A neutral ships one card and has nothing to be turned over to.
    const lone = mount(Card, { props: { unit: LONE_UNIT, flippable: true } })
    expect(lone.find('[data-testid="card-flip"]').exists()).toBe(false)
  })

  it('points the arrow at the printing the flip lands on', () => {
    const few = mountCard({ flippable: true }).get('[data-testid="card-flip"] path')
    const pack = mountCard({ unit: FOIL_UNIT, flippable: true }).get('[data-testid="card-flip"] path')

    // A few points on to the large stack, a pack back to the small one — read
    // off the two arrowheads, which is the whole of the difference.
    expect(few.attributes('d')).toContain('M8 12h7.4')
    expect(pack.attributes('d')).toContain('M16 12H8.6')
  })

  it('emits flip with the card to lay down, without opening the cell underneath', async () => {
    const clicks = []
    const wrapper = mount(
      {
        components: { Card },
        template: `<div @click="clicks.push('cell')"><Card :unit="unit" flippable @flip="onFlip" /></div>`,
        data: () => ({ unit: UNIT, clicks }),
        methods: { onFlip: (to) => clicks.push(to) },
      },
      { attachTo: document.body, global: { stubs: { teleport: true } } },
    )

    await wrapper.get('[data-testid="card-flip"]').trigger('click')
    expect(clicks).toEqual([FOIL_UNIT])
  })

  it('turns the card over rather than swapping the picture under the user', async () => {
    vi.useFakeTimers()
    const wrapper = mountCard({ flippable: true })
    await turnOver(wrapper, FOIL_UNIT)

    // Turning the way the arrow pointed, and still showing the printing it is
    // turning away from: the swap belongs at the midpoint, edge-on.
    expect(classesOf(wrapper)).toContain('is-turning-forward')
    expect(art(wrapper)).toContain('titans_few')
    expect(classesOf(wrapper)).not.toContain('is-foil')

    vi.advanceTimersByTime(HALF_TURN_MS)
    await nextTick()
    // Half way: the artwork has changed, and the foil with it, behind an edge
    // that has no width to show either.
    expect(art(wrapper)).toContain('titans_pack')
    expect(classesOf(wrapper)).toContain('is-foil')
    expect(classesOf(wrapper)).toContain('is-turning-forward')

    vi.advanceTimersByTime(HALF_TURN_MS)
    await nextTick()
    expect(classesOf(wrapper)).not.toContain('is-turning-forward')
  })

  it('turns back the way it came, from the other printing', async () => {
    vi.useFakeTimers()
    const wrapper = mountCard({ unit: FOIL_UNIT, flippable: true })
    await turnOver(wrapper, UNIT)

    expect(classesOf(wrapper)).toContain('is-turning-back')
    expect(classesOf(wrapper)).not.toContain('is-turning-forward')

    vi.advanceTimersByTime(HALF_TURN_MS * 2)
    await nextTick()
    expect(art(wrapper)).toContain('titans_few')
    expect(classesOf(wrapper).join(' ')).not.toContain('is-turning')
  })

  it('lands on the card it was turned to even where nothing was drawn', async () => {
    vi.useFakeTimers()
    const wrapper = mountCard({ flippable: true })
    await turnOver(wrapper, FOIL_UNIT)

    // The rotation is CSS and may never have run; the printing is not its to
    // decide, so the timers land the card whatever was or was not painted.
    vi.advanceTimersByTime(HALF_TURN_MS * 2)
    await nextTick()
    expect(art(wrapper)).toContain('titans_pack')
  })

  it('does not turn a card that was simply replaced by another', async () => {
    vi.useFakeTimers()
    const wrapper = mountCard({ flippable: true })
    // The cell was given a different card outright — not this card, turned over.
    await wrapper.setProps({ unit: UNITS[UNIT_TYPE.CASTLE].ARCHANGELS_PACK })

    expect(classesOf(wrapper).join(' ')).not.toContain('is-turning')
    expect(art(wrapper)).toContain('archangels_pack')
  })

  it('hands over the other printing at once when motion is unwelcome', async () => {
    vi.useFakeTimers()
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true })
    const wrapper = mountCard({ flippable: true })
    await turnOver(wrapper, FOIL_UNIT)

    // No turn to sit through, and so nothing waiting on a timer to undo.
    expect(classesOf(wrapper).join(' ')).not.toContain('is-turning')
    expect(art(wrapper)).toContain('titans_pack')
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
