<template>
  <v-card class="top-panel">
    <v-container>
      <v-row>
        <v-col cols="auto">
          <div class="time-display">
            <div class="time-value">{{ currentTime }}</div>
            <div class="time-label">Time</div>
          </div>
        </v-col>
        <v-col cols="2">
          <v-btn :color="isPlaying ? 'error' : 'success'" @click="togglePlay"
            :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" size="small" />
        </v-col>
        <v-col cols="3">
          <v-slider v-model="bpm" :min="30" :max="180" class="align-center" density="compact" hide-details>
            <template v-slot:append>
              <div class="text-medium-emphasis">{{ Math.round(bpm) }} BPM</div>
            </template>
          </v-slider>
        </v-col>
        <!-- <v-col cols="2">
          <v-select v-model="currentKey" :items="keySignatures" label="Key" density="compact" hide-details
            @update:modelValue="updateKey" />
        </v-col> -->
        <v-col cols="3">
          <v-btn color="primary" prepend-icon="mdi-upload" size="large" @click="triggerFileUpload"
            :loading="isUploading" :disabled="isUploading">
            Upload MIDI
          </v-btn>
          <input type="file" ref="fileInput" accept=".mid,.midi,.wav,.mp3" style="display: none"
            @change="handleFileUpload">
          <div v-if="uploadError" class="text-red">{{ uploadError }}</div>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const fileInput = ref(null)
const isUploading = ref(false)
const uploadError = ref(null)

// const keySignatures = [
//   'C', 'd', 'D', 'e', 'E', 'F', 'g', 'G', 'a', 'A', 'b', 'B',
//   'Cm', 'dm', 'Dm', 'em', 'Em', 'fm', 'gm', 'Gm', 'am', 'Am', 'bm', 'Bm'
// ]

// const currentKey = computed({
//   get: () => musicStore.currentKey,
//   set: (value) => musicStore.setKey(value)
// })

// function updateKey(value) {
//   musicStore.setKey(value)
// }

const bpm = computed({
  get: () => musicStore.bpm,
  set: (value) => musicStore.setBpm(value)
})

const isPlaying = computed(() => musicStore.isPlaying)

function togglePlay() {
  musicStore.setIsPlaying(!musicStore.isPlaying)
}

const currentTime = computed(() => {
  const seconds = musicStore.currentTime | 0
  const mins = seconds / 60 | 0
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

function triggerFileUpload() {
  fileInput.value.click()
}

async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  isUploading.value = true
  uploadError.value = null

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const data = await response.json()

    // Update store with the received data
    if (data.tempo) {
      musicStore.setBpm(data.tempo)
    }
    if (data.key) {
      musicStore.setKey(data.key)
    }
    if (data.notes) {
      musicStore.setNotes(data.notes)
    }
  } catch (error) {
    console.error('Upload error:', error)
    uploadError.value = 'Failed to upload file'
  } finally {
    isUploading.value = false
    event.target.value = '' // Reset file input
  }
}

const handleSpacePress = (e) => {
  if (e.code === 'Space') {
    e.preventDefault()
    togglePlay()
  }
}

window.addEventListener('keydown', handleSpacePress)

onUnmounted(() => {
  window.removeEventListener('keydown', handleSpacePress)
})
</script>

<style scoped>
.v-col {
  display: flex;
  align-items: center;
}

.top-panel {
  background: #1E1E1E;
}

.time-display {
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 16px;
  border-radius: 8px;
  text-align: center;
  min-width: 100px;
}

.time-value {
  font-family: 'Roboto Mono', monospace;
  font-size: 24px;
  font-weight: 500;
  color: #fff;
  line-height: 1;
  margin-bottom: 4px;
}

.time-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.v-btn-group {
  .v-btn {
    min-width: 80px;
  }
}
</style>
