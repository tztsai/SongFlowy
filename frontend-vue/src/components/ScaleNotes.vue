<template>
  <v-card>
    <v-card-title>Scale Notes</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <div class="scale-display">
            <v-chip
              v-for="(note, index) in currentScale"
              :key="index"
              class="ma-1"
              :color="isNoteActive(note) ? 'success' : ''"
            >
              {{ note }}
            </v-chip>
          </div>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-select
            v-model="selectedScale"
            :items="availableScales"
            label="Select Scale"
            @update:modelValue="updateScale"
          ></v-select>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const activeNotes = ref(new Set())

const availableScales = [
  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']
]

const currentScale = computed(() => musicStore.currentScale)
const selectedScale = computed({
  get() {
    return musicStore.currentScale
  },
  set(value) {
    musicStore.setScale(value)
  }
})

const updateScale = (scale) => {
  musicStore.setScale(scale)
}

const isNoteActive = (note) => activeNotes.value.has(note)

// Listen for keydown events
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

const handleKeyDown = (event) => {
  const note = event.key.toUpperCase()
  if (currentScale.value.includes(note)) {
    activeNotes.value.add(note)
  }
}

const handleKeyUp = (event) => {
  const note = event.key.toUpperCase()
  activeNotes.value.delete(note)
}
</script>

<style scoped>
.scale-display {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 1rem;
}
</style>
