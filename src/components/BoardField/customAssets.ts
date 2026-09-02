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
  /** An object URL over the picked file — never a path into `assets/`. */
  url: string
  /** Taken off the list by its cross, but still drawn where it was laid down. */
  retired?: boolean
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

/** Everything still offered under `scope`, oldest first. */
export function customAssets(scope: CustomScope | string): CustomAsset[] {
  return assets.filter((asset) => asset.scope === scope && !asset.retired)
}

/** Whether anything at all is on offer — the unload guard's half of it. */
export function hasCustomAssets(): boolean {
  return assets.some((asset) => !asset.retired)
}

/**
 * Takes a picture off the list its cross was clicked in.
 *
 * The entry itself is kept, and its object URL with it: a piece already laid
 * down on the board is drawn from that same URL, and revoking it would leave a
 * hole in the board rather than in the picker. The picture goes when the page
 * does, as everything here does.
 */
export function removeCustomAsset(id: string): void {
  const asset = assets.find((candidate) => candidate.id === id)
  if (asset) asset.retired = true
}

/**
 * The picture behind an id, or `undefined` if it is not a custom one. Retired
 * pictures still answer, so the board keeps what it was already showing.
 */
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
    url: URL.createObjectURL(file),
  }
  assets.push(asset)
  return asset
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
