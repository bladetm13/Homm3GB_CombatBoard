<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * A scroll container with a hand-drawn HoMM3 scrollbar.
 *
 * The native bar is hidden and the rail is driven entirely from JS, because CSS
 * alone cannot deliver it: `::-webkit-scrollbar` is ignored by Chrome as soon as
 * the standard `scrollbar-width` is set, Firefox only ever exposes
 * `scrollbar-width`/`scrollbar-color`, and neither engine lets a bevelled brass
 * plate be drawn at all. Scrolling itself stays native — wheel, touch, keyboard
 * and `scrollIntoView` all keep working; the rail only reflects and drives it.
 */
const props = defineProps({
  /** Rail width in px. The thumb never gets thinner than this minus its border. */
  railWidth: { type: Number, default: 14 },
  /** Shortest the thumb may get, so a very long list stays grabbable. */
  minThumb: { type: Number, default: 32 },
})

const viewportEl = ref(null)
const contentEl = ref(null)

const scrollTop = ref(0)
const scrollHeight = ref(0)
const clientHeight = ref(0)
const dragging = ref(false)

/** How far the content can travel. Zero means there is nothing to scroll. */
const scrollRange = computed(() => Math.max(0, scrollHeight.value - clientHeight.value))
const scrollable = computed(() => scrollRange.value > 1)

/**
 * The rail spans the viewport exactly, so the viewport's own height doubles as
 * the track length — no second measurement to keep in sync.
 */
const thumbHeight = computed(() => {
  if (!scrollable.value) return 0
  const proportional = (clientHeight.value * clientHeight.value) / scrollHeight.value
  return Math.min(clientHeight.value, Math.max(props.minThumb, Math.round(proportional)))
})

const thumbTravel = computed(() => Math.max(0, clientHeight.value - thumbHeight.value))

const thumbTop = computed(() => {
  if (!scrollable.value) return 0
  return Math.round((scrollTop.value / scrollRange.value) * thumbTravel.value)
})

const hasAbove = computed(() => scrollable.value && scrollTop.value > 1)
const hasBelow = computed(() => scrollable.value && scrollTop.value < scrollRange.value - 1)

function measure() {
  const el = viewportEl.value
  if (!el) return
  scrollTop.value = el.scrollTop
  scrollHeight.value = el.scrollHeight
  clientHeight.value = el.clientHeight
}

function scrollToOffset(offset) {
  const el = viewportEl.value
  if (!el) return
  el.scrollTop = Math.min(scrollRange.value, Math.max(0, offset))
  // happy-dom and any browser mid-frame: read back rather than assume it took.
  measure()
}

/* --- Dragging the thumb -------------------------------------------------- */

const drag = { pointerId: null, startY: 0, startScroll: 0 }

function onThumbDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  drag.pointerId = event.pointerId
  drag.startY = event.clientY
  drag.startScroll = scrollTop.value
  dragging.value = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
  // The picker sits over the board; neither should see this as a click-through.
  event.preventDefault()
  event.stopPropagation()
}

function onThumbMove(event) {
  if (!dragging.value || event.pointerId !== drag.pointerId) return
  if (thumbTravel.value <= 0) return
  const travelled = event.clientY - drag.startY
  scrollToOffset(drag.startScroll + (travelled / thumbTravel.value) * scrollRange.value)
}

function endDrag(event) {
  if (!dragging.value) return
  const target = event?.currentTarget
  if (event?.pointerId != null && target?.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  dragging.value = false
  drag.pointerId = null
}

/** Clicking the empty rail pages towards the click, the way the old panels did. */
function onTrackDown(event) {
  const el = viewportEl.value
  if (!el || !scrollable.value) return
  const { top } = event.currentTarget.getBoundingClientRect()
  const clickedBelowThumb = event.clientY - top > thumbTop.value + thumbHeight.value / 2
  const page = clientHeight.value * 0.9
  scrollToOffset(scrollTop.value + (clickedBelowThumb ? page : -page))
}

/* --- Keeping the numbers fresh ------------------------------------------ */

let observer = null

onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(measure)
  // The viewport for window resizes, the content for anything that grows inside
  // it — a collapsing group changes the content's height, not the box's.
  if (viewportEl.value) observer.observe(viewportEl.value)
  if (contentEl.value) observer.observe(contentEl.value)
})

onBeforeUnmount(() => observer?.disconnect())

defineExpose({ measure, scrollToOffset })
</script>

<template>
  <div class="scrollbox" :style="{ '--rail': `${railWidth}px` }" data-testid="scrollbox">
    <div
      ref="viewportEl"
      class="scrollbox__viewport"
      data-testid="scrollbox-viewport"
      @scroll.passive="measure"
    >
      <div ref="contentEl" class="scrollbox__content">
        <slot />
      </div>
    </div>

    <div
      class="scrollbox__fade scrollbox__fade--top"
      :class="{ 'is-on': hasAbove }"
      data-testid="scrollbox-fade-top"
      aria-hidden="true"
    />
    <div
      class="scrollbox__fade scrollbox__fade--bottom"
      :class="{ 'is-on': hasBelow }"
      data-testid="scrollbox-fade-bottom"
      aria-hidden="true"
    />

    <!-- Purely a pointer affordance: the viewport above is already scrollable by
         wheel, touch and keyboard, so screen readers gain nothing from the rail. -->
    <div
      v-show="scrollable"
      class="scrollbox__track"
      data-testid="scrollbox-track"
      aria-hidden="true"
      @pointerdown="onTrackDown"
    >
      <div
        class="scrollbox__thumb"
        :class="{ 'is-dragging': dragging }"
        :style="{ height: `${thumbHeight}px`, transform: `translateY(${thumbTop}px)` }"
        data-testid="scrollbox-thumb"
        @pointerdown.stop="onThumbDown"
        @pointermove="onThumbMove"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      />
    </div>
  </div>
</template>

<style scoped>
.scrollbox {
  position: relative;
  display: flex;
  min-height: 0;
}

.scrollbox__viewport {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* The rail is drawn on top of this padding, not beside it. */
  padding-right: var(--rail);
  /* Once this list bottoms out, the board behind the dialog must stay put. */
  overscroll-behavior: contain;
  /* Hide the native bar in both engines — ours replaces it. */
  scrollbar-width: none;
}

.scrollbox__viewport::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* --- The rail: a channel carved into the panel -------------------------- */
.scrollbox__track {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--rail);
  cursor: pointer;
  background-image: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.62),
    rgba(0, 0, 0, 0.22) 45%,
    rgba(0, 0, 0, 0.62)
  );
  box-shadow:
    inset 1px 0 0 var(--h3-bevel-dark),
    inset -1px 0 0 rgba(181, 140, 74, 0.22);
}

/* --- The thumb: the brass plate from .h3-btn, laid on its side ---------- */
.scrollbox__thumb {
  position: absolute;
  top: 0;
  right: 1px;
  left: 1px;
  background-image:
    linear-gradient(180deg, rgba(255, 226, 160, 0.2), rgba(0, 0, 0, 0.28)),
    linear-gradient(90deg, #8a6330, #5a3d1c 55%, #32200d);
  border: 1px solid var(--h3-bevel-dark);
  border-radius: var(--h3-radius);
  box-shadow:
    inset 1px 1px 0 rgba(255, 236, 190, 0.42),
    inset -1px -1px 0 rgba(0, 0, 0, 0.7);
}

.scrollbox__thumb:hover {
  background-image:
    linear-gradient(180deg, rgba(255, 236, 190, 0.3), rgba(0, 0, 0, 0.22)),
    linear-gradient(90deg, #a67a3c, #6f4c23 55%, #3f2911);
}

/* Held down: the bevel flips, so the plate reads as pressed in. */
.scrollbox__thumb.is-dragging {
  background-image:
    linear-gradient(180deg, rgba(255, 236, 190, 0.34), rgba(0, 0, 0, 0.2)),
    linear-gradient(90deg, #b0843f, #785427 55%, #452d13);
  box-shadow:
    inset -1px -1px 0 rgba(255, 236, 190, 0.25),
    inset 1px 1px 0 rgba(0, 0, 0, 0.8);
}

/* --- Edge fades: shown only while the list really continues ------------- */
.scrollbox__fade {
  position: absolute;
  left: 0;
  /* Stop short of the rail so the thumb is never veiled. */
  right: var(--rail);
  z-index: 1;
  height: 30px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.scrollbox__fade.is-on {
  opacity: 1;
}

.scrollbox__fade--top {
  top: 0;
  background-image: linear-gradient(180deg, rgba(10, 6, 2, 0.85), rgba(10, 6, 2, 0));
}

.scrollbox__fade--bottom {
  bottom: 0;
  background-image: linear-gradient(0deg, rgba(10, 6, 2, 0.85), rgba(10, 6, 2, 0));
}
</style>
