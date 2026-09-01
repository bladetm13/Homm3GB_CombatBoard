<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ScrollBox from '../ScrollBox.vue'
import { useEscapeKey } from '../../composables/useEscapeKey'
import { pickerMemory } from './pickerMemory'

/**
 * The shell both board pickers share: a teleported backdrop, the panel, its
 * title bar and a scrolling body. Only the contents differ, so they live in the
 * default slot.
 *
 * `testid` prefixes every hook (`<testid>`, `<testid>-backdrop`,
 * `<testid>-close`) so two pickers can be told apart on the page.
 *
 * The list comes back scrolled where it was left. `memoryKey` is what that is
 * filed under — one picker showing two different lists, as the token picker
 * does, needs a key per list, not per component.
 */
const props = defineProps({
  title: { type: String, required: true },
  testid: { type: String, default: 'picker' },
  memoryKey: { type: String, default: '' },
})

const emit = defineEmits(['close'])

useEscapeKey(() => emit('close'))

const scrollBox = ref(null)
const memory = pickerMemory(props.memoryKey || props.testid)

onMounted(async () => {
  // One tick for the groups to render: there is nothing to scroll before that.
  await nextTick()
  scrollBox.value?.scrollToOffset(memory.scrollTop)
})

onBeforeUnmount(() => {
  memory.scrollTop = scrollBox.value?.scrollTop ?? memory.scrollTop
})
</script>

<template>
  <Teleport to="body">
    <div class="picker__backdrop" :data-testid="`${testid}-backdrop`" @click.self="emit('close')">
      <div class="picker h3-panel" role="dialog" :aria-label="title" :data-testid="testid">
        <header class="picker__head">
          <h2 class="picker__title h3-title">{{ title }}</h2>
          <button
            class="picker__close h3-btn"
            type="button"
            aria-label="Close"
            :data-testid="`${testid}-close`"
            @click="emit('close')"
          >
            &times;
          </button>
        </header>

        <ScrollBox ref="scrollBox" class="picker__body">
          <slot />
        </ScrollBox>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.picker__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3vh 2vw;
  background: rgba(6, 4, 2, 0.72);
  backdrop-filter: blur(3px);
}

.picker {
  display: flex;
  flex-direction: column;
  width: min(880px, 100%);
  max-height: 94vh;
  overflow: hidden;
}

.picker__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--h3-bevel-dark);
  box-shadow: 0 1px 0 rgba(181, 140, 74, 0.3);
}

.picker__title {
  margin: 0;
  font-size: 17px;
}

.picker__close {
  --h3-btn-size: 30px;
  font-size: 17px;
}

.picker__body {
  /* ScrollBox is the flex child that has to shrink inside the panel. */
  flex: 1;
  min-height: 0;
}
</style>
