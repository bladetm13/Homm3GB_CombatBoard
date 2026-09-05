import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import BoardDice from '../src/components/BoardDice.vue'

const open = () => mount(BoardDice)

const button = (wrapper) => wrapper.get('[data-testid="board-dice-roll"]')
const popup = (wrapper) => wrapper.find('[data-testid="board-dice-popup"]')
const die = (wrapper) => wrapper.find('[data-testid="board-dice-face"]')

/** The die is in the air for 700ms; this carries it to the table. */
async function land(wrapper) {
  vi.advanceTimersByTime(700)
  await wrapper.vm.$nextTick()
}

/**
 * `Math.random` returns [0, 1); a third of that range each, so these are the
 * three faces of the die in the order it names them.
 */
const rolls = (...faces) => {
  const draws = faces.map((face) => [-1, 0, 1].indexOf(face) / 3 + 0.1)
  let at = 0
  vi.spyOn(Math, 'random').mockImplementation(() => draws[Math.min(at++, draws.length - 1)])
}

/** Whatever the die is showing right now, blur or result. */
const shown = (wrapper) => die(wrapper).text()

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/* The die keeps timers running, and a timer outlives the test that set it. */
enableAutoUnmount(afterEach)

describe('BoardDice', () => {
  it('offers one button, and nothing on the table until it is pressed', () => {
    const wrapper = open()
    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(button(wrapper).attributes('title')).toBe('Roll the die')
    expect(popup(wrapper).exists()).toBe(false)
  })

  it('throws the die, which lands on a face', async () => {
    const wrapper = open()
    rolls(1)
    await button(wrapper).trigger('click')

    expect(popup(wrapper).exists()).toBe(true)
    await land(wrapper)
    expect(die(wrapper).attributes('data-face')).toBe('1')
    expect(shown(wrapper)).toBe('+1')
  })

  it('rolls nothing but -1, 0 and +1', async () => {
    const wrapper = open()
    const seen = new Set()

    for (let throwNumber = 0; throwNumber < 60; throwNumber += 1) {
      await button(wrapper).trigger('click')
      await land(wrapper)
      seen.add(die(wrapper).attributes('data-face'))
    }

    expect([...seen].sort()).toEqual(['-1', '0', '1'])
  })

  it('writes the sign on the face, and leaves zero bare', async () => {
    const wrapper = open()
    for (const [face, label] of [
      [-1, '-1'],
      [0, '0'],
      [1, '+1'],
    ]) {
      rolls(face)
      await button(wrapper).trigger('click')
      await land(wrapper)
      expect(shown(wrapper)).toBe(label)
      vi.restoreAllMocks()
    }
  })

  it('tints the face by what it means', async () => {
    const wrapper = open()
    for (const [face, tint] of [
      [-1, 'is-down'],
      [0, 'is-even'],
      [1, 'is-up'],
    ]) {
      rolls(face)
      await button(wrapper).trigger('click')
      await land(wrapper)
      expect(die(wrapper).classes()).toContain(tint)
      vi.restoreAllMocks()
    }
  })

  it('keeps the result off the face while the die is still in the air', async () => {
    const wrapper = open()
    // The blur is drawn from its own draws, so the first is not the result.
    rolls(1, -1, -1, -1, -1, -1, -1, -1, -1, -1)
    await button(wrapper).trigger('click')

    expect(die(wrapper).classes()).toContain('is-tumbling')
    expect(die(wrapper).attributes('data-face')).toBeUndefined()
    expect(shown(wrapper)).toBe('-1')

    await land(wrapper)
    expect(die(wrapper).classes()).toContain('is-landed')
    expect(shown(wrapper)).toBe('+1')
  })

  it('flicks through faces while it tumbles', async () => {
    const wrapper = open()
    rolls(0, -1, 1, -1, 1)
    await button(wrapper).trigger('click')

    const blur = [shown(wrapper)]
    for (let tick = 0; tick < 3; tick += 1) {
      vi.advanceTimersByTime(80)
      await wrapper.vm.$nextTick()
      blur.push(shown(wrapper))
    }

    expect(blur).toEqual(['-1', '+1', '-1', '+1'])
  })

  it('takes the die off the table three seconds after it lands', async () => {
    const wrapper = open()
    rolls(0)
    await button(wrapper).trigger('click')
    await land(wrapper)

    vi.advanceTimersByTime(2999)
    await wrapper.vm.$nextTick()
    expect(popup(wrapper).exists()).toBe(true)

    vi.advanceTimersByTime(1)
    await wrapper.vm.$nextTick()
    expect(popup(wrapper).exists()).toBe(false)
  })

  it('throws again from the start when it is pressed while one is still up', async () => {
    const wrapper = open()
    rolls(1)
    await button(wrapper).trigger('click')
    await land(wrapper)
    expect(shown(wrapper)).toBe('+1')

    vi.advanceTimersByTime(2500)
    rolls(-1)
    await button(wrapper).trigger('click')
    await wrapper.vm.$nextTick()
    expect(die(wrapper).classes()).toContain('is-tumbling')

    // The first throw's three seconds were up long ago; the second's are not.
    await land(wrapper)
    vi.advanceTimersByTime(2999)
    await wrapper.vm.$nextTick()
    expect(shown(wrapper)).toBe('-1')
  })

  it('says what came up, for a reader who cannot see the die', async () => {
    const wrapper = open()
    rolls(-1)
    await button(wrapper).trigger('click')

    const stage = wrapper.get('[role="status"]')
    expect(stage.attributes('aria-live')).toBe('polite')
    // Not while it is a blur — only the face it settles on is worth saying.
    expect(stage.text()).not.toContain('Rolled')

    await land(wrapper)
    expect(stage.text()).toContain('Rolled -1')
    expect(die(wrapper).attributes('aria-hidden')).toBe('true')
  })

  it('skips the tumble for a reader who has asked for less motion', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }))
    const wrapper = open()
    rolls(1)
    await button(wrapper).trigger('click')

    expect(die(wrapper).classes()).toContain('is-landed')
    expect(shown(wrapper)).toBe('+1')
  })

  it('leaves the board still when the widget is used', () => {
    // `CombatBoard` skips its own pan for anything under `[data-no-drag]`.
    expect(open().get('[data-testid="board-dice"]').attributes('data-no-drag')).toBeDefined()
  })

  it('drops its timers when it goes', async () => {
    const wrapper = open()
    rolls(1)
    await button(wrapper).trigger('click')
    wrapper.unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
