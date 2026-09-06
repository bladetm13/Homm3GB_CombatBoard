<script setup>
import { computed, ref } from 'vue'
import Accordion from '../Accordion.vue'
import Card from './Card.vue'
import { CUSTOM_SCOPE, addCustomAsset, customAssets, removeCustomAsset } from './customAssets'

/**
 * The Custom section every picker opens with: an empty card-shaped plate that
 * takes a picture off the user's disk, and everything added that way so far.
 *
 * The three pickers differ only in what they are filing — a card, a field
 * token, a stack marker — so the section is one component parametrised by
 * scope. What it adds is offered from that same list afterwards and picked like
 * any built-in card or token; see `customAssets` for how far that goes.
 *
 * Each picture carries the same hover cross the board's own pieces do, which
 * takes it back off the list.
 */
const props = defineProps({
  scope: { type: String, required: true },
  /** The picker's own hook prefix, so its entries answer to its selectors. */
  testid: { type: String, default: 'picker' },
  defaultOpen: { type: Boolean, default: true },
})

const emit = defineEmits(['select', 'toggle'])

const isUnits = computed(() => props.scope === CUSTOM_SCOPE.UNITS)
const assets = computed(() => customAssets(props.scope))

/** `picker-unit-<id>` and `token-picker-token-<id>`, as the built-in cells use. */
const entryTestid = (id) => `${props.testid}-${isUnits.value ? 'unit' : 'token'}-${id}`

/** What the artwork should look like to sit on the board without surprises. */
const SHAPE_HINT = {
  [CUSTOM_SCOPE.UNITS]: 'Cards are 2090×2900 px (209 : 290) — any upright image works, PNG or WebP with a transparent background looks best.',
  [CUSTOM_SCOPE.FIELD_TOKENS]: 'Tokens are square, around 256×256 px — round art on a transparent background looks best.',
  [CUSTOM_SCOPE.UNIT_TOKENS]: 'Tokens are square, around 256×256 px — round art on a transparent background looks best.',
}

const hint = computed(() => SHAPE_HINT[props.scope] ?? SHAPE_HINT[CUSTOM_SCOPE.UNITS])

const fileInput = ref(null)

/*
  The input is the file dialog and nothing else — the plate is what the user
  sees and clicks. Clearing `value` afterwards is what lets the same file be
  picked twice, which is otherwise a silent no-op.
*/
function onPicked(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) addCustomAsset(props.scope, file)
}
</script>

<template>
  <Accordion
    title="Custom"
    :default-open="defaultOpen"
    :data-testid="`${testid}-group-custom`"
    @toggle="emit('toggle', $event)"
  >
    <template #meta>{{ assets.length }}</template>

    <p class="custom__info" :data-testid="`${testid}-custom-info`">
      <span class="custom__info-mark" aria-hidden="true">i</span>
      <span>
        {{ hint }}
        Pictures are kept in this tab only — nothing is uploaded, and a reload
        forgets them.
      </span>
    </p>

    <div class="custom__grid" :class="isUnits ? 'custom__grid--cards' : 'custom__grid--tokens'">
      <button
        class="custom__add"
        type="button"
        aria-label="Add a custom image"
        :data-testid="`${testid}-custom-add`"
        @click="fileInput.click()"
      >
        <svg class="custom__plus" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <button
        v-for="asset in assets"
        :key="asset.id"
        class="custom__cell"
        type="button"
        :data-testid="entryTestid(asset.id)"
        @click="emit('select', asset.id)"
      >
        <Card v-if="isUnits" :unit="asset.id" lazy />
        <img
          v-else
          class="custom__art"
          :src="asset.url"
          :alt="asset.label"
          :title="asset.label"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <span
          class="custom__remove"
          role="button"
          tabindex="0"
          :aria-label="`Remove ${asset.label}`"
          :data-testid="`${testid}-custom-remove-${asset.id}`"
          @click.stop="removeCustomAsset(asset.id)"
          @keydown.enter.stop.prevent="removeCustomAsset(asset.id)"
          @keydown.space.stop.prevent="removeCustomAsset(asset.id)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle class="custom__remove-disc" cx="12" cy="12" r="11.2" />
            <path d="m8.4 8.4 7.2 7.2m0-7.2-7.2 7.2" />
          </svg>
        </span>
      </button>

      <input
        ref="fileInput"
        class="custom__input"
        type="file"
        accept="image/*"
        aria-hidden="true"
        tabindex="-1"
        :data-testid="`${testid}-custom-input`"
        @change="onPicked"
      />
    </div>
  </Accordion>
</template>

<style scoped>
.custom__info {
  display: flex;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--h3-gold-dim);
}

.custom__info-mark {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  font-family: var(--h3-font-display);
  font-size: 11px;
  color: var(--h3-hint-ink);
  border: 1px solid var(--h3-hint-edge);
  border-radius: 50%;
}

/*
  The plate is an empty one of whatever the section files, so it lines up with
  the picker it stands in: a blank card among the towns, a blank disc among the
  tokens. Anything added is shown in that same shape, whatever the picture is.
*/
.custom__grid {
  display: grid;
  gap: 10px;
}

/* The two shapes, and the cell widths, of the pickers themselves. */
.custom__grid--cards {
  grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
}

.custom__grid--tokens {
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
}

.custom__add,
.custom__cell {
  padding: 0;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(181, 140, 74, 0.35);
  border-radius: 3px;
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease;
}

/* The unit art is 2090x2900; the token art is round and roughly square. */
.custom__grid--cards :is(.custom__add, .custom__cell) {
  aspect-ratio: 209 / 290;
}

.custom__grid--tokens :is(.custom__add, .custom__cell) {
  aspect-ratio: 1;
}

/* Empty on purpose: a dashed outline reads as a slot waiting to be filled. */
.custom__add {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--h3-gold-dim);
  border: 1px dashed rgba(181, 140, 74, 0.55);
}

.custom__add:hover,
.custom__cell:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.65);
}

.custom__add:hover {
  color: var(--h3-gold-bright);
  background: rgba(242, 217, 152, 0.08);
  border-color: var(--h3-gold-dim);
}

.custom__add:focus-visible,
.custom__cell:focus-visible {
  outline: 1px solid var(--h3-gold);
  outline-offset: 2px;
}

.custom__plus {
  width: 26%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.custom__cell {
  position: relative;
  padding: 6px;
}

/*
  The cross the board draws on its own pieces, hung in the cell's corner: out of
  the way until the picture is hovered, and never the click that picks it.
*/
.custom__remove {
  position: absolute;
  top: 4%;
  right: 4%;
  display: flex;
  width: 16%;
  max-width: 26px;
  color: var(--h3-hint-ink);
  cursor: pointer;
  opacity: 0;
  /* Inert while it is invisible, so it never takes the tap that picks. */
  pointer-events: none;
  transition:
    opacity 0.12s ease,
    color 0.12s ease;
}

.custom__cell:hover .custom__remove,
.custom__remove:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

/* No hover to wait for, so the cross stands — see the same note in `Card`. */
@media (hover: none) and (pointer: coarse) {
  .custom__remove {
    width: max(16%, 18px);
    opacity: 0.9;
    pointer-events: auto;
  }
}

.custom__remove:hover {
  color: #ffbea0;
}

.custom__remove svg {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
}

.custom__remove-disc {
  fill: var(--h3-hint-ground);
  stroke: var(--h3-hint-edge);
  stroke-width: 1;
}

.custom__remove:hover .custom__remove-disc {
  stroke: currentColor;
}

.custom__art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.custom__input {
  display: none;
}
</style>
