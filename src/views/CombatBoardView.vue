<script setup>
import BoardField from '../components/BoardField/BoardField.vue'
import CombatBoard from '../components/CombatBoard.vue'
</script>

<template>
  <main class="combat-page">
    <CombatBoard>
      <div class="combat-page__field">
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
  top: 9.6%;
  right: 1.15%;
  bottom: 8.6%;
  left: 1.7%;
}
</style>
