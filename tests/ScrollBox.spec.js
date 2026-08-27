import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ScrollBox from '../src/components/ScrollBox.vue'

/**
 * happy-dom reports zero layout, so every test states the geometry it wants.
 * `scrollTop` has to stay writable: the component scrolls by assigning to it and
 * then reading it back, exactly as it does in a browser.
 */
const setGeometry = (wrapper, { scrollTop = 0, scrollHeight, clientHeight }) => {
  const el = wrapper.get('[data-testid="scrollbox-viewport"]').element
  Object.defineProperties(el, {
    scrollTop: { value: scrollTop, writable: true, configurable: true },
    scrollHeight: { value: scrollHeight, configurable: true },
    clientHeight: { value: clientHeight, configurable: true },
  })
  wrapper.vm.measure()
  return el
}

const mountBox = (slot = '<p>content</p>') =>
  mount(ScrollBox, { slots: { default: slot }, attachTo: document.body })

const thumb = (wrapper) => wrapper.get('[data-testid="scrollbox-thumb"]')
const px = (wrapper, prop) => thumb(wrapper).element.style[prop]

describe('ScrollBox', () => {
  it('renders whatever it is given', () => {
    const wrapper = mountBox('<p data-testid="slotted">hello</p>')
    expect(wrapper.get('[data-testid="slotted"]').text()).toBe('hello')
  })

  it('hides the rail when the content fits', async () => {
    const wrapper = mountBox()
    setGeometry(wrapper, { scrollHeight: 400, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="scrollbox-track"]').element.style.display).toBe('none')
  })

  it('shows the rail once there is somewhere to scroll', async () => {
    const wrapper = mountBox()
    setGeometry(wrapper, { scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="scrollbox-track"]').element.style.display).not.toBe('none')
  })

  it('sizes the thumb in proportion to how much is visible', async () => {
    const wrapper = mountBox()
    // A fifth of the content is on screen, so the thumb is a fifth of the rail.
    setGeometry(wrapper, { scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(px(wrapper, 'height')).toBe('80px')
  })

  it('never shrinks the thumb below the grabbable minimum', async () => {
    const wrapper = mountBox()
    // Proportionally this would be 0.1px — unusable.
    setGeometry(wrapper, { scrollHeight: 100000, clientHeight: 100 })
    await wrapper.vm.$nextTick()
    expect(px(wrapper, 'height')).toBe('32px')
  })

  it('places the thumb where the content is', async () => {
    const wrapper = mountBox()
    setGeometry(wrapper, { scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(px(wrapper, 'transform')).toBe('translateY(0px)')

    // Half way down 1600px of travel, over 320px of rail travel.
    setGeometry(wrapper, { scrollTop: 800, scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(px(wrapper, 'transform')).toBe('translateY(160px)')

    setGeometry(wrapper, { scrollTop: 1600, scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(px(wrapper, 'transform')).toBe('translateY(320px)')
  })

  it('scrolls the content when the thumb is dragged', async () => {
    const wrapper = mountBox()
    const el = setGeometry(wrapper, { scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()

    await thumb(wrapper).trigger('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0 })
    // 80 of 320 rail px is a quarter, i.e. 400 of the 1600 scrollable px.
    await thumb(wrapper).trigger('pointermove', { pointerId: 1, clientY: 80 })
    expect(el.scrollTop).toBe(400)

    await thumb(wrapper).trigger('pointermove', { pointerId: 1, clientY: 160 })
    expect(el.scrollTop).toBe(800)
  })

  it('marks the thumb while it is held', async () => {
    const wrapper = mountBox()
    setGeometry(wrapper, { scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()

    expect(thumb(wrapper).classes()).not.toContain('is-dragging')
    await thumb(wrapper).trigger('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0 })
    expect(thumb(wrapper).classes()).toContain('is-dragging')
    await thumb(wrapper).trigger('pointerup', { pointerId: 1 })
    expect(thumb(wrapper).classes()).not.toContain('is-dragging')
  })

  it('clamps a drag at both ends instead of overscrolling', async () => {
    const wrapper = mountBox()
    const el = setGeometry(wrapper, { scrollTop: 800, scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()

    await thumb(wrapper).trigger('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0 })
    await thumb(wrapper).trigger('pointermove', { pointerId: 1, clientY: 5000 })
    expect(el.scrollTop).toBe(1600)

    await thumb(wrapper).trigger('pointermove', { pointerId: 1, clientY: -5000 })
    expect(el.scrollTop).toBe(0)
  })

  it('ignores a drag that never started', async () => {
    const wrapper = mountBox()
    const el = setGeometry(wrapper, { scrollTop: 200, scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()

    await thumb(wrapper).trigger('pointermove', { pointerId: 1, clientY: 500 })
    expect(el.scrollTop).toBe(200)
  })

  it('ignores a right-click on the thumb', async () => {
    const wrapper = mountBox()
    setGeometry(wrapper, { scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()

    await thumb(wrapper).trigger('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 2 })
    expect(thumb(wrapper).classes()).not.toContain('is-dragging')
  })

  it('pages towards a click on the empty rail', async () => {
    const wrapper = mountBox()
    const el = setGeometry(wrapper, { scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    const track = wrapper.get('[data-testid="scrollbox-track"]')

    // Below the thumb: forward one near-page (400 * 0.9).
    await track.trigger('pointerdown', { clientY: 300 })
    expect(el.scrollTop).toBe(360)

    // Thumb now sits at 72px; a click above it goes back, clamped at the top.
    await track.trigger('pointerdown', { clientY: 5 })
    expect(el.scrollTop).toBe(0)
  })

  it('does not page when there is nothing to scroll', async () => {
    const wrapper = mountBox()
    const el = setGeometry(wrapper, { scrollHeight: 400, clientHeight: 400 })
    await wrapper.vm.$nextTick()

    await wrapper.get('[data-testid="scrollbox-track"]').trigger('pointerdown', { clientY: 300 })
    expect(el.scrollTop).toBe(0)
  })

  it('fades only the edges that have more content behind them', async () => {
    const wrapper = mountBox()
    const fade = (edge) => wrapper.get(`[data-testid="scrollbox-fade-${edge}"]`).classes()

    setGeometry(wrapper, { scrollHeight: 400, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(fade('top')).not.toContain('is-on')
    expect(fade('bottom')).not.toContain('is-on')

    setGeometry(wrapper, { scrollTop: 0, scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(fade('top')).not.toContain('is-on')
    expect(fade('bottom')).toContain('is-on')

    setGeometry(wrapper, { scrollTop: 800, scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(fade('top')).toContain('is-on')
    expect(fade('bottom')).toContain('is-on')

    setGeometry(wrapper, { scrollTop: 1600, scrollHeight: 2000, clientHeight: 400 })
    await wrapper.vm.$nextTick()
    expect(fade('top')).toContain('is-on')
    expect(fade('bottom')).not.toContain('is-on')
  })

  it('keeps the rail and the fades out of the accessibility tree', () => {
    const wrapper = mountBox()
    for (const id of ['scrollbox-track', 'scrollbox-fade-top', 'scrollbox-fade-bottom']) {
      expect(wrapper.get(`[data-testid="${id}"]`).attributes('aria-hidden')).toBe('true')
    }
  })

  it('honours a custom rail width', () => {
    const wrapper = mount(ScrollBox, { props: { railWidth: 22 } })
    expect(wrapper.get('[data-testid="scrollbox"]').attributes('style')).toContain('--rail: 22px')
  })

  it('honours a custom minimum thumb size', async () => {
    const wrapper = mount(ScrollBox, { props: { minThumb: 60 }, attachTo: document.body })
    setGeometry(wrapper, { scrollHeight: 100000, clientHeight: 100 })
    await wrapper.vm.$nextTick()
    expect(px(wrapper, 'height')).toBe('60px')
  })
})
