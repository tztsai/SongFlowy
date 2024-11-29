<template>
  <v-card class="top-panel">
    <v-card-text>
      <v-row>
        <v-col cols="1">
          <v-icon size="large" color="primary">mdi-music</v-icon>
        </v-col>
        <v-col cols="2">
          <v-select v-model="currentKey" :items="keySignatures" label="Key" density="compact" hide-details
            @update:modelValue="updateKey" />
        </v-col>
        <v-col cols="4">
          <v-slider v-model="bpm" :min="30" :max="180" class="align-center" density="compact" hide-details>
            <template v-slot:append>
              <div class="text-medium-emphasis">{{ Math.round(bpm) }} BPM</div>
            </template>
          </v-slider>
        </v-col>
        <v-col cols="2">
          <v-btn :color="isPlaying ? 'error' : 'success'" @click="togglePlay"
            :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" size="small" />
        </v-col>
        <v-col cols="3">
          <v-btn color="primary" prepend-icon="mdi-upload" size="small" class="align-center" @click="triggerFileUpload"
            :loading="isUploading" :disabled="isUploading">
            Upload MIDI
          </v-btn>
          <input type="file" ref="fileInput" accept=".mid,.midi,.wav,.mp3" style="display: none"
            @change="handleFileUpload">
          <div v-if="uploadError" class="text-red">{{ uploadError }}</div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useMusicStore, scaleMap, noteColors } from '@/stores/music'

const musicStore = useMusicStore()
const fileInput = ref(null)
const isUploading = ref(false)
const uploadError = ref(null)

const keySignatures = [
  'C', 'd', 'D', 'e', 'E', 'F', 'g', 'G', 'a', 'A', 'b', 'B',
  'Cm', 'dm', 'Dm', 'em', 'Em', 'fm', 'gm', 'Gm', 'am', 'Am', 'bm', 'Bm'
]

const currentKey = computed({
  get: () => musicStore.getCurrentKey,
  set: (value) => musicStore.setKey(value)
})

const bpm = computed({
  get: () => musicStore.bpm,
  set: (value) => musicStore.setBpm(value)
})

const isPlaying = computed(() => musicStore.isPlaying)

function updateKey(value) {
  musicStore.setKey(value)
}

function togglePlay() {
  musicStore.setIsPlaying(!musicStore.isPlaying)
}

function triggerFileUpload() {
  fileInput.value.click()
}

function translateKey(key) {
  const keys = 'ABCDEFG'
  let octave = key[key.length - 1]
  let postfix = ''
  if (!/\d/.test(octave)) {
    octave = '4'
    if (key.includes('m')) {  // minor
      postfix = 'm'
    }
  } else {
    key = key.slice(0, key.length - 1)
    postfix = octave
  }
  const k = key[0].toUpperCase()
  let index = keys.indexOf(k)
  if (key.includes('b')) {
    return keys[index].toLowerCase() + postfix
  } else if (key.includes('#')) {
    if (index === 6) {
      index = -1
      if (/\d/.test(postfix)) {
        postfix = parseInt(postfix) + 1
      }
    }
    return keys[index + 1].toLowerCase() + postfix
  } else {
    return keys[index] + postfix
  }
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
    // Set the key first before processing notes
    if (data.key) {
      let key = translateKey(data.key)
      if (!scaleMap[key]) {
        throw new Error(`Invalid key: ${key}`)
      }
      musicStore.setKey(key)
      console.log('Set key to:', key, 'Scale:', scaleMap[key])
    }
    if (data.notes) {
      musicStore.setNotes(data.notes.map((note, index) => {
        const key = translateKey(note.noteName)
        console.log(note.noteName, key, note.start, note.duration)
        const y = note.start * 60
        return {
          id: index,
          column: scaleMap[currentKey.value].indexOf(key[0]),
          y: document.querySelector('.track-columns').clientHeight - y,
          length: note.duration * 60,
          noteName: key,
          color: noteColors[key[0]]
        }
      }).filter(Boolean))
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
.top-panel {
  border-radius: 8px;
}

.v-card-text {
  padding-top: 8px;
  padding-bottom: 8px;
}

.align-center {
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
