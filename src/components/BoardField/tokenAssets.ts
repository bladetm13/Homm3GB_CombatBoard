import { customImage, customLabel } from './customAssets'
import type { Token } from './tokenConstants'

/**
 * Resolves a token's enum value — its path relative to `assets/` — to the URL
 * Vite emits for that file. The unit-side twin of this module is
 * `unitAssets.ts`; the two differ only in what they glob. Like that one, an id
 * with no file behind it falls through to `customAssets`.
 */
const ASSET_ROOT = '../../../assets/'

const modules = import.meta.glob(
  ['../../../assets/field_tokens/*.{png,webp}', '../../../assets/unit_tokens/*.{png,webp}'],
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const urls: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [path.slice(ASSET_ROOT.length), url]),
)

export function tokenImage(token: Token | string): string {
  const url = urls[token] ?? customImage(token)
  if (!url) throw new Error(`No asset found for token "${token}"`)
  return url
}

export function hasTokenImage(token: Token | string): boolean {
  return token in urls || customImage(token) !== undefined
}

/** Short names that would read as words if they were merely capitalised. */
const ACRONYMS = new Set(['hp'])

/**
 * A readable name for a token, used for alt text and tooltips:
 * `unit_tokens/common-damage-1.png` -> `Damage 1`. The category prefix goes,
 * the same way `unitLabel` drops a unit's folder and type. A custom token keeps
 * the name of the file it came from.
 */
export function tokenLabel(token: Token | string): string {
  const custom = customLabel(token)
  if (custom !== undefined) return custom
  const file = token.slice(token.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
  return file
    .split('-')
    .slice(1)
    .map((word) => (ACRONYMS.has(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(' ')
}
