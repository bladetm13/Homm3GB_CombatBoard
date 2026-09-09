<script setup>
import { ref } from 'vue'
import AboutDialog from './AboutDialog.vue'
import Homm3Button from './Homm3Button.vue'

/**
 * One button, standing on top of the zoom widget: the only thing in the corner
 * that is about the tool rather than about the board.
 */
const open = ref(false)
</script>

<template>
  <div class="about-controls h3-panel" data-no-drag>
    <Homm3Button
      class="about-controls__button"
      title="About"
      data-testid="about-open"
      @click="open = true"
    >
      <svg class="about-controls__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5.5" />
        <path d="M12 7.6v.9" />
      </svg>
    </Homm3Button>

    <AboutDialog v-if="open" @close="open = false" />
  </div>
</template>

<style scoped>
/*
  Placed by `.combat-zoom`, which stands it on top of the zoom widget. It keeps
  to the right edge of that column rather than spanning it: this is one small
  button, and a plate the width of the zoom widget around it would read as an
  empty shelf.
*/
.about-controls {
  align-self: flex-end;
  display: flex;
  padding: var(--h3-widget-pad);
}

/*
  The one button here is the icon and no more — the brass plate of a zoom button
  would make the (i) the loudest thing in the corner, which it is not.
*/
.about-controls__button {
  --h3-btn-size: calc(var(--h3-widget-icon) + 10px);
  padding: 0;
}

.about-controls__icon {
  width: var(--h3-widget-icon);
  height: var(--h3-widget-icon);
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
