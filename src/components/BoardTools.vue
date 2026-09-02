<script setup>
import { computed, ref } from 'vue'
import Homm3Button from './Homm3Button.vue'
import {
  boardSnapshot,
  missingPictures,
  readBoardSnapshot,
  restorePictures,
  resolveSnapshot,
} from './BoardField/boardSnapshot'

/**
 * The three things done to a whole board rather than to one cell of it: put it
 * on paper, write it to a file, read one back. They sit beside the zoom widget
 * because that is the other control that answers for the board as a whole.
 *
 * An exported file carries the user's own pictures inside it, so importing is
 * the one click it looks like.
 *
 * The widget says nothing about how any of that went — the board is the report,
 * and a row of buttons is no place to read a paragraph. The one exception is a
 * picture the file carried that the browser could not make sense of: that is
 * something the user cannot see for themselves, since all it leaves behind is
 * an empty cell.
 */
const props = defineProps({
  units: { type: Object, default: () => ({}) },
  tokens: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['import'])

const jsonInput = ref(null)

/** Pictures the last file carried that could not be read back out of it. */
const unreadable = ref([])

const warning = computed(() => {
  const count = unreadable.value.length
  if (!count) return ''
  const names = unreadable.value.map((entry) => entry.file || entry.label).filter(Boolean)
  const opening = `${count} ${count === 1 ? 'picture' : 'pictures'} could not be read`
  return names.length ? `${opening}: ${names.join(', ')}` : `${opening}.`
})

function printBoard() {
  window.print()
}

async function exportBoard() {
  const snapshot = await boardSnapshot({ units: props.units, tokens: props.tokens })
  download(
    `combat-board-${snapshot.savedAt.slice(0, 19).replace(/[:T]/g, '-')}.json`,
    JSON.stringify(snapshot, null, 2),
  )
}

async function onJsonPicked(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  unreadable.value = []

  let snapshot
  try {
    snapshot = readBoardSnapshot(JSON.parse(await file.text()))
  } catch {
    // Nothing in it to lay down, so the board keeps what it already had.
    return
  }

  // Everything the file brought with it, before a piece is laid down. What will
  // not come out of it is named below rather than left as a gap on the board.
  restorePictures(snapshot)
  unreadable.value = missingPictures(snapshot)

  const { units, tokens } = resolveSnapshot(snapshot)
  emit('import', { units, tokens })
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // The download has taken its own reference by now; ours can go.
  setTimeout(() => URL.revokeObjectURL(url))
}
</script>

<template>
  <div class="board-tools h3-panel" data-no-drag data-testid="board-tools">
    <div class="board-tools__buttons">
      <Homm3Button title="Print the board" data-testid="board-print" @click="printBoard">
        <svg class="board-tools__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 9V4h10v5" />
          <path d="M6.5 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1.5" />
          <rect x="7" y="15" width="10" height="6" rx="1" />
        </svg>
      </Homm3Button>
      <Homm3Button title="Export the board as JSON" data-testid="board-export" @click="exportBoard">
        <svg class="board-tools__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </Homm3Button>
      <Homm3Button
        title="Import a board from JSON"
        data-testid="board-import"
        @click="jsonInput.click()"
      >
        <svg class="board-tools__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 14V3m0 0L8 7m4-4 4 4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </Homm3Button>
    </div>

    <!--
      A picture the file carried but the browser would not take: not an image
      at all, or too mangled to decode. Whatever stood on it is simply not on
      the board, which is why this is worth saying out loud.
    -->
    <p v-if="warning" class="board-tools__warning" data-testid="board-tools-warning">
      {{ warning }}
    </p>

    <input
      ref="jsonInput"
      class="board-tools__input"
      type="file"
      accept="application/json,.json"
      aria-hidden="true"
      tabindex="-1"
      data-testid="board-import-input"
      @change="onJsonPicked"
    />
  </div>
</template>

<style scoped>
/* Placed by `.combat-controls`, immediately left of the zoom widget. */
.board-tools {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: max-content;
  max-width: min(300px, calc(100vw - 160px));
  padding: 8px;
}

.board-tools__buttons {
  display: flex;
  gap: 8px;
}

.board-tools__icon {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.board-tools__warning {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.45;
  color: var(--h3-hint-ink);
}

.board-tools__input {
  display: none;
}
</style>
