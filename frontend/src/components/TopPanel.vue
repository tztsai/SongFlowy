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
        <v-col cols="1">
          <v-select v-model="currentKey" :items="keySignatures" label="Key" density="compact" hide-details
            @update:modelValue="updateKey" />
        </v-col>
        <v-col cols="1">
          <v-select v-model="baseOctave" :items="[0,1,2,3,4,5]" label="Octave" density="compact" hide-details
            @update:modelValue="updateBaseOctave" />
        </v-col>
        <v-col cols="3">
          <v-slider v-model="bpm" :min="30" :max="180" style="max-width: 200px;" density="compact" hide-details>
            <template v-slot:append>
              <div class="text-medium-emphasis">{{ Math.round(bpm) }} BPM</div>
            </template>
          </v-slider>
        </v-col>
        <v-col cols="auto">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn color="primary" prepend-icon="mdi-upload" size="large" v-bind="props" :loading="isUploading"
                :disabled="isUploading">
                Upload
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="uploadType = 'separate'; triggerFileUpload('vocal')">
                <v-list-item-title>Upload Melody Track</v-list-item-title>
              </v-list-item>
              <v-list-item @click="uploadType = 'separate'; triggerFileUpload('bgm')">
                <v-list-item-title>Upload Background Music</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item @click="uploadType = 'combined'; triggerFileUpload('combined')">
                <v-list-item-title>AI Audio Separation</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <input type="file" ref="vocalInput" accept=".mid,.midi,.wav,.flac,.mp3" style="display: none"
            @change="handleFileUpload('vocal')">
          <input type="file" ref="bgmInput" accept=".wav,.flac,.mp3" style="display: none"
            @change="handleFileUpload('bgm')">
          <input type="file" ref="combinedInput" accept=".wav,.flac,.mp3" style="display: none"
            @change="handleFileUpload('combined')">
          <div v-if="uploadError" class="text-red">{{ uploadError }}</div>
        </v-col>
        <v-col cols="auto">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn color="secondary" prepend-icon="mdi-history" size="large" v-bind="props" class="ml-2">
                Recent
              </v-btn>
            </template>
            <v-list>
              <template v-if="recentTracks.length > 0">
                <v-list-item v-for="(track, index) in recentTracks" :key="index" @click="loadRecentTrack(track)">
                  <v-list-item-title>
                    {{ formatTrackName(track) }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatDate(track.savedAt) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
              <v-list-item v-else>
                <v-list-item-title class="text-subtitle-2">No recent tracks</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
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
const uploadError = ref(null)

const keySignatures = [
  'C', 'd', 'D', 'e', 'E', 'F', 'g', 'G', 'a', 'A', 'b', 'B',
  'Cm', 'dm', 'Dm', 'em', 'Em', 'fm', 'gm', 'Gm', 'am', 'Am', 'bm', 'Bm'
]

const currentKey = computed({
  get() {
    return musicStore.currentKey
  },
  set(value) {
    updateKey(value)
  }
})

const baseOctave = computed({
  get() {
    return musicStore.baseOctave
  },
  set(value) {
    updateOctave(value)
  }
})

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
  switch (type) {
    case 'vocal':
      return vocalInput.value.click()
    case 'bgm':
      return bgmInput.value.click()
    case 'combined':
      return combinedInput.value.click()
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
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)

  var vocalPath, bgmPath

  try {
    if (type === 'combined') {
      const { song, vocal, instrumental } = await apiClient.post('/api/separate', form)
      vocalPath = vocal
      bgmPath = song
    } else if (type === 'vocal') {
      const { path } = await apiClient.post('/api/upload', form)
      vocalPath = path
    } else if (type === 'bgm') {
      const { path } = await apiClient.post('/api/upload', form)
      bgmPath = path
    }

    if (vocalPath) {
      console.log('Vocal path:', vocalPath)
      const form2 = new FormData()
      form2.append('path', vocalPath)
      const vocalData = await apiClient.post('/api/sheet', form2)

      // TODO: transcribe the vocal track and set lyrics
      musicStore.setTitle(vocalPath.split('/').pop().split('.')[0])
      musicStore.setBpm(vocalData.tempo)
      musicStore.setKey(vocalData.key)
      musicStore.setTimeSignature(...vocalData.time_signature)
      musicStore.setNotes(vocalData.notes)
      musicStore.setOctave(Math.min(...musicStore.notes.map(
        note => parseInt(note.noteName[1]))))
    }
    if (bgmPath) {
      console.log('BGM path:', bgmPath)
      const { url } = await apiClient.get(`/${bgmPath}`)
      await musicStore.saveBGMToStorage(url)
      musicStore.setBGMPath(url)
    }

    musicStore.saveTrack()
    loadRecentTracks()  // Refresh the list

  } catch (error) {
    console.error('Upload error:', error)
    uploadError.value = error.message
  } finally {
    isUploading.value = false
    input.value = null
  }
}

const handleSpacePress = (e) => {
  if (e.code === 'Space' && !e.repeat && !e.target.matches('input, textarea')) {
    e.preventDefault()
    togglePlay()
  }
}

window.addEventListener('keydown', handleSpacePress)

const recentTracks = ref([])

const loadRecentTracks = () => {
  recentTracks.value = musicStore.getRecentTracks()
}

const loadRecentTrack = (track) => {
  musicStore.loadTrack(track)
}

const formatTrackName = (track) => {
  return `${track.title} (${track.key})`
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

function updateOctave(value) {
  musicStore.setOctave(value, true)
}

function updateKey(value) {
  musicStore.setKey(value, true)
}

// Load recent tracks when component mounts
onMounted(() => {
  loadRecentTracks()
})

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

.v-select {
  min-width: 90px;
  min-height: 45px;
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
