<script setup>
import Accordion from '../Accordion.vue'
import Card from './Card.vue'
import CustomAssets from './CustomAssets.vue'
import PickerDialog from './PickerDialog.vue'
import { CUSTOM_SCOPE } from './customAssets'
import { pickerMemory } from './pickerMemory'
import { UNITS, UNIT_TYPE_LABEL } from './constants'

const emit = defineEmits(['select', 'close'])

/** Which groups the user left open last time; Castle only, on a first visit. */
const memory = pickerMemory('unit-picker')

/* The user's own cards come first, and the section stands open until closed. */
const customOpen = memory.open.custom ?? true

const groups = Object.entries(UNITS).map(([type, units], index) => ({
  type,
  label: UNIT_TYPE_LABEL[type],
  units: Object.values(units),
  open: memory.open[type] ?? index === 0,
}))
</script>

<template>
  <PickerDialog title="Choose a unit" memory-key="unit-picker" @close="emit('close')">
    <CustomAssets
      :scope="CUSTOM_SCOPE.UNITS"
      testid="picker"
      :default-open="customOpen"
      @select="emit('select', $event)"
      @toggle="memory.open.custom = $event"
    />
    <Accordion
      v-for="group in groups"
      :key="group.type"
      :title="group.label"
      :default-open="group.open"
      :data-testid="`picker-group-${group.type}`"
      @toggle="memory.open[group.type] = $event"
    >
      <template #meta>{{ group.units.length }}</template>
      <div class="picker__grid">
        <button
          v-for="unit in group.units"
          :key="unit"
          class="picker__cell"
          type="button"
          :data-testid="`picker-unit-${unit}`"
          @click="emit('select', unit)"
        >
          <Card :unit="unit" lazy />
          <!-- Same plus the board draws on an empty cell: this is what fills it. -->
          <span class="picker__add" aria-hidden="true">
            <svg class="picker__plus" viewBox="0 0 24 24">
              <circle class="picker__plus-disc" cx="12" cy="12" r="11.2" />
              <path d="M12 6.5v11M6.5 12h11" />
            </svg>
          </span>
        </button>
      </div>
    </Accordion>
  </PickerDialog>
</template>

<style scoped>
.picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--h3-card-column), 1fr));
  gap: 10px;
}

.picker__cell {
  /* The unit art is 2090x2900 — keep that shape so nothing is letterboxed. */
  position: relative;
  aspect-ratio: 209 / 290;
  padding: 0;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(181, 140, 74, 0.35);
  border-radius: 3px;
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease;
}

.picker__cell:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.65);
}

.picker__cell:focus-visible {
  outline: 1px solid var(--h3-gold);
  outline-offset: 2px;
}

/* Inert, like the board's own hint: the cell around it takes the click. */
.picker__add {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--h3-hint-ink);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.picker__cell:hover .picker__add,
.picker__cell:focus-visible .picker__add {
  opacity: 1;
}

.picker__plus {
  width: 20%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
}

.picker__plus-disc {
  fill: var(--h3-hint-ground);
  stroke: var(--h3-hint-edge);
  stroke-width: 1;
}
</style>
