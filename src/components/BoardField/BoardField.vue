<script setup>
import { computed, ref } from 'vue'
import Card from './Card.vue'
import TokenPickerDialog from './TokenPickerDialog.vue'
import UnitPickerDialog from './UnitPickerDialog.vue'
import { TOKEN_SCOPE } from './tokenConstants'

const emit = defineEmits(['cell-click', 'place', 'place-token', 'remove'])
const units = defineModel('units', { type: Object, default: () => ({}) })
const activeCell = ref(null)
const activeTokenCell = ref(null)

const cellKey = (cell) => `${cell.row}-${cell.col}`
const unitAt = (cell) => units.value[cellKey(cell)]

const cells = computed(() =>
  Array.from({ length: 20 }, (_, index) => ({
    index,
    row: Math.floor(index / 4) + 1,
    col: (index % 4) + 1,
  })),
)

function openPicker(cell) {
  activeCell.value = cell
  emit('cell-click', cell)
}

/**
 * The token plate stops the click from reaching the cell, so it has to
 * announce the cell itself — from the outside, a click anywhere in a cell still
 * emits `cell-click`.
 */
function openTokenPicker(cell) {
  activeTokenCell.value = cell
  emit('cell-click', cell)
}

/**
 * A token is offered by where it can go: a stack marker on a unit, a board
 * effect on bare ground. The cell under the plate decides which set opens.
 */
const tokenScope = computed(() =>
  activeTokenCell.value && unitAt(activeTokenCell.value) ? TOKEN_SCOPE.UNIT : TOKEN_SCOPE.FIELD,
)

function place(unit) {
  const cell = activeCell.value
  if (!cell) return
  units.value = { ...units.value, [cellKey(cell)]: unit }
  activeCell.value = null
  emit('place', { ...cell, unit })
}

function placeToken(token) {
  const cell = activeTokenCell.value
  if (!cell) return
  activeTokenCell.value = null
  emit('place-token', { ...cell, token })
}

function removeAt(cell) {
  const key = cellKey(cell)
  const unit = units.value[key]
  const { [key]: _removed, ...rest } = units.value
  units.value = rest
  emit('remove', { ...cell, unit })
}
</script>

<template>
  <div
    class="board-field"
    data-testid="board-field"
  >
    <div
      v-for="cell in cells"
      :key="cell.index"
      :class="`board-field__cell row-${cell.row} col-${cell.col}`"
      data-testid="board-field-cell"
      :data-row="cell.row"
      :data-col="cell.col"
      @click="openPicker(cell)"
    >
      <Card
        v-if="unitAt(cell)"
        :unit="unitAt(cell)"
        removable
        @remove="removeAt(cell)"
      />
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
      v-if="activeTokenCell"
      :key="tokenScope"
      :scope="tokenScope"
      @select="placeToken"
      @close="activeTokenCell = null"
    />
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
