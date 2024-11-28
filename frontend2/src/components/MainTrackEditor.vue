<template>
  <v-card class="music-track">
    <v-card-title>Track Editor</v-card-title>
    <v-card-text>
      <div class="track-container" ref="trackContainer">
        <div 
          class="note-line"
          v-for="(note, index) in visibleNotes" 
          :key="index"
          :style="{ top: `${note.position}px` }"
          :class="{ 'active': note.active }"
        >
          {{ note.name }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const trackContainer = ref(null)
const visibleNotes = ref([])
const scrollSpeed = 2
let animationFrame = null

const createNote = (name, position) => ({
  name,
  position,
  active: false
})

const updateNotes = () => {
  if (!store.state.isPlaying) return
  
  visibleNotes.value = visibleNotes.value.map(note => ({
    ...note,
    position: note.position + scrollSpeed
  })).filter(note => note.position < window.innerHeight)

  if (Math.random() < 0.02) {
    const scale = store.state.currentScale
    const randomNote = scale[Math.floor(Math.random() * scale.length)]
    visibleNotes.value.push(createNote(randomNote, 0))
  }

  animationFrame = requestAnimationFrame(updateNotes)
}

watch(() => store.state.isPlaying, (newValue) => {
  if (newValue) {
    visibleNotes.value = []
    updateNotes()
  } else {
    cancelAnimationFrame(animationFrame)
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  cancelAnimationFrame(animationFrame)
})

const handleKeyPress = (event) => {
  const key = event.key.toUpperCase()
  if (store.state.currentScale.includes(key)) {
    const note = visibleNotes.value.find(n => 
      n.name === key && 
      !n.active && 
      n.position > window.innerHeight - 150 && 
      n.position < window.innerHeight - 50
    )
    if (note) {
      note.active = true
      // TODO: Add scoring logic here
    }
  }
}
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
}

.note-line {
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
