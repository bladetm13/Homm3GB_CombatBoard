import { isCellKey } from './boardRules'
import {
  CUSTOM_SCOPE,
  customAssets,
  customImage,
  isCustomAsset,
  restoreCustomAsset,
} from './customAssets'
import { hasTokenImage } from './tokenAssets'
import { hasUnitImage } from './unitAssets'

/**
 * The board written down, and read back.
 *
 * A snapshot is what the export button hands the user: every card and token
 * where it stands, and every picture they brought in themselves — the picture
 * itself, base64 in the JSON, not a reference to a file on their disk. A
 * browser will not read a path back, so a reference would be a promise the
 * import could not keep; carrying the bytes costs a third again in size and
 * makes the file whole. The name it was picked under rides along for the user's
 * own sake, and as the last resort a hand-trimmed file has.
 *
 * Nothing is trusted on the way in. A file can be hand-edited, half-written or
 * from another board entirely, so every key is checked against the grid, every
 * value against the assets that actually exist, and every picture against being
 * a picture at all; whatever fails is counted and dropped rather than laid
 * down.
 */

export const SNAPSHOT_APP = 'homm3-combat-board'
export const SNAPSHOT_VERSION = 1

/**
 * The board, ready to be written out as JSON. Reading the pictures out of the
 * files they came from is what makes this a promise.
 */
export async function boardSnapshot({ units = {}, tokens = {} } = {}) {
  return {
    app: SNAPSHOT_APP,
    version: SNAPSHOT_VERSION,
    savedAt: new Date().toISOString(),
    custom: await customManifest(),
    board: {
      units: { ...units },
      tokens: Object.fromEntries(
        Object.entries(tokens).map(([key, list]) => [key, [...list]]),
      ),
    },
  }
}

/**
 * Reads a parsed file into a snapshot this board could lay down, throwing only
 * when the file is not a board at all. `dropped` is how much of it was thrown
 * away — an entry off the grid, a card this deck does not have, a fifth token
 * on a cell that holds four.
 */
export function readBoardSnapshot(data) {
  if (!isObject(data)) throw new Error('That file does not hold a board.')

  // A bare `{ units, tokens }` is a board too, whoever wrote it.
  const board = isObject(data.board) ? data.board : data
  if (!isObject(board.units) && !isObject(board.tokens)) {
    throw new Error('That file does not hold a board.')
  }

  const custom = readManifest(data.custom)
  const known = new Map(custom.map((entry) => [entry.id, entry]))
  const units = {}
  const tokens = {}
  let dropped = 0

  for (const [key, unit] of Object.entries(isObject(board.units) ? board.units : {})) {
    if (isCellKey(key) && isPlaceableUnit(unit, known)) units[key] = unit
    else dropped += 1
  }

  for (const [key, list] of Object.entries(isObject(board.tokens) ? board.tokens : {})) {
    if (!isCellKey(key) || !Array.isArray(list)) {
      dropped += 1
      continue
    }
    const kept = list.filter((token) => isPlaceableToken(token, known))
    dropped += list.length - kept.length
    // However many the cell carries: the board draws four and offers the rest.
    if (kept.length) tokens[key] = kept
  }

  return { custom, units, tokens, dropped }
}

/**
 * The part of a snapshot the board can show right now: whatever leans on a
 * picture that is not back yet waits until it is. `waiting` is how many pieces
 * that is.
 */
export function resolveSnapshot(snapshot) {
  const units = {}
  const tokens = {}
  let waiting = 0

  for (const [key, unit] of Object.entries(snapshot.units)) {
    if (isWaiting(unit)) waiting += 1
    else units[key] = unit
  }

  for (const [key, list] of Object.entries(snapshot.tokens)) {
    const ready = list.filter((token) => !isWaiting(token))
    waiting += list.length - ready.length
    if (ready.length) tokens[key] = ready
  }

  return { units, tokens, waiting }
}

/**
 * Unpacks the pictures the file carries, under the ids the board refers to them
 * by, and hands back how many came through. Anything that is not a picture, or
 * is too mangled to decode, is left out — the board simply goes without it.
 */
export function restorePictures(snapshot) {
  let restored = 0
  for (const entry of snapshot.custom) {
    if (customImage(entry.id)) continue
    const file = fileFromData(entry.data, entry.file)
    if (!file) continue
    restoreCustomAsset(entry, file)
    restored += 1
  }
  return restored
}

/**
 * The snapshot's pictures that are still not in this tab — a file written
 * before its pictures were carried, or one they were trimmed out of.
 */
export function missingPictures(snapshot) {
  return snapshot.custom.filter((entry) => !customImage(entry.id))
}

/** An id refers to a picture, and the picture is not back yet. */
function isWaiting(value) {
  return isCustomAsset(value) && !customImage(value)
}

/**
 * Every picture the user brought in, whether or not any of it is on the board.
 * The pickers hold all there are — one crossed off is gone from the board with
 * it, see `removeCustomAsset` — so the three lists are the whole manifest.
 */
async function customManifest() {
  const assets = Object.values(CUSTOM_SCOPE).flatMap((scope) => customAssets(scope))
  return Promise.all(assets.map(noteOf))
}

async function noteOf({ id, scope, label, file, blob }) {
  return { id, scope, label, file, data: await dataFromBlob(blob) }
}

/** The picture as a data URL: `data:image/png;base64,...`, ready for JSON. */
async function dataFromBlob(blob) {
  if (!blob) return ''
  const bytes = new Uint8Array(await blob.arrayBuffer())
  // A chunk at a time: a whole image spread into `fromCharCode` blows the stack.
  let binary = ''
  for (let at = 0; at < bytes.length; at += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000))
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

/** The picture back out of a data URL, or nothing if it is not one, or not a picture. */
function fileFromData(data, name) {
  const match = /^data:(image\/[\w.+-]+);base64,(.*)$/s.exec(String(data ?? ''))
  if (!match) return null

  try {
    const binary = atob(match[2])
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new File([bytes], name || 'picture', { type: match[1] })
  } catch {
    return null
  }
}

const SCOPES = new Set(Object.values(CUSTOM_SCOPE))
const TOKEN_SCOPES = new Set([CUSTOM_SCOPE.FIELD_TOKENS, CUSTOM_SCOPE.UNIT_TOKENS])

/** `custom/<scope>/<n>`, and the scope in the id is the scope on the entry. */
const isManifestEntry = (entry) =>
  isObject(entry) &&
  typeof entry.id === 'string' &&
  SCOPES.has(entry.scope) &&
  entry.id === `custom/${entry.scope}/${entry.id.slice(entry.id.lastIndexOf('/') + 1)}` &&
  /^\d+$/.test(entry.id.slice(entry.id.lastIndexOf('/') + 1))

function readManifest(list) {
  if (!Array.isArray(list)) return []
  return list.filter(isManifestEntry).map((entry) => ({
    id: entry.id,
    scope: entry.scope,
    label: typeof entry.label === 'string' ? entry.label : '',
    file: typeof entry.file === 'string' ? entry.file : '',
    data: typeof entry.data === 'string' ? entry.data : '',
  }))
}

/** A card this deck has, or one of the file's own pictures, filed as a card. */
function isPlaceableUnit(unit, known) {
  if (typeof unit !== 'string') return false
  if (isCustomAsset(unit)) return known.get(unit)?.scope === CUSTOM_SCOPE.UNITS
  return hasUnitImage(unit)
}

function isPlaceableToken(token, known) {
  if (typeof token !== 'string') return false
  if (isCustomAsset(token)) return TOKEN_SCOPES.has(known.get(token)?.scope)
  return hasTokenImage(token)
}

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
