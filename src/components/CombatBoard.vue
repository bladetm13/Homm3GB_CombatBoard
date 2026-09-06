<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import boardImage from '../../assets/battle_board.jpeg'
import ZoomControls from './ZoomControls.vue'
import { useBoardTransform } from '../composables/useBoardTransform.js'

/** The battle board artwork is a 1x2 (width x height) strip. */
const BOARD_ASPECT_RATIO = 0.5

const viewportEl = ref(null)
const boardEl = ref(null)

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

/*
  Every finger on the board, by pointer id. One of them pans; two of them pinch.

  The map holds fingers that came down on a card as well as on bare board:
  carrying a card is the field's gesture, not the board's, but a second finger
  arriving over one is still the second half of a pinch — and the field gives
  the card up when it sees that finger. The widgets are the one thing kept out
  of the map: they are furniture in front of the board, not the board.
*/
const points = new Map()

/** The one-finger pan. */
const drag = {
  pressed: false,
  moved: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
}

/** The two-finger pinch: which fingers, and what they were doing at the start. */
let pinch = null

function measure() {
  const el = viewportEl.value
  if (!el) return
  setContainerSize(el.clientWidth, el.clientHeight)
}

/** A point relative to the viewport center — which is the zoom anchor. */
function fromCentre(clientX, clientY) {
  const el = viewportEl.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return {
    x: clientX - (rect.left + rect.width / 2),
    y: clientY - (rect.top + rect.height / 2),
  }
}

function onWheel(event) {
  const { x, y } = fromCentre(event.clientX, event.clientY)
  zoomByWheel(event.deltaY, x, y)
}


function isOverlayUi(target) {
  return typeof target?.closest === 'function' && target.closest('[data-no-drag]') !== null
}

/**
 * The widget row in the corner. It is in front of the board rather than part of
 * it, so a press there is neither a pan nor half a pinch — unlike a press on a
 * card, which `isOverlayUi` also catches but which is still a finger on the
 * board as far as zooming is concerned.
 */
function isWidget(target) {
  return typeof target?.closest === 'function' && target.closest('.combat-controls') !== null
}

function onPointerDown(event) {
  // Left button only for the mouse; touch and pen always count.
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (isWidget(event.target)) return

  points.set(event.pointerId, { x: event.clientX, y: event.clientY })

  // The second finger is a pinch, and takes the gesture off whatever had it.
  if (points.size === 2) return startPinch()
  if (points.size > 2) return

  // A card is carried by the field; the board holds still under it.
  if (isOverlayUi(event.target)) return
  drag.pressed = true
  drag.moved = false
  drag.pointerId = event.pointerId
  drag.startX = drag.lastX = event.clientX
  drag.startY = drag.lastY = event.clientY
}

function onPointerMove(event) {
  const point = points.get(event.pointerId)
  if (point) {
    point.x = event.clientX
    point.y = event.clientY
  }

  if (pinch) return movePinch()
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

/*
  Pinch to zoom.

  The two fingers are read as one gesture: how far apart they are says what the
  scale should be, and where their midpoint is says what the board should be
  hung on. Both are measured against where they started rather than accumulated
  step by step, so the board comes back to exactly the scale it left at if the
  fingers do — no drift over a long, fiddly pinch.
*/
function startPinch() {
  // Whatever the first finger was doing, the second one takes over from it.
  releaseDrag()
  const [a, b] = [...points.keys()]
  pinch = { ids: [a, b], gap: gapNow(a, b), centre: centreNow(a, b), scale: scale.value }
  setDragging(true)
}

const gapNow = (a, b) =>
  Math.max(1, Math.hypot(points.get(a).x - points.get(b).x, points.get(a).y - points.get(b).y))

const centreNow = (a, b) => ({
  x: (points.get(a).x + points.get(b).x) / 2,
  y: (points.get(a).y + points.get(b).y) / 2,
})

function movePinch() {
  const [a, b] = pinch.ids
  if (!points.has(a) || !points.has(b)) return

  // The board rides along with the midpoint, and opens or closes under it.
  const centre = centreNow(a, b)
  panBy(centre.x - pinch.centre.x, centre.y - pinch.centre.y)
  pinch.centre = centre

  const { x, y } = fromCentre(centre.x, centre.y)
  zoomTo((pinch.scale * gapNow(a, b)) / pinch.gap, x, y)
}

function onPointerUp(event) {
  points.delete(event.pointerId)

  if (pinch) {
    const [a, b] = pinch.ids
    if (points.has(a) && points.has(b)) return
    pinch = null
    // A finger still down goes back to panning, from wherever it is now rather
    // than from where it was put down — otherwise the board jumps.
    const [id] = [...points.keys()]
    if (id === undefined) return endDrag(event)
    const point = points.get(id)
    drag.pressed = drag.moved = true
    drag.pointerId = id
    drag.startX = drag.lastX = point.x
    drag.startY = drag.lastY = point.y
    return
  }

  if (event.pointerId === drag.pointerId) endDrag(event)
}

/** Lets go of the pan without touching the fingers — a pinch is taking over. */
function releaseDrag() {
  drag.pressed = false
  drag.moved = false
  drag.pointerId = null
}

function endDrag(event) {
  const target = event?.currentTarget
  if (event?.pointerId != null && target?.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  releaseDrag()
  setDragging(false)
}

/** A cancelled pointer takes the whole gesture with it — fingers and all. */
function onPointerCancel(event) {
  points.delete(event.pointerId)
  pinch = null
  endDrag(event)
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
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
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
      ref="boardEl"
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

    <!--
      Everything that answers for the board as a whole, in one row in the
      corner and outside the transform — where a control can still be clicked.
    -->
    <div class="combat-controls" data-no-drag>
      <!-- The board element goes with it: a control may want to draw it. -->
      <slot name="controls" :board="boardEl" />
      <ZoomControls
        :scale="scale"
        :can-zoom-in="canZoomIn"
        :can-zoom-out="canZoomOut"
        @zoom-in="zoomIn()"
        @zoom-out="zoomOut()"
        @reset="reset()"
      />
    </div>
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

/*
  The widgets share one corner and one baseline: whichever of them grows — the
  tools, when they have something to say — grows upwards off it.
*/
.combat-controls {
  position: absolute;
  right: var(--h3-widget-inset);
  bottom: var(--h3-widget-inset);
  /*
    The row is never allowed to wrap: three panels stacked would cover the board
    they act on. On a narrow screen the furniture inside them shrinks instead —
    see the breakpoints in `homm3.css`.
  */
  z-index: 20;
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: calc(var(--h3-widget-gap) + 2px);
}

/* Only while a pan/zoom is actually in flight — see RASTER_SETTLE_MS. */
.combat-board.is-transforming {
  will-change: transform;
}
</style>
