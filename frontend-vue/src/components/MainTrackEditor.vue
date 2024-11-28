<template>
  <v-card class="music-track">
    <v-card-title>Track Editor</v-card-title>
    <v-card-text>
      <div class="track-container" ref="trackContainer">
        <div class="grid-container">
          <div 
            v-for="i in 13" 
            :key="`vline-${i}`" 
            class="vertical-line"
            :style="{ left: `${(i * 5) + 10}%` }"
          ></div>
          <div 
            v-for="i in 10" 
            :key="`hline-${i}`" 
            class="horizontal-line"
            :style="{ top: `${(i * 8) + 10}%` }"
          ></div>
        </div>
        <div 
          v-for="(note, index) in visibleNotes" 
          :key="index"
          class="note-block"
          :style="{ 
            top: `${note.position}%`,
            left: `${note.pitch}%`,
            backgroundColor: note.color,
            opacity: note.active ? 1 : 0.7
          }"
        >
          {{ note.name }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const trackContainer = ref(null)
const visibleNotes = ref([])
const noteColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5']

const createNote = (name, position) => {
  return {
    name,
    position: position,
    pitch: Math.random() * 80 + 10,
    color: noteColors[Math.floor(Math.random() * noteColors.length)],
    active: true
  }
}

const updateNotes = () => {
  if (musicStore.isPlaying) {
    const newNote = createNote(
      musicStore.currentChord,
      Math.random() * 80 + 10
    )
    visibleNotes.value.push(newNote)
    setTimeout(() => {
      newNote.active = false
      setTimeout(() => {
        const index = visibleNotes.value.indexOf(newNote)
        if (index > -1) {
          visibleNotes.value.splice(index, 1)
        }
      }, 500)
    }, 2000)
    setTimeout(updateNotes, (60000 / musicStore.bpm))
  }
}

watch(() => musicStore.isPlaying, (newValue) => {
  if (newValue) {
    visibleNotes.value = []
    updateNotes()
  }
})

const handleKeyPress = (event) => {
  if (event.code === 'Space') {
    event.preventDefault()
    musicStore.setIsPlaying(!musicStore.isPlaying)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.music-track {
  height: 80vh;
  overflow: hidden;
  position: relative;
}

.track-container {
  height: 100%;
  position: relative;
  background: white;
}

.grid-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.vertical-line {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background-color: lightgray;
}

.horizontal-line {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.2);
  padding: 10px 20px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.note-line.active {
  background: rgba(76, 175, 80, 0.6);
}
</style>
