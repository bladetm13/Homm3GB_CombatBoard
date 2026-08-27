// @vitest-environment node
// Reads the asset folders straight off disk, so it needs no DOM.
import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { UNITS, UNIT_TYPE, UNIT_TYPE_LABEL } from '../src/components/BoardField/constants'

const ASSETS = new URL('../assets/units/', import.meta.url)

/** Values are paths relative to assets/units, so compare them as such. */
const filesIn = (type) => readdirSync(new URL(type, ASSETS)).map((file) => `${type}/${file}`)

const types = Object.values(UNIT_TYPE)

describe('unit constants', () => {
  it('has one type per assets/units subfolder', () => {
    expect(types.toSorted()).toEqual(readdirSync(ASSETS).toSorted())
  })

  it('exposes an enum for every type', () => {
    for (const type of types) {
      expect(UNITS[type], type).toBeDefined()
    }
    expect(Object.keys(UNITS)).toHaveLength(types.length)
  })

  it.each(types)('covers every %s asset exactly once', (type) => {
    const values = Object.values(UNITS[type])
    expect(values.toSorted()).toEqual(filesIn(type).toSorted())
    expect(new Set(values).size).toBe(values.length)
  })

  it('never points at a file that is not on disk', () => {
    const onDisk = new Set(types.flatMap(filesIn))
    for (const type of types) {
      for (const value of Object.values(UNITS[type])) {
        expect(onDisk.has(value), value).toBe(true)
      }
    }
  })

  it('values are folder-relative paths with the real extension', () => {
    expect(UNITS[UNIT_TYPE.CASTLE].MARKSMEN_FEW).toBe(
      'castle/units-castle-bronze-marksmen_few.webp',
    )
    expect(UNITS[UNIT_TYPE.NEUTRAL_AZURE].TITANS).toBe('neutral_azure/units-neutral-azure-titans.webp')
    expect(UNITS[UNIT_TYPE.NECROPOLIS].SKELETONS_FEW).toBe(
      'necropolis/units-necropolis-bronze-skeletons_few.webp',
    )
    // ...and these two names carry a dash of their own.
    expect(UNITS[UNIT_TYPE.FORTRESS].DRAGON_FLIES_FEW).toBe(
      'fortress/units-fortress-bronze-dragon-flies_few.webp',
    )
    expect(UNITS[UNIT_TYPE.DUNGEON].MANTICORES_ALTERNATIVE_FEW).toBe(
      'dungeon/units-dungeon-golden-manticores-alternative_few.webp',
    )
  })

  it('every value starts with its own type folder', () => {
    for (const type of types) {
      for (const value of Object.values(UNITS[type])) {
        expect(value.startsWith(`${type}/`), `${type}: ${value}`).toBe(true)
      }
    }
  })

  it('labels every type readably', () => {
    for (const type of types) {
      expect(UNIT_TYPE_LABEL[type], type).toMatch(/^[A-Z]/)
    }
    expect(UNIT_TYPE_LABEL[UNIT_TYPE.NEUTRAL_AZURE]).toBe('Neutral — Azure')
  })

  it('covers all 243 assets, inferno included', () => {
    const total = types.reduce((sum, type) => sum + Object.keys(UNITS[type]).length, 0)
    expect(total).toBe(243)
    expect(Object.keys(UNITS[UNIT_TYPE.INFERNO])).toHaveLength(14)
  })
})
