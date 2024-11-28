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
            :loading="isUploading"
            :disabled="isUploading"
          >
            Upload MIDI
          </v-btn>
          <input
            type="file"
            ref="fileInput"
            accept=".mid,.midi,.wav,.mp3"
            style="display: none"
            @change="handleFileUpload"
          >
          <div v-if="uploadError" class="text-red">{{ uploadError }}</div>
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
const isUploading = ref(false)
const uploadError = ref(null)

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
      // TODO: Update key in store when implemented
      console.log('Detected key:', data.key)
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
