import { describe, expect, it } from 'vitest'
import { hasTokenImage, tokenImage, tokenLabel } from '../src/components/BoardField/tokenAssets'
import { TOKENS, TOKEN_CATEGORY, TOKEN_SCOPE } from '../src/components/BoardField/tokenConstants'

const everyToken = Object.values(TOKENS).flatMap((scope) =>
  Object.values(scope).flatMap((group) => Object.values(group)),
)

describe('tokenAssets', () => {
  it('resolves a url for every token in every enum', () => {
    expect(everyToken).toHaveLength(30)
    for (const token of everyToken) {
      expect(hasTokenImage(token), token).toBe(true)
      expect(tokenImage(token), token).toBeTruthy()
    }
  })

  it('throws on a path that is not a token', () => {
    expect(hasTokenImage('unit_tokens/common-nonesuch.png')).toBe(false)
    expect(() => tokenImage('unit_tokens/common-nonesuch.png')).toThrow(/No asset found/)
  })

  it('keeps each token its own file name and extension', () => {
    for (const token of everyToken) {
      const file = token.slice(token.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
      expect(tokenImage(token), token).toContain(file)
      expect(tokenImage(token), token).toContain(token.slice(token.lastIndexOf('.')))
    }
    // The clone art is byte-identical in both folders, so a build is free to
    // emit a single asset for the two of them — same picture, two places it
    // may be dropped. Distinct urls are therefore not something to assert.
    const field = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].CLONE_1
    const unit = TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.SPELLS].CLONE_1
    expect(tokenImage(field)).toContain('spells-clone-1')
    expect(tokenImage(unit)).toContain('spells-clone-1')
  })

  it('labels a token by its name, without the category prefix', () => {
    expect(tokenLabel(TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.COMMON].DAMAGE_1)).toBe('Damage 1')
    expect(tokenLabel(TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.STACK].HP)).toBe('HP')
    expect(tokenLabel(TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL_LUNA)).toBe(
      'Firewall Luna',
    )
  })

  it('gives every token a non-empty, in-group unique label', () => {
    for (const [scope, groups] of Object.entries(TOKENS)) {
      for (const [category, group] of Object.entries(groups)) {
        const labels = Object.values(group).map(tokenLabel)
        for (const label of labels) expect(label, `${scope}/${category}`).not.toBe('')
        expect(new Set(labels).size, `${scope}/${category}`).toBe(labels.length)
      }
    }
  })
})
