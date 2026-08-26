import { beforeAll, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import CombatBoard from '../src/components/CombatBoard.vue'
import { MAX_SCALE, MIN_SCALE } from '../src/composables/boardTransform.js'

const pct = (scale) => `${Math.round(scale * 100)}%`
/** Enough clicks of a 1.2 step to walk the whole range either way. */
const STEPS_TO_LIMIT = 40

const VIEWPORT = { width: 1200, height: 900 }

beforeAll(() => {
  // No test DOM has a layout engine, so the viewport box is stubbed in.
  // happy-dom declares clientWidth/clientHeight on HTMLElement.prototype, which
  // would shadow an Element.prototype override — patch both to stay portable.
  for (const proto of [Element.prototype, HTMLElement.prototype]) {
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get: () => VIEWPORT.width,
    })
    Object.defineProperty(proto, 'clientHeight', {
      configurable: true,
      get: () => VIEWPORT.height,
    })
    proto.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: VIEWPORT.width,
      bottom: VIEWPORT.height,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      toJSON: () => {},
    })
    proto.setPointerCapture = () => {}
    proto.releasePointerCapture = () => {}
    proto.hasPointerCapture = () => false
  }
  if (typeof ResizeObserver === 'undefined') {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  }
})

async function mountBoard(options = {}) {
  const wrapper = mount(CombatBoard, { attachTo: document.body, ...options })
  // The container is measured in onMounted, so the first size lands a tick later.
  await nextTick()
  return wrapper
}

const board = (wrapper) => wrapper.get('[data-testid="combat-board"]')
const viewport = (wrapper) => wrapper.get('[data-testid="combat-viewport"]')
const readout = (wrapper) => wrapper.get('[data-testid="zoom-readout"]').text()

const boardOffset = (wrapper) =>
  board(wrapper)
    .attributes('style')
    .match(/translate3d\((-?[\d.]+)px, (-?[\d.]+)px/)
    .slice(1)
    .map(Number)

/**
 * VTU's `trigger` cannot assign read-only MouseEvent fields (clientX, button),
 * so pointer/wheel events are constructed with a real init dict instead.
 * happy-dom's WheelEvent drops the cursor position from that dict, so anything
 * the constructor ignored is forced on as an own property.
 */
async function fire(wrapper, type, init = {}, from = null) {
  const Ctor = type === 'wheel' ? WheelEvent : PointerEvent
  const event = new Ctor(type, { bubbles: true, cancelable: true, ...init })
  for (const key of ['clientX', 'clientY']) {
    if (key in init && event[key] !== init[key]) {
      Object.defineProperty(event, key, { configurable: true, value: init[key] })
    }
  }
  const target = from ? wrapper.get(`[data-testid="${from}"]`) : viewport(wrapper)
  target.element.dispatchEvent(event)
  await nextTick()
}

const click = async (wrapper, testid) => {
  await wrapper.get(`[data-testid="${testid}"]`).trigger('click')
}

describe('CombatBoard', () => {
  it('sizes the board to the viewport height with a 1x2 ratio', async () => {
    const wrapper = await mountBoard()
    const style = board(wrapper).attributes('style')
    expect(style).toContain(`height: ${VIEWPORT.height}px`)
    expect(style).toContain(`width: ${VIEWPORT.height / 2}px`)
  })

  it('renders the zoom controls with the current scale', async () => {
    const wrapper = await mountBoard()
    expect(readout(wrapper)).toBe('100%')
    expect(wrapper.find('[data-testid="zoom-in"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="zoom-out"]').exists()).toBe(true)
  })

  it('zooms in and out from the buttons', async () => {
    const wrapper = await mountBoard()
    await click(wrapper, 'zoom-in')
    expect(readout(wrapper)).toBe('120%')
    await click(wrapper, 'zoom-out')
    expect(readout(wrapper)).toBe('100%')
  })

  it('disables each zoom button at its limit', async () => {
    const wrapper = await mountBoard()
    for (let i = 0; i < STEPS_TO_LIMIT; i += 1) await click(wrapper, 'zoom-in')
    expect(readout(wrapper)).toBe(pct(MAX_SCALE))
    expect(wrapper.get('[data-testid="zoom-in"]').attributes('disabled')).toBeDefined()

    for (let i = 0; i < STEPS_TO_LIMIT * 2; i += 1) await click(wrapper, 'zoom-out')
    expect(readout(wrapper)).toBe(pct(MIN_SCALE))
    expect(wrapper.get('[data-testid="zoom-out"]').attributes('disabled')).toBeDefined()
  })

  it('zooms in on wheel up and out on wheel down', async () => {
    const wrapper = await mountBoard()
    await fire(wrapper, 'wheel', { deltaY: -300, clientX: 600, clientY: 450 })
    expect(board(wrapper).attributes('style')).toMatch(/scale\(1\.[1-9]/)

    const zoomedIn = Number(board(wrapper).attributes('style').match(/scale\(([\d.]+)\)/)[1])
    await fire(wrapper, 'wheel', { deltaY: 900, clientX: 600, clientY: 450 })
    const zoomedOut = Number(board(wrapper).attributes('style').match(/scale\(([\d.]+)\)/)[1])
    expect(zoomedOut).toBeLessThan(zoomedIn)
    expect(zoomedOut).toBeGreaterThanOrEqual(MIN_SCALE)
  })

  it('keeps the cursor anchor fixed while wheel-zooming', async () => {
    const wrapper = await mountBoard()
    // 300px right of the viewport centre.
    await fire(wrapper, 'wheel', { deltaY: -400, clientX: VIEWPORT.width / 2 + 300, clientY: 450 })
    const [x] = boardOffset(wrapper)
    expect(x).toBeLessThan(0)
  })

  it('resets the transform when the readout is clicked', async () => {
    const wrapper = await mountBoard()
    await click(wrapper, 'zoom-in')
    await click(wrapper, 'zoom-readout')
    expect(board(wrapper).attributes('style')).toContain('translate3d(0px, 0px, 0) scale(1)')
  })

  it('drags the board with the pointer once it is zoomed in', async () => {
    const wrapper = await mountBoard()
    for (let i = 0; i < STEPS_TO_LIMIT; i += 1) await click(wrapper, 'zoom-in')

    await fire(wrapper, 'pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 600,
      clientY: 450,
    })
    // A press alone is not a drag yet — see the click-vs-drag test below.
    expect(viewport(wrapper).classes()).not.toContain('is-dragging')

    await fire(wrapper, 'pointermove', { pointerId: 1, clientX: 500, clientY: 400 })
    expect(viewport(wrapper).classes()).toContain('is-dragging')
    expect(boardOffset(wrapper)).toEqual([-100, -50])

    await fire(wrapper, 'pointerup', { pointerId: 1 })
    expect(viewport(wrapper).classes()).not.toContain('is-dragging')

    // Moving after the release must not pan any further.
    await fire(wrapper, 'pointermove', { pointerId: 1, clientX: 100, clientY: 100 })
    expect(boardOffset(wrapper)).toEqual([-100, -50])
  })

  it('does not start a board drag when pressing the zoom controls', async () => {
    const wrapper = await mountBoard()
    // A real button press starts with a pointerdown that bubbles to the board.
    await fire(
      wrapper,
      'pointerdown',
      { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 1150, clientY: 850 },
      'zoom-in',
    )
    expect(viewport(wrapper).classes()).not.toContain('is-dragging')

    // ...and the click must still reach the button.
    await click(wrapper, 'zoom-in')
    expect(readout(wrapper)).toBe('120%')

    // A stray move afterwards must not pan the board either.
    await fire(wrapper, 'pointermove', { pointerId: 1, clientX: 400, clientY: 300 })
    expect(boardOffset(wrapper)).toEqual([0, 0])
  })

  it('still starts a drag from the board surface itself', async () => {
    const wrapper = await mountBoard()
    await fire(wrapper, 'pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 600,
      clientY: 450,
    }, 'combat-board')
    await fire(wrapper, 'pointermove', { pointerId: 1, clientX: 560, clientY: 450 })
    expect(viewport(wrapper).classes()).toContain('is-dragging')
    expect(boardOffset(wrapper)).toEqual([-40, 0])
  })

  it('treats a press that barely moves as a click, not a drag', async () => {
    const wrapper = await mountBoard()
    for (let i = 0; i < STEPS_TO_LIMIT; i += 1) await click(wrapper, 'zoom-in')

    await fire(wrapper, 'pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 600,
      clientY: 450,
    })
    // 3px of jitter is below the threshold: nothing pans, nothing is captured,
    // so the click reaches whatever sits on the board.
    await fire(wrapper, 'pointermove', { pointerId: 1, clientX: 602, clientY: 452 })
    expect(viewport(wrapper).classes()).not.toContain('is-dragging')
    expect(boardOffset(wrapper)).toEqual([0, 0])

    await fire(wrapper, 'pointerup', { pointerId: 1 })
    expect(viewport(wrapper).classes()).not.toContain('is-dragging')
  })

  it('pans from where the drag committed, not from the press', async () => {
    const wrapper = await mountBoard()
    for (let i = 0; i < STEPS_TO_LIMIT; i += 1) await click(wrapper, 'zoom-in')

    await fire(wrapper, 'pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 600,
      clientY: 450,
    })
    await fire(wrapper, 'pointermove', { pointerId: 1, clientX: 620, clientY: 450 })
    // The whole travel counts once the threshold is crossed — no lost pixels.
    expect(boardOffset(wrapper)).toEqual([20, 0])
  })

  it('ignores pointer moves that never started a drag', async () => {
    const wrapper = await mountBoard()
    await fire(wrapper, 'pointermove', { pointerId: 1, clientX: 10, clientY: 10 })
    expect(boardOffset(wrapper)).toEqual([0, 0])
  })

  it('does not start a drag on a right click', async () => {
    const wrapper = await mountBoard()
    await fire(wrapper, 'pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 2,
      clientX: 10,
      clientY: 10,
    })
    expect(viewport(wrapper).classes()).not.toContain('is-dragging')
  })

  it('never drags the board fully out of the viewport', async () => {
    const wrapper = await mountBoard()
    for (let i = 0; i < STEPS_TO_LIMIT; i += 1) await click(wrapper, 'zoom-in')

    await fire(wrapper, 'pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 0,
      clientY: 0,
    })
    await fire(wrapper, 'pointermove', { pointerId: 1, clientX: 99999, clientY: 99999 })
    await fire(wrapper, 'pointerup', { pointerId: 1 })

    const [x, y] = boardOffset(wrapper)
    const scaledW = (VIEWPORT.height / 2) * MAX_SCALE
    const scaledH = VIEWPORT.height * MAX_SCALE
    // The board's leading edge must still be inside the viewport.
    expect(VIEWPORT.width / 2 + x - scaledW / 2).toBeLessThan(VIEWPORT.width)
    expect(VIEWPORT.height / 2 + y - scaledH / 2).toBeLessThan(VIEWPORT.height)
  })

  it('renders the blurred backdrop from the same artwork', async () => {
    const wrapper = await mountBoard()
    const backdrop = wrapper.get('.combat-backdrop').attributes('style')
    expect(backdrop).toContain('battle_board')
    expect(board(wrapper).attributes('style')).toContain('battle_board')
  })

  it('renders slotted content inside the board container', async () => {
    const wrapper = await mountBoard({ slots: { default: '<div class="test-card">card</div>' } })
    expect(board(wrapper).find('.test-card').exists()).toBe(true)
  })

  it('hands the current scale and board size to the slot', async () => {
    const wrapper = await mountBoard({
      slots: {
        default: `<template #default="{ scale, boardWidth, boardHeight }">
          <i class="probe">{{ scale }}|{{ boardWidth }}|{{ boardHeight }}</i>
        </template>`,
      },
    })
    expect(wrapper.get('.probe').text()).toBe(`1|${VIEWPORT.height / 2}|${VIEWPORT.height}`)

    await click(wrapper, 'zoom-in')
    expect(wrapper.get('.probe').text()).toBe(`1.2|${VIEWPORT.height / 2}|${VIEWPORT.height}`)
  })

  it('exposes an imperative zoom api to its parent', async () => {
    const wrapper = await mountBoard()
    wrapper.vm.zoomTo(MAX_SCALE)
    await nextTick()
    expect(readout(wrapper)).toBe(pct(MAX_SCALE))

    wrapper.vm.reset()
    await nextTick()
    expect(readout(wrapper)).toBe('100%')
    expect(wrapper.vm.scale).toBe(1)
  })
})
