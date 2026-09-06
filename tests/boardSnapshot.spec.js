import { afterEach, describe, expect, it } from 'vitest'
import {
  SNAPSHOT_APP,
  SNAPSHOT_VERSION,
  boardSnapshot,
  missingPictures,
  readBoardSnapshot,
  resolveSnapshot,
  restorePictures,
} from '../src/components/BoardField/boardSnapshot'
import {
  CUSTOM_SCOPE,
  addCustomAsset,
  clearCustomAssets,
  removeCustomAsset,
  restoreCustomAsset,
} from '../src/components/BoardField/customAssets'
import { UNITS, UNIT_TYPE } from '../src/components/BoardField/constants'
import { unitImage } from '../src/components/BoardField/unitAssets'
import { TOKENS, TOKEN_CATEGORY, TOKEN_SCOPE } from '../src/components/BoardField/tokenConstants'

const TITANS = UNITS[UNIT_TYPE.TOWER].TITANS_FEW
const ARCHANGELS = UNITS[UNIT_TYPE.CASTLE].ARCHANGELS_PACK
const FIREWALL = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL
const QUICKSAND = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].QUICKSAND
const DAMAGE_1 = TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.COMMON].DAMAGE_1

const image = (name) => new File(['art'], name, { type: 'image/png' })

afterEach(clearCustomAssets)

describe('boardSnapshot', () => {
  it('writes the board down, cards, tokens and all', async () => {
    const snapshot = await boardSnapshot({
      units: { '1-1': TITANS },
      tokens: { '1-1': [DAMAGE_1], '2-3': [FIREWALL, QUICKSAND] },
    })

    expect(snapshot.app).toBe(SNAPSHOT_APP)
    expect(snapshot.version).toBe(SNAPSHOT_VERSION)
    expect(Date.parse(snapshot.savedAt)).not.toBeNaN()
    expect(snapshot.board).toEqual({
      units: { '1-1': TITANS },
      tokens: { '1-1': [DAMAGE_1], '2-3': [FIREWALL, QUICKSAND] },
    })
    expect(snapshot.custom).toEqual([])
  })

  it('is a copy — later moves on the board do not rewrite it', async () => {
    const units = { '1-1': TITANS }
    const tokens = { '1-1': [DAMAGE_1] }
    const snapshot = await boardSnapshot({ units, tokens })

    units['1-2'] = ARCHANGELS
    tokens['1-1'].push(FIREWALL)

    expect(snapshot.board.units).toEqual({ '1-1': TITANS })
    expect(snapshot.board.tokens['1-1']).toEqual([DAMAGE_1])
  })

  it('carries every picture the user brought in, bytes and all', async () => {
    const card = addCustomAsset(CUSTOM_SCOPE.UNITS, image('Angry Peasant.png'))
    const token = addCustomAsset(CUSTOM_SCOPE.UNIT_TOKENS, image('Poison.webp'))

    expect((await boardSnapshot({})).custom).toEqual([
      {
        id: card.id,
        scope: CUSTOM_SCOPE.UNITS,
        label: 'Angry Peasant',
        file: 'Angry Peasant.png',
        data: `data:image/png;base64,${btoa('art')}`,
      },
      {
        id: token.id,
        scope: CUSTOM_SCOPE.UNIT_TOKENS,
        label: 'Poison',
        file: 'Poison.webp',
        data: `data:image/png;base64,${btoa('art')}`,
      },
    ])
  })

  it('still carries a picture crossed off the picker but left on the board', async () => {
    const card = addCustomAsset(CUSTOM_SCOPE.UNITS, image('Boss.png'))
    removeCustomAsset(card.id)

    expect((await boardSnapshot({})).custom).toEqual([])
    expect((await boardSnapshot({ units: { '3-2': card.id } })).custom).toMatchObject([
      { id: card.id, scope: CUSTOM_SCOPE.UNITS, label: 'Boss', file: 'Boss.png' },
    ])
  })

  it('reads its own file back, unchanged', async () => {
    const written = await boardSnapshot({
      units: { '5-4': TITANS },
      tokens: { '5-4': [DAMAGE_1] },
    })
    const read = readBoardSnapshot(JSON.parse(JSON.stringify(written)))

    expect(read).toEqual({
      custom: [],
      units: { '5-4': TITANS },
      tokens: { '5-4': [DAMAGE_1] },
      dropped: 0,
    })
  })
})

describe('readBoardSnapshot', () => {
  it('refuses a file that holds no board at all', () => {
    for (const data of [null, 42, 'a board', [], {}, { board: 7 }]) {
      expect(() => readBoardSnapshot(data)).toThrow(/does not hold a board/)
    }
  })

  it('takes a bare board too, whoever wrote it', () => {
    expect(readBoardSnapshot({ units: { '1-1': TITANS } }).units).toEqual({ '1-1': TITANS })
  })

  it('drops a cell that is not on the grid', () => {
    const read = readBoardSnapshot({
      board: {
        units: { '1-1': TITANS, '6-1': TITANS, '1-5': TITANS, '0-0': TITANS, nowhere: TITANS },
        tokens: { '9-9': [FIREWALL] },
      },
    })

    expect(read.units).toEqual({ '1-1': TITANS })
    expect(read.tokens).toEqual({})
    expect(read.dropped).toBe(5)
  })

  it('drops a card or token this deck does not have', () => {
    const read = readBoardSnapshot({
      board: {
        units: { '1-1': 'castle/units-castle-nonesuch.webp', '1-2': ARCHANGELS, '1-3': 7 },
        tokens: { '2-1': [FIREWALL, 'field_tokens/nonesuch.png', null] },
      },
    })

    expect(read.units).toEqual({ '1-2': ARCHANGELS })
    expect(read.tokens).toEqual({ '2-1': [FIREWALL] })
    expect(read.dropped).toBe(4)
  })

  /* The cell draws four and offers the rest; none of them are dropped here. */
  it('keeps every token a cell carries, past the four it can draw', () => {
    const read = readBoardSnapshot({
      board: { tokens: { '1-1': [FIREWALL, QUICKSAND, FIREWALL, QUICKSAND, FIREWALL] } },
    })

    expect(read.tokens['1-1']).toHaveLength(5)
    expect(read.dropped).toBe(0)
  })

  it('drops a token list that is not a list', () => {
    const read = readBoardSnapshot({ board: { tokens: { '1-1': FIREWALL } } })
    expect(read.tokens).toEqual({})
    expect(read.dropped).toBe(1)
  })

  it('keeps a picture it names, and the pieces standing on it', () => {
    const read = readBoardSnapshot({
      custom: [
        { id: 'custom/units/1', scope: 'units', label: 'Boss', file: 'boss.png' },
        { id: 'custom/unit_tokens/2', scope: 'unit_tokens', label: 'Poison', file: 'poison.png' },
      ],
      board: {
        units: { '1-1': 'custom/units/1' },
        tokens: { '1-1': ['custom/unit_tokens/2'] },
      },
    })

    expect(read.custom).toHaveLength(2)
    expect(read.units).toEqual({ '1-1': 'custom/units/1' })
    expect(read.tokens).toEqual({ '1-1': ['custom/unit_tokens/2'] })
    expect(read.dropped).toBe(0)
  })

  it('drops a picture the file never names, and whatever leaned on it', () => {
    const read = readBoardSnapshot({
      custom: [{ id: 'custom/units/1', scope: 'units', file: 'boss.png' }],
      board: {
        units: { '1-1': 'custom/units/9' },
        tokens: { '2-2': ['custom/field_tokens/3'] },
      },
    })

    expect(read.units).toEqual({})
    expect(read.tokens).toEqual({})
    expect(read.dropped).toBe(2)
  })

  it('drops a picture filed under the wrong sort of thing', () => {
    const read = readBoardSnapshot({
      custom: [
        { id: 'custom/units/1', scope: 'units', file: 'boss.png' },
        { id: 'custom/field_tokens/2', scope: 'field_tokens', file: 'lava.png' },
      ],
      // A card cannot be a token, and a token cannot be a card.
      board: {
        units: { '1-1': 'custom/field_tokens/2' },
        tokens: { '2-2': ['custom/units/1'] },
      },
    })

    expect(read.units).toEqual({})
    expect(read.tokens).toEqual({})
    expect(read.dropped).toBe(2)
  })

  it('sifts the manifest itself, id, scope and all', () => {
    const read = readBoardSnapshot({
      custom: [
        { id: 'custom/units/1', scope: 'units', file: 'ok.png' },
        { id: 'custom/units/2', scope: 'field_tokens', file: 'crossed.png' },
        { id: 'units/3', scope: 'units', file: 'no-prefix.png' },
        { id: 'custom/units/four', scope: 'units', file: 'not-a-number.png' },
        { id: 'custom/spells/5', scope: 'spells', file: 'unknown-scope.png' },
        'nonsense',
        null,
      ],
      board: { units: {} },
    })

    expect(read.custom).toEqual([
      { id: 'custom/units/1', scope: 'units', label: '', file: 'ok.png', data: '' },
    ])
  })

  it('takes a manifest that is not a list as no manifest at all', () => {
    expect(readBoardSnapshot({ custom: 'boss.png', board: { units: {} } }).custom).toEqual([])
  })
})

describe('restorePictures', () => {
  it('brings a picture back from the file alone, into a tab that never had it', async () => {
    const card = addCustomAsset(CUSTOM_SCOPE.UNITS, image('Boss.png'))
    const written = JSON.parse(
      JSON.stringify(await boardSnapshot({ units: { '1-1': card.id }, tokens: {} })),
    )
    // A fresh tab: the file is all there is.
    clearCustomAssets()

    const read = readBoardSnapshot(written)
    expect(missingPictures(read)).toHaveLength(1)

    expect(restorePictures(read)).toBe(1)
    expect(missingPictures(read)).toEqual([])
    expect(unitImage(card.id)).toBeTruthy()
    expect(resolveSnapshot(read)).toEqual({ units: { '1-1': card.id }, tokens: {}, waiting: 0 })
  })

  it('unpacks nothing that is not a picture', () => {
    const read = readBoardSnapshot({
      custom: [
        // Something else dressed as a picture, a field that is no data URL at
        // all, and base64 that is not base64.
        { id: 'custom/units/1', scope: 'units', file: 'a.png', data: 'data:text/html;base64,PHA+' },
        { id: 'custom/units/2', scope: 'units', file: 'b.png', data: 'boss.png' },
        { id: 'custom/units/3', scope: 'units', file: 'c.png', data: 'data:image/png;base64,@@@@' },
        { id: 'custom/units/4', scope: 'units', file: 'd.png' },
      ],
      board: { units: {} },
    })

    expect(restorePictures(read)).toBe(0)
    expect(missingPictures(read)).toHaveLength(4)
  })

  it('leaves a picture already in this tab alone', async () => {
    const card = addCustomAsset(CUSTOM_SCOPE.UNITS, image('Boss.png'))
    const read = readBoardSnapshot(JSON.parse(JSON.stringify(await boardSnapshot({}))))

    expect(restorePictures(read)).toBe(0)
    expect(missingPictures(read)).toEqual([])
    expect(unitImage(card.id)).toBe(card.url)
  })
})

describe('resolveSnapshot', () => {
  const snapshot = () =>
    readBoardSnapshot({
      custom: [{ id: 'custom/units/1', scope: 'units', label: 'Boss', file: 'boss.png' }],
      board: {
        units: { '1-1': TITANS, '1-2': 'custom/units/1' },
        tokens: { '2-1': [FIREWALL, 'custom/unit_tokens/2'], '2-2': ['custom/unit_tokens/2'] },
        // The second picture is not in the manifest, so it never gets this far.
      },
    })

  it('lays down what it can and counts what waits on a picture', () => {
    const read = snapshot()
    const { units, tokens, waiting } = resolveSnapshot(read)

    expect(units).toEqual({ '1-1': TITANS })
    expect(tokens).toEqual({ '2-1': [FIREWALL] })
    expect(waiting).toBe(1)
    expect(missingPictures(read)).toMatchObject([
      { id: 'custom/units/1', scope: 'units', label: 'Boss', file: 'boss.png' },
    ])
  })

  it('lays the rest down once the picture is back', () => {
    const read = snapshot()
    restoreCustomAsset(read.custom[0], image('boss.png'))

    const { units, waiting } = resolveSnapshot(read)
    expect(units).toEqual({ '1-1': TITANS, '1-2': 'custom/units/1' })
    expect(waiting).toBe(0)
    expect(missingPictures(read)).toEqual([])
  })
})
