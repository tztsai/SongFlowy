
<script setup lang="ts">
import TopPanel from '@/components/TopPanel.vue';
import MainTrackEditor from '@/components/MainTrackEditor.vue';
import LyricsEditor from '@/components/LyricsEditor.vue';
</script>

<template>
  <v-app>
    <v-main>
      <v-container style="width: 1000px;">
        <div class="content-wrapper">
          <v-row class="ma-0">
            <v-col class="pa-0">
              <top-panel />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="9" class="d-flex pr-0">
              <main-track-editor />
            </v-col>
            <v-col cols="3" class="d-flex">
              <lyrics-editor />
            </v-col>
          </v-row>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>
