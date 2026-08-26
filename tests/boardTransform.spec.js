import { describe, expect, it } from 'vitest'
import {
  KEEP_VISIBLE,
  MAX_SCALE,
  MIN_SCALE,
  clampOffset,
  clampScale,
  wheelZoomFactor,
  zoomAtPoint,
} from '../src/composables/boardTransform.js'

describe('clampScale', () => {
  it('keeps values inside the configured scale range', () => {
    expect(clampScale(1)).toBe(1)
    expect(clampScale(MIN_SCALE / 2)).toBe(MIN_SCALE)
    expect(clampScale(MAX_SCALE * 4)).toBe(MAX_SCALE)
  })

  it('handles non-finite input', () => {
    expect(clampScale(Number.NaN)).toBe(MIN_SCALE)
    expect(clampScale(Infinity)).toBe(MAX_SCALE)
    expect(clampScale(-Infinity)).toBe(MIN_SCALE)
  })
})

describe('clampOffset', () => {
  const container = 1000
  const board = 500

  it('leaves an in-range offset untouched', () => {
    expect(clampOffset(0, board, container)).toBe(0)
    expect(clampOffset(120, board, container)).toBe(120)
  })

  it('never lets the board leave the viewport completely', () => {
    const max = clampOffset(1e6, board, container)
    const min = clampOffset(-1e6, board, container)
    // Board right edge stays at least KEEP_VISIBLE px inside the left border.
    expect(container / 2 + min + board / 2).toBeCloseTo(KEEP_VISIBLE)
    // Board left edge stays at least KEEP_VISIBLE px inside the right border.
    expect(container / 2 + max - board / 2).toBeCloseTo(container - KEEP_VISIBLE)
  })

  it('is symmetric around the centered position', () => {
    expect(clampOffset(1e6, board, container)).toBeCloseTo(-clampOffset(-1e6, board, container))
  })

  it('never requires more visible pixels than the board has', () => {
    const tiny = 20
    const max = clampOffset(1e6, tiny, container)
    expect(container / 2 + max - tiny / 2).toBeCloseTo(container - tiny)
  })

  it('recenters when the container has not been measured yet', () => {
    expect(clampOffset(300, 0, 0)).toBe(0)
    expect(clampOffset(Number.NaN, board, container)).toBe(0)
  })
})

describe('zoomAtPoint', () => {
  it('keeps the viewport center fixed when zooming at the center', () => {
    const next = zoomAtPoint({ offsetX: 40, offsetY: -20, scale: 1, nextScale: 2 })
    expect(next.scale).toBe(2)
    expect(next.offsetX).toBe(80)
    expect(next.offsetY).toBe(-40)
  })

  it('keeps the point under the cursor pinned', () => {
    const state = { offsetX: 0, offsetY: 0, scale: 1 }
    const pointX = 200
    const pointY = -150
    // Board-local coordinate of the anchor before the zoom.
    const localX = (pointX - state.offsetX) / state.scale
    const localY = (pointY - state.offsetY) / state.scale

    const next = zoomAtPoint({ ...state, nextScale: 2.5, pointX, pointY })

    expect(next.offsetX + localX * next.scale).toBeCloseTo(pointX)
    expect(next.offsetY + localY * next.scale).toBeCloseTo(pointY)
  })

  it('is reversible', () => {
    const start = { offsetX: 33, offsetY: 77, scale: 1.4 }
    const zoomed = zoomAtPoint({ ...start, nextScale: 2.8, pointX: 120, pointY: 60 })
    const back = zoomAtPoint({ ...zoomed, nextScale: start.scale, pointX: 120, pointY: 60 })
    expect(back.offsetX).toBeCloseTo(start.offsetX)
    expect(back.offsetY).toBeCloseTo(start.offsetY)
  })
})

describe('wheelZoomFactor', () => {
  it('zooms in when scrolling up and out when scrolling down', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1)
    expect(wheelZoomFactor(100)).toBeLessThan(1)
    expect(wheelZoomFactor(0)).toBe(1)
  })

  it('produces inverse factors for opposite deltas', () => {
    expect(wheelZoomFactor(100) * wheelZoomFactor(-100)).toBeCloseTo(1)
  })
})
