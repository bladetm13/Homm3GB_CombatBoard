<script setup>
import { ref } from 'vue'
import BoardField from '../components/BoardField/BoardField.vue'
import BoardTools from '../components/BoardTools.vue'
import CombatBoard from '../components/CombatBoard.vue'

/*
  The board's own state lives here rather than inside the field: the tools
  beside the zoom widget write it out and read it back, and they sit outside the
  board's transform, which the field does not.
*/
const units = ref({})
const tokens = ref({})

function load(board) {
  units.value = board.units
  tokens.value = board.tokens
}
</script>

<template>
  <main class="combat-page">
    <CombatBoard>
      <div class="combat-page__field">
        <BoardField v-model:units="units" v-model:tokens="tokens" />
      </div>

      <template #controls="{ board }">
        <BoardTools :board="board" :units="units" :tokens="tokens" @import="load" />
      </template>
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
