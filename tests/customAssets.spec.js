import { afterEach, describe, expect, it } from 'vitest'
import {
  CUSTOM_SCOPE,
  addCustomAsset,
  clearCustomAssets,
  customAssets,
  customImage,
  customLabel,
  hasCustomAssets,
  isCustomAsset,
  removeCustomAsset,
} from '../src/components/BoardField/customAssets'
import {
  flipUnit,
  isFoilUnit,
  hasUnitImage,
  unitImage,
  unitLabel,
} from '../src/components/BoardField/unitAssets'
import { hasTokenImage, tokenImage, tokenLabel } from '../src/components/BoardField/tokenAssets'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'
import { TOKENS, TOKEN_CATEGORY, TOKEN_SCOPE } from '../src/components/BoardField/tokenConstants'

const file = (name = 'my-hero.png') => new File(['picture'], name, { type: 'image/png' })

afterEach(clearCustomAssets)

describe('customAssets', () => {
  it('files a picture under its scope and hands back an id carrying it', () => {
    const asset = addCustomAsset(CUSTOM_SCOPE.UNITS, file())

    expect(asset.id).toBe('custom/units/1')
    expect(isCustomAsset(asset.id)).toBe(true)
    expect(asset.url).toBeTruthy()
  })

  it('names a picture after the file it came from, extension dropped', () => {
    expect(addCustomAsset(CUSTOM_SCOPE.UNITS, file('Angry Peasant.webp')).label).toBe(
      'Angry Peasant',
    )
    expect(addCustomAsset(CUSTOM_SCOPE.UNITS, file('')).label).toBe('Custom image')
  })

  it('keeps the three lists apart', () => {
    const card = addCustomAsset(CUSTOM_SCOPE.UNITS, file())
    const field = addCustomAsset(CUSTOM_SCOPE.FIELD_TOKENS, file())
    const marker = addCustomAsset(CUSTOM_SCOPE.UNIT_TOKENS, file())

    expect(customAssets(CUSTOM_SCOPE.UNITS)).toEqual([card])
    expect(customAssets(CUSTOM_SCOPE.FIELD_TOKENS)).toEqual([field])
    expect(customAssets(CUSTOM_SCOPE.UNIT_TOKENS)).toEqual([marker])
  })

  it('says nothing about an id it did not make', () => {
    const unit = UNITS[UNIT_TYPE.CASTLE].ARCHANGELS_PACK
    expect(isCustomAsset(unit)).toBe(false)
    expect(customImage(unit)).toBeUndefined()
    expect(customLabel(unit)).toBeUndefined()
    expect(customImage('custom/units/404')).toBeUndefined()
  })

  it('forgets everything on demand — nothing here outlives the page', () => {
    expect(hasCustomAssets()).toBe(false)
    addCustomAsset(CUSTOM_SCOPE.UNITS, file())
    expect(hasCustomAssets()).toBe(true)

    clearCustomAssets()
    expect(hasCustomAssets()).toBe(false)
    expect(customAssets(CUSTOM_SCOPE.UNITS)).toEqual([])
    // Ids start over, so the next picture is `custom/units/1` again.
    expect(addCustomAsset(CUSTOM_SCOPE.UNITS, file()).id).toBe('custom/units/1')
  })

  it('drops a removed picture from its list, and from what is worth keeping', () => {
    const kept = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Kept.png'))
    const gone = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Gone.png'))

    removeCustomAsset(gone.id)
    expect(customAssets(CUSTOM_SCOPE.UNITS)).toEqual([kept])
    expect(hasCustomAssets()).toBe(true)

    removeCustomAsset(kept.id)
    expect(customAssets(CUSTOM_SCOPE.UNITS)).toEqual([])
    expect(hasCustomAssets()).toBe(false)

    // Removing what was never there, or twice over, is a no-op either way.
    expect(() => removeCustomAsset('custom/units/404')).not.toThrow()
    expect(() => removeCustomAsset(gone.id)).not.toThrow()
  })

  it('keeps a removed picture drawable, so the board is not left with a hole', () => {
    const asset = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Placed.png'))
    removeCustomAsset(asset.id)

    // It is off the picker, but a card already laid down still has its artwork.
    expect(unitImage(asset.id)).toBe(asset.url)
    expect(unitLabel(asset.id)).toBe('Placed')
  })

  it('resolves as a card would, so the board can lay one down', () => {
    const asset = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Boss.png'))

    expect(hasUnitImage(asset.id)).toBe(true)
    expect(unitImage(asset.id)).toBe(asset.url)
    expect(unitLabel(asset.id)).toBe('Boss')
    // Nothing in the file's name to key the foil off: a plain printing.
    expect(isFoilUnit(asset.id)).toBe(false)
    // And the id is a counter, not a name — nothing is read out of it.
    expect(isFoilUnit('custom/units/pack_pack.png')).toBe(false)
    expect(flipUnit('custom/units/pack_pack.png')).toBeUndefined()
  })

  it('reads a printing off the file a picture was picked from', () => {
    const few = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Gold Dragons_few.png'))
    const pack = addCustomAsset(CUSTOM_SCOPE.UNITS, file('gold-dragons-pack.webp'))

    // A card the user named `pack` is a foil printing like any other.
    expect(isFoilUnit(few.id)).toBe(false)
    expect(isFoilUnit(pack.id)).toBe(true)
  })

  it('pairs two pictures as one card, however their names are punctuated', () => {
    const few = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Gold Dragons_few.png'))
    const pack = addCustomAsset(CUSTOM_SCOPE.UNITS, file('gold-dragons-pack.webp'))

    expect(flipUnit(few.id)).toBe(pack.id)
    expect(flipUnit(pack.id)).toBe(few.id)
  })

  it('offers no flip until both printings of that very card are here', () => {
    const lone = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Hydras_few.png'))
    // One printing is not a pair, whatever else has been added beside it.
    expect(flipUnit(lone.id)).toBeUndefined()

    addCustomAsset(CUSTOM_SCOPE.UNITS, file('Wyverns_pack.png'))
    expect(flipUnit(lone.id)).toBeUndefined()

    // Nor is the same printing twice.
    addCustomAsset(CUSTOM_SCOPE.UNITS, file('Hydras few.webp'))
    expect(flipUnit(lone.id)).toBeUndefined()

    const twin = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Hydras_pack.png'))
    expect(flipUnit(lone.id)).toBe(twin.id)
  })

  it('keeps the two printings inside their own list', () => {
    const card = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Imp_few.png'))
    addCustomAsset(CUSTOM_SCOPE.FIELD_TOKENS, file('Imp_pack.png'))

    // A token is not the other side of a card, whatever it was called.
    expect(flipUnit(card.id)).toBeUndefined()
  })

  it('keeps a card flippable after its other printing is taken off the list', () => {
    const few = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Nix_few.png'))
    const pack = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Nix_pack.png'))

    removeCustomAsset(pack.id)

    // Off the picker, but still drawable — so a card already down can still be
    // turned over to it, as one already turned over to it is still drawn.
    expect(customAssets(CUSTOM_SCOPE.UNITS)).toHaveLength(1)
    expect(flipUnit(few.id)).toBe(pack.id)
    expect(unitImage(pack.id)).toBe(pack.url)
  })

  it('resolves as a token would, in either scope', () => {
    const field = addCustomAsset(CUSTOM_SCOPE.FIELD_TOKENS, file('Lava.png'))
    const marker = addCustomAsset(CUSTOM_SCOPE.UNIT_TOKENS, file('Poison.png'))

    for (const asset of [field, marker]) {
      expect(hasTokenImage(asset.id)).toBe(true)
      expect(tokenImage(asset.id)).toBe(asset.url)
    }
    expect(tokenLabel(field.id)).toBe('Lava')
    expect(tokenLabel(marker.id)).toBe('Poison')
  })

  it('leaves the built-in lookups exactly as they were', () => {
    addCustomAsset(CUSTOM_SCOPE.UNITS, file())
    const unit = UNITS[UNIT_TYPE.CASTLE].ARCHANGELS_PACK
    const token = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL

    expect(unitImage(unit)).toBeTruthy()
    expect(unitLabel(unit)).toBe('Archangels Pack')
    expect(isFoilUnit(unit)).toBe(true)
    expect(tokenImage(token)).toBeTruthy()
    expect(tokenLabel(token)).toBe('Firewall')

    expect(() => unitImage('units/nothing.webp')).toThrow(/No asset found/)
    expect(() => tokenImage('field_tokens/nothing.png')).toThrow(/No asset found/)
  })
})
