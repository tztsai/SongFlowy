<template>
  <v-card>
    <v-card-text>
      <v-row align="center" no-gutters>
        <v-col cols="10">
          <v-slider
            v-model="bpm"
            :min="30"
            :max="180"
            label="BPM"
            @update:modelValue="updateBpm"
            class="mx-2"
          />
        </v-col>
        <v-col cols="2" class="d-flex justify-center">
          <v-btn
            :color="isPlaying ? 'error' : 'success'"
            @click="togglePlay"
            :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
            size="large"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()

const bpm = computed({
  get() {
    return musicStore.bpm
  },
  set(value) {
    musicStore.setBpm(value)
  }
})

const isPlaying = computed({
  get() {
    return musicStore.isPlaying
  },
  set(value) {
    musicStore.setIsPlaying(value)
  }
})

const updateBpm = (value) => {
  musicStore.setBpm(value)
}

const togglePlay = () => {
  musicStore.setIsPlaying(!musicStore.isPlaying)
}
</script>
