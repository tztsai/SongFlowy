<template>
  <v-card class="top-panel">
    <v-container>
      <v-row>
        <v-col cols="1">
          <div class="time-display">
            <div class="time-value">{{ currentTime }}</div>
            <div class="time-label">Time</div>
          </div>
        </v-col>
        <v-col cols="1">
          <v-btn :color="isPlaying ? 'error' : 'success'" @click="togglePlay"
            :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" size="small" />
        </v-col>
        <v-col cols="2">
          <v-select v-model="currentKey" :items="keySignatures" label="Key" density="compact" hide-details
          style="max-width: 80px;"
          @update:modelValue="updateKey" />
        </v-col>
        <v-col cols="3">
          <v-slider v-model="bpm" :min="30" :max="180" 
          style="max-width: 200px;"
          density="compact" hide-details>
            <template v-slot:append>
              <div class="text-medium-emphasis">{{ Math.round(bpm) }} BPM</div>
            </template>
          </v-slider>
        </v-col>
        <v-col cols="auto">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn color="primary" prepend-icon="mdi-upload" size="large" v-bind="props"
                :loading="isUploading" :disabled="isUploading">
                Upload
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="uploadType = 'separate'; triggerFileUpload('vocal')">
                <v-list-item-title>Upload Vocal Track</v-list-item-title>
              </v-list-item>
              <v-list-item @click="uploadType = 'separate'; triggerFileUpload('bgm')">
                <v-list-item-title>Upload Background Music</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item @click="uploadType = 'combined'; triggerFileUpload('combined')">
                <v-list-item-title>Upload Whole Track</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <input type="file" ref="vocalInput" accept=".mid,.midi,.wav,.mp3" style="display: none"
            @change="handleFileUpload('vocal')">
          <input type="file" ref="bgmInput" accept=".mid,.midi,.wav,.mp3" style="display: none"
            @change="handleFileUpload('bgm')">
          <input type="file" ref="combinedInput" accept=".mid,.midi,.wav,.mp3" style="display: none"
            @change="handleFileUpload('combined')">
          <div v-if="uploadError" class="text-red">{{ uploadError }}</div>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMusicStore } from '@/stores/music'
import { apiClient } from '@/api/client'

const musicStore = useMusicStore()
const vocalInput = ref(null)
const bgmInput = ref(null)
const combinedInput = ref(null)
const uploadType = ref('separate') // 'separate' or 'combined'
const isUploading = ref(false)
const isSeparating = ref(false)
const uploadError = ref(null)

const keySignatures = [
  'C', 'd', 'D', 'e', 'E', 'F', 'g', 'G', 'a', 'A', 'b', 'B',
  'Cm', 'dm', 'Dm', 'em', 'Em', 'fm', 'gm', 'Gm', 'am', 'Am', 'bm', 'Bm'
]

const currentKey = computed({
  get: () => musicStore.currentKey,
  set: (value) => musicStore.setKey(value)
})

function updateKey(value) {
  musicStore.setKey(value)
}

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

function triggerFileUpload(type) {
  switch(type) {
    case 'vocal':
      vocalInput.value.click()
      break
    case 'bgm':
      bgmInput.value.click()
      break
    case 'combined':
      combinedInput.value.click()
      break
  }
}

async function handleFileUpload(type) {
  const input = type === 'vocal' ? vocalInput.value :
                type === 'bgm' ? bgmInput.value :
                combinedInput.value
                
  const file = input.files[0]
  if (!file) return

  isUploading.value = true
  uploadError.value = null
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  try {
    if (type === 'combined') {
      isSeparating.value = true
      // First separate the tracks
      const { vocal_file, bgm_file } = await apiClient.post('/api/separate', formData)
      const bgmUrl = (await apiClient.get(`/uploads/${bgm_file}`)).url

      const formData2 = new FormData()
      formData2.append('file', vocal_file)
      const sheetData = await apiClient.post('/api/sheet', formData2)
      
      musicStore.setNotes(sheetData.notes)
      musicStore.setBGMPath(bgmUrl)
    } else {
      const data = await apiClient.post('/api/upload', formData)
      
      if (type === 'vocal') {
        musicStore.setNotes(data.notes)
      } else if (type === 'bgm') {
        musicStore.setBGMPath(data.path)
      }
    }
  } catch (error) {
    console.error('Upload error:', error)
    uploadError.value = error.message
  } finally {
    isUploading.value = false
    isSeparating.value = false
    input.value = null
  }
}

const handleSpacePress = (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
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
  justify-content: space-around;
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
