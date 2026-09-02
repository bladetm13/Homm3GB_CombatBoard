import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BoardTools from '../src/components/BoardTools.vue'
import { boardSnapshot } from '../src/components/BoardField/boardSnapshot'
import {
  CUSTOM_SCOPE,
  addCustomAsset,
  clearCustomAssets,
  customImage,
} from '../src/components/BoardField/customAssets'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'
import { TOKENS, TOKEN_CATEGORY, TOKEN_SCOPE } from '../src/components/BoardField/tokenConstants'

const TITANS = UNITS[UNIT_TYPE.TOWER].TITANS_FEW
const FIREWALL = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL

const image = (name) => new File(['art'], name, { type: 'image/png' })
const json = (data) =>
  new File([JSON.stringify(data)], 'board.json', { type: 'application/json' })

const open = (props = {}) => mount(BoardTools, { props: { units: {}, tokens: {}, ...props } })

/*
  Every object URL the component asks for, newest last — the exported file is
  the last one, since a picture added along the way takes one of its own.
*/
const written = async () => JSON.parse(await saved.at(-1).text())

/** Reading a picture out of its file, or into one, takes a turn of the loop. */
const flush = () => new Promise((resolve) => setTimeout(resolve))

/** What the browser's file dialog would hand back, had one really opened. */
async function feed(wrapper, testid, files) {
  const input = wrapper.get(`[data-testid="${testid}"]`)
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
  // The JSON is read off the file, which takes a turn of the event loop.
  await new Promise((resolve) => setTimeout(resolve))
  await wrapper.vm.$nextTick()
}

/** The one thing the widget ever spells out: pictures it could not read. */
const warning = (wrapper) => wrapper.find('[data-testid="board-tools-warning"]')

let saved

beforeEach(() => {
  saved = []
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    saved.push(blob)
    return 'blob:saved'
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  window.print = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  clearCustomAssets()
})

describe('BoardTools', () => {
  it('offers the three whole-board tools beside the zoom widget', () => {
    const wrapper = open()
    for (const tool of ['board-print', 'board-export', 'board-import']) {
      expect(wrapper.find(`[data-testid="${tool}"]`).exists()).toBe(true)
    }
    // Never dragged with the board underneath it.
    expect(wrapper.get('[data-testid="board-tools"]').attributes('data-no-drag')).toBeDefined()
  })

  it('hands the page to the browser to print', async () => {
    await open().get('[data-testid="board-print"]').trigger('click')
    expect(window.print).toHaveBeenCalled()
  })

  it('saves the board as JSON, cards and tokens and all', async () => {
    const wrapper = open({ units: { '1-1': TITANS }, tokens: { '2-2': [FIREWALL] } })
    await wrapper.get('[data-testid="board-export"]').trigger('click')
    await flush()

    expect(saved).toHaveLength(1)
    expect((await written()).board).toEqual({ units: { '1-1': TITANS }, tokens: { '2-2': [FIREWALL] } })
    // The file is the whole of the report: the widget says nothing about it.
    expect(wrapper.text()).toBe('')
  })

  it('carries the pictures inside the file, not a path to them', async () => {
    addCustomAsset(CUSTOM_SCOPE.UNITS, image('Angry Peasant.png'))
    const wrapper = open()
    await wrapper.get('[data-testid="board-export"]').trigger('click')
    await flush()

    expect((await written()).custom).toEqual([
      {
        id: 'custom/units/1',
        scope: 'units',
        label: 'Angry Peasant',
        file: 'Angry Peasant.png',
        data: `data:image/png;base64,${btoa('art')}`,
      },
    ])
  })

  it('reads a picture back out of the file, in the one click', async () => {
    const card = addCustomAsset(CUSTOM_SCOPE.UNITS, image('Boss.png'))
    const wrapper = open({ units: { '1-1': card.id } })
    await wrapper.get('[data-testid="board-export"]').trigger('click')
    await flush()
    const file = new File([await saved.at(-1).text()], 'board.json')

    // A fresh tab, with nothing but the file the user saved.
    clearCustomAssets()
    const again = open()
    await feed(again, 'board-import-input', [file])

    expect(customImage(card.id)).toBeTruthy()
    expect(again.emitted('import').at(-1)[0].units).toEqual({ '1-1': card.id })
    // Nothing was lost, so there is nothing to say.
    expect(warning(again).exists()).toBe(false)
  })

  it('reads a board back and hands it to the field', async () => {
    const wrapper = open()
    const file = json(
      await boardSnapshot({ units: { '3-3': TITANS }, tokens: { '3-3': [FIREWALL] } }),
    )

    await feed(wrapper, 'board-import-input', [file])

    expect(wrapper.emitted('import')).toEqual([
      [{ units: { '3-3': TITANS }, tokens: { '3-3': [FIREWALL] } }],
    ])
    expect(wrapper.text()).toBe('')
  })

  it('lays nothing down when the file is not a board', async () => {
    const wrapper = open()
    await feed(wrapper, 'board-import-input', [
      new File(['not json at all'], 'board.json', { type: 'application/json' }),
    ])

    expect(wrapper.emitted('import')).toBeUndefined()
    expect(warning(wrapper).exists()).toBe(false)
  })

  it('leaves behind whatever the file got wrong', async () => {
    const wrapper = open()
    await feed(wrapper, 'board-import-input', [
      json({ board: { units: { '1-1': TITANS, '9-9': TITANS, '1-2': 'castle/nope.webp' } } }),
    ])

    expect(wrapper.emitted('import').at(-1)[0].units).toEqual({ '1-1': TITANS })
  })

  it('names the pictures it had to throw away, and lays down the rest', async () => {
    const wrapper = open()
    await feed(wrapper, 'board-import-input', [
      json({
        custom: [
          // Something else dressed as a picture, and a picture with no bytes.
          { id: 'custom/units/1', scope: 'units', file: 'boss.png', data: 'data:text/html;base64,PHA+' },
          { id: 'custom/units/2', scope: 'units', file: 'hero.png' },
        ],
        board: { units: { '1-1': TITANS, '1-2': 'custom/units/1', '1-3': 'custom/units/2' } },
      }),
    ])

    expect(customImage('custom/units/1')).toBeUndefined()
    expect(customImage('custom/units/2')).toBeUndefined()
    expect(wrapper.emitted('import').at(-1)[0].units).toEqual({ '1-1': TITANS })
    expect(warning(wrapper).text()).toBe('2 pictures could not be read: boss.png, hero.png')
  })

  it('says it in the singular for the one picture, and forgets it on the next file', async () => {
    const wrapper = open()
    const broken = {
      custom: [{ id: 'custom/units/1', scope: 'units', file: 'boss.png', data: 'nonsense' }],
      board: { units: { '1-1': 'custom/units/1' } },
    }

    await feed(wrapper, 'board-import-input', [json(broken)])
    expect(warning(wrapper).text()).toBe('1 picture could not be read: boss.png')

    await feed(wrapper, 'board-import-input', [json({ board: { units: { '1-1': TITANS } } })])
    expect(warning(wrapper).exists()).toBe(false)
  })

  it('asks for nothing when the pictures are already in this tab', async () => {
    const card = addCustomAsset(CUSTOM_SCOPE.UNITS, image('Boss.png'))
    const wrapper = open({ units: { '1-1': card.id } })
    await wrapper.get('[data-testid="board-export"]').trigger('click')
    await flush()

    const again = open()
    await feed(again, 'board-import-input', [new File([await saved.at(-1).text()], 'board.json')])

    expect(again.emitted('import').at(-1)[0].units).toEqual({ '1-1': card.id })
    expect(warning(again).exists()).toBe(false)
  })
})
