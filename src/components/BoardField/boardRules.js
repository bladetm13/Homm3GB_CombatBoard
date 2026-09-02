/**
 * The shape of the board, and the one rule about it that more than one file
 * needs to know.
 *
 * The grid is the one printed on the artwork — four columns across, five rows
 * down — and a cell is named by its place in it. An imported file is the reason
 * these live apart from the component: a key off the board has to be spotted
 * before anything is laid down.
 */

export const ROWS = 5
export const COLS = 4

/** How many tokens one cell holds — two rows of two, and no more. */
export const MAX_TOKENS = 4

/** A cell's key in the board's own state: `<row>-<col>`, both 1-based. */
export const cellKey = (cell) => `${cell.row}-${cell.col}`

/** Whether a key names a cell that exists. */
export function isCellKey(key) {
  const match = /^(\d+)-(\d+)$/.exec(String(key))
  if (!match) return false
  const row = Number(match[1])
  const col = Number(match[2])
  return row >= 1 && row <= ROWS && col >= 1 && col <= COLS
}
