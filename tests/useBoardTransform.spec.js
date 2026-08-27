import { beforeEach, describe, expect, it } from 'vitest'
import { useBoardTransform } from '../src/composables/useBoardTransform.js'
import { KEEP_VISIBLE, MAX_SCALE, MIN_SCALE } from '../src/composables/boardTransform.js'

const VIEWPORT = { width: 1280, height: 800 }

describe('useBoardTransform', () => {
  let board

  beforeEach(() => {
    board = useBoardTransform({ aspectRatio: 0.5 })
    board.setContainerSize(VIEWPORT.width, VIEWPORT.height)
  })

  it('fits the board to the full viewport height at 100%', () => {
    expect(board.baseHeight.value).toBe(VIEWPORT.height)
    expect(board.baseWidth.value).toBe(VIEWPORT.height / 2)
    expect(board.scale.value).toBe(1)
    expect(board.transform.value).toBe('translate3d(0px, 0px, 0) scale(1)')
  })

  it('reports the board as not pannable while it fits', () => {
    expect(board.isPannable.value).toBe(false)
    board.zoomTo(MAX_SCALE)
    expect(board.isPannable.value).toBe(true)
  })

  it('clamps zoom to the configured range', () => {
    for (let i = 0; i < 40; i += 1) board.zoomIn()
    expect(board.scale.value).toBe(MAX_SCALE)
    for (let i = 0; i < 80; i += 1) board.zoomOut()
    expect(board.scale.value).toBe(MIN_SCALE)
  })

  it('steps zoom by the configured factor', () => {
    board.zoomIn()
    expect(board.scale.value).toBeCloseTo(1.2)
    board.zoomOut()
    expect(board.scale.value).toBeCloseTo(1)
  })

  it('toggles canZoomIn / canZoomOut at the limits', () => {
    expect(board.canZoomIn.value).toBe(true)
    expect(board.canZoomOut.value).toBe(true)
    board.zoomTo(MAX_SCALE)
    expect(board.canZoomIn.value).toBe(false)
    board.zoomTo(MIN_SCALE)
    expect(board.canZoomOut.value).toBe(false)
  })

  it('zooms towards the cursor', () => {
    board.zoomByWheel(-240, 300, 100)
    expect(board.scale.value).toBeGreaterThan(1)
    expect(board.state.offsetX).toBeLessThan(0)
    expect(board.state.offsetY).toBeLessThan(0)
  })

  it('pans and keeps the board partially visible', () => {
    board.zoomTo(MAX_SCALE)
    board.panBy(100000, 100000)

    const halfW = board.scaledWidth.value / 2
    const halfH = board.scaledHeight.value / 2
    const left = VIEWPORT.width / 2 + board.state.offsetX - halfW
    const top = VIEWPORT.height / 2 + board.state.offsetY - halfH

    expect(left).toBeLessThanOrEqual(VIEWPORT.width - KEEP_VISIBLE + 0.001)
    expect(top).toBeLessThanOrEqual(VIEWPORT.height - KEEP_VISIBLE + 0.001)
  })

  it('keeps the board on screen after a resize', () => {
    board.zoomTo(MAX_SCALE)
    board.panBy(100000, 0)
    const before = board.state.offsetX

    board.setContainerSize(400, 400)

    expect(board.state.offsetX).toBeLessThan(before)
    const left = 400 / 2 + board.state.offsetX - board.scaledWidth.value / 2
    expect(left).toBeLessThanOrEqual(400 - KEEP_VISIBLE + 0.001)
  })

  it('resets scale and offset', () => {
    board.zoomTo(MAX_SCALE)
    board.panBy(200, 200)
    board.reset()
    expect(board.scale.value).toBe(1)
    expect(board.state.offsetX).toBe(0)
    expect(board.state.offsetY).toBe(0)
  })

  it('snaps the rendered offset to a whole device pixel, keeping state exact', () => {
    board.panBy(-30.4, 15.6)
    expect(board.transform.value).toContain('translate3d(-30px, 16px, 0)')
    // Rounding is for CSS only: the state still carries the exact offset, so
    // repeated pans do not accumulate the error.
    expect(board.state.offsetX).toBeCloseTo(-30.4)
    expect(board.state.offsetY).toBeCloseTo(15.6)
  })

  it('exposes a css transform string with translate before scale', () => {
    board.zoomTo(MAX_SCALE)
    board.panBy(-30, 15)
    expect(board.transform.value).toMatch(
      new RegExp(`^translate3d\\(-?[\\d.]+px, -?[\\d.]+px, 0\\) scale\\(${MAX_SCALE}\\)$`),
    )
  })
})
