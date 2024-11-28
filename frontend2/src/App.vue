<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>Perfect Song Learning</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12" md="3">
            <top-panel />
          </v-col>
          <v-col cols="12" md="6">
            <main-track-editor />
          </v-col>
          <v-col cols="12" md="3">
            <chord-progression />
            <scale-notes class="mt-4" />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import TopPanel from '@/components/TopPanel.vue'
import MainTrackEditor from '@/components/MainTrackEditor.vue'
import ChordProgression from '@/components/ChordProgression.vue'
import ScaleNotes from '@/components/ScaleNotes.vue'
</script>

<style>
.v-application {
  background: #121212;
}
</style>
