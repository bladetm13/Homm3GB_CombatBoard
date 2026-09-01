<script setup>
import { computed } from 'vue'
import CardFoil from './CardFoil.vue'
import { useEscapeKey } from '../../composables/useEscapeKey'
import { isFoilUnit, unitImage, unitLabel } from './unitAssets'

/**
 * A card blown up to fill the screen, so the rules text printed on it can
 * actually be read. Opened from the eye on a `Card`, on the board and in the
 * picker alike — which is why it teleports out and sits above both.
 */
const props = defineProps({
  unit: { type: String, required: true },
})

const emit = defineEmits(['close'])

const src = computed(() => unitImage(props.unit))
const label = computed(() => unitLabel(props.unit))
const foil = computed(() => isFoilUnit(props.unit))

useEscapeKey(() => emit('close'))
</script>

<template>
  <Teleport to="body">
    <div
      class="preview__backdrop"
      data-testid="card-preview-backdrop"
      @click.self="emit('close')"
    >
      <figure class="preview" role="dialog" :aria-label="label" data-testid="card-preview">
        <!--
          The frame shrinks to the artwork, so the sheen laid over it lines up
          with the card whatever the screen leaves room for.
        -->
        <div class="preview__frame" :class="{ 'is-foil': foil }">
          <img
            class="preview__art"
            :src="src"
            :alt="label"
            decoding="async"
            draggable="false"
          />
          <CardFoil v-if="foil" class="preview__foil" :unit="unit" />
        </div>
        <figcaption class="preview__caption h3-title">{{ label }}</figcaption>
      </figure>
      <button
        class="preview__close h3-btn"
        type="button"
        aria-label="Close"
        data-testid="card-preview-close"
        @click="emit('close')"
      >
        &times;
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.preview__backdrop {
  position: fixed;
  inset: 0;
  /* Above the pickers (100): a preview is always opened from one of them. */
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4vh 4vw;
  background: rgba(6, 4, 2, 0.85);
  backdrop-filter: blur(4px);
}

.preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 0;
  pointer-events: none;
}

.preview__frame {
  position: relative;
  display: inline-block;
  line-height: 0;
}

.preview__frame.is-foil {
  isolation: isolate;
}

.preview__art {
  display: block;
  max-width: min(560px, 90vw);
  max-height: 84vh;
  object-fit: contain;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.8));
}

/*
  Nothing here is hovered — the card was opened to be looked at — so the sheen
  runs on its own, a touch slower and stronger than on the small card.
*/
.preview__foil {
  opacity: var(--card-foil-hover, 0.26);
  animation: card-foil-sweep 2.4s ease-in-out infinite alternate;
}

@media (prefers-reduced-motion: reduce) {
  .preview__foil {
    animation: none;
  }
}

.preview__caption {
  font-size: 15px;
}

.preview__close {
  --h3-btn-size: 34px;
  position: absolute;
  top: 2vh;
  right: 2vw;
  font-size: 19px;
}
</style>
