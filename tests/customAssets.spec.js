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
  moveCustomAsset,
  onCustomAssetRemoved,
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

  it('carries a picture to another place in its own list', () => {
    const ids = () => customAssets(CUSTOM_SCOPE.UNITS).map((asset) => asset.label)
    const [imp, gog, efreet] = ['Imp', 'Gog', 'Efreet'].map((name) =>
      addCustomAsset(CUSTOM_SCOPE.UNITS, file(`${name}.png`)),
    )
    expect(ids()).toEqual(['Imp', 'Gog', 'Efreet'])

    // Forwards, the picture lands after the place it was dropped on.
    moveCustomAsset(imp.id, gog.id)
    expect(ids()).toEqual(['Gog', 'Imp', 'Efreet'])

    // Back, it lands before it — either way, on the place itself.
    moveCustomAsset(efreet.id, gog.id)
    expect(ids()).toEqual(['Efreet', 'Gog', 'Imp'])

    // A picture dropped on itself, or on one that is not there, stays put.
    moveCustomAsset(gog.id, gog.id)
    moveCustomAsset(gog.id, 'custom/units/404')
    moveCustomAsset('custom/units/404', gog.id)
    expect(ids()).toEqual(['Efreet', 'Gog', 'Imp'])
  })

  it('leaves the other lists as they were, and never mixes one into another', () => {
    const card = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Imp.png'))
    const lava = addCustomAsset(CUSTOM_SCOPE.FIELD_TOKENS, file('Lava.png'))
    const poison = addCustomAsset(CUSTOM_SCOPE.FIELD_TOKENS, file('Poison.png'))
    const second = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Gog.png'))

    // A card is not a place among the tokens, whichever way round it is asked.
    moveCustomAsset(card.id, lava.id)
    moveCustomAsset(lava.id, card.id)
    expect(customAssets(CUSTOM_SCOPE.UNITS)).toEqual([card, second])
    expect(customAssets(CUSTOM_SCOPE.FIELD_TOKENS)).toEqual([lava, poison])

    // And reordering one list says nothing about the other.
    moveCustomAsset(second.id, card.id)
    expect(customAssets(CUSTOM_SCOPE.UNITS)).toEqual([second, card])
    expect(customAssets(CUSTOM_SCOPE.FIELD_TOKENS)).toEqual([lava, poison])
  })

  it('forgets a removed picture outright — the picker is where a picture is', () => {
    const asset = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Placed.png'))
    removeCustomAsset(asset.id)

    // Nothing is left behind to be drawn, or found by name, in its place.
    expect(hasUnitImage(asset.id)).toBe(false)
    expect(customImage(asset.id)).toBeUndefined()
    expect(customLabel(asset.id)).toBeUndefined()
    expect(() => unitImage(asset.id)).toThrow()
  })

  it('tells whoever is listening which picture went', () => {
    const heard = []
    const stop = onCustomAssetRemoved((id) => heard.push(id))

    const asset = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Gone.png'))
    removeCustomAsset(asset.id)
    // Removing what is not there says nothing.
    removeCustomAsset(asset.id)
    expect(heard).toEqual([asset.id])

    stop()
    removeCustomAsset(addCustomAsset(CUSTOM_SCOPE.UNITS, file('Next.png')).id)
    expect(heard).toEqual([asset.id])
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

  it('flips to the picture that is on the picker now, not the one replaced', () => {
    const few = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Nix_few.png'))
    const pack = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Nix_pack.png'))
    expect(flipUnit(pack.id)).toBe(few.id)

    // The small printing is redrawn and picked again under the same file name:
    // the card it is the other side of turns over to the new one.
    removeCustomAsset(few.id)
    expect(flipUnit(pack.id)).toBeUndefined()

    const redrawn = addCustomAsset(CUSTOM_SCOPE.UNITS, file('Nix_few.png'))
    expect(customAssets(CUSTOM_SCOPE.UNITS)).toHaveLength(2)
    expect(flipUnit(pack.id)).toBe(redrawn.id)
    expect(unitImage(redrawn.id)).toBe(redrawn.url)
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
