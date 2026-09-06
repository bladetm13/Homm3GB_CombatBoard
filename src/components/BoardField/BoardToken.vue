<script setup>
import { tokenImage, tokenLabel } from './tokenAssets'

/**
 * One token as it is laid on the board: the picture, and the hover-only cross
 * that takes it off again.
 *
 * The picture is itself the button — a click on it opens the picker over this
 * token, which is how one is swapped for another. That is the whole of what a
 * token does, and it does it the same wherever it is drawn: in a cell, or in
 * the popover that opens over a cell holding more than it can show. Which is
 * why this is a component rather than markup in `BoardField`.
 *
 * It takes its size from `--h3-token-size`, which whoever draws it sets — a
 * marker on a stack is small, a board effect on bare ground is not, and in the
 * popover they are all whatever fits three to a row.
 */
defineProps({
  token: { type: String, required: true },
  /** Which slot of the cell this is, which is what numbers its test hooks. */
  index: { type: Number, required: true },
  /** The hooks are `<testid>-<index>` and `<testid>-remove-<index>`. */
  testid: { type: String, default: 'board-field-token' },
})

defineEmits(['replace', 'remove'])
</script>

<template>
  <span class="board-token">
    <button
      class="board-token__art"
      type="button"
      :aria-label="`Replace ${tokenLabel(token)}`"
      :data-testid="`${testid}-${index}`"
      :data-token="token"
      @click.stop="$emit('replace')"
    >
      <img
        :src="tokenImage(token)"
        :alt="tokenLabel(token)"
        :title="tokenLabel(token)"
        decoding="async"
        draggable="false"
      />
    </button>
    <button
      class="board-token__remove"
      type="button"
      :aria-label="`Remove ${tokenLabel(token)}`"
      :data-testid="`${testid}-remove-${index}`"
      @click.stop="$emit('remove')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle class="board-token__remove-disc" cx="12" cy="12" r="11.2" />
        <path d="m8.4 8.4 7.2 7.2m0-7.2-7.2 7.2" />
      </svg>
    </button>
  </span>
</template>

<style scoped>
.board-token {
  position: relative;
  display: block;
  width: var(--h3-token-size);
  height: var(--h3-token-size);
  /* The row it stands in is inert so the cell keeps its click; a token is not. */
  pointer-events: auto;
}

.board-token__art {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  cursor: pointer;
  background: none;
  border: 0;
  transition:
    transform 0.12s ease,
    filter 0.12s ease;
}

.board-token__art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7));
}

.board-token:hover .board-token__art,
.board-token__art:focus-visible {
  outline: none;
  transform: scale(1.08);
  filter: brightness(1.15) drop-shadow(0 0 5cqw rgba(249, 219, 156, 0.75));
}

.board-token__remove {
  position: absolute;
  top: -8%;
  right: -8%;
  display: flex;
  width: 40%;
  padding: 0;
  color: var(--h3-hint-ink);
  cursor: pointer;
  background: none;
  border: 0;
  opacity: 0;
  /* Inert while it is invisible, so it never takes the click that replaces. */
  pointer-events: none;
  transition:
    opacity 0.12s ease,
    color 0.12s ease;
}

.board-token:hover .board-token__remove,
.board-token__remove:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

.board-token__remove:hover {
  color: #ffbea0;
}

/* A finger cannot hover, so the cross stands — see the same note in `Card`. */
@media (hover: none) and (pointer: coarse) {
  .board-token__remove {
    width: max(40%, 15px);
    opacity: 0.9;
    pointer-events: auto;
  }
}

.board-token__remove svg {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
}

.board-token__remove-disc {
  fill: var(--h3-hint-ground);
  stroke: var(--h3-hint-edge);
  stroke-width: 1;
}

.board-token__remove:hover .board-token__remove-disc {
  stroke: currentColor;
}
</style>
