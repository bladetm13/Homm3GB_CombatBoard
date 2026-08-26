<script setup>
import { computed, ref } from 'vue'
import Card from './Card.vue'
import UnitPickerDialog from './UnitPickerDialog.vue'

/**
 * The playable grid of the combat board: 4 columns x 5 rows of cells, matching
 * the grid printed on the artwork.
 *
 * The field fills whatever box it is placed in — the parent decides which part
 * of the board it covers, this component only divides that box into cells.
 *
 * Clicking a cell opens the unit picker; choosing a unit puts it in that cell.
 * Placed cards are `removable`, so hovering one reveals the cross that takes it
 * off the field. Placement is kept in a model, so the parent may bind
 * `v-model:units` to own the state, or leave it and let the field manage itself.
 */
const props = defineProps({
  cols: { type: Number, default: 4 },
  rows: { type: Number, default: 5 },
  /** Gap between cells, as a fraction of the cell size. */
  gap: { type: Number, default: 0.03 },
  /** Outlines every cell — useful when aligning the grid to the artwork. */
  debug: { type: Boolean, default: false },
})

const emit = defineEmits(['cell-click', 'place', 'remove'])

/** Placed units, keyed by `row-col`. */
const units = defineModel('units', { type: Object, default: () => ({}) })

/** The cell the picker was opened from, and where the pick will land. */
const activeCell = ref(null)

const cellKey = (cell) => `${cell.row}-${cell.col}`
const unitAt = (cell) => units.value[cellKey(cell)]

/** Row/col are 1-based to read the same way as the grid lines they map to. */
const cells = computed(() =>
  Array.from({ length: props.rows * props.cols }, (_, index) => ({
    index,
    row: Math.floor(index / props.cols) + 1,
    col: (index % props.cols) + 1,
  })),
)

function openPicker(cell) {
  activeCell.value = cell
  emit('cell-click', cell)
}

function place(unit) {
  const cell = activeCell.value
  if (!cell) return
  units.value = { ...units.value, [cellKey(cell)]: unit }
  activeCell.value = null
  emit('place', { ...cell, unit })
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
    :class="{ 'is-debug': debug }"
    :style="{
      '--field-cols': cols,
      '--field-rows': rows,
      '--field-gap': `${gap * 100}%`,
    }"
    data-testid="board-field"
  >
    <div
      v-for="cell in cells"
      :key="cell.index"
      class="board-field__cell"
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
      <slot v-bind="cell" :unit="unitAt(cell)" />
    </div>

    <UnitPickerDialog
      v-if="activeCell"
      @select="place"
      @close="activeCell = null"
    />
  </div>
</template>

<style scoped>
.board-field {
  display: grid;
  grid-template-columns: repeat(var(--field-cols), 1fr);
  grid-template-rows: repeat(var(--field-rows), 1fr);
  /* Fills whatever box the parent gives it. */
  width: 100%;
  height: 100%;
  gap: var(--field-gap);
}

.board-field__cell {
  position: relative;
  /* Cards inside a cell are positioned against the cell, not the board. */
  min-width: 0;
  min-height: 0;
  cursor: pointer;
}

.board-field.is-debug .board-field__cell {
  border: 1px dashed rgba(242, 217, 152, 0.75);
  border-radius: 4%;
  box-shadow: inset 0 0 12px rgba(242, 217, 152, 0.15);
}
</style>
