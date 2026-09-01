/**
 * What a picker remembers between openings: which groups the user left
 * expanded, and where the list was scrolled to when it closed.
 *
 * The dialogs are mounted fresh every time they open — that is what keeps their
 * lazy groups cheap — so the state cannot live in the component. It lives here
 * instead, one entry per picker, for as long as the page does. Nothing is
 * written to storage: this is where the user was a moment ago, not a setting.
 *
 * Entries are plain mutable objects on purpose. They are read while a dialog is
 * being set up and written as the user clicks, and nothing renders off them
 * after that, so there is nothing for reactivity to do.
 */
const memories = new Map()

/**
 * The remembered state for `key`, created empty on first ask. The token picker
 * keys by scope as well, since field and unit tokens are different lists.
 */
export function pickerMemory(key) {
  let memory = memories.get(key)
  if (!memory) {
    memory = { open: {}, scrollTop: 0 }
    memories.set(key, memory)
  }
  return memory
}

/** Forgets everything. For tests — nothing in the app clears this. */
export function clearPickerMemory() {
  memories.clear()
}
