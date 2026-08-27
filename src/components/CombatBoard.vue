<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import boardImage from '../../assets/battle_board.jpeg'
import ZoomControls from './ZoomControls.vue'
import { useBoardTransform } from '../composables/useBoardTransform.js'

/** The battle board artwork is a 1x2 (width x height) strip. */
const BOARD_ASPECT_RATIO = 0.5

const viewportEl = ref(null)

const {
  baseWidth,
  baseHeight,
  transform,
  scale,
  dragging,
  canZoomIn,
  canZoomOut,
  setContainerSize,
  panBy,
  zoomIn,
  zoomOut,
  zoomTo,
  zoomByWheel,
  reset,
  setDragging,
} = useBoardTransform({ aspectRatio: BOARD_ASPECT_RATIO })

defineExpose({ scale, zoomIn, zoomOut, zoomTo, reset, baseWidth, baseHeight })

const DRAG_THRESHOLD_PX = 4

const RASTER_SETTLE_MS = 200

const transforming = ref(false)
let settleTimer = null

watch(transform, () => {
  transforming.value = true
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => (transforming.value = false), RASTER_SETTLE_MS)
})

let resizeObserver = null
const drag = {
  pressed: false,
  moved: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
}

function measure() {
  const el = viewportEl.value
  if (!el) return
  setContainerSize(el.clientWidth, el.clientHeight)
}

/** Pointer position relative to the viewport center — the zoom anchor. */
function pointFromEvent(event) {
  const el = viewportEl.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return {
    x: event.clientX - (rect.left + rect.width / 2),
    y: event.clientY - (rect.top + rect.height / 2),
  }
}

function onWheel(event) {
  const { x, y } = pointFromEvent(event)
  zoomByWheel(event.deltaY, x, y)
}


function isOverlayUi(target) {
  return typeof target?.closest === 'function' && target.closest('[data-no-drag]') !== null
}

function onPointerDown(event) {
  // Left button only for the mouse; touch and pen always drag.
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (isOverlayUi(event.target)) return
  drag.pressed = true
  drag.moved = false
  drag.pointerId = event.pointerId
  drag.startX = drag.lastX = event.clientX
  drag.startY = drag.lastY = event.clientY
}

function onPointerMove(event) {
  if (!drag.pressed || event.pointerId !== drag.pointerId) return

  if (!drag.moved) {
    const travelled = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    if (travelled < DRAG_THRESHOLD_PX) return
    drag.moved = true
    setDragging(true)
    // Capturing here — not on pointerdown — lets the pointer leave the window
    // mid-drag while leaving a click-sized press untouched.
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  panBy(event.clientX - drag.lastX, event.clientY - drag.lastY)
  drag.lastX = event.clientX
  drag.lastY = event.clientY
}

function endDrag(event) {
  if (!drag.pressed) return
  const target = event?.currentTarget
  if (event?.pointerId != null && target?.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  drag.pressed = false
  drag.moved = false
  drag.pointerId = null
  setDragging(false)
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(viewportEl.value)
  } else {
    window.addEventListener('resize', measure)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', measure)
  clearTimeout(settleTimer)
})
</script>

<template>
  <div
    ref="viewportEl"
    class="combat-viewport"
    :class="{ 'is-dragging': dragging }"
    data-testid="combat-viewport"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @contextmenu.prevent
    @dragstart.prevent
  >
    <!-- Blurred cover of the same artwork fills whatever the board leaves empty. -->
    <div
      class="combat-backdrop"
      :style="{ backgroundImage: `url(${boardImage})` }"
      aria-hidden="true"
    />
    <div class="combat-vignette" aria-hidden="true" />

    <!-- The board itself: transform container for every future card / unit. -->
    <div
      class="combat-board"
      :class="{ 'is-transforming': transforming }"
      data-testid="combat-board"
      :style="{
        width: `${baseWidth}px`,
        height: `${baseHeight}px`,
        transform,
        backgroundImage: `url(${boardImage})`,
      }"
    >
      <slot :scale="scale" :board-width="baseWidth" :board-height="baseHeight" />
    </div>

    <ZoomControls
      :scale="scale"
      :can-zoom-in="canZoomIn"
      :can-zoom-out="canZoomOut"
      @zoom-in="zoomIn()"
      @zoom-out="zoomOut()"
      @reset="reset()"
    />
  </div>
</template>

<style scoped>
.combat-viewport {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  background: var(--h3-wood-dark);
  touch-action: none;
}

.combat-viewport.is-dragging {
  cursor: grabbing;
}

.combat-backdrop {
  position: absolute;
  /* Overscan by more than the blur radius so no transparent edge bleeds in. */
  inset: -120px;
  background-position: center;
  background-size: cover;
  filter: blur(10px) saturate(0.75) brightness(0.45);
}

.combat-vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.7) 100%),
    linear-gradient(180deg, rgba(20, 12, 4, 0.3), rgba(10, 6, 2, 0.5));
}

.combat-board {
  position: relative;
  flex: 0 0 auto;
  transform-origin: center center;
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  border: 1px solid var(--h3-bevel-dark);
  box-shadow:
    0 0 0 1px rgba(181, 140, 74, 0.35),
    0 12px 48px rgba(0, 0, 0, 0.75);
}

/* Only while a pan/zoom is actually in flight — see RASTER_SETTLE_MS. */
.combat-board.is-transforming {
  will-change: transform;
}
</style>
