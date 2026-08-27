import { describe, expect, it } from 'vitest'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'
import { hasUnitImage, unitImage, unitLabel } from '../src/components/BoardField/unitAssets'

const everyUnit = Object.values(UNITS).flatMap((group) => Object.values(group))

describe('unitAssets', () => {
  it('resolves a url for every unit in every enum', () => {
    expect(everyUnit).toHaveLength(243)
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

  it('throws on an unknown unit rather than rendering a broken image', () => {
    expect(() => unitImage('castle/nope.webp')).toThrow(/No asset found/)
    expect(hasUnitImage('castle/nope.webp')).toBe(false)
  })

  it('builds a readable label from the path', () => {
    expect(unitLabel(UNITS[UNIT_TYPE.CASTLE].MARKSMEN_FEW)).toBe('Marksmen Few')
    expect(unitLabel(UNITS[UNIT_TYPE.TOWER].TITANS_PACK)).toBe('Titans Pack')
    expect(unitLabel(UNITS[UNIT_TYPE.NEUTRAL_AZURE].AZURE_DRAGONS)).toBe('Azure Dragons')
    expect(unitLabel(UNITS[UNIT_TYPE.NECROPOLIS].DREAD_KNIGHTS_FEW)).toBe('Dread Knights Few')
    expect(unitLabel(UNITS[UNIT_TYPE.FORTRESS].DRAGON_FLIES_FEW)).toBe('Dragon Flies Few')
  })
})
