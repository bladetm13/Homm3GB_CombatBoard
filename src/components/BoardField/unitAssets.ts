import type { Unit } from './constants'
import { customEntry, customImage, customLabel, isCustomAsset, scopedCustomAssets } from './customAssets'

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
 * The two printings a card comes in: the small stack and the large one. Which
 * of them a card is is written in its file name and nowhere else — `_few` and
 * `_pack` on the cards that ship with the board, and whatever the user called
 * the file on a card they brought in themselves.
 */
export const UNIT_VARIANT = {
  FEW: 'few',
  PACK: 'pack',
} as const

export type UnitVariant = (typeof UNIT_VARIANT)[keyof typeof UNIT_VARIANT]

const OTHER_PRINTING: Record<UnitVariant, UnitVariant> = {
  [UNIT_VARIANT.FEW]: UNIT_VARIANT.PACK,
  [UNIT_VARIANT.PACK]: UNIT_VARIANT.FEW,
}

/** The file's own name: folders and extension dropped. */
function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
}

const isLetter = (char: string | undefined): boolean => !!char && /[a-z]/i.test(char)

/**
 * A word begins at the name's edge, after anything that is not a letter, or on
 * a camelCase hump: `_few`, `-few`, `.few`, `2few` and `cardFew` all say the
 * same thing, and `curfew` says none of it.
 */
function startsWord(name: string, at: number): boolean {
  const before = name[at - 1]
  if (at === 0 || !isLetter(before)) return true
  return before === before.toLowerCase() && name[at] === name[at].toUpperCase()
}

/** And it ends at the edge, before a non-letter, or before the next hump. */
function endsWord(name: string, at: number): boolean {
  const after = name[at]
  if (!isLetter(after)) return true
  return after === after.toUpperCase()
}

interface Printing {
  /** Where the word sits in the name it was read out of. */
  at: number
  length: number
  variant: UnitVariant
}

/**
 * The `few` or `pack` a name carries, or `null` when it carries neither.
 *
 * The last such word wins. On every card that ships with the board the size is
 * the final word of the file name, and a user's `pack_mule_few.png` is a small
 * stack of pack mules rather than a large stack of mules.
 */
function readPrinting(name: string): Printing | null {
  const lower = name.toLowerCase()
  let found: Printing | null = null

  for (const variant of Object.values(UNIT_VARIANT)) {
    for (let at = lower.indexOf(variant); at !== -1; at = lower.indexOf(variant, at + 1)) {
      if (!startsWord(name, at) || !endsWord(name, at + variant.length)) continue
      if (!found || at > found.at) found = { at, length: variant.length, variant }
    }
  }

  return found
}

/**
 * What is left of a name with its `few`/`pack` cut out, down to letters and
 * digits — what makes two files the two printings of one card. It is loose on
 * purpose: `Gold Dragons (few).png` and `gold_dragons_pack.webp` are a pair,
 * because to whoever picked those two files they plainly are.
 */
function stemOf(name: string, printing: Printing): string {
  const rest = name.slice(0, printing.at) + name.slice(printing.at + printing.length)
  return rest.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * The name a card's printing is read out of. A built-in card is its own path; a
 * custom one is the file it was picked from, never the id standing in for it —
 * that is a counter, and says nothing about the picture.
 */
function fileNameOf(unit: Unit | string): string {
  const entry = customEntry(unit)
  if (entry) return baseName(entry.file || entry.label)
  return isCustomAsset(unit) ? '' : baseName(unit)
}

/** Which printing a card is — `few`, `pack`, or neither. */
export function unitVariant(unit: Unit | string): UnitVariant | null {
  return readPrinting(fileNameOf(unit))?.variant ?? null
}

/**
 * `pack` printings are the foil ones, so the word in the file name is what the
 * card's holographic treatment keys off. Neutrals ship a single, non-foil card
 * and carry no size word at all — and a picture the user brought in is foil on
 * the same terms as anything else, if that is what they named it.
 */
export function isFoilUnit(unit: Unit | string): boolean {
  return unitVariant(unit) === UNIT_VARIANT.PACK
}

/**
 * The same unit's other printing, or `undefined` when there is none to turn the
 * card over to — the card says neither `few` nor `pack`, or it does and the
 * other one is not here.
 *
 * "Not here" is the whole of it for a picture the user brought in: nothing can
 * be derived from a file on their disk, so the other printing exists only if
 * they picked it too. It is looked for by name, under the same scope, and a
 * picture taken back off the picker still answers — a card already turned over
 * to it is drawn from that same picture, and would otherwise be left stranded.
 */
export function flipUnit(unit: Unit | string): string | undefined {
  const entry = customEntry(unit)
  if (!entry && isCustomAsset(unit)) return undefined

  const name = fileNameOf(unit)
  const printing = readPrinting(name)
  if (!printing) return undefined
  const wanted = OTHER_PRINTING[printing.variant]

  if (!entry) {
    // A built-in card's other printing is its own path with the word swapped.
    const at = unit.lastIndexOf('/') + 1 + printing.at
    const other = unit.slice(0, at) + wanted + unit.slice(at + printing.length)
    return other in urls ? other : undefined
  }

  const stem = stemOf(name, printing)
  const other = scopedCustomAssets(entry.scope).find((candidate) => {
    if (candidate.id === entry.id) return false
    const candidateName = baseName(candidate.file || candidate.label)
    const candidatePrinting = readPrinting(candidateName)
    return (
      candidatePrinting?.variant === wanted &&
      stemOf(candidateName, candidatePrinting) === stem
    )
  })

  return other?.id
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
  let parts = baseName(unit).split('-').slice(2) // drop "units" and the type segment
  if (parts[0] && TIERS.has(parts[0])) parts = parts.slice(1)
  return parts
    .join('_')
    .split('_')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}
