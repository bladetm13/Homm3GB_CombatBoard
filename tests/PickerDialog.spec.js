import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import PickerDialog from '../src/components/BoardField/PickerDialog.vue'
import ScrollBox from '../src/components/ScrollBox.vue'
import { clearPickerMemory } from '../src/components/BoardField/pickerMemory'

const open = (props = {}) =>
  mount(PickerDialog, {
    attachTo: document.body,
    props: { title: 'Choose a unit', ...props },
    slots: { default: '<p>a very long list</p>' },
    global: { stubs: { teleport: true } },
  })

/** happy-dom reports zero layout, so state the geometry each test needs. */
const setGeometry = (wrapper, { scrollHeight = 2000, clientHeight = 400 } = {}) => {
  const el = wrapper.get('[data-testid="scrollbox-viewport"]').element
  Object.defineProperties(el, {
    scrollTop: { value: 0, writable: true, configurable: true },
    scrollHeight: { value: scrollHeight, configurable: true },
    clientHeight: { value: clientHeight, configurable: true },
  })
  wrapper.findComponent(ScrollBox).vm.measure()
  return el
}

const scrollTo = (wrapper, offset) => wrapper.findComponent(ScrollBox).vm.scrollToOffset(offset)

beforeEach(clearPickerMemory)

describe('PickerDialog', () => {
  it('opens at the top the first time', async () => {
    const wrapper = open()
    const viewport = setGeometry(wrapper)
    await nextTick()
    expect(viewport.scrollTop).toBe(0)
  })

  it('comes back scrolled where it was closed', async () => {
    const first = open()
    setGeometry(first)
    scrollTo(first, 300)
    first.unmount()

    const second = open()
    // The restore waits a tick for the list to render, so the geometry is in
    // place by the time it runs.
    const viewport = setGeometry(second)
    await nextTick()
    await nextTick()
    expect(viewport.scrollTop).toBe(300)
  })

  it('remembers each list separately, not each component', async () => {
    const field = open({ memoryKey: 'token-picker:field' })
    setGeometry(field)
    scrollTo(field, 240)
    field.unmount()

    const units = open({ memoryKey: 'token-picker:unit' })
    const viewport = setGeometry(units)
    await nextTick()
    await nextTick()
    expect(viewport.scrollTop).toBe(0)
  })

  it('files the memory under the testid when no key is given', async () => {
    const first = open({ testid: 'picker' })
    setGeometry(first)
    scrollTo(first, 180)
    first.unmount()

    const second = open({ memoryKey: 'picker' })
    const viewport = setGeometry(second)
    await nextTick()
    await nextTick()
    expect(viewport.scrollTop).toBe(180)
  })
})
