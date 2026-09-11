<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Accordion from '../Accordion.vue'
import Card from './Card.vue'
import {
  CUSTOM_SCOPE,
  addCustomAsset,
  customAssets,
  moveCustomAsset,
  removeCustomAsset,
} from './customAssets'

/**
 * The Custom section every picker opens with: an empty card-shaped plate that
 * takes a picture off the user's disk, and everything added that way so far.
 *
 * The three pickers differ only in what they are filing — a card, a field
 * token, a stack marker — so the section is one component parametrised by
 * scope. What it adds is offered from that same list afterwards and picked like
 * any built-in card or token; see `customAssets` for how far that goes.
 *
 * Each picture carries the same hover cross the board's own pieces do, which
 * takes it back off the list, and a grip beside it that carries it to another
 * place in the same list — the order is the user's own; see `moveCustomAsset`.
 */
const props = defineProps({
  scope: { type: String, required: true },
  /** The picker's own hook prefix, so its entries answer to its selectors. */
  testid: { type: String, default: 'picker' },
  defaultOpen: { type: Boolean, default: true },
})

const emit = defineEmits(['select', 'toggle'])

const isUnits = computed(() => props.scope === CUSTOM_SCOPE.UNITS)
const assets = computed(() => customAssets(props.scope))

/** `picker-unit-<id>` and `token-picker-token-<id>`, as the built-in cells use. */
const entryTestid = (id) => `${props.testid}-${isUnits.value ? 'unit' : 'token'}-${id}`

/** What the artwork should look like to sit on the board without surprises. */
const SHAPE_HINT = {
  [CUSTOM_SCOPE.UNITS]: 'Cards are 2090×2900 px (209 : 290) — any upright image works, PNG or WebP with a transparent background looks best.',
  [CUSTOM_SCOPE.FIELD_TOKENS]: 'Tokens are square, around 256×256 px — round art on a transparent background looks best.',
  [CUSTOM_SCOPE.UNIT_TOKENS]: 'Tokens are square, around 256×256 px — round art on a transparent background looks best.',
}

const hint = computed(() => SHAPE_HINT[props.scope] ?? SHAPE_HINT[CUSTOM_SCOPE.UNITS])

const fileInput = ref(null)

/*
  The input is the file dialog and nothing else — the plate is what the user
  sees and clicks. A whole batch can be picked at once, and each picture is
  filed in the order the dialog handed it over. Clearing `value` afterwards is
  what lets the same file be picked twice, which is otherwise a silent no-op.
*/
function onPicked(event) {
  const picked = Array.from(event.target.files ?? [])
  event.target.value = ''
  for (const file of picked) addCustomAsset(props.scope, file)
}

/*
  Carrying a picture to another place in the list.

  It is the board's own gesture, and it is written the same way: a press is not
  a carry until the pointer has travelled far enough to mean one, the picture
  then rides under the pointer as a ghost, and the place it is let go over is
  where it lands.

  What differs is where it is taken hold of. The board hands a whole card to the
  pointer because there is nothing else a press on a cell could mean; here a
  press means "pick this one", and on a touch screen a drag across the list
  means "scroll it". So the carry has a handle of its own, which is the only
  thing on the plate that does not scroll under a finger.
*/
const DRAG_THRESHOLD_PX = 4

/** How long after a release a click can still be the one it left behind. */
const DROP_CLICK_MS = 250

let press = null
let droppedAt = 0
const drag = ref(null)

/** Whether this plate is the one being carried, or the one it is held over. */
const carrying = (asset) => drag.value?.id === asset.id
const dropState = (asset) =>
  drag.value && drag.value.over === asset.id && !carrying(asset) ? 'ok' : null

function startPress(asset, event) {
  // Left button only for the mouse; touch and pen always carry.
  if (event.pointerType === 'mouse' && event.button !== 0) return
  // And one hand at a time: a second finger is the list being scrolled.
  if (!event.isPrimary) return

  const handle = event.currentTarget
  const rect = handle.closest('[data-custom-id]').getBoundingClientRect()

  /*
    Touch hands the pointer to the element it went down on, which would hide
    every plate the finger then passes over — the same capture the board gives
    up, for the same reason, and asked of both places the browser may have put
    it.
  */
  releaseCapture(event.target, event.pointerId)
  releaseCapture(handle, event.pointerId)

  droppedAt = 0
  press = {
    asset,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    // Where in the plate it was taken hold of, so the ghost hangs off the same
    // spot, and how big that plate is in this picker's grid.
    grabX: event.clientX - rect.left,
    grabY: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', endDrag)
}

/** Gives up a capture the browser set for us, wherever it put it. */
function releaseCapture(el, pointerId) {
  if (el?.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId)
}

function onPointerMove(event) {
  if (!press || event.pointerId !== press.pointerId) return

  if (!drag.value) {
    const travelled = Math.hypot(event.clientX - press.startX, event.clientY - press.startY)
    if (travelled < DRAG_THRESHOLD_PX) return
    drag.value = {
      id: press.asset.id,
      url: press.asset.url,
      label: press.asset.label,
      over: null,
      width: press.width,
      height: press.height,
      x: 0,
      y: 0,
    }
  } else if (event.pointerType === 'mouse' && event.buttons === 0) {
    // Let go somewhere the page never heard about — off the window, most
    // likely. The picture stays where it was rather than in the air.
    endDrag()
    return
  }

  drag.value.x = event.clientX - press.grabX
  drag.value.y = event.clientY - press.grabY
}

/** The plate the pointer is over now — the plates are the carry's hit test. */
function onOver(asset) {
  if (!drag.value || drag.value.over === asset.id) return
  drag.value.over = asset.id
}

function onGridLeave() {
  if (drag.value) drag.value.over = null
}

function onPointerUp(event) {
  if (!press || event.pointerId !== press.pointerId) return
  const carried = drag.value
  endDrag()
  if (!carried) return

  swallowNextClick()
  if (carried.over) moveCustomAsset(carried.id, carried.over)
}

/** Puts the picture down where it stands — nothing moves, the listeners go. */
function endDrag() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', endDrag)
  press = null
  drag.value = null
}

// A carry listens on `window`, which outlives the picker it was started in.
onBeforeUnmount(endDrag)

/** Arms the swallow for the click a finished carry is about to leave behind. */
function swallowNextClick() {
  droppedAt = Date.now()
}

/*
  A carry that ends over the plate it started on leaves a click on that plate,
  which would pick the picture and close the picker over it. That one click is
  eaten — on `window` and before anything sees it, since the click lands on
  whatever the press and the release have in common, which is rarely the plate
  itself.
*/
function swallowDropClick(event) {
  if (!droppedAt || Date.now() - droppedAt > DROP_CLICK_MS) return
  droppedAt = 0
  event.stopPropagation()
  event.preventDefault()
}

onMounted(() => window.addEventListener('click', swallowDropClick, true))
onBeforeUnmount(() => window.removeEventListener('click', swallowDropClick, true))

/**
 * The grip's other way to move a picture, for whoever is on a keyboard: one
 * place along the list per press, in the order the list is read.
 */
function onGripKey(asset, step) {
  const list = assets.value
  const onto = list[list.indexOf(asset) + step]
  if (onto) moveCustomAsset(asset.id, onto.id)
}
</script>

<template>
  <Accordion
    title="Custom"
    :default-open="defaultOpen"
    :data-testid="`${testid}-group-custom`"
    @toggle="emit('toggle', $event)"
  >
    <template #meta>{{ assets.length }}</template>

    <p class="custom__info" :data-testid="`${testid}-custom-info`">
      <span class="custom__info-mark" aria-hidden="true">i</span>
      <span>
        {{ hint }}
        <!--
          Only the cards come in two printings, so only the card picker is told
          how the board reads one. The word is looked for in the file's own
          name, which is all a browser will say about a picture the user picked.
        -->
        <template v-if="isUnits">
          A name carrying the word <b class="custom__info-key">few</b> or
          <b class="custom__info-key">pack</b> — as in
          <b class="custom__info-key">gold_dragons_pack.png</b> — is read as that
          printing: a pack card is drawn with the foil sheen, and a card with both
          of its printings added here carries a flip arrow on the board that turns
          it over to the other one.
        </template>
        Pictures are kept in this tab only — nothing is uploaded, and a reload
        forgets them. This list is where they live: removing one here also takes
        it off the board, and the grip beside its cross carries it to another
        place in the list.
      </span>
    </p>

    <div
      class="custom__grid"
      :class="isUnits ? 'custom__grid--cards' : 'custom__grid--tokens'"
      @pointerleave="onGridLeave"
    >
      <button
        class="custom__add"
        type="button"
        aria-label="Add custom images"
        :data-testid="`${testid}-custom-add`"
        @click="fileInput.click()"
      >
        <svg class="custom__plus" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <button
        v-for="asset in assets"
        :key="asset.id"
        class="custom__cell"
        type="button"
        :data-custom-id="asset.id"
        :data-testid="entryTestid(asset.id)"
        :data-carried="carrying(asset) || null"
        :data-drop="dropState(asset)"
        @click="emit('select', asset.id)"
        @pointermove="onOver(asset)"
      >
        <Card v-if="isUnits" :unit="asset.id" lazy />
        <img
          v-else
          class="custom__art"
          :src="asset.url"
          :alt="asset.label"
          :title="asset.label"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <!--
          The handle the picture is carried by. It is a grip rather than the
          whole plate for the reason given above `startPress`, and it sits
          across from the cross so neither is ever the other by a pixel.
        -->
        <span
          class="custom__grip"
          role="button"
          tabindex="0"
          :aria-label="`Move ${asset.label}`"
          :data-testid="`${testid}-custom-move-${asset.id}`"
          @click.stop
          @pointerdown="startPress(asset, $event)"
          @keydown.left.stop.prevent="onGripKey(asset, -1)"
          @keydown.up.stop.prevent="onGripKey(asset, -1)"
          @keydown.right.stop.prevent="onGripKey(asset, 1)"
          @keydown.down.stop.prevent="onGripKey(asset, 1)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle class="custom__grip-disc" cx="12" cy="12" r="11.2" />
            <g class="custom__grip-dots">
              <circle cx="9.4" cy="7.6" r="1.35" />
              <circle cx="14.6" cy="7.6" r="1.35" />
              <circle cx="9.4" cy="12" r="1.35" />
              <circle cx="14.6" cy="12" r="1.35" />
              <circle cx="9.4" cy="16.4" r="1.35" />
              <circle cx="14.6" cy="16.4" r="1.35" />
            </g>
          </svg>
        </span>

        <span
          class="custom__remove"
          role="button"
          tabindex="0"
          :aria-label="`Remove ${asset.label}`"
          :data-testid="`${testid}-custom-remove-${asset.id}`"
          @click.stop="removeCustomAsset(asset.id)"
          @keydown.enter.stop.prevent="removeCustomAsset(asset.id)"
          @keydown.space.stop.prevent="removeCustomAsset(asset.id)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle class="custom__remove-disc" cx="12" cy="12" r="11.2" />
            <path d="m8.4 8.4 7.2 7.2m0-7.2-7.2 7.2" />
          </svg>
        </span>
      </button>

      <!--
        The picture under the pointer. It rides on `body` so it is over the
        picker's own panel rather than clipped by the list it came out of, and
        it stays out of the pointer's way so the plates underneath go on
        reporting themselves.
      -->
      <Teleport to="body">
        <div
          v-if="drag"
          class="custom__ghost"
          data-testid="picker-custom-ghost"
          :style="{
            width: `${drag.width}px`,
            height: `${drag.height}px`,
            transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
          }"
          aria-hidden="true"
        >
          <img :src="drag.url" alt="" draggable="false" />
        </div>
      </Teleport>

      <input
        ref="fileInput"
        class="custom__input"
        type="file"
        accept="image/*"
        multiple
        aria-hidden="true"
        tabindex="-1"
        :data-testid="`${testid}-custom-input`"
        @change="onPicked"
      />
    </div>
  </Accordion>
</template>

<style scoped>
/*
  A note, not a footnote: it is the only place the rules for a picture are
  written down, so it is set on its own darkened plate in the panel's own gold
  rather than dimmed into the woodgrain behind it.
*/
.custom__info {
  display: flex;
  gap: 9px;
  margin: 0 0 12px;
  padding: 9px 11px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--h3-gold);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.75);
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(181, 140, 74, 0.32);
  border-left: 3px solid var(--h3-gold-dim);
  border-radius: var(--h3-radius);
}

.custom__info-mark {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  margin-top: 2px;
  font-family: var(--h3-font-display);
  font-size: 13px;
  color: var(--h3-hint-ink);
  border: 1px solid var(--h3-hint-edge);
  border-radius: 50%;
}

/* The words the board actually looks for, told apart from the prose about them. */
.custom__info-key {
  font-family: var(--h3-font-display);
  font-weight: 700;
  white-space: nowrap;
  color: var(--h3-gold-bright);
}

/*
  The plate is an empty one of whatever the section files, so it lines up with
  the picker it stands in: a blank card among the towns, a blank disc among the
  tokens. Anything added is shown in that same shape, whatever the picture is.
*/
.custom__grid {
  display: grid;
  gap: 10px;
}

/* The two shapes, and the cell widths, of the pickers themselves. */
.custom__grid--cards {
  grid-template-columns: repeat(auto-fill, minmax(var(--h3-card-column), 1fr));
}

.custom__grid--tokens {
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
}

.custom__add,
.custom__cell {
  padding: 0;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(181, 140, 74, 0.35);
  border-radius: 3px;
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease;
}

/* The unit art is 2090x2900; the token art is round and roughly square. */
.custom__grid--cards :is(.custom__add, .custom__cell) {
  aspect-ratio: 209 / 290;
}

.custom__grid--tokens :is(.custom__add, .custom__cell) {
  aspect-ratio: 1;
}

/* Empty on purpose: a dashed outline reads as a slot waiting to be filled. */
.custom__add {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--h3-gold-dim);
  border: 1px dashed rgba(181, 140, 74, 0.55);
}

.custom__add:hover,
.custom__cell:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.65);
}

.custom__add:hover {
  color: var(--h3-gold-bright);
  background: rgba(242, 217, 152, 0.08);
  border-color: var(--h3-gold-dim);
}

.custom__add:focus-visible,
.custom__cell:focus-visible {
  outline: 1px solid var(--h3-gold);
  outline-offset: 2px;
}

.custom__plus {
  width: 26%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.custom__cell {
  position: relative;
  padding: 6px;
}

/*
  The two controls a picture carries, hung in its top corners: the cross the
  board draws on its own pieces, and the grip the picture is carried by. Both
  keep out of the way until the picture is hovered, and neither is ever the
  click that picks it.
*/
.custom__grip,
.custom__remove {
  position: absolute;
  top: 4%;
  display: flex;
  width: 16%;
  max-width: 26px;
  color: var(--h3-hint-ink);
  cursor: pointer;
  opacity: 0;
  /* Inert while it is invisible, so it never takes the tap that picks. */
  pointer-events: none;
  transition:
    opacity 0.12s ease,
    color 0.12s ease;
}

.custom__remove {
  right: 4%;
}

/*
  The grip is the one thing on the plate a finger may drag without the list
  scrolling under it — which is the whole reason a picture is carried by a
  handle rather than by itself.
*/
.custom__grip {
  left: 4%;
  cursor: grab;
  touch-action: none;
}

.custom__grip:active {
  cursor: grabbing;
}

.custom__cell:hover :is(.custom__grip, .custom__remove),
.custom__grip:focus-visible,
.custom__remove:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

/* No hover to wait for, so both stand — see the same note in `Card`. */
@media (hover: none) and (pointer: coarse) {
  .custom__grip,
  .custom__remove {
    width: max(16%, 18px);
    opacity: 0.9;
    pointer-events: auto;
  }
}

.custom__remove:hover {
  color: #ffbea0;
}

.custom__grip:hover {
  color: var(--h3-gold-bright);
}

.custom__grip svg,
.custom__remove svg {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
}

.custom__grip-disc,
.custom__remove-disc {
  fill: var(--h3-hint-ground);
  stroke: var(--h3-hint-edge);
  stroke-width: 1;
}

.custom__grip:hover .custom__grip-disc,
.custom__remove:hover .custom__remove-disc {
  stroke: currentColor;
}

/* Dots, not strokes: six of them read as something to take hold of. */
.custom__grip-dots {
  fill: currentColor;
  stroke: none;
}

/*
  The plate a picture was lifted out of keeps its place in the grid while the
  picture is in the air — the gap is where it goes back to if it is let go over
  nothing.
*/
.custom__cell[data-carried] {
  opacity: 0.35;
}

/* And the plate it is held over is the place it would take. */
.custom__cell[data-drop='ok'] {
  border-color: var(--h3-gold-bright);
  box-shadow:
    inset 0 0 0 1px var(--h3-gold-bright),
    0 0 10px rgba(242, 217, 152, 0.35);
}

/*
  The picture itself while it is carried. Over the picker it came out of, and
  out of the pointer's way so the plates underneath go on reporting themselves.
*/
.custom__ghost {
  position: fixed;
  top: 0;
  left: 0;
  /* Over the picker it was lifted out of, under the preview that opens on top. */
  z-index: 120;
  opacity: 0.92;
  pointer-events: none;
  will-change: transform;
}

.custom__ghost img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.75));
}

.custom__art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.custom__input {
  display: none;
}
</style>
