// @vitest-environment node
// Reads the asset folders straight off disk, so it needs no DOM.
import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  TOKENS,
  TOKEN_CATEGORY,
  TOKEN_CATEGORY_LABEL,
  TOKEN_SCOPE,
} from '../src/components/BoardField/tokenConstants'

const ASSETS = new URL('../assets/', import.meta.url)

/** Values are paths relative to assets/, so compare them as such. */
const filesIn = (scope) => readdirSync(new URL(scope, ASSETS)).map((file) => `${scope}/${file}`)

const scopes = Object.values(TOKEN_SCOPE)
const tokensIn = (scope) => Object.values(TOKENS[scope]).flatMap((group) => Object.values(group))

describe('token constants', () => {
  it('has one scope per token folder on disk', () => {
    const folders = readdirSync(ASSETS, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.endsWith('_tokens'))
      .map((entry) => entry.name)
    expect(scopes.toSorted()).toEqual(folders.toSorted())
    expect(Object.keys(TOKENS)).toHaveLength(scopes.length)
  })

  it.each(scopes)('covers every %s asset exactly once', (scope) => {
    const values = tokensIn(scope)
    expect(values.toSorted()).toEqual(filesIn(scope).toSorted())
    expect(new Set(values).size).toBe(values.length)
  })

  it('groups a scope by the category each file name starts with', () => {
    for (const scope of scopes) {
      for (const [category, group] of Object.entries(TOKENS[scope])) {
        for (const token of Object.values(group)) {
          expect(token, token).toBe(`${scope}/${category}-${token.slice(token.indexOf('-') + 1)}`)
        }
      }
    }
  })

  it('files every category under a heading', () => {
    for (const scope of scopes) {
      for (const category of Object.keys(TOKENS[scope])) {
        expect(Object.values(TOKEN_CATEGORY)).toContain(category)
        expect(TOKEN_CATEGORY_LABEL[category], category).toBeTruthy()
      }
    }
  })

  it('keeps the two scopes apart, even where a token exists in both', () => {
    expect(TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].CLONE_1).toBe(
      'field_tokens/spells-clone-1.png',
    )
    expect(TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.SPELLS].CLONE_1).toBe(
      'unit_tokens/spells-clone-1.png',
    )
    // Board effects take a cell; stack markers ride a unit. Nothing is in both.
    const field = new Set(tokensIn(TOKEN_SCOPE.FIELD))
    expect(tokensIn(TOKEN_SCOPE.UNIT).some((token) => field.has(token))).toBe(false)
  })

  it('offers the field only spell markers, and the unit the stack ones', () => {
    expect(Object.keys(TOKENS[TOKEN_SCOPE.FIELD])).toEqual([TOKEN_CATEGORY.SPELLS])
    expect(Object.keys(TOKENS[TOKEN_SCOPE.UNIT])).toEqual([
      TOKEN_CATEGORY.COMMON,
      TOKEN_CATEGORY.EFFECT,
      TOKEN_CATEGORY.STACK,
      TOKEN_CATEGORY.SPELLS,
      TOKEN_CATEGORY.OTHER,
    ])
  })
})
