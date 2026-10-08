import { describe, expect, it } from 'vitest'
import { tokenOrder, withoutRoundTokens } from '../src/components/BoardField/boardRules'
import { UNIT_TOKENS_COMMON } from '../src/components/BoardField/tokenConstants'

const { ACTIVATION, RETALIATION, DAMAGE_1, DEFENSE } = UNIT_TOKENS_COMMON

describe('tokenOrder', () => {
  it('puts activation first, retaliation next, and the rest as they were laid', () => {
    const list = [DAMAGE_1, RETALIATION, DEFENSE, ACTIVATION]
    expect(tokenOrder(list).map((index) => list[index])).toEqual([
      ACTIVATION,
      RETALIATION,
      DAMAGE_1,
      DEFENSE,
    ])
  })

  it('keeps two of a kind in the order they were laid', () => {
    expect(tokenOrder([DAMAGE_1, RETALIATION, DEFENSE, RETALIATION])).toEqual([1, 3, 0, 2])
  })

  it('leaves the list it was handed alone', () => {
    const list = [DAMAGE_1, ACTIVATION]
    tokenOrder(list)
    expect(list).toEqual([DAMAGE_1, ACTIVATION])
  })
})

describe('withoutRoundTokens', () => {
  it('takes the round markers off every cell, and drops a cell left empty', () => {
    expect(
      withoutRoundTokens({
        '1-1': [ACTIVATION, DAMAGE_1, RETALIATION],
        '2-2': [RETALIATION, ACTIVATION],
        '3-3': [DEFENSE],
      }),
    ).toEqual({ '1-1': [DAMAGE_1], '3-3': [DEFENSE] })
  })

  it('hands back the same map when there is nothing to take', () => {
    const tokens = { '1-1': [DAMAGE_1] }
    expect(withoutRoundTokens(tokens)).toBe(tokens)
  })

  it('leaves the map it was handed alone', () => {
    const tokens = { '1-1': [ACTIVATION, DAMAGE_1] }
    withoutRoundTokens(tokens)
    expect(tokens).toEqual({ '1-1': [ACTIVATION, DAMAGE_1] })
  })
})
