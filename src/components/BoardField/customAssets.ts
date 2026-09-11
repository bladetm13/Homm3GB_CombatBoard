import { reactive } from 'vue'

/**
 * Pictures the user brings in themselves, for a card or a token this deck does
 * not have.
 *
 * They live in the open tab and nowhere else: nothing is uploaded, nothing is
 * written to storage, and a reload forgets every one of them — which is half of
 * what the board's unload guard warns about.
 *
 * An entry's `id` stands in for an enum value everywhere a built-in one would
 * go. `unitImage`, `tokenImage` and both label helpers fall back to this
 * registry, so a custom picture drops onto the board like any other card or
 * token, preview and all.
 *
 * The list in the picker is the whole of what exists: a picture crossed off it
 * is gone, and whatever was laid down from it goes with it — see
 * `removeCustomAsset`.
 */

/** Which of the three lists an image was added to — the asset folder it stands in for. */
export const CUSTOM_SCOPE = {
  UNITS: 'units',
  FIELD_TOKENS: 'field_tokens',
  UNIT_TOKENS: 'unit_tokens',
} as const

export type CustomScope = (typeof CUSTOM_SCOPE)[keyof typeof CUSTOM_SCOPE]

export interface CustomAsset {
  /** Doubles as the board's value for this picture, the way a path does. */
  id: string
  scope: CustomScope
  label: string
  /** The picked file's name — all a browser will say about where it came from. */
  file: string
  /** An object URL over the picked file — never a path into `assets/`. */
  url: string
  /** The file itself, kept so an export can carry the picture, not just its name. */
  blob: Blob
}

/**
 * Custom ids are `custom/<scope>/<n>`: no built-in value can collide with them,
 * and the scope stays readable in the board's state, as it is in a real path.
 */
const PREFIX = 'custom/'

/** Reactive so a picker's Custom section grows the moment a file is picked. */
const assets = reactive<CustomAsset[]>([])

let counter = 0

export function isCustomAsset(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith(PREFIX)
}

/** Everything filed under `scope`, oldest first. */
export function customAssets(scope: CustomScope | string): CustomAsset[] {
  return assets.filter((asset) => asset.scope === scope)
}

/** Whether anything at all is here — the unload guard's half of it. */
export function hasCustomAssets(): boolean {
  return assets.length > 0
}

/**
 * Moves a picture onto another one's place in the list, the way a card is
 * carried from one cell to another: everything between the two shifts along to
 * make room, and nothing else stirs.
 *
 * The order a picker shows is the user's own — it says nothing about the
 * pictures, only about which ones they want nearest to hand — so it is theirs
 * to set. Both pictures have to be in the same list for that to mean anything;
 * a card is not a place among the tokens.
 *
 * All three lists share one array, so the move is made there: the pictures in
 * between are the other list's as well as this one's, and keeping their order
 * among themselves is what leaves the other pickers as they were.
 */
export function moveCustomAsset(id: string, onto: string): void {
  if (id === onto) return
  const from = assets.findIndex((asset) => asset.id === id)
  const at = assets.findIndex((asset) => asset.id === onto)
  if (from === -1 || at === -1 || assets[from].scope !== assets[at].scope) return

  const [moved] = assets.splice(from, 1)
  /*
    `at` is read off the list the picture was still in. Taken out of it, a
    target that sat after the picture has slid back one place — so inserting at
    that same index puts the picture after the target going forwards, and
    before it going back, which is what dropping onto a place means either way.
  */
  assets.splice(at, 0, moved)
}

/**
 * Whoever has to hear that a picture is gone. The board is the one that does:
 * it cannot draw what is no longer here, so it takes the piece off the cell.
 */
const watchers = new Set<(id: string) => void>()

/** Subscribes to removals and hands back the way to stop listening. */
export function onCustomAssetRemoved(listener: (id: string) => void): () => void {
  watchers.add(listener)
  return () => watchers.delete(listener)
}

/**
 * Takes a picture off the list its cross was clicked in, for good: the entry
 * goes, its object URL is released, and every listener is told so the pieces
 * drawn from it can go too.
 *
 * The picker is where a picture is, and the only place it is — so a picture
 * crossed off it is gone from the tab entirely rather than kept alive by
 * whatever was laid down from it. That is what lets a file be replaced: cross
 * the old one off, pick the new one under the same name, and nothing is left
 * behind to be found by name later and drawn in its place.
 *
 * Listeners are told synchronously, before anything renders, so the board never
 * gets a frame in which it is asked to draw a picture that is no longer here.
 */
export function removeCustomAsset(id: string): void {
  const at = assets.findIndex((candidate) => candidate.id === id)
  if (at === -1) return
  const [asset] = assets.splice(at, 1)
  URL.revokeObjectURL?.(asset.url)
  for (const listener of watchers) listener(id)
}

/** The picture behind an id, or `undefined` if it is not a custom one, or gone. */
export function customImage(id: unknown): string | undefined {
  if (!isCustomAsset(id)) return undefined
  return assets.find((asset) => asset.id === id)?.url
}

/** The name the file was picked under, or `undefined` for a built-in id. */
export function customLabel(id: unknown): string | undefined {
  if (!isCustomAsset(id)) return undefined
  return assets.find((asset) => asset.id === id)?.label
}

/**
 * Files a picked image under `scope` and hands back the entry. Any format the
 * browser can draw works — it is the browser that decodes it, not us.
 */
export function addCustomAsset(scope: CustomScope | string, file: File): CustomAsset {
  counter += 1
  const asset: CustomAsset = {
    id: `${PREFIX}${scope}/${counter}`,
    scope: scope as CustomScope,
    label: labelFor(file),
    file: file?.name ?? '',
    url: URL.createObjectURL(file),
    blob: file,
  }
  assets.push(asset)
  return asset
}

/**
 * Puts a picture back under the id an exported board refers to it by, so the
 * cards and tokens laid on it come back with it. An id already here is handed
 * straight back — a picture is never registered twice.
 */
export function restoreCustomAsset(
  entry: { id: string; scope: CustomScope | string; label?: string },
  file: File,
): CustomAsset | undefined {
  const existing = assets.find((asset) => asset.id === entry.id)
  if (existing) return existing

  const asset: CustomAsset = {
    id: entry.id,
    scope: entry.scope as CustomScope,
    label: entry.label || labelFor(file),
    file: file?.name ?? '',
    url: URL.createObjectURL(file),
    blob: file,
  }
  assets.push(asset)
  // Ids are handed out in order; a restored one must not be handed out again.
  counter = Math.max(counter, Number(entry.id.slice(entry.id.lastIndexOf('/') + 1)) || 0)
  return asset
}

/** The whole entry behind an id, for whoever needs its name. */
export function customEntry(id: unknown): CustomAsset | undefined {
  if (!isCustomAsset(id)) return undefined
  return assets.find((asset) => asset.id === id)
}

/** Forgets everything, releasing the object URLs with it. For tests. */
export function clearCustomAssets(): void {
  for (const asset of assets) URL.revokeObjectURL?.(asset.url)
  assets.length = 0
  counter = 0
}

/** The file's own name, extension dropped — nothing here to prettify. */
function labelFor(file: File): string {
  const name = String(file?.name ?? '').replace(/\.[^.]+$/, '')
  return name || 'Custom image'
}
