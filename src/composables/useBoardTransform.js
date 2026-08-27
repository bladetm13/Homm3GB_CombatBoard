import { computed, reactive, readonly } from 'vue'
import {
  KEEP_VISIBLE,
  MAX_SCALE,
  MIN_SCALE,
  clampOffset,
  clampScale,
  wheelZoomFactor,
  zoomAtPoint,
} from './boardTransform.js'

/**
 * Reactive pan/zoom state for the combat board.
 *
 * `aspectRatio` is width / height (0.5 for the 1x2 battle board). At scale 1
 * the board is exactly as tall as the container, so the base size is derived
 * from the container height alone.
 */
export function useBoardTransform(options = {}) {
  const {
    aspectRatio = 0.5,
    minScale = MIN_SCALE,
    maxScale = MAX_SCALE,
    keepVisible = KEEP_VISIBLE,
    zoomStep = 1.2,
  } = options

  const state = reactive({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    containerWidth: 0,
    containerHeight: 0,
    dragging: false,
  })

  const baseHeight = computed(() => state.containerHeight)
  const baseWidth = computed(() => state.containerHeight * aspectRatio)
  const scaledWidth = computed(() => baseWidth.value * state.scale)
  const scaledHeight = computed(() => baseHeight.value * state.scale)

  const canZoomIn = computed(() => state.scale < maxScale - 1e-6)
  const canZoomOut = computed(() => state.scale > minScale + 1e-6)

  const isPannable = computed(
    () =>
      scaledWidth.value > state.containerWidth + 0.5 ||
      scaledHeight.value > state.containerHeight + 0.5,
  )

  function snap(value) {
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
    return Math.round(value * dpr) / dpr
  }

  const transform = computed(
    () => `translate3d(${snap(state.offsetX)}px, ${snap(state.offsetY)}px, 0) scale(${state.scale})`,
  )

  function applyClamp() {
    state.offsetX = clampOffset(state.offsetX, scaledWidth.value, state.containerWidth, keepVisible)
    state.offsetY = clampOffset(state.offsetY, scaledHeight.value, state.containerHeight, keepVisible)
  }

  function setContainerSize(width, height) {
    state.containerWidth = width
    state.containerHeight = height
    applyClamp()
  }

  function panBy(dx, dy) {
    state.offsetX += dx
    state.offsetY += dy
    applyClamp()
  }

  /** `pointX/pointY` are offsets from the container center (px). */
  function zoomTo(nextScale, pointX = 0, pointY = 0) {
    const target = clampScale(nextScale, minScale, maxScale)
    if (target === state.scale) return
    const next = zoomAtPoint({
      offsetX: state.offsetX,
      offsetY: state.offsetY,
      scale: state.scale,
      nextScale: target,
      pointX,
      pointY,
    })
    state.scale = next.scale
    state.offsetX = next.offsetX
    state.offsetY = next.offsetY
    applyClamp()
  }

  function zoomBy(factor, pointX = 0, pointY = 0) {
    zoomTo(state.scale * factor, pointX, pointY)
  }

  const zoomIn = (pointX = 0, pointY = 0) => zoomBy(zoomStep, pointX, pointY)
  const zoomOut = (pointX = 0, pointY = 0) => zoomBy(1 / zoomStep, pointX, pointY)

  function zoomByWheel(deltaY, pointX = 0, pointY = 0) {
    zoomBy(wheelZoomFactor(deltaY), pointX, pointY)
  }

  function reset() {
    state.scale = 1
    state.offsetX = 0
    state.offsetY = 0
  }

  return {
    state: readonly(state),
    scale: computed(() => state.scale),
    dragging: computed(() => state.dragging),
    baseWidth,
    baseHeight,
    scaledWidth,
    scaledHeight,
    transform,
    canZoomIn,
    canZoomOut,
    isPannable,
    minScale,
    maxScale,
    setContainerSize,
    panBy,
    zoomTo,
    zoomBy,
    zoomIn,
    zoomOut,
    zoomByWheel,
    reset,
    setDragging: (value) => {
      state.dragging = value
    },
  }
}
