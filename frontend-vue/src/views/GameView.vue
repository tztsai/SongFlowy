
<script setup lang="ts">
import MainTrackEditor from '@/components/MainTrackEditor.vue'
</script>

<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>Perfect Song Learning</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12" md="8">
            <main-track-editor />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>
