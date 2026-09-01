// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { clearPickerMemory, pickerMemory } from '../src/components/BoardField/pickerMemory'

beforeEach(clearPickerMemory)

describe('pickerMemory', () => {
  it('starts a picker off with nothing remembered', () => {
    expect(pickerMemory('unit-picker')).toEqual({ open: {}, scrollTop: 0 })
  })

  it('hands back the same entry, so writes are seen by the next opening', () => {
    pickerMemory('unit-picker').open.castle = true
    pickerMemory('unit-picker').scrollTop = 420

    expect(pickerMemory('unit-picker')).toEqual({ open: { castle: true }, scrollTop: 420 })
  })

  it('keeps one entry per key', () => {
    pickerMemory('token-picker:field_tokens').scrollTop = 120
    expect(pickerMemory('token-picker:unit_tokens').scrollTop).toBe(0)
    expect(pickerMemory('token-picker:field_tokens').scrollTop).toBe(120)
  })

  it('forgets everything on demand', () => {
    pickerMemory('unit-picker').scrollTop = 99
    clearPickerMemory()
    expect(pickerMemory('unit-picker').scrollTop).toBe(0)
  })
})
