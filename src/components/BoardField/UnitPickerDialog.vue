<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import Accordion from '../Accordion.vue'
import Card from './Card.vue'
import { UNITS, UNIT_TYPE_LABEL } from './constants'

const emit = defineEmits(['select', 'close'])

const groups = Object.entries(UNITS).map(([type, units]) => ({
  type,
  label: UNIT_TYPE_LABEL[type],
  units: Object.values(units),
}))

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="picker__backdrop" data-testid="picker-backdrop" @click.self="emit('close')">
      <div class="picker h3-panel" role="dialog" aria-label="Choose a unit" data-testid="picker">
        <header class="picker__head">
          <h2 class="picker__title h3-title">Choose a unit</h2>
          <button
            class="picker__close h3-btn"
            type="button"
            aria-label="Close"
            data-testid="picker-close"
            @click="emit('close')"
          >
            &times;
          </button>
        </header>

        <div class="picker__body">
          <Accordion
            v-for="(group, index) in groups"
            :key="group.type"
            :title="group.label"
            :default-open="index === 0"
            :data-testid="`picker-group-${group.type}`"
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
              </button>
            </div>
          </Accordion>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.picker__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3vh 2vw;
  background: rgba(6, 4, 2, 0.72);
  backdrop-filter: blur(3px);
}

.picker {
  display: flex;
  flex-direction: column;
  width: min(880px, 100%);
  max-height: 94vh;
  overflow: hidden;
}

.picker__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--h3-bevel-dark);
  box-shadow: 0 1px 0 rgba(181, 140, 74, 0.3);
}

.picker__title {
  margin: 0;
  font-size: 17px;
}

.picker__close {
  --h3-btn-size: 30px;
  font-size: 17px;
}

.picker__body {
  overflow-y: auto;
}

.picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
  gap: 10px;
}

.picker__cell {
  /* The unit art is 2090x2900 — keep that shape so nothing is letterboxed. */
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
</style>
