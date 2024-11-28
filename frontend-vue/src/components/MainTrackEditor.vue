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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const trackContainer = ref(null)
const visibleNotes = ref([])
const scrollSpeed = 0.5
let animationFrame = null

const colors = ['blue', 'green', 'red', 'magenta', 'lime', 'brown', 'pink', 'gold', 'navy']

const createNote = (name, position) => {
  const pitchMap = {
    'C': 15,
    'D': 25,
    'E': 35,
    'F': 45,
    'G': 55,
    'A': 65,
    'B': 75
  }
  
  return {
    name,
    position,
    pitch: pitchMap[name],
    color: colors[Math.floor(Math.random() * colors.length)],
    active: false
  }
}

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
