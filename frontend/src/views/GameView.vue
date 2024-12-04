
<script setup lang="ts">
import TopPanel from '@/components/TopPanel.vue';
import MainTrackEditor from '@/components/MainTrackEditor.vue';
import LyricsEditor from '@/components/LyricsEditor.vue';
</script>

<template>
  <v-app class="game-view">
    <TopPanel />
    <v-main class="game-content">
      <MainTrackEditor />
      <LyricsEditor />
    </v-main>
  </v-app>
</template>

<style>
#app {
  padding: auto !important;
  margin: 0 !important;
  background: #1E1E1E;
  min-width: fit-content;
  width: 100vw;
}

.v-main {
  padding: 8px 0px !important;
}
</style>

<style scoped>
.game-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1E1E1E;
}

.game-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 16px;
  gap: 16px;
  overflow-x: auto;
  min-width: min-content;
}
</style>
