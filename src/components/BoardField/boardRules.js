/**
 * The shape of the board, and the rules about it that more than one file needs
 * to know.
 *
 * The grid is the one printed on the artwork — four columns across, five rows
 * down — and a cell is named by its place in it. An imported file is the reason
 * these live apart from the component: a key off the board has to be spotted
 * before anything is laid down.
 */

import { UNIT_TOKENS_COMMON } from './tokenConstants'

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

/**
 * And how many a cell with a stack on it draws for a finger.
 *
 * A touch screen has no hover, so the cross that takes a token off is always
 * drawn, and it needs a floor in pixels to be worth aiming at — which is why a
 * marker there is as big as a board effect. Two of those side by side are the
 * width of the card they stand on, and the card's own stats are printed down
 * its left edge. So a stack wears two, in a column down the middle, where the
 * card can still be read either side of them.
 *
 * Bare ground has no card to hide and keeps its four.
 */
export const VISIBLE_TOKENS_ON_STACK_TOUCH = 2

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

/**
 * The markers a stack wears for one round only: it has acted, it has struck
 * back. A new round takes them off every card — see `withoutRoundTokens` — and
 * they are what a card shows first, in this order — see `tokenOrder`.
 */
export const ROUND_TOKENS = [UNIT_TOKENS_COMMON.ACTIVATION, UNIT_TOKENS_COMMON.RETALIATION]

/**
 * The board's tokens with every round marker taken off, and a cell left with
 * nothing on it taken out altogether. Hands back the same map when there was
 * nothing to take, so a new round on a quiet board changes nothing.
 */
export function withoutRoundTokens(tokens) {
  let next = tokens
  for (const [key, list] of Object.entries(tokens)) {
    const kept = list.filter((token) => !ROUND_TOKENS.includes(token))
    if (kept.length === list.length) continue
    next = { ...next }
    if (kept.length) next[key] = kept
    else delete next[key]
  }
  return next
}

/**
 * The order a cell draws its tokens in, as indices into the list it holds: the
 * round markers first, then everything else as it was laid down. The list
 * itself is never reordered, so a token keeps the slot it is replaced and
 * removed by.
 */
export function tokenOrder(list) {
  const rank = (token) => {
    const at = ROUND_TOKENS.indexOf(token)
    return at === -1 ? ROUND_TOKENS.length : at
  }
  return list.map((_, index) => index).sort((a, b) => rank(list[a]) - rank(list[b]) || a - b)
}
