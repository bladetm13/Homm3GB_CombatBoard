<script setup>
import { computed, ref } from 'vue'
import CardFoil from './CardFoil.vue'
import CardPreviewDialog from './CardPreviewDialog.vue'
import { isFoilUnit, unitImage, unitLabel } from './unitAssets'

/**
 * A single unit card. `unit` is an enum value from `constants.ts`, which is also
 * the path to its artwork.
 *
 * The card fills its container, so the same component works both as a picker
 * entry and as a piece on the board. `removable` adds the hover-only cross that
 * takes it off the field. `lazy` defers the artwork until the card scrolls into
 * view — worth it for the picker's long lists, pointless for the few pieces on
 * the board.
 *
 * `_pack` units get the holographic treatment on top of the artwork — see
 * `isFoilUnit`.
 *
 * The eye is on every card, wherever it is shown: at card size the printed
 * rules text is unreadable, so the card carries its own way of being read.
 */
const props = defineProps({
  unit: { type: String, required: true },
  removable: { type: Boolean, default: false },
  lazy: { type: Boolean, default: false },
})

const emit = defineEmits(['remove'])

const src = computed(() => unitImage(props.unit))
const label = computed(() => unitLabel(props.unit))
const foil = computed(() => isFoilUnit(props.unit))

const previewing = ref(false)
</script>

<template>
  <div
    class="card"
    :class="{ 'is-removable': removable, 'is-foil': foil }"
    data-testid="card"
    :data-unit="unit"
  >
    <img
      class="card__art"
      :src="src"
      :alt="label"
      :title="label"
      :loading="lazy ? 'lazy' : 'eager'"
      decoding="async"
      draggable="false"
    />
    <CardFoil v-if="foil" class="card__foil" :unit="unit" />
    <button
      class="card__preview"
      type="button"
      :aria-label="`Preview ${label}`"
      data-testid="card-preview-open"
      @click.stop="previewing = true"
    >
      <svg class="card__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="card__icon-disc" cx="12" cy="12" r="11.2" />
        <path d="M4.6 12S7.5 7.7 12 7.7 19.4 12 19.4 12 16.5 16.3 12 16.3 4.6 12 4.6 12Z" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    </button>
    <button
      v-if="removable"
      class="card__remove"
      type="button"
      :aria-label="`Remove ${label}`"
      data-testid="card-remove"
      @click.stop="emit('remove')"
    >
      <svg class="card__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="card__icon-disc" cx="12" cy="12" r="11.2" />
        <path d="m8.4 8.4 7.2 7.2m0-7.2-7.2 7.2" />
      </svg>
    </button>

    <CardPreviewDialog v-if="previewing" :unit="unit" @close="previewing = false" />
  </div>
</template>

<style scoped>
.card {
  position: relative;
  /*
    The corner controls are sized and inset in `cqw`, so the card has to be the
    container they measure. Without this they find whatever container happens to
    be above them — the board's cell on the field, the viewport in the picker,
    which is a hundred times wider.
  */
  container-type: inline-size;
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

.card.is-foil {
  isolation: isolate;
}

/* The sheen itself is `CardFoil`; the card only says when it comes out. */
.card.is-foil:hover .card__foil {
  opacity: var(--card-foil-hover, 0.2);
  animation: card-foil-sweep 1.5s ease-in-out infinite alternate;
}

@media (prefers-reduced-motion: reduce) {
  .card.is-foil:hover .card__foil {
    animation: none;
  }
}

/*
  The same disc-and-line hint the board and the picker draw, only smaller and
  tucked inside the card's own corners rather than hung off them: they read as
  controls on the artwork, not as badges stuck to the card.
*/
.card__preview,
.card__remove {
  position: absolute;
  top: 5cqw;
  display: flex;
  width: 12%;
  padding: 0;
  color: var(--h3-hint-ink);
  cursor: pointer;
  background: none;
  border: 0;
  /* Hidden until the card is hovered, so the board stays clean. */
  opacity: 0;
  transition:
    opacity 0.12s ease,
    color 0.12s ease;
}

.card__preview {
  left: 5cqw;
}

.card__remove {
  right: 5cqw;
}

.card:hover .card__preview,
.card__preview:focus-visible,
.card.is-removable:hover .card__remove,
.card__remove:focus-visible {
  opacity: 1;
}

.card__preview:hover {
  color: var(--h3-gold-bright);
}

/* Warm, not gold: the one control here that takes something away. */
.card__remove:hover {
  color: #ffbea0;
}

.card__icon {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
}

.card__icon-disc {
  fill: var(--h3-hint-ground);
  stroke: var(--h3-hint-edge);
  stroke-width: 1;
}

.card__preview:hover .card__icon-disc,
.card__remove:hover .card__icon-disc {
  stroke: currentColor;
}

</style>
