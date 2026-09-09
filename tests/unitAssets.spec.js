import { describe, expect, it } from 'vitest'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'
import {
  flipUnit,
  hasUnitImage,
  isFoilUnit,
  unitImage,
  unitLabel,
  unitVariant,
} from '../src/components/BoardField/unitAssets'

const everyUnit = Object.values(UNITS).flatMap((group) => Object.values(group))

describe('unitAssets', () => {
  it('resolves a url for every unit in every enum', () => {
    expect(everyUnit).toHaveLength(278)
    for (const unit of everyUnit) {
      expect(hasUnitImage(unit), unit).toBe(true)
      expect(unitImage(unit), unit).toBeTruthy()
    }
  })

  it('keeps each unit its own filename and extension', () => {
    expect(unitImage(UNITS[UNIT_TYPE.CASTLE].MARKSMEN_FEW)).toContain('marksmen_few')
    expect(unitImage(UNITS[UNIT_TYPE.NECROPOLIS].SKELETONS_FEW)).toContain('skeletons_few')
    // The glob covers .webp and .png alike; today every asset happens to be .webp.
    for (const unit of everyUnit) {
      expect(unitImage(unit), unit).toContain(unit.slice(unit.lastIndexOf('.')))
    }
  })

  it('gives each unit a distinct url', () => {
    const urls = everyUnit.map(unitImage)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('gives every asset a non-empty, in-group unique label', () => {
    for (const [type, group] of Object.entries(UNITS)) {
      const labels = Object.values(group).map(unitLabel)
      for (const label of labels) expect(label, type).not.toBe('')
      expect(new Set(labels).size, type).toBe(labels.length)
    }
  })

  it('throws on an unknown unit rather than rendering a broken image', () => {
    expect(() => unitImage('castle/nope.webp')).toThrow(/No asset found/)
    expect(hasUnitImage('castle/nope.webp')).toBe(false)
  })

  it('treats every _pack printing, and only those, as foil', () => {
    expect(isFoilUnit(UNITS[UNIT_TYPE.TOWER].TITANS_PACK)).toBe(true)
    expect(isFoilUnit(UNITS[UNIT_TYPE.TOWER].TITANS_FEW)).toBe(false)
    // Neutrals ship one card each and carry no size suffix at all.
    expect(isFoilUnit(UNITS[UNIT_TYPE.NEUTRAL_AZURE].AZURE_DRAGONS)).toBe(false)
    // A dash inside the unit's own name must not confuse the suffix check.
    expect(isFoilUnit(UNITS[UNIT_TYPE.DUNGEON].MANTICORES_ALTERNATIVE_PACK)).toBe(true)

    // Neither obstacles nor card backs nor bank cards come in foil printings.
    for (const type of [UNIT_TYPE.BACKS, UNIT_TYPE.CREATURE_BANKS, UNIT_TYPE.WAR_MACHINES]) {
      for (const unit of Object.values(UNITS[type])) expect(isFoilUnit(unit), unit).toBe(false)
    }
    // Obstacles are single scanned cards, so none of them is a foil printing.
    for (const unit of Object.values(UNITS[UNIT_TYPE.WALLS])) {
      expect(isFoilUnit(unit), unit).toBe(false)
    }

    const foil = everyUnit.filter(isFoilUnit)
    expect(foil).toHaveLength(75)
    for (const unit of foil) expect(unit, unit).toContain('_pack')
  })

  it('reads a printing off the word in the file name, however it is fenced', () => {
    expect(unitVariant(UNITS[UNIT_TYPE.TOWER].TITANS_FEW)).toBe('few')
    expect(unitVariant(UNITS[UNIT_TYPE.TOWER].TITANS_PACK)).toBe('pack')
    // Neutrals ship one card each and say neither.
    expect(unitVariant(UNITS[UNIT_TYPE.NEUTRAL_AZURE].AZURE_DRAGONS)).toBe(null)
    expect(unitVariant(UNITS[UNIT_TYPE.WALLS].GATE)).toBe(null)

    // The word is a word wherever it is fenced off, which is what a card the
    // user named themselves needs — see the same paths through `flipUnit`.
    for (const name of ['a/hero_few.png', 'a/hero-few.png', 'a/hero.few.png', 'a/heroFew.png']) {
      expect(unitVariant(name), name).toBe('few')
    }
    for (const name of ['a/hero_pack.png', 'a/PACK-hero.png', 'a/hero 2 pack.png']) {
      expect(unitVariant(name), name).toBe('pack')
    }

    // And a word it merely sits inside is not the word.
    for (const name of ['a/curfew.png', 'a/fewer_men.png', 'a/packrat.png', 'a/repack.png']) {
      expect(unitVariant(name), name).toBe(null)
    }

    // Both said: the size is the suffix, so the last one is the card's.
    expect(unitVariant('a/pack_mule_few.png')).toBe('few')
  })

  it('turns a card over to the other printing of the same unit', () => {
    const { TITANS_FEW, TITANS_PACK } = UNITS[UNIT_TYPE.TOWER]
    expect(flipUnit(TITANS_FEW)).toBe(TITANS_PACK)
    expect(flipUnit(TITANS_PACK)).toBe(TITANS_FEW)

    // A dash inside the unit's own name is not the one the size is fenced by.
    const { MANTICORES_ALTERNATIVE_FEW, MANTICORES_ALTERNATIVE_PACK } = UNITS[UNIT_TYPE.DUNGEON]
    expect(flipUnit(MANTICORES_ALTERNATIVE_FEW)).toBe(MANTICORES_ALTERNATIVE_PACK)
    expect(flipUnit(MANTICORES_ALTERNATIVE_PACK)).toBe(MANTICORES_ALTERNATIVE_FEW)

    // Every printing on the board has its opposite, and lands back on itself.
    for (const unit of everyUnit.filter(unitVariant)) {
      const other = flipUnit(unit)
      expect(other, unit).toBeTruthy()
      expect(hasUnitImage(other), other).toBe(true)
      expect(unitVariant(other), other).not.toBe(unitVariant(unit))
      expect(flipUnit(other), other).toBe(unit)
    }
  })

  it('offers no flip where there is no other printing to flip to', () => {
    // Single cards: nothing in the name to flip, and nothing to flip to.
    for (const unit of everyUnit.filter((candidate) => !unitVariant(candidate))) {
      expect(flipUnit(unit), unit).toBeUndefined()
    }
    // A name that says `few` over a file this deck does not have is still no.
    expect(flipUnit('tower/units-tower-golden-nobody_few.webp')).toBeUndefined()
  })

  it('builds a readable label from the path', () => {
    expect(unitLabel(UNITS[UNIT_TYPE.CASTLE].MARKSMEN_FEW)).toBe('Marksmen Few')
    expect(unitLabel(UNITS[UNIT_TYPE.TOWER].TITANS_PACK)).toBe('Titans Pack')
    expect(unitLabel(UNITS[UNIT_TYPE.NEUTRAL_AZURE].AZURE_DRAGONS)).toBe('Azure Dragons')
    expect(unitLabel(UNITS[UNIT_TYPE.NECROPOLIS].DREAD_KNIGHTS_FEW)).toBe('Dread Knights Few')
    expect(unitLabel(UNITS[UNIT_TYPE.FORTRESS].DRAGON_FLIES_FEW)).toBe('Dragon Flies Few')
    // The obstacles' `obstacles-` prefix is dropped like any other type segment.
    expect(unitLabel(UNITS[UNIT_TYPE.WALLS].WALL_BROKEN)).toBe('Wall Broken')
    expect(unitLabel(UNITS[UNIT_TYPE.BACKS].TOWER_BACK)).toBe('Tower Back')
    // Card backs are named after their deck, so the label is the deck.
    expect(unitLabel(UNITS[UNIT_TYPE.BACKS].NEUTRAL_AZURE)).toBe('Neutral Azure')
    expect(unitLabel(UNITS[UNIT_TYPE.BACKS].MIGHT_AND_MAGIC)).toBe('Might And Magic')
    expect(unitLabel(UNITS[UNIT_TYPE.BACKS].CREATURE_BANKS)).toBe('Creature Banks')
    expect(unitLabel(UNITS[UNIT_TYPE.WAR_MACHINES].FIRST_AID_TENT)).toBe('First Aid Tent')
    expect(unitLabel(UNITS[UNIT_TYPE.WAR_MACHINES].AMMO_CART)).toBe('Ammo Cart')
  })
})
