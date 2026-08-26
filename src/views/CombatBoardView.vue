<script setup>
import BoardField from '../components/BoardField/BoardField.vue'
import CombatBoard from '../components/CombatBoard.vue'

/**
 * The combat board page.
 *
 * `CombatBoard` owns the artwork and the pan/zoom transform; this view is the
 * parent that fills it. `BoardField` covers the printed grid and divides it into
 * cells — units go into its cell slot and inherit the board's scale for free.
 */
</script>

<template>
  <main class="combat-page">
    <CombatBoard>
      <!--
        The artwork keeps a rules band at the top and bottom, so the grid does
        not span the full board. These insets are measured off the artwork —
        pass `debug` to BoardField to check the alignment.
      -->
      <div class="combat-page__field">
        <!-- Unit cards go in BoardField's cell slot, addressed by row / col. -->
        <BoardField />
      </div>
    </CombatBoard>
  </main>
</template>

<style scoped>
.combat-page {
  width: 100%;
  height: 100%;
}

.combat-page__field {
  position: absolute;
  top: 9.5%;
  right: 2%;
  bottom: 10.4%;
  left: 1.8%;
}
</style>
