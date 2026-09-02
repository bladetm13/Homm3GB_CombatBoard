import type { Unit } from './constants'
import { customImage, customLabel, isCustomAsset } from './customAssets'

/**
 * Resolves a unit's enum value — its path relative to `assets/units/` — to the
 * URL Vite emits for that file.
 *
 * `import.meta.glob` picks every asset up at build time, so new files and new
 * extensions are supported by dropping them into the folder and regenerating
 * `constants.ts`; nothing here needs to change.
 *
 * A picture the user added themselves has no file to glob, so every lookup here
 * falls through to `customAssets` — see that module for what a custom id is.
 */
const ASSET_ROOT = '../../../assets/units/'

const modules = import.meta.glob('../../../assets/units/**/*.{webp,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const urls: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [path.slice(ASSET_ROOT.length), url]),
)

export function unitImage(unit: Unit | string): string {
  const url = urls[unit] ?? customImage(unit)
  if (!url) throw new Error(`No asset found for unit "${unit}"`)
  return url
}

export function hasUnitImage(unit: Unit | string): boolean {
  return unit in urls || customImage(unit) !== undefined
}

/**
 * `_pack` variants are the foil printings, so the suffix is what the card's
 * holographic treatment keys off. Neutrals ship a single, non-foil card and
 * carry no size suffix at all.
 */
export function isFoilUnit(unit: Unit | string): boolean {
  if (isCustomAsset(unit)) return false
  const file = unit.slice(unit.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
  return file.endsWith('_pack')
}

const TIERS = new Set(['bronze', 'silver', 'golden', 'azure'])

/**
 * A readable name for a unit, used for alt text and tooltips:
 * `castle/units-castle-bronze-marksmen_few.webp` -> `Marksmen Few`. A custom
 * card is named by the file it was picked from, so there is nothing to parse.
 */
export function unitLabel(unit: Unit | string): string {
  const custom = customLabel(unit)
  if (custom !== undefined) return custom
  const file = unit.slice(unit.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
  let parts = file.split('-').slice(2) // drop "units" and the type segment
  if (parts[0] && TIERS.has(parts[0])) parts = parts.slice(1)
  return parts
    .join('_')
    .split('_')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}
