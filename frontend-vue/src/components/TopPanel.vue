<template>
  <v-card class="top-panel">
    <v-card-text class="py-2">
      <v-row>
        <v-col cols="4">
          <v-slider
            v-model="bpm"
            :min="30"
            :max="180"
            label="BPM"
            @update:modelValue="updateBpm"
            class="mb-0"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="auto">
          <v-btn
            :color="isPlaying ? 'error' : 'success'"
            @click="togglePlay"
            :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
            size="small"
            class="mr-2"
          />
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="primary"
            prepend-icon="mdi-upload"
            size="small"
            @click="triggerFileUpload"
          >
            Upload MIDI
          </v-btn>
          <input
            type="file"
            ref="fileInput"
            accept=".mid,.midi"
            style="display: none"
            @change="handleFileUpload"
          >
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const fileInput = ref(null)

const bpm = computed({
  get: () => musicStore.bpm,
  set: (value) => musicStore.setBpm(value)
})

const isPlaying = computed(() => musicStore.isPlaying)

function updateBpm(value) {
  musicStore.setBpm(value)
}

function togglePlay() {
  musicStore.setIsPlaying(!musicStore.isPlaying)
}

function triggerFileUpload() {
  fileInput.value.click()
}

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (file) {
    // TODO: Implement MIDI file processing
    console.log('MIDI file selected:', file.name)
  }
  // Reset file input
  event.target.value = ''
}

const handleSpacePress = (e) => {
  if (e.code === 'Space') {
    e.preventDefault() // Prevent page scrolling
    togglePlay()
  }
}

window.addEventListener('keydown', handleSpacePress)

onUnmounted(() => {
  window.removeEventListener('keydown', handleSpacePress)
})
</script>

<style scoped>
.top-panel {
  border-radius: 8px;
}

.v-card-text {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
