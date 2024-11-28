<template>
  <v-card>
    <v-card-title>Controls</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <v-slider
            v-model="bpm"
            :min="60"
            :max="180"
            label="BPM"
            @update:modelValue="updateBpm"
          ></v-slider>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" class="d-flex justify-center">
          <v-btn
            :color="isPlaying ? 'error' : 'success'"
            @click="togglePlay"
          >
            {{ isPlaying ? 'Stop' : 'Play' }}
          </v-btn>
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
