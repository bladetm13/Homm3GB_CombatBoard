<script setup>
import { computed, ref } from 'vue'
import Card from './Card.vue'
import UnitPickerDialog from './UnitPickerDialog.vue'

const emit = defineEmits(['cell-click', 'place', 'remove'])
const units = defineModel('units', { type: Object, default: () => ({}) })
const activeCell = ref(null)

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
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(5, 1fr);
  width: 100%;
  height: 100%;
}

.board-field__cell {
  position: relative;
  min-width: 0;
  min-height: 0;
  cursor: pointer;
}

.board-field .board-field__cell:hover {
  border-radius: 4%;
  background: rgba(242, 217, 152, 0.25);
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
