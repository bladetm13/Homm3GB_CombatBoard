import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { useEscapeKey } from '../src/composables/useEscapeKey'

const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

/** A component that records every Escape it is handed. */
const listener = (log, name) => ({
  setup: () => useEscapeKey(() => log.push(name)),
  template: '<i />',
})

describe('useEscapeKey', () => {
  it('calls the handler on Escape, and on nothing else', () => {
    const log = []
    mount(listener(log, 'only'))

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(log).toEqual([])

    escape()
    expect(log).toEqual(['only'])
  })

  it('hands Escape to the last mounted handler alone', () => {
    const log = []
    mount(listener(log, 'under'))
    const over = mount(listener(log, 'over'))

    escape()
    expect(log).toEqual(['over'])

    // With the top one gone, the one below takes over again.
    over.unmount()
    escape()
    expect(log).toEqual(['over', 'under'])
  })

  it('stops listening once the last handler is gone', () => {
    const log = []
    const wrapper = mount(listener(log, 'gone'))
    wrapper.unmount()

    escape()
    expect(log).toEqual([])
  })
})
