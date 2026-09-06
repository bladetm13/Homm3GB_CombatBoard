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

/**
 * How many tokens a cell draws on the board — two rows of two, which is all the
 * artwork has room for.
 *
 * It is not a limit on how many a cell may hold: a stack carrying its markers
 * onto ground that is already marked ends up with more than four, and throwing
 * the difference away would lose the user's work without saying so. Past this
 * many the last slot goes to the chip that opens the rest — see
 * `board-field__crowd`.
 */
export const VISIBLE_TOKENS = 4

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
