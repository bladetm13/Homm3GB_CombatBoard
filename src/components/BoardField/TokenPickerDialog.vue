<script setup>
import { computed } from 'vue'
import Accordion from '../Accordion.vue'
import CustomAssets from './CustomAssets.vue'
import PickerDialog from './PickerDialog.vue'
import { pickerMemory } from './pickerMemory'
import { tokenImage, tokenLabel } from './tokenAssets'
import { TOKENS, TOKEN_CATEGORY_LABEL, TOKEN_SCOPE } from './tokenConstants'

/**
 * The token counterpart of `UnitPickerDialog`: same shell, same accordion, one
 * group per file-name category.
 *
 * A token is only ever offered where it may be dropped, so the dialog shows one
 * scope at a time — field tokens take a cell of their own, unit tokens ride on
 * a stack — and the caller picks which by what the cell holds.
 */
const props = defineProps({
  scope: {
    type: String,
    default: TOKEN_SCOPE.FIELD,
    validator: (value) => value in TOKENS,
  },
})

const emit = defineEmits(['select', 'close'])

const TITLE = {
  [TOKEN_SCOPE.FIELD]: 'Choose a field token',
  [TOKEN_SCOPE.UNIT]: 'Choose a unit token',
}

const title = computed(() => TITLE[props.scope])

/*
  Each scope is its own list, so each remembers its own groups and scroll. The
  caller remounts the dialog when the scope changes, so reading this once is
  enough.
*/
const memoryKey = `token-picker:${props.scope}`
const memory = pickerMemory(memoryKey)

/* The user's own tokens come first, and the section stands open until closed. */
const customOpen = memory.open.custom ?? true

const groups = computed(() =>
  Object.entries(TOKENS[props.scope]).map(([category, tokens], index) => ({
    category,
    label: TOKEN_CATEGORY_LABEL[category],
    tokens: Object.values(tokens),
    open: memory.open[category] ?? index === 0,
  })),
)
</script>

<template>
  <PickerDialog
    :title="title"
    testid="token-picker"
    :memory-key="memoryKey"
    @close="emit('close')"
  >
    <CustomAssets
      :scope="scope"
      testid="token-picker"
      :default-open="customOpen"
      @select="emit('select', $event)"
      @toggle="memory.open.custom = $event"
    />
    <Accordion
      v-for="group in groups"
      :key="group.category"
      :title="group.label"
      :default-open="group.open"
      :data-testid="`token-picker-group-${group.category}`"
      @toggle="memory.open[group.category] = $event"
    >
      <template #meta>{{ group.tokens.length }}</template>
      <div class="token-picker__grid">
        <button
          v-for="token in group.tokens"
          :key="token"
          class="token-picker__cell"
          type="button"
          :data-testid="`token-picker-token-${token}`"
          @click="emit('select', token)"
        >
          <img
            class="token-picker__art"
            :src="tokenImage(token)"
            :alt="tokenLabel(token)"
            :title="tokenLabel(token)"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </button>
      </div>
    </Accordion>
  </PickerDialog>
</template>

<style scoped>
.token-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 10px;
}

.token-picker__cell {
  /* The art is round and roughly square — keep the cell square with it. */
  aspect-ratio: 1;
  padding: 6px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(181, 140, 74, 0.35);
  border-radius: 3px;
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease;
}

.token-picker__cell:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.65);
}

.token-picker__cell:focus-visible {
  outline: 1px solid var(--h3-gold);
  outline-offset: 2px;
}

.token-picker__art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}
</style>
