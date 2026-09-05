<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import Card from './Card.vue'
import TokenPickerDialog from './TokenPickerDialog.vue'
import UnitPickerDialog from './UnitPickerDialog.vue'
import { COLS, MAX_TOKENS, ROWS, cellKey } from './boardRules'
import { hasCustomAssets } from './customAssets'
import { tokenImage, tokenLabel } from './tokenAssets'
import { TOKEN_SCOPE } from './tokenConstants'
import { unitImage } from './unitAssets'
import { useEscapeKey } from '../../composables/useEscapeKey'
import { useUnloadGuard } from '../../composables/useUnloadGuard'

const emit = defineEmits([
  'cell-click',
  'move',
  'place',
  'place-token',
  'remove',
  'remove-token',
])
const units = defineModel('units', { type: Object, default: () => ({}) })
const tokens = defineModel('tokens', { type: Object, default: () => ({}) })
const activeCell = ref(null)

/**
 * The cell the token picker is open over, and which of its tokens the pick will
 * land on: an index replaces that token, `null` adds one.
 */
const activeToken = ref(null)

/*
  A laid-out board is the whole of the user's work and none of it is saved, so
  leaving the page with anything on it — a card, a token, or a picture the user
  brought in — is worth a word of warning first.
*/
useUnloadGuard(
  () =>
    Object.keys(units.value).length > 0 ||
    Object.keys(tokens.value).length > 0 ||
    hasCustomAssets(),
)

const unitAt = (cell) => units.value[cellKey(cell)]
const tokensAt = (cell) => tokens.value[cellKey(cell)] ?? []

const cells = computed(() =>
  Array.from({ length: ROWS * COLS }, (_, index) => ({
    index,
    row: Math.floor(index / COLS) + 1,
    col: (index % COLS) + 1,
  })),
)

function openPicker(cell) {
  activeCell.value = cell
  emit('cell-click', cell)
}

/**
 * Everything token-side stops the click from reaching the cell, so it has to
 * announce the cell itself — from the outside, a click anywhere in a cell still
 * emits `cell-click`.
 */
function openTokenPicker(cell, index = null) {
  activeToken.value = { cell, index }
  emit('cell-click', cell)
}

/**
 * A token is offered by where it can go: a stack marker on a unit, a board
 * effect on bare ground. The cell under the picker decides which set opens —
 * and a token already down is replaced from the same set it came from.
 */
const tokenScope = computed(() =>
  activeToken.value && unitAt(activeToken.value.cell) ? TOKEN_SCOPE.UNIT : TOKEN_SCOPE.FIELD,
)

function place(unit) {
  const cell = activeCell.value
  if (!cell) return
  units.value = { ...units.value, [cellKey(cell)]: unit }
  activeCell.value = null
  emit('place', { ...cell, unit })
}

function placeToken(token) {
  const active = activeToken.value
  if (!active) return
  const { cell, index } = active
  const list = tokensAt(cell)
  const at = index ?? list.length
  if (at >= MAX_TOKENS) return

  const next = [...list]
  next[at] = token
  tokens.value = { ...tokens.value, [cellKey(cell)]: next }
  activeToken.value = null
  // `index` is the cell's own; a token's place in it is its `slot`.
  emit('place-token', { ...cell, token, slot: at })
}

function removeToken(cell, index) {
  const key = cellKey(cell)
  const token = tokensAt(cell)[index]
  const next = tokensAt(cell).filter((_, i) => i !== index)
  tokens.value = next.length ? { ...tokens.value, [key]: next } : withoutKey(tokens.value, key)
  emit('remove-token', { ...cell, token, slot: index })
}

function removeAt(cell) {
  const key = cellKey(cell)
  const unit = units.value[key]
  units.value = withoutKey(units.value, key)
  // The markers belonged to the stack that stood here, and the cell is bare
  // ground now — which is not a place unit tokens may be.
  if (tokensAt(cell).length) tokens.value = withoutKey(tokens.value, key)
  emit('remove', { ...cell, unit })
}

/*
  Carrying a card from one cell to another.

  A press on a card is not a drag yet: `press` keeps the bookkeeping until the
  pointer has travelled far enough to mean it, and only then does `drag` open
  and the ghost appear — so a plain click still opens the picker over the card.

  The pointer is deliberately left uncaptured, because capture would send every
  move to the card and the cells under it would never hear the pointer pass.
  Instead each cell reports itself while the drag is live, the ghost keeps out
  of the way with `pointer-events: none`, and a release the page never saw is
  caught on the next move with no button held.
*/
const DRAG_THRESHOLD_PX = 4

let press = null
const drag = ref(null)

/**
 * A drag ends in a click the board would otherwise read as a bare cell click —
 * over whichever cell the card was dropped on. This swallows that one click.
 */
let dropped = false

/** A card may land on any cell that holds no unit — bare ground or tokens. */
const canDrop = (cell) => !unitAt(cell)

/**
 * What the cell under the pointer has to say for itself: `ok` if the card can
 * land there, `no` if it cannot, and nothing at all when no card is in the air
 * or the cell is the one it came from.
 */
function dropState(cell) {
  const carried = drag.value
  if (!carried || carried.over?.index !== cell.index) return null
  if (cell.index === carried.from.index) return null
  return canDrop(cell) ? 'ok' : 'no'
}

function startPress(cell, event) {
  // Left button only for the mouse; touch and pen always carry.
  if (event.pointerType === 'mouse' && event.button !== 0) return
  // The card's own controls — the eye and the cross — are not handles.
  if (event.target?.closest?.('button')) return

  const handle = event.currentTarget
  const rect = handle.getBoundingClientRect()
  /*
    Touch hands the pointer to the element it went down on, which would hide
    every cell the finger then passes over. The card does not need it.
  */
  if (handle.hasPointerCapture?.(event.pointerId)) {
    handle.releasePointerCapture(event.pointerId)
  }

  dropped = false
  press = {
    cell,
    unit: unitAt(cell),
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    // Where in the card it was taken hold of, so the ghost hangs off the same
    // spot, and how big it is on screen at the board's current zoom.
    grabX: event.clientX - rect.left,
    grabY: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', endDrag)
}

function onPointerMove(event) {
  if (!press || event.pointerId !== press.pointerId) return

  if (!drag.value) {
    const travelled = Math.hypot(event.clientX - press.startX, event.clientY - press.startY)
    if (travelled < DRAG_THRESHOLD_PX) return
    drag.value = {
      from: press.cell,
      unit: press.unit,
      over: null,
      width: press.width,
      height: press.height,
      x: 0,
      y: 0,
    }
  } else if (event.pointerType === 'mouse' && event.buttons === 0) {
    // Let go somewhere the page never heard about — off the window, most
    // likely. The card goes back where it was rather than staying in the air.
    endDrag()
    return
  }

  drag.value.x = event.clientX - press.grabX
  drag.value.y = event.clientY - press.grabY
}

/** The cell the pointer is over now — the cells are the drag's hit test. */
function onCellOver(cell) {
  if (!drag.value || drag.value.over?.index === cell.index) return
  drag.value.over = cell
}

function onFieldLeave() {
  if (drag.value) drag.value.over = null
}

function onPointerUp(event) {
  if (!press || event.pointerId !== press.pointerId) return
  const carried = drag.value
  endDrag()
  if (!carried) return

  dropped = true
  const target = carried.over
  if (target && target.index !== carried.from.index && canDrop(target)) {
    moveUnit(carried.from, target)
  }
}

/** Puts the card down where it stands — nothing moves, the listeners go. */
function endDrag() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', endDrag)
  press = null
  drag.value = null
}

useEscapeKey(() => {
  if (drag.value) endDrag()
})

// A drag listens on `window`, which outlives the board it was started on.
onBeforeUnmount(endDrag)

function moveUnit(from, to) {
  const fromKey = cellKey(from)
  const toKey = cellKey(to)
  const unit = units.value[fromKey]

  units.value = { ...withoutKey(units.value, fromKey), [toKey]: unit }

  /*
    The markers belonged to the stack, so they travel with it — bare ground is
    not a place unit tokens may be, and leaving them behind would only throw
    them away. Whatever the cell already held keeps its slots; the arriving
    markers fill what room is left of the four.
  */
  const carried = tokensAt(from)
  if (carried.length) {
    const next = [...tokensAt(to), ...carried].slice(0, MAX_TOKENS)
    tokens.value = { ...withoutKey(tokens.value, fromKey), [toKey]: next }
  }

  emit('move', { from: { ...from }, to: { ...to }, unit })
}

/**
 * The click a finished drag leaves behind, on its way to the cell it was
 * dropped on. Caught on the way down, so no cell ever sees it.
 */
function onClickCapture(event) {
  if (!dropped) return
  dropped = false
  event.stopPropagation()
  event.preventDefault()
}

function withoutKey(source, key) {
  const { [key]: _dropped, ...rest } = source
  return rest
}
</script>

<template>
  <div
    class="board-field"
    :class="{ 'is-dragging': !!drag }"
    data-testid="board-field"
    @click.capture="onClickCapture"
    @pointerleave="onFieldLeave"
  >
    <div
      v-for="cell in cells"
      :key="cell.index"
      :class="`board-field__cell row-${cell.row} col-${cell.col}`"
      data-testid="board-field-cell"
      :data-row="cell.row"
      :data-col="cell.col"
      :data-drop="dropState(cell)"
      @click="openPicker(cell)"
      @pointermove="onCellOver(cell)"
    >
      <!--
        The card is the drag handle, and `data-no-drag` is what keeps the board
        itself still while it is carried — see `CombatBoard`.
      -->
      <Card
        v-if="unitAt(cell)"
        :unit="unitAt(cell)"
        removable
        class="board-field__card"
        :class="{ 'is-carried': drag?.from.index === cell.index }"
        data-no-drag
        @pointerdown="startPress(cell, $event)"
        @remove="removeAt(cell)"
      />
      <!--
        The tokens laid on this cell — on the card if there is one, on the bare
        ground if not. They wrap after two, so three read as a row of two and a
        single below it.
      -->
      <div
        v-if="tokensAt(cell).length"
        class="board-field__tokens"
        :class="unitAt(cell) ? 'board-field__tokens--on-unit' : 'board-field__tokens--on-field'"
        data-testid="board-field-tokens"
      >
        <span
          v-for="(token, index) in tokensAt(cell)"
          :key="index"
          class="board-field__token"
        >
          <button
            class="board-field__token-art"
            type="button"
            :aria-label="`Replace ${tokenLabel(token)}`"
            :data-testid="`board-field-token-${index}`"
            :data-token="token"
            @click.stop="openTokenPicker(cell, index)"
          >
            <img
              :src="tokenImage(token)"
              :alt="tokenLabel(token)"
              :title="tokenLabel(token)"
              decoding="async"
              draggable="false"
            />
          </button>
          <button
            class="board-field__token-remove"
            type="button"
            :aria-label="`Remove ${tokenLabel(token)}`"
            :data-testid="`board-field-token-remove-${index}`"
            @click.stop="removeToken(cell, index)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle class="board-field__token-remove-disc" cx="12" cy="12" r="11.2" />
              <path d="m8.4 8.4 7.2 7.2m0-7.2-7.2 7.2" />
            </svg>
          </button>
        </span>
      </div>

      <!--
        Hover affordances. The hint says what a bare click will do — a plus on
        bare ground, swap arrows over a card — and is a hint only: the cell
        itself takes the click, so it stays out of the pointer's way. The token
        plate is the sole way into the token picker, and belongs on every cell:
        a cell with a unit gets the stack markers, an empty one the board
        effects.
      -->
      <div class="board-field__overlay" data-testid="board-field-overlay">
        <span
          v-if="!tokensAt(cell).length"
          class="board-field__hint"
          data-testid="board-field-hint"
          :data-hint="unitAt(cell) ? 'swap' : 'add'"
          aria-hidden="true"
        >
          <svg v-if="!unitAt(cell)" class="board-field__plus" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <!-- Two arrows passing each other: the click swaps this card for another. -->
          <svg v-else class="board-field__swap" viewBox="0 0 24 24">
            <circle class="board-field__swap-disc" cx="12" cy="12" r="11.2" />
            <path d="M5.5 9.5H17m-3-3 3 3-3 3" />
            <path d="M18.5 14.5H7m3 3-3-3 3-3" />
          </svg>
        </span>
        <button
          v-if="tokensAt(cell).length < MAX_TOKENS"
          class="board-field__add-token"
          type="button"
          data-testid="board-field-add-token"
          @click.stop="openTokenPicker(cell)"
        >
          <svg class="board-field__token-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          Add token
        </button>
      </div>
      <slot v-bind="cell" :unit="unitAt(cell)" />
    </div>

    <UnitPickerDialog
      v-if="activeCell"
      @select="place"
      @close="activeCell = null"
    />

    <TokenPickerDialog
      v-if="activeToken"
      :key="tokenScope"
      :scope="tokenScope"
      @select="placeToken"
      @close="activeToken = null"
    />

    <!--
      The card under the pointer. It rides on `body` because the board it came
      from is scaled and clipped, and it stays out of the pointer's way so the
      cell beneath goes on reporting itself.
    -->
    <Teleport to="body">
      <div
        v-if="drag"
        class="board-field__ghost"
        data-testid="board-field-ghost"
        :data-unit="drag.unit"
        :style="{
          width: `${drag.width}px`,
          height: `${drag.height}px`,
          transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
        }"
        aria-hidden="true"
      >
        <img :src="unitImage(drag.unit)" alt="" draggable="false" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.board-field {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(5, 1fr);
  width: 100%;
  height: 100%;
}

.board-field__cell {
  position: relative;
  /* The hover affordances size themselves off the cell — see `cqw` below. */
  container-type: size;
  min-width: 0;
  min-height: 0;
  cursor: pointer;
  background: transparent;
  transition: background 0.2s ease;
}

.board-field .board-field__cell:hover {
  border-radius: 4%;
  background: var(--h3-hint-tint);
}

/*
  While a card is in the air the board stops answering the hover: the cell the
  pointer is over says whether the card may land there instead, and the plates
  and hints underneath would only read as an invitation to click.
*/
.board-field.is-dragging,
.board-field.is-dragging .board-field__cell {
  cursor: grabbing;
}

.board-field.is-dragging .board-field__overlay {
  opacity: 0;
}

.board-field.is-dragging .board-field__cell:hover {
  background: transparent;
}

.board-field.is-dragging .board-field__cell[data-drop='ok'] {
  border-radius: 4%;
  background: var(--h3-hint-tint);
  box-shadow: inset 0 0 0 2px var(--h3-hint-ink);
}

/* Warm, like every other refusal on this board. */
.board-field.is-dragging .board-field__cell[data-drop='no'] {
  border-radius: 4%;
  background: rgba(120, 32, 20, 0.3);
  box-shadow: inset 0 0 0 2px rgba(255, 190, 160, 0.6);
}

/* The card is being carried; what is left in the cell is only its place. */
.board-field__card.is-carried {
  opacity: 0.28;
}

.board-field__ghost {
  position: fixed;
  top: 0;
  left: 0;
  /* Over the board and its controls, under any dialog. */
  z-index: 50;
  opacity: 0.92;
  pointer-events: none;
  will-change: transform;
}

.board-field__ghost img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.75));
}

/*
  Tokens are laid out by wrapping, not by counting: the box is only wide enough
  for two, so one centres, two share a row, and the third and fourth drop to a
  second row under them. Sizes are in `cqw` — a share of the cell — so the whole
  arrangement holds at any zoom. The side padding is derived from the token size
  so the box always fits exactly two across, whichever size is in play.
*/
.board-field__tokens {
  --h3-token-gap: 4cqw;

  position: absolute;
  inset: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: var(--h3-token-gap);
  padding: 0 calc((100cqw - 2 * var(--h3-token-size) - var(--h3-token-gap)) / 2);
  pointer-events: none;
}

/*
  A token on a unit is a marker read against the card, so it stays small; one on
  bare ground is the whole point of the cell, so it takes the room.
*/
.board-field__tokens--on-unit {
  --h3-token-size: 23cqw;
}

.board-field__tokens--on-field {
  --h3-token-size: 39cqw;
}

.board-field__token {
  position: relative;
  display: block;
  width: var(--h3-token-size);
  height: var(--h3-token-size);
  pointer-events: auto;
}

.board-field__token-art {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  cursor: pointer;
  background: none;
  border: 0;
  transition:
    transform 0.12s ease,
    filter 0.12s ease;
}

.board-field__token-art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7));
}

.board-field__token:hover .board-field__token-art,
.board-field__token-art:focus-visible {
  outline: none;
  transform: scale(1.08);
  filter: brightness(1.15) drop-shadow(0 0 5cqw rgba(249, 219, 156, 0.75));
}

.board-field__token-remove {
  position: absolute;
  top: -8%;
  right: -8%;
  display: flex;
  width: 40%;
  padding: 0;
  color: var(--h3-hint-ink);
  cursor: pointer;
  background: none;
  border: 0;
  opacity: 0;
  transition:
    opacity 0.12s ease,
    color 0.12s ease;
}

.board-field__token:hover .board-field__token-remove,
.board-field__token-remove:focus-visible {
  opacity: 1;
}

.board-field__token-remove:hover {
  color: #ffbea0;
}

.board-field__token-remove svg {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
}

.board-field__token-remove-disc {
  fill: var(--h3-hint-ground);
  stroke: var(--h3-hint-edge);
  stroke-width: 1;
}

.board-field__token-remove:hover .board-field__token-remove-disc {
  stroke: currentColor;
}

/*
  The affordances sit above the cell but never take its clicks: the stack is
  inert, and only the token plate comes alive while the cell is hovered — so a
  click anywhere else still opens the unit picker.
*/
.board-field__overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.board-field__cell:hover .board-field__overlay,
.board-field__cell:focus-within .board-field__overlay {
  opacity: 1;
}

.board-field__hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--h3-hint-ink);
}

.board-field__plus,
.board-field__swap {
  width: 20%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.85));
}

/* The arrows land on artwork, not bare board, so they bring their own ground. */
.board-field__swap {
  width: 20%;
  stroke-width: 1.8;
}

.board-field__swap-disc {
  fill: var(--h3-hint-ground);
  stroke: var(--h3-hint-edge);
  stroke-width: 1;
}

/*
  A small brass plate, in the spirit of `.h3-btn` but quieter: it lies over the
  artwork, so it stays translucent and skips the button's heavy bevel. Sized in
  container units, so the label keeps its proportion of the cell at any zoom.
*/
.board-field__add-token {
  position: absolute;
  bottom: 7%;
  left: 50%;
  display: flex;
  gap: 0.4em;
  align-items: center;
  justify-content: center;
  max-width: 96%;
  padding: 0.32em 0.6em;
  font-family: var(--h3-font-display);
  font-size: 8cqw;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.03em;
  white-space: nowrap;
  color: var(--h3-hint-ink);
  text-shadow: 0 1px 2px #000;
  cursor: pointer;
  background-image: linear-gradient(180deg, rgba(58, 40, 18, 0.9), rgba(18, 12, 5, 0.94));
  border: 1px solid rgba(181, 140, 74, 0.55);
  border-radius: var(--h3-radius);
  box-shadow:
    inset 0 1px 0 rgba(255, 232, 180, 0.18),
    0 2px 6px rgba(0, 0, 0, 0.6);
  transform: translateX(-50%);
  transition:
    border-color 0.2s ease,
    filter 0.2s ease,
    color 0.2s ease;
}

.board-field__cell:hover .board-field__add-token,
.board-field__cell:focus-within .board-field__add-token {
  pointer-events: auto;
}

.board-field__add-token:hover,
.board-field__add-token:focus-visible {
  /* The same tint the cell uses, laid over the plate rather than under it. */
  color: var(--h3-gold-bright);
  background-image:
    linear-gradient(0deg, var(--h3-hint-tint), var(--h3-hint-tint)),
    linear-gradient(180deg, rgba(58, 40, 18, 0.9), rgba(18, 12, 5, 0.94));
  border-color: var(--h3-hint-ink);
  outline: none;
}

.board-field__token-icon {
  width: 1.15em;
  height: 1.15em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.board-field__cell.col-1 {
  margin-right: 5%;
}

.board-field__cell.col-2 {
  margin-left: 2%;
  margin-right: 3%;
}

.board-field__cell.col-3 {
  margin-left: 3.6%;
  margin-right: 1.5%;
}

.board-field__cell.col-4 {
  margin-left: 5%;
}

.board-field__cell.row-1 {
  margin-bottom: 3.5%;
}

.board-field__cell.row-2 {
  margin-top: 2.8%;
  margin-bottom: 0.5%;
}

.board-field__cell.row-3 {
  margin-top: 5%;
  margin-bottom: 4.2%;
}

.board-field__cell.row-4 {
  margin-top: 2%;
  margin-bottom: 1.5%;
}

.board-field__cell.row-5 {
  margin-top: 5%;
}
</style>
