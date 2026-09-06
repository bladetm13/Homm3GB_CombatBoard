import { customImage, customLabel } from './customAssets'
import { TOKEN_SCOPE } from './tokenConstants'
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

const SCOPES: Set<string> = new Set(Object.values(TOKEN_SCOPE))

/**
 * Which set a token came from, read back out of the id itself: every id carries
 * the folder it stands in — `unit_tokens/stack-hp.png` for one of ours,
 * `custom/unit_tokens/3` for a picture the user brought in.
 *
 * On the board that is who a token belongs to. A unit token marks the stack and
 * goes wherever the stack goes; a field token is laid on the ground and answers
 * to the cell, not to whoever happens to be standing on it.
 *
 * An id that names no folder is treated as the ground's, which is the harmless
 * way to be wrong: it stays where it was put instead of being carried off or
 * thrown away with a card.
 */
export function tokenScopeOf(token: Token | string): TOKEN_SCOPE {
  const folder = String(token)
    .split('/')
    .find((segment) => SCOPES.has(segment))
  return (folder as TOKEN_SCOPE) ?? TOKEN_SCOPE.FIELD
}

/** Short names that would read as words if they were merely capitalised. */
const ACRONYMS = new Set(['hp', 'vi'])

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
