import { describe, expect, it } from 'vitest'
import {
  UNITS,
  UNITS_BACKS,
  UNITS_CASTLE,
  UNITS_CREATURE_BANKS,
  UNITS_NEUTRAL_AZURE,
  UNITS_NEUTRAL_BRONZE,
  UNITS_SUMMONED,
  UNITS_WALLS,
  UNITS_WAR_MACHINES,
} from '../src/components/BoardField/constants'
import { unitStock } from '../src/components/BoardField/unitStock'

const board = (...units) => Object.fromEntries(units.map((unit, i) => [`1-${i + 1}`, unit]))
const copies = (unit) => unitStock(unit, {})?.copies

describe('unitStock', () => {
  it('counts a town card once, whichever printing is face up', () => {
    const placed = board(UNITS_CASTLE.MARKSMEN_FEW, UNITS_CASTLE.MARKSMEN_PACK)
    expect(unitStock(UNITS_CASTLE.MARKSMEN_FEW, placed)).toEqual({
      used: 2,
      copies: 1,
      twoSided: true,
    })
    expect(unitStock(UNITS_CASTLE.MARKSMEN_PACK, placed)?.used).toBe(2)
    expect(unitStock(UNITS_CASTLE.GRIFFINS_FEW, placed)?.used).toBe(0)
  })

  it('knows the cards the box holds more than one of', () => {
    expect(copies(UNITS_WALLS.WALL)).toBe(3)
    expect(copies(UNITS_WALLS.GATE_BROKEN)).toBe(1)
    expect(copies(UNITS_SUMMONED.FIRE_ELEMENTALS_PACK)).toBe(2)
    expect(copies(UNITS_WAR_MACHINES.CATAPULT)).toBe(4)
    expect(copies(UNITS_NEUTRAL_BRONZE.HALFLINGS)).toBe(2)
    expect(copies(UNITS_NEUTRAL_AZURE.RUST_DRAGONS)).toBe(2)
    expect(copies(UNITS_NEUTRAL_AZURE.TITANS)).toBe(1)
    expect(copies(UNITS_CREATURE_BANKS.CRYPT_WRAITHS)).toBe(4)
    expect(copies(UNITS_CREATURE_BANKS.CRYPT_VAMPIRES)).toBe(1)
    expect(copies(UNITS_BACKS.NEUTRAL_AZURE)).toBe(12)
  })

  it('pairs the sides printed on one physical card', () => {
    const walls = board(UNITS_WALLS.WALL, UNITS_WALLS.WALL_BROKEN, UNITS_WALLS.WALL)
    expect(unitStock(UNITS_WALLS.WALL_BROKEN, walls)?.used).toBe(3)

    const tower = board(UNITS_BACKS.TOWER_BACK)
    expect(unitStock(UNITS_WALLS.TOWER, tower)).toEqual({ used: 1, copies: 1, twoSided: true })

    const summoned = board(UNITS_SUMMONED.AIR_ELEMENTALS_FEW, UNITS_SUMMONED.AIR_ELEMENTALS_PACK)
    expect(unitStock(UNITS_SUMMONED.AIR_ELEMENTALS_FEW, summoned)?.used).toBe(2)
  })

  it('leaves a one-sided card on its own', () => {
    expect(unitStock(UNITS_WAR_MACHINES.CANNON, {})?.twoSided).toBe(false)
    expect(unitStock(UNITS_NEUTRAL_BRONZE.ORCS, {})?.twoSided).toBe(false)
  })

  it('does not count the plentiful backs, or a card the user brought in', () => {
    expect(unitStock(UNITS_BACKS.NEUTRAL_BRONZE, {})).toBeNull()
    expect(unitStock(UNITS_BACKS.MIGHT_AND_MAGIC, {})).toBeNull()
    expect(unitStock('custom:units:1', {})).toBeNull()
  })

  it('has a stock for every other built-in card', () => {
    const uncounted = Object.values(UNITS)
      .flatMap((units) => Object.values(units))
      .filter((unit) => unitStock(unit, {}) === null)
    expect(uncounted.every((unit) => unit.startsWith('backs/'))).toBe(true)
    expect(uncounted).toHaveLength(Object.values(UNITS_BACKS).length - 2)
  })
})
