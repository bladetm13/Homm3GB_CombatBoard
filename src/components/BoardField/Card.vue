<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import CardFoil from './CardFoil.vue'
import CardPreviewDialog from './CardPreviewDialog.vue'
import { UNIT_VARIANT, flipUnit, isFoilUnit, unitImage, unitLabel, unitVariant } from './unitAssets'

/**
 * A single unit card. `unit` is an enum value from `constants.ts`, which is also
 * the path to its artwork.
 *
 * The card fills its container, so the same component works both as a picker
 * entry and as a piece on the board. `removable` adds the hover-only cross that
 * takes it off the field. `lazy` defers the artwork until the card scrolls into
 * view — worth it for the picker's long lists, pointless for the few pieces on
 * the board.
 *
 * `pack` units get the holographic treatment on top of the artwork — see
 * `isFoilUnit`.
 *
 * `flippable` adds the arrow under the cross that turns the card over to its
 * other printing — the same unit in its other stack size. It is drawn only when
 * there is one to turn over to, which for a picture the user brought in means
 * they brought in both; the card asks `flipUnit` and shows what it is told.
 *
 * The turn itself is half a rotation to edge-on and half a rotation back, with
 * the artwork changed in the middle where there is nothing to see — see
 * `HALF_TURN_MS`.
 *
 * The eye is on every card, wherever it is shown: at card size the printed
 * rules text is unreadable, so the card carries its own way of being read.
 */
const props = defineProps({
  unit: { type: String, required: true },
  removable: { type: Boolean, default: false },
  flippable: { type: Boolean, default: false },
  lazy: { type: Boolean, default: false },
})

const emit = defineEmits(['remove', 'flip'])

/**
 * Half the turn: how long the card takes to reach edge-on, and so when the
 * artwork behind it changes.
 *
 * The rotation is CSS and the swap is a timer, rather than both being one or
 * the other, because the two have different jobs. The rotation is what is seen;
 * the swap is what the card *is*, and it has to happen whether or not anything
 * was drawn — a browser with animations turned off, or a test — or the card
 * would be left showing the printing it was turned away from.
 */
const HALF_TURN_MS = 130

/**
 * The card the artwork is showing. It lags `unit` for half a turn and no
 * longer: the board has already been told what the card is, and this is only
 * the picture catching up with it.
 */
const shown = ref(props.unit)

/** Which way the card is turning now — `forward`, `back`, or not at all. */
const turn = ref(null)

/** The turn this card asked the board for, until the board answers with it. */
let asked = null
let timers = []

const src = computed(() => unitImage(shown.value))
const label = computed(() => unitLabel(props.unit))
const foil = computed(() => isFoilUnit(shown.value))

/** The card this one turns over to, if it has one and is allowed to offer it. */
const flipTo = computed(() => (props.flippable ? flipUnit(props.unit) : undefined))

/**
 * Which way the arrow points. A pack is the far side of the pair, so its arrow
 * points back to the small stack; a few points on to the large one. It is the
 * printing the card is now that the arrow reads off, not where it will land.
 */
const flipBack = computed(() => unitVariant(props.unit) === UNIT_VARIANT.PACK)

/**
 * A turn is motion for its own sake, so a reader who has asked for less of it
 * gets the other printing at once instead.
 */
const restless = () => !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

/**
 * The card is turned over by the board, not here: this component asks, and is
 * handed a new `unit` if the board agrees. So the turn is armed on the click
 * and only begins when that new card actually arrives — and the direction is
 * the one taken down at the click, the printing having changed since.
 *
 * Any other change of `unit` is the cell being given a different card outright,
 * which is not a turn and is drawn at once.
 */
watch(
  () => props.unit,
  (unit) => {
    const request = asked
    asked = null
    clearTurn()

    if (request?.to !== unit || !restless()) {
      turn.value = null
      shown.value = unit
      return
    }

    turn.value = request.back ? 'back' : 'forward'
    timers = [
      setTimeout(() => (shown.value = unit), HALF_TURN_MS),
      setTimeout(() => (turn.value = null), HALF_TURN_MS * 2),
    ]
  },
)

function flip() {
  asked = { to: flipTo.value, back: flipBack.value }
  emit('flip', flipTo.value)
}

function clearTurn() {
  for (const timer of timers) clearTimeout(timer)
  timers = []
}

onBeforeUnmount(clearTurn)

const previewing = ref(false)
</script>

<template>
  <div
    class="card"
    :class="[{ 'is-removable': removable, 'is-foil': foil }, turn && `is-turning-${turn}`]"
    data-testid="card"
    :data-unit="unit"
  >
    <img
      class="card__art"
      :src="src"
      :alt="label"
      :title="label"
      :loading="lazy ? 'lazy' : 'eager'"
      decoding="async"
      draggable="false"
    />
    <CardFoil v-if="foil" class="card__foil" :unit="shown" />
    <button
      class="card__preview"
      type="button"
      :aria-label="`Preview ${label}`"
      data-testid="card-preview-open"
      @click.stop="previewing = true"
    >
      <svg class="card__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="card__icon-disc" cx="12" cy="12" r="11.2" />
        <path d="M4.6 12S7.5 7.7 12 7.7 19.4 12 19.4 12 16.5 16.3 12 16.3 4.6 12 4.6 12Z" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    </button>
    <button
      v-if="removable"
      class="card__remove"
      type="button"
      :aria-label="`Remove ${label}`"
      data-testid="card-remove"
      @click.stop="emit('remove')"
    >
      <svg class="card__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="card__icon-disc" cx="12" cy="12" r="11.2" />
        <path d="m8.4 8.4 7.2 7.2m0-7.2-7.2 7.2" />
      </svg>
    </button>
    <button
      v-if="flipTo"
      class="card__flip"
      type="button"
      :aria-label="`Flip ${label} to ${unitLabel(flipTo)}`"
      :title="`Flip to ${unitLabel(flipTo)}`"
      data-testid="card-flip"
      :data-flip-to="flipTo"
      @click.stop="flip()"
    >
      <svg class="card__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="card__icon-disc" cx="12" cy="12" r="11.2" />
        <path v-if="flipBack" d="M16 12H8.6m3.2-3.4L8.4 12l3.4 3.4" />
        <path v-else d="M8 12h7.4m-3.2-3.4L15.6 12l-3.4 3.4" />
      </svg>
    </button>

    <CardPreviewDialog v-if="previewing" :unit="unit" @close="previewing = false" />
  </div>
</template>

<style scoped>
.card {
  position: relative;
  /*
    The corner controls are sized and inset in `cqw`, so the card has to be the
    container they measure. Without this they find whatever container happens to
    be above them — the board's cell on the field, the viewport in the picker,
    which is a hundred times wider.
  */
  container-type: inline-size;
  /*
    The corner controls' one size and one inset, so the flip can be hung exactly
    a control's height below the cross without either of them knowing what that
    height is — and so a touch screen can grow all three by changing one line.
    In `cqw` rather than `%` because a percentage `top` measures the card's
    height, and everything here is measured across its width.
  */
  --card-control: 12cqw;
  --card-inset: 5cqw;

  width: 100%;
  height: 100%;
}

.card__art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.6));
}

.card.is-foil {
  isolation: isolate;
}

/*
  The card turning over.

  Half a rotation to edge-on and half a rotation back, and the artwork changes
  in between — see `HALF_TURN_MS`. `-90deg` and `90deg` are the same picture,
  which is no picture at all: the card has no width at either, so the jump
  between them at the midpoint cannot be seen and the two halves read as one
  continuous turn rather than a turn undone.

  It turns the way its arrow points, so a card sent on to the large stack and
  the same card sent back to the small one do not turn the same way. The lift is
  what keeps it from reading as flat: a card being turned over comes up off the
  table, and it needs to come up off the cells beside it too.
*/
.card.is-turning-forward,
.card.is-turning-back {
  z-index: 1;
}

.card.is-turning-forward {
  animation: card-turn-forward 260ms both;
}

.card.is-turning-back {
  animation: card-turn-back 260ms both;
}

@keyframes card-turn-forward {
  0% {
    transform: perspective(700px) rotateY(0deg) scale(1);
    animation-timing-function: ease-in;
  }

  49.99% {
    transform: perspective(700px) rotateY(-90deg) scale(1.05);
  }

  50% {
    transform: perspective(700px) rotateY(90deg) scale(1.05);
    animation-timing-function: ease-out;
  }

  100% {
    transform: perspective(700px) rotateY(0deg) scale(1);
  }
}

@keyframes card-turn-back {
  0% {
    transform: perspective(700px) rotateY(0deg) scale(1);
    animation-timing-function: ease-in;
  }

  49.99% {
    transform: perspective(700px) rotateY(90deg) scale(1.05);
  }

  50% {
    transform: perspective(700px) rotateY(-90deg) scale(1.05);
    animation-timing-function: ease-out;
  }

  100% {
    transform: perspective(700px) rotateY(0deg) scale(1);
  }
}

/* The sheen itself is `CardFoil`; the card only says when it comes out. */
.card.is-foil:hover .card__foil {
  opacity: var(--card-foil-hover, 0.2);
  animation: card-foil-sweep 1.5s ease-in-out infinite alternate;
}

@media (prefers-reduced-motion: reduce) {
  .card.is-foil:hover .card__foil {
    animation: none;
  }
}

/*
  The same disc-and-line hint the board and the picker draw, only smaller and
  tucked inside the card's own corners rather than hung off them: they read as
  controls on the artwork, not as badges stuck to the card.
*/
.card__preview,
.card__remove,
.card__flip {
  position: absolute;
  top: var(--card-inset);
  display: flex;
  width: var(--card-control);
  padding: 0;
  color: var(--h3-hint-ink);
  cursor: pointer;
  background: none;
  border: 0;
  /* Hidden until the card is hovered, so the board stays clean. */
  opacity: 0;
  /*
    Out of the way while it is out of sight. Without this the corner is a button
    the moment the card exists, whether or not anything is drawn there — which
    on a screen that cannot hover means every tap near a corner is a preview or
    a removal the user never asked for.
  */
  pointer-events: none;
  transition:
    opacity 0.12s ease,
    color 0.12s ease;
}

.card__preview {
  left: var(--card-inset);
}

.card__remove {
  right: var(--card-inset);
}

/*
  Under the cross and in the same column, one control's height below it with a
  hair's breadth between: two controls in a stack, not one control drawn twice.
*/
.card__flip {
  top: calc(var(--card-inset) + var(--card-control) + 3cqw);
  right: var(--card-inset);
}

.card:hover .card__preview,
.card__preview:focus-visible,
.card.is-removable:hover .card__remove,
.card__remove:focus-visible,
.card:hover .card__flip,
.card__flip:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

/*
  A finger cannot hover, so on a touch screen the controls are simply there —
  the only way to reach them, and the only way a tap on the artwork can be told
  from a tap on them. They are drawn a little larger and given a floor in
  pixels: a share of the card is nothing to aim at when the card is one cell of
  a board scaled down to fit a phone. The flip follows the cross down, because
  it is the same measurement that places it.
*/
@media (hover: none) and (pointer: coarse) {
  .card {
    --card-control: max(14cqw, 17px);
  }

  .card__preview,
  .card__remove,
  .card__flip {
    opacity: 0.9;
    pointer-events: auto;
  }

  /*
    The sheen has no hover to come out for either, and a foil printing that
    never shows its foil is just a card. So it is simply on — but held still:
    the sweep is the light moving as the pointer arrives, and there is no
    arrival here. It is also the one thing on the page that would animate
    twenty at a time down a scrolling picker, which is a poor way to spend a
    phone. The full sweep is a tap away, in the preview.
  */
  .card.is-foil .card__foil {
    opacity: var(--card-foil-touch, 0.24);
  }
}

.card__preview:hover,
.card__flip:hover {
  color: var(--h3-gold-bright);
}

/* Warm, not gold: the one control here that takes something away. */
.card__remove:hover {
  color: #ffbea0;
}

.card__icon {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
}

.card__icon-disc {
  fill: var(--h3-hint-ground);
  stroke: var(--h3-hint-edge);
  stroke-width: 1;
}

.card__preview:hover .card__icon-disc,
.card__remove:hover .card__icon-disc,
.card__flip:hover .card__icon-disc {
  stroke: currentColor;
}

</style>
