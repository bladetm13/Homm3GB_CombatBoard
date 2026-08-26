<script setup>
defineProps({
  label: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
</script>

<template>
  <button class="h3-btn" type="button" :disabled="disabled" :title="title" :aria-label="title || label">
    <slot>{{ label }}</slot>
  </button>
</template>
