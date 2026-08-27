<script setup>
import { computed } from 'vue'
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
// The sheen is masked by the artwork itself, so the CSS needs the same url.
const foilStyle = computed(() => ({ '--card-art': `url("${src.value}")` }))
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
    <span
      v-if="foil"
      class="card__foil"
      :style="foilStyle"
      data-testid="card-foil"
      aria-hidden="true"
    />
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

.card.is-foil {
  isolation: isolate;
}

.card__foil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  -webkit-mask-image: var(--card-art);
  mask-image: var(--card-art);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  background-image:
    linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.6) 48%, transparent 57%),
    linear-gradient(
      105deg,
      #ff2fd0 6%,
      #37e8ff 24%,
      #7dff8a 40%,
      #ffe14d 56%,
      #ff7a3c 72%,
      #a45cff 92%
    );
  background-size:
    240% 100%,
    200% 100%;
  background-position:
    30% 0,
    35% 0;
  mix-blend-mode: color-dodge;
  opacity: var(--card-foil-rest, 0);
  transition: opacity 0.18s ease;
}

.card.is-foil:hover .card__foil {
  opacity: var(--card-foil-hover, 0.2);
  animation: card-foil-sweep 1.5s ease-in-out infinite alternate;
}

@keyframes card-foil-sweep {
  from {
    background-position:
      95% 0,
      100% 0;
  }
  to {
    background-position:
      -35% 0,
      -30% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card.is-foil:hover .card__foil {
    animation: none;
  }
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
