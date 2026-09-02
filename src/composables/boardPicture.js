import boardArt from '../../assets/battle_board.jpeg'

/**
 * The board as a picture: the printed artwork with every card and token drawn
 * where it stands.
 *
 * Nothing here reads the stylesheet or repeats it. The pieces are measured
 * where the browser has already laid them out — `getBoundingClientRect` against
 * the board's own rect — so whatever the CSS does with token sizes or wrapping,
 * the picture follows. Measuring after the fact also means the live pan and
 * zoom cancel out: both rects carry the same transform, and dividing one by the
 * other leaves the board's own coordinates behind.
 *
 * Only `img` elements are drawn. The hover affordances are SVG buttons, so the
 * board comes out as it looks when nothing is under the pointer.
 */

/** Wide enough that a card is still sharp when the artwork itself is not. */
const MIN_WIDTH = 1440

/**
 * The rectangle an image actually covers inside its box under `object-fit:
 * contain` — centred, and letterboxed on whichever pair of sides has room.
 */
export function containRect(box, natural) {
  if (!natural?.width || !natural?.height) return box

  const scale = Math.min(box.width / natural.width, box.height / natural.height)
  const width = natural.width * scale
  const height = natural.height * scale

  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  }
}

/**
 * Every piece on the board, in the order it is drawn, each with the share of
 * the board it covers — 0..1 in both directions, so the numbers hold at any
 * size the picture is rendered at.
 */
export function pieceBoxes(boardEl) {
  const board = boardEl?.getBoundingClientRect?.()
  if (!board?.width || !board?.height) return []

  const pieces = []
  for (const image of boardEl.querySelectorAll('img')) {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) continue

    const rect = image.getBoundingClientRect()
    if (!rect.width || !rect.height) continue

    // Contain is worked out in screen pixels, where both axes share a scale.
    const drawn = containRect(
      { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      { width: image.naturalWidth, height: image.naturalHeight },
    )

    pieces.push({
      image,
      box: {
        x: (drawn.x - board.left) / board.width,
        y: (drawn.y - board.top) / board.height,
        width: drawn.width / board.width,
        height: drawn.height / board.height,
      },
    })
  }

  return pieces
}

/**
 * WebP where the browser can encode it, PNG where it cannot. Asked before the
 * save dialog opens, so the name it suggests carries the right extension.
 */
export function pictureType() {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    return canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/png'
  } catch {
    return 'image/png'
  }
}

/** The extension that goes with a type from `pictureType`. */
export const pictureExtension = (type) => (type === 'image/webp' ? '.webp' : '.png')

/**
 * Draws the board and everything on it, and hands back the file. `null` when
 * there is no board on the page, or no canvas to draw it on.
 */
export async function renderBoardPicture(boardEl, type = 'image/webp') {
  const rect = boardEl?.getBoundingClientRect?.()
  if (!rect?.width || !rect?.height) return null

  const canvas = document.createElement('canvas')
  const context = canvas.getContext?.('2d')
  if (!context) return null

  const art = await loadImage(boardArt)
  // The artwork's own resolution, unless that is too little to keep a card
  // legible. Its shape comes from the board, so nothing is stretched.
  canvas.width = Math.round(Math.max(art?.naturalWidth || 0, MIN_WIDTH))
  canvas.height = Math.round((canvas.width * rect.height) / rect.width)

  if (art) context.drawImage(art, 0, 0, canvas.width, canvas.height)

  for (const { image, box } of pieceBoxes(boardEl)) {
    context.drawImage(
      image,
      box.x * canvas.width,
      box.y * canvas.height,
      box.width * canvas.width,
      box.height * canvas.height,
    )
  }

  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.95))
}

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}
