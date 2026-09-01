<script setup>
import { ref, watch } from 'vue'

/**
 * A HoMM3-styled collapsible section. Each instance keeps its own state, so
 * several of them toggle independently.
 *
 * `toggle` fires on every open and close, for anyone who wants to remember the
 * section's state — the component itself only keeps it while it is mounted.
 *
 * The body is mounted lazily: a section that has never been opened renders no
 * slot content at all, so heavy children (images, in particular) cost nothing
 * until the user asks for them. Once opened it stays mounted and collapsing
 * only hides it, so re-opening is instant.
 */
const props = defineProps({
  title: { type: String, required: true },
  defaultOpen: { type: Boolean, default: true },
})

const emit = defineEmits(['toggle'])

const open = ref(props.defaultOpen)
const wasOpened = ref(props.defaultOpen)

watch(open, (isOpen) => {
  if (isOpen) wasOpened.value = true
  emit('toggle', isOpen)
})
</script>

<template>
  <section class="accordion" :class="{ 'is-open': open }">
    <button
      class="accordion__header h3-title"
      type="button"
      :aria-expanded="open"
      data-testid="accordion-header"
      @click="open = !open"
    >
      <span class="accordion__chevron" aria-hidden="true">{{ open ? '▾' : '▸' }}</span>
      <span class="accordion__title">{{ title }}</span>
      <span class="accordion__count"><slot name="meta" /></span>
    </button>
    <div v-show="open" class="accordion__body" data-testid="accordion-body">
      <slot v-if="wasOpened" />
    </div>
  </section>
</template>

<style scoped>
.accordion {
  border-bottom: 1px solid rgba(0, 0, 0, 0.55);
}

.accordion__header {
  display: flex;
  align-items: center;
  gap: 0.55em;
  width: 100%;
  padding: 8px 10px;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  background-image: linear-gradient(180deg, #4b2503, #3b1503);
  border: 0;
  border-top: 1px solid rgba(181, 140, 74, 0.35);
}

.accordion__header:hover {
  background-image: linear-gradient(180deg, #3b1500, #2b0500);
}

.accordion__chevron {
  width: 0.8em;
  color: var(--h3-gold-dim);
}

.accordion__title {
  flex: 1;
}

.accordion__count {
  font-size: 12px;
  color: var(--h3-gold-dim);
}

.accordion__body {
  padding: 10px;
  background: rgba(0, 0, 0, 0.22);
}
</style>
