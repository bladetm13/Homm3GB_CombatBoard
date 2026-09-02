import { describe, expect, it } from 'vitest'
import {
  containRect,
  pictureExtension,
  pictureType,
  pieceBoxes,
  renderBoardPicture,
} from '../src/composables/boardPicture'

const rect = (left, top, width, height) => ({ left, top, width, height })

/** What `containRect` works in: a box already in the caller's coordinates. */
const box = (x, y, width, height) => ({ x, y, width, height })

const fakeImage = (natural, bounds, complete = true) => ({
  complete,
  naturalWidth: natural[0],
  naturalHeight: natural[1],
  getBoundingClientRect: () => bounds,
})

const fakeBoard = (bounds, images = []) => ({
  getBoundingClientRect: () => bounds,
  querySelectorAll: () => images,
})

describe('containRect', () => {
  it('letterboxes a wide picture top and bottom', () => {
    expect(containRect(box(0, 0, 100, 100), { width: 200, height: 100 })).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
    })
  })

  it('letterboxes a tall picture left and right', () => {
    expect(containRect(box(10, 20, 100, 100), { width: 100, height: 200 })).toEqual({
      x: 35,
      y: 20,
      width: 50,
      height: 100,
    })
  })

  it('fills a box its picture already fits', () => {
    expect(containRect(box(0, 0, 209, 290), { width: 2090, height: 2900 })).toEqual({
      x: 0,
      y: 0,
      width: 209,
      height: 290,
    })
  })

  it('leaves a box alone when there is no picture to fit in it', () => {
    const empty = box(0, 0, 100, 100)
    expect(containRect(empty, { width: 0, height: 0 })).toBe(empty)
    expect(containRect(empty, undefined)).toBe(empty)
  })
})

describe('pieceBoxes', () => {
  const board = rect(100, 200, 400, 800)

  it('measures a piece as its share of the board, wherever the board is', () => {
    const card = fakeImage([100, 100], rect(200, 400, 100, 100))
    expect(pieceBoxes(fakeBoard(board, [card]))[0].box).toEqual({
      x: 0.25,
      y: 0.25,
      width: 0.25,
      height: 0.125,
    })
  })

  it('measures what the picture covers, not the box it sits in', () => {
    // A square box holding a 2:1 picture: half the height, centred.
    const token = fakeImage([200, 100], rect(100, 200, 100, 100))
    expect(pieceBoxes(fakeBoard(board, [token]))[0].box).toEqual({
      x: 0,
      y: 25 / 800,
      width: 0.25,
      height: 50 / 800,
    })
  })

  it('keeps the order the board draws them in — a token over its card', () => {
    const card = fakeImage([100, 100], rect(100, 200, 100, 100))
    const token = fakeImage([100, 100], rect(120, 220, 40, 40))
    const boxes = pieceBoxes(fakeBoard(board, [card, token]))

    expect(boxes.map(({ image }) => image)).toEqual([card, token])
  })

  it('passes over a picture there is nothing to draw of', () => {
    const pieces = [
      fakeImage([100, 100], rect(100, 200, 100, 100), false), // still loading
      fakeImage([0, 0], rect(100, 200, 100, 100)), // never loaded
      fakeImage([100, 100], rect(100, 200, 0, 0)), // laid out to nothing
    ]
    expect(pieceBoxes(fakeBoard(board, pieces))).toEqual([])
  })

  it('has nothing to measure without a board on the page', () => {
    expect(pieceBoxes(null)).toEqual([])
    expect(pieceBoxes(fakeBoard(rect(0, 0, 0, 0), [fakeImage([10, 10], rect(0, 0, 10, 10))]))).toEqual([])
  })
})

describe('the picture itself', () => {
  it('names the file by what the browser can encode', () => {
    expect(['image/webp', 'image/png']).toContain(pictureType())
    expect(pictureExtension('image/webp')).toBe('.webp')
    expect(pictureExtension('image/png')).toBe('.png')
  })

  it('draws nothing when there is no board, or nothing to draw on', async () => {
    expect(await renderBoardPicture(null)).toBeNull()
    expect(await renderBoardPicture(fakeBoard(rect(0, 0, 0, 0)))).toBeNull()
    // happy-dom has no 2d context, which is the other way out of the same door.
    expect(await renderBoardPicture(fakeBoard(rect(0, 0, 400, 800)))).toBeNull()
  })
})
