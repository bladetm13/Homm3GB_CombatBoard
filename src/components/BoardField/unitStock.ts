import {
  UNITS,
  UNITS_BACKS,
  UNITS_CREATURE_BANKS,
  UNITS_NEUTRAL_AZURE,
  UNITS_NEUTRAL_BRONZE,
  UNITS_NEUTRAL_GOLDEN,
  UNITS_NEUTRAL_SILVER,
  UNITS_SUMMONED,
  UNITS_WALLS,
  UNITS_WAR_MACHINES,
  type Unit,
} from './constants'
import { flipUnit } from './unitAssets'

/**
 * How many of each card the box actually holds.
 *
 * The board takes any card any number of times, which makes it easy to lay out
 * a fight that cannot be set up on the table. The picker does not stop that —
 * it only says how many copies are already down against how many there are.
 *
 * Copies are counted per physical card, not per picture: a card's two printings
 * (`_few` on one side, `_pack` on the other), a wall and its broken state, a
 * tower and the back it is printed on are each one card, so whichever side is
 * down takes from the same copies.
 *
 * Everything not listed here is a single card — with its other printing on the
 * back, when it has one. Most card backs come in more copies than any board
 * needs and are left uncounted, and so is anything the user brought in.
 */
interface Stock {
  /** Every picture of the one physical card. */
  sides: Unit[]
  copies: number
}

/** Cards that are not one of their own, listed with what they pair with. */
const EXPLICIT: Stock[] = [
  { sides: [UNITS_WALLS.WALL, UNITS_WALLS.WALL_BROKEN], copies: 3 },
  { sides: [UNITS_WALLS.GATE, UNITS_WALLS.GATE_BROKEN], copies: 1 },
  { sides: [UNITS_WALLS.TOWER, UNITS_BACKS.TOWER_BACK], copies: 1 },
  { sides: [UNITS_BACKS.NEUTRAL_AZURE], copies: 12 },

  ...Object.values(UNITS_WAR_MACHINES).map((unit) => ({
    sides: [unit],
    copies: 4,
  })),

  ...[
    UNITS_NEUTRAL_BRONZE.HALFLINGS,
    UNITS_NEUTRAL_SILVER.MUMMIES,
    UNITS_NEUTRAL_SILVER.NOMADS,
    UNITS_NEUTRAL_GOLDEN.GOLD_GOLEMS,
    UNITS_NEUTRAL_GOLDEN.DIAMOND_GOLEMS,
    UNITS_NEUTRAL_GOLDEN.ENCHANTERS,
    UNITS_NEUTRAL_AZURE.FAERIE_DRAGONS,
    UNITS_NEUTRAL_AZURE.CRYSTAL_DRAGONS,
    UNITS_NEUTRAL_AZURE.RUST_DRAGONS,
    UNITS_NEUTRAL_AZURE.AZURE_DRAGONS,
  ].map((unit) => ({ sides: [unit], copies: 2 })),

  ...(
    [
      [UNITS_CREATURE_BANKS.IMP_CACHE_FAMILIARS, 4],
      [UNITS_CREATURE_BANKS.CRYPT_SKELETONS, 1],
      [UNITS_CREATURE_BANKS.CRYPT_ZOMBIES, 1],
      [UNITS_CREATURE_BANKS.CRYPT_WRAITHS, 4],
      [UNITS_CREATURE_BANKS.CRYPT_VAMPIRES, 1],
      [UNITS_CREATURE_BANKS.DWARVEN_TREASURY_DWARVES, 4],
      [UNITS_CREATURE_BANKS.MEDUSA_STORES_MEDUSAS, 4],
      [UNITS_CREATURE_BANKS.DRAGON_FLY_HIVE_DRAGON_FLIES, 4],
      [UNITS_CREATURE_BANKS.DERELICT_SHIP_WATER_ELEMENTALS, 4],
      [UNITS_CREATURE_BANKS.PYRAMID_GOLD_GOLEMS, 2],
      [UNITS_CREATURE_BANKS.PYRAMID_DIAMOND_GOLEMS, 2],
      [UNITS_CREATURE_BANKS.GRIFFIN_CONSERVATORY_GRIFFINS, 4],
      [UNITS_CREATURE_BANKS.NAGA_BANK_NAGAS, 4],
      [UNITS_CREATURE_BANKS.CYCLOPS_STOCKPILE_CYCLOPES, 4],
      [UNITS_CREATURE_BANKS.DRAGON_UTOPIA_BLACK_DRAGONS, 1],
      [UNITS_CREATURE_BANKS.DRAGON_UTOPIA_GOLD_DRAGONS, 1],
      [UNITS_CREATURE_BANKS.DRAGON_UTOPIA_FAERIE_DRAGONS, 1],
      [UNITS_CREATURE_BANKS.DRAGON_UTOPIA_CRYSTAL_DRAGONS, 1],
    ] as [Unit, number][]
  ).map(([unit, copies]) => ({ sides: [unit], copies })),
]

/** Summoned elementals come two to a printing pair; the rest of the towns one. */
const SUMMONED = new Set<string>(Object.values(UNITS_SUMMONED))

/** The backs nobody runs out of: no counter at all. */
const UNCOUNTED = new Set<string>(
  Object.values(UNITS_BACKS).filter(
    (unit) => !EXPLICIT.some((stock) => stock.sides.includes(unit)),
  ),
)

/** Every built-in card, keyed to the stock it draws from. */
const STOCK = new Map<string, Stock>()

for (const stock of EXPLICIT) for (const side of stock.sides) STOCK.set(side, stock)

for (const units of Object.values(UNITS)) {
  for (const unit of Object.values(units) as Unit[]) {
    if (STOCK.has(unit) || UNCOUNTED.has(unit)) continue
    const other = flipUnit(unit) as Unit | undefined
    const stock: Stock = {
      sides: other ? [unit, other] : [unit],
      copies: SUMMONED.has(unit) ? 2 : 1,
    }
    for (const side of stock.sides) STOCK.set(side, stock)
  }
}

export interface UnitStock {
  /** Copies of this card already on the board, whichever side up. */
  used: number
  /** Copies of it in the box. */
  copies: number
  /** Whether the card has another side that counts against the same copies. */
  twoSided: boolean
}

/**
 * How many of `unit`'s copies `placed` — the board's cell-to-card map — already
 * uses, or `null` for a card that is not counted: a picture the user brought
 * in, or a card back the box has plenty of.
 */
export function unitStock(unit: Unit | string, placed: Record<string, string>): UnitStock | null {
  const stock = STOCK.get(unit)
  if (!stock) return null
  const sides = new Set<string>(stock.sides)
  const used = Object.values(placed).filter((card) => sides.has(card)).length
  return { used, copies: stock.copies, twoSided: stock.sides.length > 1 }
}
