<script setup>
import { computed } from 'vue'
import { unitImage, unitLabel } from './unitAssets'

/**
 * A single unit card. `unit` is an enum value from `constants.ts`, which is also
 * the path to its artwork.
 *
 * The card fills its container, so the same component works both as a picker
 * entry and as a piece on the board. `removable` adds the hover-only cross that
 * takes it off the field.
 */
const props = defineProps({
  unit: { type: String, required: true },
  removable: { type: Boolean, default: false },
})

const emit = defineEmits(['remove'])

const src = computed(() => unitImage(props.unit))
const label = computed(() => unitLabel(props.unit))
</script>

<template>
  <div class="card" :class="{ 'is-removable': removable }" data-testid="card" :data-unit="unit">
    <img class="card__art" :src="src" :alt="label" :title="label" draggable="false" />
    <button
      v-if="removable"
      class="card__remove"
      type="button"
      :aria-label="`Remove ${label}`"
      data-testid="card-remove"
      @click.stop="emit('remove')"
    >
      &times;
    </button>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  width: 100%;
  height: 100%;
}

.card__art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.6));
}

.card__remove {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  font-family: var(--h3-font-display);
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  color: var(--h3-gold-bright);
  cursor: pointer;
  background-image: linear-gradient(180deg, #8c2f22, #4a1610);
  border: 1px solid var(--h3-bevel-dark);
  border-radius: 50%;
  box-shadow:
    inset 1px 1px 0 rgba(255, 190, 160, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.7);
  /* Hidden until the card is hovered, so the board stays clean. */
  opacity: 0;
  transition: opacity 0.12s ease;
}

.card.is-removable:hover .card__remove,
.card__remove:focus-visible {
  opacity: 1;
}

.card__remove:hover {
  filter: brightness(1.25);
}
</style>
