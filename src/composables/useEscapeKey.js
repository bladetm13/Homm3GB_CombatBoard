import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Closes on Escape — but only the topmost dialog.
 *
 * Dialogs stack: a card preview opens over the unit picker, and one Escape
 * should dismiss the preview alone. Listeners on `document` all fire in the
 * order they were added, so the picker's would run first no matter which
 * dialog is on top; a single listener walking a stack is what keeps the two in
 * order. Last mounted wins, which is the same thing as topmost.
 */
const handlers = []

function onKeydown(event) {
  if (event.key !== 'Escape') return
  handlers.at(-1)?.(event)
}

export function useEscapeKey(handler) {
  onMounted(() => {
    handlers.push(handler)
    if (handlers.length === 1) document.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    const index = handlers.lastIndexOf(handler)
    if (index !== -1) handlers.splice(index, 1)
    if (!handlers.length) document.removeEventListener('keydown', onKeydown)
  })
}
