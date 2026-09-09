<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BoardToken from './BoardToken.vue'
import Card from './Card.vue'
import TokenPickerDialog from './TokenPickerDialog.vue'
import UnitPickerDialog from './UnitPickerDialog.vue'
import {
  COLS,
  ROWS,
  VISIBLE_TOKENS,
  VISIBLE_TOKENS_ON_STACK_TOUCH,
  cellKey,
} from './boardRules'
import { hasCustomAssets } from './customAssets'
import { tokenScopeOf } from './tokenAssets'
import { TOKEN_SCOPE } from './tokenConstants'
import { unitImage } from './unitAssets'
import { useEscapeKey } from '../../composables/useEscapeKey'
import { useTouchScreen } from '../../composables/useTouchScreen'
import { useUnloadGuard } from '../../composables/useUnloadGuard'

const emit = defineEmits([
  'cell-click',
  'flip',
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

/*
  A cell's tokens, split by who they answer to. The markers were put on the
  stack and go wherever it goes; the rest were laid on the ground and stay in
  the cell, whoever walks over them — see `tokenScopeOf`.
*/
const stackTokensAt = (cell) =>
  tokensAt(cell).filter((token) => tokenScopeOf(token) === TOKEN_SCOPE.UNIT)
const fieldTokensAt = (cell) =>
  tokensAt(cell).filter((token) => tokenScopeOf(token) !== TOKEN_SCOPE.UNIT)

const touch = useTouchScreen()

/**
 * How many tokens this cell has room to draw. Four as the artwork is printed,
 * and two on a stack under a finger, where they are drawn big enough to be
 * worth aiming at — see `VISIBLE_TOKENS_ON_STACK_TOUCH`.
 */
const slotsOn = (cell) =>
  touch.value && unitAt(cell) ? VISIBLE_TOKENS_ON_STACK_TOUCH : VISIBLE_TOKENS

/**
 * More tokens than the cell has room to draw. The rest are not lost — the last
 * slot becomes the chip that opens every one of them.
 */
const crowded = (cell) => tokensAt(cell).length > slotsOn(cell)

/**
 * The tokens the cell draws itself. They all fit until the cell is crowded;
 * past that the last slot belongs to the chip, so one fewer is drawn than there
 * are slots.
 */
const shownTokensAt = (cell) =>
  crowded(cell) ? tokensAt(cell).slice(0, slotsOn(cell) - 1) : tokensAt(cell)

/**
 * Lays `list` on a cell, or takes the cell out of the model when nothing is
 * left on it. Hands back the new map rather than writing it, so a move can put
 * both of its cells down in one go.
 */
function withTokens(source, cell, list) {
  const key = cellKey(cell)
  return list.length ? { ...source, [key]: list } : withoutKey(source, key)
}

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
  closeCrowd()
  activeToken.value = { cell, index }
  emit('cell-click', cell)
}

/**
 * A token is offered by where it can go: a stack marker on a unit, a board
 * effect on bare ground. A token already down is replaced from the same set it
 * came from, which is asked of the token itself — a cell can hold both at once,
 * a stack standing on ground that was already marked, and there the cell has no
 * one answer to give.
 */
const tokenScope = computed(() => {
  const active = activeToken.value
  if (!active) return TOKEN_SCOPE.FIELD
  const replacing = active.index == null ? undefined : tokensAt(active.cell)[active.index]
  if (replacing !== undefined) return tokenScopeOf(replacing)
  return unitAt(active.cell) ? TOKEN_SCOPE.UNIT : TOKEN_SCOPE.FIELD
})

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

  const next = [...list]
  next[at] = token
  tokens.value = { ...tokens.value, [cellKey(cell)]: next }
  activeToken.value = null
  // `index` is the cell's own; a token's place in it is its `slot`.
  emit('place-token', { ...cell, token, slot: at })
}

function removeToken(cell, index) {
  const token = tokensAt(cell)[index]
  const next = tokensAt(cell).filter((_, i) => i !== index)
  tokens.value = withTokens(tokens.value, cell, next)
  emit('remove-token', { ...cell, token, slot: index })
}

/*
  The popover a crowded cell opens: every token on it, the four the cell draws
  and the ones it could not.

  It is opened by the chip standing in the cell's last slot, and it lies over
  the card, the width of the cell. The mouse opens it by arriving and closes it
  by leaving — the popover covers the chip it was opened from, so the pointer is
  already inside it. A finger has no arriving or leaving to offer, so touch taps
  the chip to open and taps away to close, which `onOutsidePress` hears.

  `crowded` is asked again on the way out: take enough tokens off through the
  popover's own crosses and there is nothing left it can show that the cell does
  not, so it puts itself away.
*/
const crowdCell = ref(null)

const crowdOpen = (cell) => crowdCell.value?.index === cell.index && crowded(cell)

const closeCrowd = () => (crowdCell.value = null)

/** A pointer that hovers opens it on arrival; a tap is touch's way in. */
function onChipEnter(event, cell) {
  if (event.pointerType === 'mouse') crowdCell.value = cell
}

function onChipClick(cell) {
  crowdCell.value = crowdOpen(cell) ? null : cell
}

/** Leaving it is how a mouse puts it away; a finger never leaves anything. */
function onCrowdLeave(event) {
  if (event.pointerType === 'mouse') closeCrowd()
}

/*
  A press anywhere but the popover puts it away — a click on the board, a tap
  beside it, or the mouse being held down to carry a card. The click that press
  is about to become is eaten, so dismissing the popover does not also open a
  picker over whatever it was dismissed onto.
*/
function onOutsidePress(event) {
  if (event.target?.closest?.('[data-testid="board-field-crowd"]')) return
  closeCrowd()
  swallowNextClick()
}

watch(crowdCell, (cell) => {
  if (cell) window.addEventListener('pointerdown', onOutsidePress, true)
  else window.removeEventListener('pointerdown', onOutsidePress, true)
})

onBeforeUnmount(() => window.removeEventListener('pointerdown', onOutsidePress, true))

/**
 * Turns the card over to its other printing, in place: the cell keeps its
 * tokens, and the stack is the same stack, drawn at its other size.
 *
 * Which card that is — and whether the card has one at all — is the card's own
 * business; the cell lays down what it is handed. See `flipUnit`.
 */
function flipAt(cell, unit) {
  const from = unitAt(cell)
  units.value = { ...units.value, [cellKey(cell)]: unit }
  emit('flip', { ...cell, from, unit })
}

function removeAt(cell) {
  const key = cellKey(cell)
  const unit = units.value[key]
  units.value = withoutKey(units.value, key)
  /*
    The markers belonged to the stack that stood here, and go with it: the cell
    is bare ground now, which is not a place unit tokens may be. What was laid
    on the ground was never the stack's to take away, and is left where it is.
  */
  const kept = fieldTokensAt(cell)
  if (kept.length !== tokensAt(cell).length) tokens.value = withTokens(tokens.value, cell, kept)
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
 * When the last gesture that leaves a stray click behind ended — a drag let go,
 * or the popover of a crowded cell dismissed by a press somewhere else.
 *
 * A drag that begins and ends over one cell leaves a click behind, and the cell
 * would read it as a bare click and open the picker over the card just moved —
 * so that one click is eaten. Two things about how it is eaten matter:
 *
 * The listener is on `window`, not on the field. The click lands on whatever
 * the pointer went down and came up over have in common, which for a drag that
 * ended outside the grid is some ancestor of the field — a listener on the
 * field would never see it, and would still be waiting to eat the user's next
 * real click.
 *
 * And it is a moment in time rather than a flag, because a drag may leave no
 * click at all: a touch drag sends none, and a flag would sit armed until
 * something else came along to be swallowed instead.
 */
let droppedAt = 0

/** How long after a release a click can still be the one it left behind. */
const DROP_CLICK_MS = 250

/** Arms that swallow for a gesture that is about to leave a click behind. */
function swallowNextClick() {
  droppedAt = Date.now()
}

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
  /*
    And only the first finger down. A second one is the board's — half of the
    pinch that zooms it — and a card is carried by one hand or not at all. This
    is the half of that rule that stops a card being picked up mid-pinch;
    `onSecondPointer` below is the half that puts one down again.
  */
  if (!event.isPrimary) return
  // The card's own controls — the eye and the cross — are not handles.
  if (event.target?.closest?.('button')) return

  const handle = event.currentTarget
  const rect = handle.getBoundingClientRect()
  /*
    Touch hands the pointer to the element it went down on, which would hide
    every cell the finger then passes over. The card does not need it.

    `event.target` first, because that is where the browser puts it: a press on
    a card lands on the artwork inside it, not on the card this listener is
    bound to. Asking only the card to let go of a capture it never held is a
    silent no-op, and the finger then drags a ghost no cell can hear — the card
    rides along and comes home again, every time.
  */
  releaseCapture(event.target, event.pointerId)
  releaseCapture(handle, event.pointerId)

  droppedAt = 0
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
  window.addEventListener('pointerdown', onSecondPointer)
}

/*
  A second finger anywhere means the board is being pinched, and a card cannot
  be carried by a board that is moving underneath it. It goes back where it came
  from and the gesture is the board's.

  The listener hears the very press that added it — a listener put on `window`
  mid-dispatch still runs when the event reaches `window` — so the pointer that
  started the carry has to be let through.
*/
function onSecondPointer(event) {
  if (!press || event.pointerId === press.pointerId) return
  endDrag()
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

  swallowNextClick()
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
  window.removeEventListener('pointerdown', onSecondPointer)
  press = null
  drag.value = null
}

useEscapeKey(() => {
  if (drag.value) endDrag()
  else closeCrowd()
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
    them away. A board effect is the other way about: it was laid on the cell,
    and a stack walking off it does not pick it up. Whatever the cell arrived at
    already held keeps its place, and the arriving markers fall in behind it —
    all of them. The cell draws four and offers the rest behind a chip, which is
    a better answer than quietly dropping whichever ones would not fit.
  */
  const carried = stackTokensAt(from)
  if (carried.length) {
    const next = [...tokensAt(to), ...carried]
    tokens.value = withTokens(withTokens(tokens.value, from, fieldTokensAt(from)), to, next)
  }

  emit('move', { from: { ...from }, to: { ...to }, unit })
}

/** The click a finished drag leaves behind — caught before anything sees it. */
function swallowDropClick(event) {
  if (!droppedAt || Date.now() - droppedAt > DROP_CLICK_MS) return
  droppedAt = 0
  event.stopPropagation()
  event.preventDefault()
}

onMounted(() => window.addEventListener('click', swallowDropClick, true))
onBeforeUnmount(() => window.removeEventListener('click', swallowDropClick, true))

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
    @pointerleave="onFieldLeave"
  >
    <div
      v-for="cell in cells"
      :key="cell.index"
      :class="[
        `board-field__cell row-${cell.row} col-${cell.col}`,
        { 'is-crowd-open': crowdOpen(cell) },
      ]"
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
        flippable
        class="board-field__card"
        :class="{ 'is-carried': drag?.from.index === cell.index }"
        data-no-drag
        @pointerdown="startPress(cell, $event)"
        @remove="removeAt(cell)"
        @flip="flipAt(cell, $event)"
      />
      <!--
        The tokens laid on this cell — on the card if there is one, on the bare
        ground if not. They wrap after two, so three read as a row of two and a
        single below it, and a fourth fills the square.

        A cell may carry more than those four: a stack walks its markers onto
        ground that is already marked, and none of them are thrown away. Past
        four the last slot goes to the chip below, which opens every one of them
        over the card.
      -->
      <div
        v-if="tokensAt(cell).length"
        class="board-field__tokens"
        :class="unitAt(cell) ? 'board-field__tokens--on-unit' : 'board-field__tokens--on-field'"
        data-testid="board-field-tokens"
      >
        <BoardToken
          v-for="(token, index) in shownTokensAt(cell)"
          :key="index"
          :token="token"
          :index="index"
          @replace="openTokenPicker(cell, index)"
          @remove="removeToken(cell, index)"
        />
        <button
          v-if="crowded(cell)"
          class="board-field__chip"
          type="button"
          :aria-label="`Show all ${tokensAt(cell).length} tokens`"
          :aria-expanded="crowdOpen(cell)"
          data-testid="board-field-token-more"
          @click.stop="onChipClick(cell)"
          @pointerenter="onChipEnter($event, cell)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle class="board-field__chip-disc" cx="12" cy="12" r="11.2" />
            <circle cx="6.6" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="17.4" cy="12" r="1.7" />
          </svg>
        </button>
      </div>

      <!--
        Every token the cell carries, three to a row, laid over the card at the
        cell's own width. They are the same tokens they are on the board — a
        click replaces, the cross takes off — because they are the same
        component. Clicking its own ground puts it away, as does leaving it.
      -->
      <div
        v-if="crowdOpen(cell)"
        class="board-field__crowd h3-panel"
        data-testid="board-field-crowd"
        data-no-drag
        @click.stop="closeCrowd()"
        @pointerleave="onCrowdLeave"
      >
        <BoardToken
          v-for="(token, index) in tokensAt(cell)"
          :key="index"
          :token="token"
          :index="index"
          testid="board-field-crowd-token"
          @replace="openTokenPicker(cell, index)"
          @remove="removeToken(cell, index)"
        />
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
          <!--
            Two arrows chasing each other round a circle: the click swaps this
            card for another. The turning reading is the one a browser's reload
            button has taught everybody, which straight arrows passing each
            other never quite gave.

            Both halves are the same arc on a circle of radius 6, one turned
            half a turn about the middle. Each sweeps 130 degrees, and the gaps
            left over are what stops the pair closing into a plain ring — each
            gap is where the arrow ahead of it points.

            The heads are filled triangles rather than two strokes off the tip,
            because on a curve one of those strokes lies back along the arc it
            came from and the pair reads as a blob rather than an arrow.
          -->
          <svg v-else class="board-field__swap" viewBox="0 0 24 24">
            <circle class="board-field__swap-disc" cx="12" cy="12" r="11.2" />
            <path d="M6.36 9.95A6 6 0 0 1 17.2 9" />
            <path class="board-field__swap-head" d="M18.9 11.94 15.46 10 18.93 8Z" />
            <path d="M17.64 14.05A6 6 0 0 1 6.8 15" />
            <path class="board-field__swap-head" d="M5.1 12.06 8.54 14 5.07 16Z" />
          </svg>
        </span>
        <button
          class="board-field__add-token"
          type="button"
          data-testid="board-field-add-token"
          @click.stop="openTokenPicker(cell)"
        >
          <svg class="board-field__token-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          <span class="board-field__add-token-label">Add token</span>
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
  /*
    What a token standing on bare ground is, which is as big as one gets. It is
    declared here rather than on the row that uses it because the popover is
    that row's sibling, and on a touch screen the two draw a token the same
    size — see the media query at the foot of this file.
  */
  --h3-token-ground: 39cqw;

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

.board-field.is-dragging .board-field__overlay,
.board-field.is-dragging .board-field__add-token {
  opacity: 0;
  pointer-events: none;
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
  --h3-token-size: var(--h3-token-ground);
}

/*
  On a touch screen a marker is drawn as big as a board effect, and the card
  gives up the room.

  A marker is small so the card can still be read under it, which holds as long
  as the cross that takes it off is a share of it. It is not: a finger needs a
  floor in pixels, and against a marker a quarter of a cell wide — twenty
  points, on a board scaled to fit a phone — that floor is most of the token.
  A cross that covers what it is attached to is worse than a card read through
  a bigger marker.
*/
@media (hover: none) and (pointer: coarse) {
  /*
    And down the middle of the card rather than across it.

    Two of these side by side are as wide as the card they stand on, and the
    card's own stats are printed down its left edge — which is the half of it a
    player actually needs to read. In a column they clear that edge, and the
    artwork shows either side of them. Two is all a column holds; a third token
    turns the second into the chip, as a fifth does on bare ground.
  */
  .board-field__tokens--on-unit {
    --h3-token-size: var(--h3-token-ground);

    flex-direction: column;
    /* The side padding fits exactly two across, which a column does not need. */
    padding: 0;
  }
}

/*
  The chip that stands in the last slot of a crowded cell: the same dark disc
  the board draws its other hints on, with the three dots that say there is more
  here than is being shown.
*/
.board-field__chip {
  display: block;
  width: var(--h3-token-size);
  height: var(--h3-token-size);
  padding: 0;
  color: var(--h3-hint-ink);
  cursor: pointer;
  background: none;
  border: 0;
  pointer-events: auto;
  transition:
    transform 0.12s ease,
    filter 0.12s ease;
}

.board-field__chip:hover,
.board-field__chip:focus-visible {
  outline: none;
  transform: scale(1.08);
  filter: brightness(1.15);
}

.board-field__chip svg {
  display: block;
  width: 100%;
  height: 100%;
  fill: currentColor;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7));
}

.board-field__chip-disc {
  fill: rgba(8, 5, 2, 0.88);
  stroke: var(--h3-hint-edge);
  stroke-width: 1;
}

/*
  The popover a crowded cell opens: the cell's own width, laid over the middle
  of the card so the chip it was opened from is underneath it — which is what
  lets a mouse close it simply by leaving. It is as tall as its rows need, three
  tokens to a row, and the token size is what makes that three: two gaps and two
  sides of padding are taken out of the cell's width before it is divided.
*/
.board-field__crowd {
  /*
    Three to a row, with room to spare: three tokens, two gaps and two sides of
    padding come to 90 of the cell's 100, and the ten left over are what keeps
    the third token up here. The panel's own border is why there has to be
    slack at all — a cell is a hundred-odd pixels wide, so the two pixels it
    takes are most of a percent, and an arrangement that adds up to exactly a
    hundred wraps rather than fits.

    Two to a row on a touch screen, where a token this small is mostly the
    cross that takes it off — see the media query at the foot of this file.
  */
  --h3-token-size: 24cqw;
  --h3-crowd-gap: 4cqw;

  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--h3-crowd-gap);
  justify-content: center;
  padding: 5cqw;
  transform: translateY(-50%);
}

/*
  A cell is a containment context, which is its own stacking context with it, so
  a popover reaching past the cell's edges would still be painted under the
  cells that come after it. While one is open, its cell goes above them.
*/
.board-field__cell.is-crowd-open {
  z-index: 2;
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

/* The arrowheads are the one part of the mark that is filled, not drawn. */
.board-field__swap-head {
  fill: currentColor;
  stroke: none;
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

/*
  A finger cannot hover, so on a touch screen the affordances stand rather than
  wait: the token plate is the only way into the token picker, and hidden it is
  either invisible-but-tappable or unreachable, both of which are worse than a
  little furniture on the board.

  What is shown is trimmed to earn its room on a small screen. The plate loses
  its label and becomes the plus in a chip, and keeps a floor in pixels so it
  stays worth aiming at when the whole board is scaled to fit a phone. The swap
  arrows go entirely: they only said a card can be tapped, on twenty cells at
  once, and a card that can be tapped is not news. The plus on bare ground
  stays at full strength: with no hover and no cursor to change shape, that plus
  is the whole of what tells a user an empty cell takes a card, and a hint drawn
  faintly enough to be missed is not a hint.
*/
@media (hover: none) and (pointer: coarse) {
  .board-field__overlay {
    opacity: 1;
  }

  /*
    The popover follows the markers above, for the same reason and to the same
    size: two to a row rather than three. Two of these, a gap and the padding
    come to 92 of the cell's 100 — a third could not stand beside them if it
    tried. It leaves the popover taller, which is the cheap half of the trade:
    it has the whole board to grow over, and a token in it is now the size a
    token is everywhere else.

    It stands here, below `.board-field__crowd` itself, because a media query
    carries no weight of its own — an override written above the rule it means
    to override simply never lands.
  */
  .board-field__crowd {
    --h3-token-size: var(--h3-token-ground);
  }

  .board-field__hint[data-hint='swap'] {
    display: none;
  }

  .board-field__add-token {
    padding: 0.3em;
    font-size: max(8cqw, 12px);
    opacity: 0.75;
    pointer-events: auto;
    bottom: 4%;
  }

  .board-field__add-token-label {
    display: none;
  }

  .board-field__token-icon {
    width: max(1.15em, 15px);
    height: max(1.15em, 15px);
  }
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
