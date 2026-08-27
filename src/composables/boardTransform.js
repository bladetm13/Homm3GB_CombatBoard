/**
 * Pure helpers for the combat-board pan/zoom model.
 *
 * Model: the board is centered in the container and then transformed with
 * `translate(offsetX, offsetY) scale(scale)` around its own center.
 * Because the translation comes first in the matrix, offsets are plain
 * container-space pixels — which keeps the clamping math below trivial.
 */

export const MIN_SCALE = 0.75
export const MAX_SCALE = 3
/** How much of the board (px, per axis) must stay inside the viewport. */
export const KEEP_VISIBLE = 96

export function clampScale(scale, min = MIN_SCALE, max = MAX_SCALE) {
  if (Number.isNaN(scale)) return min
  return Math.min(max, Math.max(min, scale))
}

/**
 * Clamp one axis so the board can never be dragged completely off screen.
 * The board occupies [C/2 + o - S/2, C/2 + o + S/2] in container space.
 */
export function clampOffset(offset, scaledSize, containerSize, keepVisible = KEEP_VISIBLE) {
  if (!Number.isFinite(offset)) return 0
  const keep = Math.min(keepVisible, scaledSize, containerSize)
  const min = keep - containerSize / 2 - scaledSize / 2
  const max = containerSize / 2 + scaledSize / 2 - keep
  if (min > max) return 0
  return Math.min(max, Math.max(min, offset))
}

/**
 * Zoom while keeping the container-space point `(pointX, pointY)` — measured
 * from the container center — pinned under the cursor.
 */
export function zoomAtPoint({ offsetX, offsetY, scale, nextScale, pointX = 0, pointY = 0 }) {
  const ratio = nextScale / scale
  return {
    scale: nextScale,
    offsetX: pointX - (pointX - offsetX) * ratio,
    offsetY: pointY - (pointY - offsetY) * ratio,
  }
}

/** Turn a wheel delta into a multiplicative zoom factor. */
export function wheelZoomFactor(deltaY, intensity = 0.0015) {
  return Math.exp(-deltaY * intensity)
}
