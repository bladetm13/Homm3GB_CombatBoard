<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import Homm3Button from './Homm3Button.vue'

/**
 * What the table does between and during rounds, in the widget left of the
 * tools: throw the die, and start a new round.
 *
 * Starting a round is the board's business, not the widget's — it says so and
 * the page takes the round's markers off the field. See `withoutRoundTokens`.
 *
 * The die has three faces — a penalty, nothing, a bonus — thrown for whatever
 * the table needs one for. The result is not board state: it is read off the
 * die and applied by hand, so nothing about it is saved or emitted. It shows
 * itself over the widget, holds long enough to be read out loud, and goes.
 */
const FACES = [-1, 0, 1]

const emit = defineEmits(['new-round'])

/** How long it is in the air, and how long the face it lands on stays up. */
const TUMBLE_MS = 700
const SHOW_MS = 3000
/** How fast the faces flick past while it tumbles. */
const FLICKER_MS = 80

/** The face on show, or `null` while the die is off the table. */
const face = ref(null)
/** Still in the air: the face on show is a blur, not the result. */
const rolling = ref(false)

let flicker = null
let landing = null
let hiding = null

const pick = () => FACES[Math.floor(Math.random() * FACES.length)]

/** `+1` and `-1` carry their sign; `0` is neither, so it goes bare. */
const label = computed(() => (face.value > 0 ? `+${face.value}` : `${face.value}`))

/** What the face means, which is what tints it: a penalty, nothing, a bonus. */
const sign = computed(() => (face.value > 0 ? 'up' : face.value < 0 ? 'down' : 'even'))

/**
 * A tumble is motion for its own sake, so a reader who has asked for less of it
 * gets the result at once instead.
 */
const restless = () => !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

function roll() {
  clearTimers()
  const result = pick()

  if (!restless()) {
    land(result)
    return
  }

  rolling.value = true
  face.value = pick()
  // The result is drawn only when it lands, so the blur never gives it away.
  flicker = setInterval(() => (face.value = pick()), FLICKER_MS)
  landing = setTimeout(() => land(result), TUMBLE_MS)
}

function land(result) {
  clearInterval(flicker)
  flicker = null
  face.value = result
  rolling.value = false
  hiding = setTimeout(() => (face.value = null), SHOW_MS)
}

function clearTimers() {
  clearInterval(flicker)
  clearTimeout(landing)
  clearTimeout(hiding)
  flicker = landing = hiding = null
}

onBeforeUnmount(clearTimers)
</script>

<template>
  <div class="round-controls h3-panel" data-no-drag data-testid="round-controls">
    <!--
      The die stands over the widget rather than in it: it is a throw, read once
      and gone, and the widget is a row of buttons that stays. The stage is here
      whether or not the die is, so a reader is told what came up.
    -->
    <div class="round-controls__stage" role="status" aria-live="polite">
      <Transition name="round-controls-pop">
        <div v-if="face !== null" class="round-controls__popup" data-testid="round-controls-popup">
          <span
            class="round-controls__die"
            :class="[`is-${sign}`, rolling ? 'is-tumbling' : 'is-landed']"
            :data-face="rolling ? null : face"
            data-testid="round-controls-face"
            aria-hidden="true"
          >
            {{ label }}
          </span>
          <span v-if="!rolling" class="round-controls__said">Rolled {{ label }}</span>
        </div>
      </Transition>
    </div>

    <Homm3Button title="Roll the die" data-testid="round-controls-roll" @click="roll">
      <svg class="round-controls__icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
        <circle cx="8.5" cy="8.5" r="1.35" />
        <circle cx="15.5" cy="15.5" r="1.35" />
        <circle cx="12" cy="12" r="1.35" />
      </svg>
    </Homm3Button>

    <Homm3Button
      title="New round"
      data-testid="round-controls-new-round"
      @click="emit('new-round')"
    >
      <svg class="round-controls__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
        <path d="M19.5 3.5v4h-4" />
      </svg>
    </Homm3Button>
  </div>
</template>

<style scoped>
/* Placed by `.combat-controls`, immediately left of the board tools. */
.round-controls {
  display: flex;
  gap: var(--h3-widget-gap);
  padding: var(--h3-widget-pad);
}

.round-controls__icon {
  width: var(--h3-widget-icon);
  height: var(--h3-widget-icon);
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/*
  A zero-sized anchor on top of the widget: the die hangs off it and is centred
  on the widget without ever taking up room in the row.
*/
.round-controls__stage {
  position: absolute;
  bottom: 100%;
  left: 50%;
}

.round-controls__popup {
  position: absolute;
  bottom: 14px;
  left: 0;
  transform: translateX(-50%);
}

/*
  The die itself: the same brass the buttons are cut from, squared off and lit
  from the same corner, with the throw's own colour behind the numeral.
*/
.round-controls__die {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 62px;
  font-family: var(--h3-font-display);
  font-size: 27px;
  font-weight: 700;
  line-height: 1;
  color: var(--h3-face-ink);
  text-shadow:
    0 1px 1px #000,
    0 0 10px var(--h3-face-glow);
  background-image:
    linear-gradient(180deg, rgba(255, 226, 160, 0.2), rgba(0, 0, 0, 0.3)),
    linear-gradient(160deg, var(--h3-face-ground), #2a1b0b);
  border: 1px solid var(--h3-bevel-dark);
  border-radius: 11px;
  box-shadow:
    inset 2px 2px 0 rgba(255, 236, 190, 0.32),
    inset -2px -2px 0 rgba(0, 0, 0, 0.7),
    inset 0 0 0 1px rgba(181, 140, 74, 0.35),
    0 8px 20px rgba(0, 0, 0, 0.7),
    0 0 22px var(--h3-face-glow);
}

/* Neither way — plain stone, and no glow to claim otherwise. */
.round-controls__die.is-even {
  --h3-face-ink: var(--h3-gold);
  --h3-face-ground: #6b5732;
  --h3-face-glow: rgba(0, 0, 0, 0);
}

.round-controls__die.is-up {
  --h3-face-ink: var(--h3-gold-bright);
  --h3-face-ground: #7f6220;
  --h3-face-glow: rgba(249, 219, 156, 0.45);
}

.round-controls__die.is-down {
  --h3-face-ink: #ffcdbc;
  --h3-face-ground: #6f2c1e;
  --h3-face-glow: rgba(168, 64, 44, 0.5);
}

/* In the air: over and over, and a touch of height with each turn. */
.round-controls__die.is-tumbling {
  animation: round-controls-tumble 0.3s linear infinite;
}

@keyframes round-controls-tumble {
  0% {
    transform: translateY(0) rotate(0deg) scale(1);
  }

  50% {
    transform: translateY(-13px) rotate(180deg) scale(1.1);
  }

  100% {
    transform: translateY(0) rotate(360deg) scale(1);
  }
}

/* Down hard, over-shooting once before it settles flat. */
.round-controls__die.is-landed {
  animation: round-controls-land 0.42s cubic-bezier(0.2, 1.5, 0.4, 1) both;
}

@keyframes round-controls-land {
  0% {
    transform: scale(1.4) rotate(-14deg);
  }

  55% {
    transform: scale(0.93) rotate(5deg);
  }

  100% {
    transform: scale(1) rotate(0deg);
  }
}

/*
  The die rides in from the widget it was thrown out of, and drifts off the top
  on its way out.
*/
.round-controls-pop-enter-active {
  transition:
    opacity 0.16s ease-out,
    transform 0.16s ease-out;
}

.round-controls-pop-leave-active {
  transition:
    opacity 0.3s ease-in,
    transform 0.3s ease-in;
}

.round-controls-pop-enter-from {
  opacity: 0;
  transform: translate(-50%, 16px) scale(0.55);
}

.round-controls-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px) scale(0.85);
}

/*
  A throw is motion for its own sake. Asked for less of it, the die simply
  appears with the face it landed on.
*/
@media (prefers-reduced-motion: reduce) {
  .round-controls__die.is-tumbling,
  .round-controls__die.is-landed {
    animation: none;
  }

  .round-controls-pop-enter-active,
  .round-controls-pop-leave-active {
    transition: opacity 0.16s ease;
  }

  .round-controls-pop-enter-from,
  .round-controls-pop-leave-to {
    transform: translateX(-50%);
  }
}

/* For a reader, who gets the result in words rather than on a brass plate. */
.round-controls__said {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
