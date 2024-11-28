
<script setup lang="ts">
import TopPanel from '@/components/TopPanel.vue';
import MainTrackEditor from '@/components/MainTrackEditor.vue'
</script>

<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12" lg="9" class="mx-auto">
            <top-panel />
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <main-track-editor />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>
