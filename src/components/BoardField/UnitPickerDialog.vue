<script setup>
import { computed } from 'vue'
import Accordion from '../Accordion.vue'
import Card from './Card.vue'
import CustomAssets from './CustomAssets.vue'
import PickerDialog from './PickerDialog.vue'
import { CUSTOM_SCOPE } from './customAssets'
import { pickerMemory } from './pickerMemory'
import { UNITS, UNIT_TYPE_LABEL } from './constants'
import { unitFileName } from './unitAssets'
import { unitStock } from './unitStock'

const props = defineProps({
  /** The board's cell-to-card map, so each card can say how many are down. */
  placed: { type: Object, default: () => ({}) },
})

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

/**
 * Copies down against copies in the box, for every card the box limits. The
 * pick is never refused — a board that asks for more than the box holds is
 * only told so, in red.
 */
const stocks = computed(() => {
  const map = {}
  for (const group of groups) {
    for (const unit of group.units) {
      const stock = unitStock(unit, props.placed)
      if (stock) map[unit] = stock
    }
  }
  return map
})

const plural = (count, one, many) => (count === 1 ? one : many)

function stockTitle({ used, copies, twoSided }) {
  const lines = [
    `On the board: ${used} of the ${copies} ${plural(copies, 'copy', 'copies')} in the box.`,
  ]
  if (twoSided) lines.push('Its other side is the same card and counts against the same copies.')
  if (used > copies) lines.push('That is more than the box holds.')
  return lines.join(' ')
}
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
        <div v-for="unit in group.units" :key="unit" class="picker__item">
          <button
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
            <span
              v-if="stocks[unit]"
              class="picker__stock"
              :class="{ 'is-over': stocks[unit].used > stocks[unit].copies }"
              :title="stockTitle(stocks[unit])"
              :data-testid="`picker-stock-${unit}`"
            >
              {{ stocks[unit].used }}/{{ stocks[unit].copies }}
            </span>
          </button>
          <span class="picker__caption h3-title" :title="unitFileName(unit)">
            {{ unitFileName(unit) }}
          </span>
        </div>
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

.picker__item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.picker__cell {
  /* The unit art is 2090x2900 — keep that shape so nothing is letterboxed. */
  position: relative;
  aspect-ratio: 209 / 290;
  /* The counter in its corner is placed by the card's width, as the eye is. */
  container-type: inline-size;
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

/*
  Copies down of copies in the box. It sits in the bottom-right corner, clear
  of the eye, and turns red when the board asks for more than the box holds.
*/
.picker__stock {
  position: absolute;
  right: 5cqw;
  bottom: 5cqw;
  padding: 1px 8px;
  font-family: var(--h3-font-display);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--h3-gold-bright);
  text-shadow: 0 1px 1px #000;
  background: var(--h3-hint-ground);
  border: 1px solid var(--h3-hint-edge);
  border-radius: 12px;
  cursor: help;
}

.picker__stock.is-over {
  color: #fff;
  background: rgba(168, 64, 44, 0.92);
  border-color: #ffbea0;
}

/* The file's own name, small enough that a long one still fits the column. */
.picker__caption {
  font-size: 10px;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
}
</style>
