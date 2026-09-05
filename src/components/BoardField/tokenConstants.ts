/**
 * Token assets, generated from the `assets/<scope>_tokens/` folders.
 *
 * Like the unit enums in `constants.ts`, a value is the file's path relative to
 * `assets/`, extension included, so it doubles as the asset lookup key — see
 * `tokenAssets.ts`. The folder is the first segment, which is what tells a
 * field token from a unit one.
 *
 * Where a unit's group comes from its folder, a token's comes from its file
 * name: every token is named `<category>-<name>.png`, and the category is the
 * heading it is filed under. Keys therefore drop that prefix, since the enum
 * name already carries it.
 *
 * The two scopes overlap — `spells-clone-*` exists in both folders, once as the
 * clone standing on the field and once as the marker on the cloned stack — so
 * the paths, not the file names, are what identify a token.
 */

/** Where a token may be dropped. The value is the folder it lives in. */
export enum TOKEN_SCOPE {
  /** Board effects: they take a cell of their own, so the cell must be empty. */
  FIELD = 'field_tokens',
  /** Stack markers: they sit on a unit, so the cell must hold one. */
  UNIT = 'unit_tokens',
}

/** The file-name prefix every token carries, and the group it stands for. */
export enum TOKEN_CATEGORY {
  COMMON = 'common',
  EFFECT = 'effect',
  STACK = 'stack',
  SPELLS = 'spells',
  OTHER = 'other',
}

/** Group headings, for the token picker. */
export const TOKEN_CATEGORY_LABEL: Record<TOKEN_CATEGORY, string> = {
  [TOKEN_CATEGORY.COMMON]: 'Common',
  [TOKEN_CATEGORY.EFFECT]: 'Effects',
  [TOKEN_CATEGORY.STACK]: 'Stack Stats',
  [TOKEN_CATEGORY.SPELLS]: 'Spells',
  [TOKEN_CATEGORY.OTHER]: 'Other',
}

/** Spell markers that occupy a cell: each spread, then its numbered variants. */
export enum FIELD_TOKENS_SPELLS {
  FIREWALL = 'field_tokens/spells-firewall.png',
  FIREWALL_LUNA_I = 'field_tokens/spells-firewall-luna-i.png',
  FIREWALL_LUNA_VI = 'field_tokens/spells-firewall-luna-vi.png',
  FORCE_FIELD = 'field_tokens/spells-force-field.png',
  LAND_MINE = 'field_tokens/spells-land-mine.png',
  LAND_MINE_0 = 'field_tokens/spells-land-mine-0.png',
  LAND_MINE_2 = 'field_tokens/spells-land-mine-2.png',
  QUICKSAND = 'field_tokens/spells-quicksand.png',
  QUICKSAND_1 = 'field_tokens/spells-quicksand-1.png',
  QUICKSAND_2 = 'field_tokens/spells-quicksand-2.png',
  CLONE_1 = 'field_tokens/spells-clone-1.png',
  CLONE_2 = 'field_tokens/spells-clone-2.png',
}

export enum UNIT_TOKENS_COMMON {
  DAMAGE_1 = 'unit_tokens/common-damage-1.png',
  DAMAGE_2 = 'unit_tokens/common-damage-2.png',
  DAMAGE_3 = 'unit_tokens/common-damage-3.png',
  DAMAGE_5 = 'unit_tokens/common-damage-5.png',
  DEFENSE = 'unit_tokens/common-defense.png',
  PARALYSIS = 'unit_tokens/common-paralysis.png',
}

export enum UNIT_TOKENS_EFFECT {
  ATTACK_1 = 'unit_tokens/effect-attack-1.png',
  ATTACK_2 = 'unit_tokens/effect-attack-2.png',
  CORROSION = 'unit_tokens/effect-corrosion.png',
  WEAKNESS_1 = 'unit_tokens/effect-weakness-1.png',
  WEAKNESS_2 = 'unit_tokens/effect-weakness-2.png',
}

export enum UNIT_TOKENS_STACK {
  STACK_TOKEN = 'unit_tokens/stack-stack-token.png',
  ATTACK = 'unit_tokens/stack-attack.png',
  DEFENSE = 'unit_tokens/stack-defense.png',
  HP = 'unit_tokens/stack-hp.png',
  INITIATIVE = 'unit_tokens/stack-initiative.png',
}

export enum UNIT_TOKENS_SPELLS {
  CLONE_1 = 'unit_tokens/spells-clone-1.png',
  CLONE_2 = 'unit_tokens/spells-clone-2.png',
}

export enum UNIT_TOKENS_OTHER {
  TIME = 'unit_tokens/other-time.png',
}

/** Field-token enums by category. Drives the picker's order. */
export const FIELD_TOKENS = {
  [TOKEN_CATEGORY.SPELLS]: FIELD_TOKENS_SPELLS,
} as const

/** Unit-token enums by category. Drives the picker's order. */
export const UNIT_TOKENS = {
  [TOKEN_CATEGORY.COMMON]: UNIT_TOKENS_COMMON,
  [TOKEN_CATEGORY.EFFECT]: UNIT_TOKENS_EFFECT,
  [TOKEN_CATEGORY.STACK]: UNIT_TOKENS_STACK,
  [TOKEN_CATEGORY.SPELLS]: UNIT_TOKENS_SPELLS,
  [TOKEN_CATEGORY.OTHER]: UNIT_TOKENS_OTHER,
} as const

/** Every token enum, keyed by the scope it may be dropped in. */
export const TOKENS = {
  [TOKEN_SCOPE.FIELD]: FIELD_TOKENS,
  [TOKEN_SCOPE.UNIT]: UNIT_TOKENS,
} as const

type Groups = (typeof TOKENS)[keyof typeof TOKENS]
type Group = Groups[keyof Groups]

/** Any token asset path, e.g. `unit_tokens/common-damage-1.png`. */
export type Token = Group[keyof Group]
