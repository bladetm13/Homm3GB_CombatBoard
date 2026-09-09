<script setup>
import { useEscapeKey } from '../composables/useEscapeKey'

/**
 * What the board itself has no room to say: whose game this is, and under what
 * terms the tool that lays it out is given away. Opened from the (i) above the
 * zoom widget, and teleported out of the board like every other dialog.
 */
const REPOSITORY_URL = 'https://github.com/bladetm13/Homm3GB_CombatBoard'
const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`
const AUTHOR_NAME = 'Ihor Kolesnychenko (the_13th)'
const AUTHOR_EMAIL = 'bladetm13@gmail.com'

const emit = defineEmits(['close'])

useEscapeKey(() => emit('close'))
</script>

<template>
  <Teleport to="body">
    <div class="about__backdrop" data-testid="about-backdrop" @click.self="emit('close')">
      <div class="about h3-panel" role="dialog" aria-label="About" data-testid="about">
        <header class="about__head">
          <h2 class="about__title h3-title">About</h2>
          <button
            class="about__close h3-btn"
            type="button"
            aria-label="Close"
            data-testid="about-close"
            @click="emit('close')"
          >
            &times;
          </button>
        </header>

        <div class="about__body h3-selectable">
          <p class="about__text">
            This tool is made for informational purposes only. All rights to
            <em>Heroes of Might and Magic III: The Board Game</em> belong to Ubisoft
            Entertainment. This is an unofficial, non-commercial fan tool — not affiliated
            with, endorsed by, or sponsored by Ubisoft.
          </p>

          <p class="about__text">
            Author: {{ AUTHOR_NAME }} &mdash;
            <a
              class="about__link"
              :href="`mailto:${AUTHOR_EMAIL}`"
              data-testid="about-author-email"
            >
              {{ AUTHOR_EMAIL }}
            </a>
          </p>

          <p class="about__text">
            <a
              class="about__link"
              :href="LICENSE_URL"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="about-license"
            >
              Licence
            </a>
          </p>

          <p class="about__text">
            Repository:
            <a
              class="about__link"
              :href="REPOSITORY_URL"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="about-repository"
            >
              {{ REPOSITORY_URL }}
            </a>
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.about__backdrop {
  position: fixed;
  inset: 0;
  /* The same layer as the pickers: nothing is ever opened over this one. */
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3vh 2vw;
  background: rgba(6, 4, 2, 0.72);
  backdrop-filter: blur(3px);
}

.about {
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  max-height: 94vh;
  overflow: hidden;
}

.about__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--h3-bevel-dark);
  box-shadow: 0 1px 0 rgba(181, 140, 74, 0.3);
}

.about__title {
  margin: 0;
  font-size: 17px;
}

.about__close {
  --h3-btn-size: 30px;
  font-size: 17px;
}

.about__body {
  padding: 14px 16px 16px;
  overflow-y: auto;
}

.about__text {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--h3-gold);
  overflow-wrap: anywhere;
}

.about__text:last-child {
  margin-bottom: 0;
}

.about__link {
  color: var(--h3-hint-ink);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.about__link:hover {
  color: var(--h3-gold-bright);
}

.about__link:focus-visible {
  outline: 1px solid var(--h3-gold);
  outline-offset: 2px;
}
</style>
