import { onBeforeUnmount, ref } from 'vue'

/**
 * Whether the board is being read with a finger rather than a pointer.
 *
 * Everything else the board does about touch it does in CSS, where it belongs
 * — see the `(hover: none) and (pointer: coarse)` blocks the components carry.
 * This is the one thing CSS cannot answer: how many tokens a cell draws before
 * the rest go behind a chip. The chip stands in the last slot, and which slot
 * that is is a question about what to render, not how to paint it.
 *
 * It is a live answer, not one read once: a window dragged onto a touchscreen,
 * or a device that changes its mind, is rare but costs nothing to follow.
 */
const QUERY = '(hover: none) and (pointer: coarse)'

export function useTouchScreen() {
  const touch = ref(false)

  const media = window.matchMedia?.(QUERY)
  if (!media) return touch

  touch.value = media.matches
  const onChange = (event) => (touch.value = event.matches)
  media.addEventListener?.('change', onChange)
  onBeforeUnmount(() => media.removeEventListener?.('change', onChange))

  return touch
}
