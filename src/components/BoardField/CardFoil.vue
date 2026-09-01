<script setup>
import { computed } from 'vue'
import { unitImage } from './unitAssets'

/**
 * The holographic sheen of a `_pack` printing, masked by the card's own artwork
 * so it never spills past the card's edges.
 *
 * It is only the sheen, not when to show it: at rest it is transparent, and
 * whoever places it decides what brings it out — a hover on the board and in
 * the picker, the open preview outright. Both drive it through the shared
 * `card-foil-sweep` animation.
 */
const props = defineProps({
  unit: { type: String, required: true },
})

// The sheen is masked by the artwork itself, so the CSS needs the same url.
const style = computed(() => ({ '--card-art': `url("${unitImage(props.unit)}")` }))
</script>

<template>
  <span class="card-foil" :style="style" data-testid="card-foil" aria-hidden="true" />
</template>

<style scoped>
.card-foil {
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
</style>
