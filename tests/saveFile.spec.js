import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveFile } from '../src/composables/saveFile'

const blobOf = (text) => new Blob([text], { type: 'text/plain' })

const ask = (overrides = {}) =>
  saveFile({
    name: 'combat-board.json',
    type: 'application/json',
    extensions: ['.json'],
    description: 'Board file',
    produce: async () => blobOf('{}'),
    ...overrides,
  })

/** A file handle of the sort `showSaveFilePicker` hands back. */
function fakeHandle() {
  const written = []
  return {
    written,
    createWritable: async () => ({
      write: async (blob) => written.push(blob),
      close: async () => {},
    }),
  }
}

let clicked
let urls

beforeEach(() => {
  clicked = []
  urls = []
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    urls.push(blob)
    return 'blob:saved'
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
    clicked.push(this.download)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  delete window.showSaveFilePicker
})

describe('saveFile', () => {
  it('falls back to a download where there is no save dialog to open', async () => {
    expect(await ask()).toBe(true)
    expect(clicked).toEqual(['combat-board.json'])
    expect(urls).toHaveLength(1)
    // The link is not left behind in the page.
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('writes into the file the dialog came back with', async () => {
    const handle = fakeHandle()
    window.showSaveFilePicker = vi.fn(async () => handle)

    expect(await ask()).toBe(true)
    expect(window.showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'combat-board.json',
      types: [{ description: 'Board file', accept: { 'application/json': ['.json'] } }],
    })
    expect(await handle.written[0].text()).toBe('{}')
    // Written, not downloaded.
    expect(clicked).toEqual([])
  })

  it('opens the dialog before it makes the file, while the click is still fresh', async () => {
    const order = []
    window.showSaveFilePicker = vi.fn(async () => {
      order.push('dialog')
      return fakeHandle()
    })

    await ask({
      produce: async () => {
        order.push('made')
        return blobOf('{}')
      },
    })

    expect(order).toEqual(['dialog', 'made'])
  })

  it('makes nothing at all when the user closes the dialog', async () => {
    window.showSaveFilePicker = vi.fn(async () => {
      throw new DOMException('The user aborted a request.', 'AbortError')
    })
    const produce = vi.fn()

    expect(await ask({ produce })).toBe(false)
    expect(produce).not.toHaveBeenCalled()
    expect(clicked).toEqual([])
  })

  it('saves nothing when there turns out to be nothing to save', async () => {
    expect(await ask({ produce: async () => null })).toBe(false)
    expect(clicked).toEqual([])

    const handle = fakeHandle()
    window.showSaveFilePicker = vi.fn(async () => handle)
    expect(await ask({ produce: async () => null })).toBe(false)
    expect(handle.written).toEqual([])
  })
})
