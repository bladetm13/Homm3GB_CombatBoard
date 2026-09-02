/**
 * Warns before the tab is closed, reloaded or navigated away from, while there
 * is something on the board to lose.
 *
 * Nothing here is saved anywhere — the layout and any custom pictures live in
 * the page and die with it — so leaving really does throw the work away. The
 * browser writes the wording of the prompt itself; all a page may do is ask for
 * it, and only when the user has actually done something, or every reload of an
 * empty board would nag.
 */
import { onBeforeUnmount, onMounted } from 'vue'

export function useUnloadGuard(hasUnsavedWork) {
  function onBeforeUnload(event) {
    if (!hasUnsavedWork()) return
    event.preventDefault()
    // The legacy channel, still what some browsers actually read. The string is
    // never shown — they all print their own.
    event.returnValue = ''
    return ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
