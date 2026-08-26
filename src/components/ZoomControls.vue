<script setup>
import Homm3Button from './Homm3Button.vue'

defineProps({
  scale: { type: Number, required: true },
  canZoomIn: { type: Boolean, default: true },
  canZoomOut: { type: Boolean, default: true },
})

const emit = defineEmits(['zoom-in', 'zoom-out', 'reset'])
</script>

<template>
  <div class="zoom-controls h3-panel" data-no-drag>
    <button
      class="zoom-readout h3-title"
      type="button"
      title="Скинути масштаб"
      data-testid="zoom-readout"
      @click="emit('reset')"
    >
      {{ Math.round(scale * 100) }}%
    </button>
    <div class="zoom-buttons">
      <Homm3Button
        title="Zoom out"
        data-testid="zoom-out"
        :disabled="!canZoomOut"
        @click="emit('zoom-out')"
      >
        &minus;
      </Homm3Button>
      <Homm3Button
        title="Zoom in"
        data-testid="zoom-in"
        :disabled="!canZoomIn"
        @click="emit('zoom-in')"
      >
        &plus;
      </Homm3Button>
    </div>
  </div>
</template>

<style scoped>
.zoom-controls {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.zoom-readout {
  padding: 2px 4px 4px;
  font-size: 13px;
  color: var(--h3-gold);
  text-align: center;
  letter-spacing: 0.1em;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--h3-bevel-dark);
  border-radius: var(--h3-radius);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
}

.zoom-readout:hover {
  color: var(--h3-gold-bright);
}

.zoom-buttons {
  display: flex;
  gap: 8px;
}
</style>
