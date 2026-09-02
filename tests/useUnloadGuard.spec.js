import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { useUnloadGuard } from '../src/composables/useUnloadGuard'

/*
  The guard listens on `window`, which outlives the component tree, so every
  host here is unmounted again before the next test asks who is listening.
*/
const mounted = []

function host(hasUnsavedWork) {
  const wrapper = mount({
    setup() {
      useUnloadGuard(hasUnsavedWork)
      return () => null
    },
  })
  mounted.push(wrapper)
  return wrapper
}

/** What the browser sends on its way out; a cancelled one puts up the prompt. */
function leave() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
})

describe('useUnloadGuard', () => {
  it('asks the browser to warn while there is work to lose', () => {
    host(() => true)
    const event = leave()

    expect(event.defaultPrevented).toBe(true)
    // The legacy channel some browsers still read; the wording is theirs.
    expect(event.returnValue).toBe('')
  })

  it('lets an untouched page close without a word', () => {
    host(() => false)
    expect(leave().defaultPrevented).toBe(false)
  })

  it('asks again the moment there is something to lose', () => {
    let touched = false
    host(() => touched)
    expect(leave().defaultPrevented).toBe(false)

    touched = true
    expect(leave().defaultPrevented).toBe(true)
  })

  it('stops listening once the component is gone', () => {
    host(() => true).unmount()
    expect(leave().defaultPrevented).toBe(false)
  })
})
