<template>
  <v-card class="main-track-editor" elevation="3">
    <v-card-title class="title-container">
      <v-btn
        :prepend-icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
        :color="isPlaying ? 'error' : 'primary'"
        @click="togglePlay"
      >
        {{ isPlaying ? 'Pause' : 'Play' }}
      </v-btn>
    </v-card-title>

    <v-card-text class="track-container pa-0">
      <!-- Track Columns -->
      <div class="track-columns">
        <div v-for="col in cols" :key="col" class="track-column" @click="addNote($event, col)">
          <div v-for="note in getNotesInColumn(col)" :key="note.id" class="note" 
            :style="getNoteStyle(note)"
            :class="{ 'is-falling': isPlaying }"
            @mousedown="startDragging(note, $event)"
            @mouseup="stopDragging"
            @mousemove="handleDrag($event)">
            {{ note.noteName }}
          </div>
        </div>
      </div>

      <!-- Scale Notes at the Bottom -->
      <div class="scale-notes">
        <v-chip v-for="col in cols" :key="col" :color="noteColors[scaleNotes[col % scaleNotes.length]]" class="scale-note-chip">
          {{ scaleNotes[col % scaleNotes.length] }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const isPlaying = computed(() => musicStore.isPlaying)
const cols = ref(14)
const scaleNotes = computed(() => musicStore.currentScale)

const noteColors = {
  'D': '#8100FF',
  'C#': '#5900FF',
  'C': '#001CFF',
  'B': '#008BD6',
  'A#': '#00C986',
  'A': '#00FF00',
  'G#': '#00FF00',
  'G': '#00FF00',
  'F#': '#E0FF00',
  'F': '#FFCD00',
  'E': '#FF5600',
  'D#': '#FF0000'
}

const audioContext = ref(null)
const noteFrequencies = {
  'C': 261.63,
  'C#': 277.18,
  'D': 293.66,
  'D#': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'G': 392.00,
  'G#': 415.30,
  'A': 440.00,
  'A#': 466.16,
  'B': 493.88
}

const notes = ref([])
let nextNoteId = 0
let draggedNote = null
let dragStartY = 0

function addNote(event, col) {
  if (draggedNote) return
  const rect = event.target.getBoundingClientRect()
  const y = event.clientY - rect.top
  const noteName = scaleNotes.value[col % scaleNotes.value.length]
  
  notes.value.push({
    id: nextNoteId++,
    col,
    y,
    length: 60,
    noteName,
    color: noteColors[noteName]
  })
}

function getNotesInColumn(col) {
  return notes.value.filter(note => note.col === col)
}

function getNoteStyle(note) {
  return {
    backgroundColor: note.color,
    top: `${note.y}px`,
    height: `${note.length}px`
  }
}

function startDragging(note, event) {
  draggedNote = note
  dragStartY = event.clientY - note.y
  event.stopPropagation()
}

function stopDragging() {
  draggedNote = null
}

function handleDrag(event) {
  if (!draggedNote) return
  const newY = event.clientY - dragStartY
  draggedNote.y = Math.max(0, newY)
  event.preventDefault()
}

function togglePlay() {
  if (isPlaying.value) {
    stopPlaying()
  } else {
    startPlaying()
  }
}

function startPlaying() {
  musicStore.setIsPlaying(true)
  startNoteAnimation()
}

function stopPlaying() {
  musicStore.setIsPlaying(false)
}

let animationFrame = null

function startNoteAnimation() {
  const animate = () => {
    if (!isPlaying.value) {
      cancelAnimationFrame(animationFrame)
      return
    }

    const containerHeight = document.querySelector('.track-columns').clientHeight

    notes.value.forEach(note => {
      const oldY = note.y
      note.y += (musicStore.bpm / 60) * 2

      // Check if note just crossed the bottom threshold
      if (oldY < containerHeight && note.y >= containerHeight) {
        playNote(note.noteName)
        note.y = 0
      }
    })

    animationFrame = requestAnimationFrame(animate)
  }

  animationFrame = requestAnimationFrame(animate)
}

function playNote(noteName) {
  if (!audioContext.value) return

  const oscillator = audioContext.value.createOscillator()
  const gainNode = audioContext.value.createGain()
  
  // Set note frequency
  const baseFreq = noteFrequencies[noteName.replace(/\d+/, '')] || 440
  oscillator.frequency.setValueAtTime(baseFreq, audioContext.value.currentTime)
  
  // Set waveform
  oscillator.type = 'sine'
  
  // Configure gain (volume envelope)
  gainNode.gain.setValueAtTime(0, audioContext.value.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.5, audioContext.value.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.value.currentTime + 0.5)
  
  // Connect nodes
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.value.destination)
  
  // Start and stop
  oscillator.start()
  oscillator.stop(audioContext.value.currentTime + 0.5)
}

function handleKeyPress(event) {
  if (event.code === 'Space') {
    event.preventDefault() // Prevent page scrolling
    togglePlay()
  }
}

onMounted(() => {
  audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.main-track-editor {
  background: #1E1E1E;
  border-radius: 8px;
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}

.track-container {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.track-columns {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 1px;
  background: #2D2D2D;
  padding: 1px;
  position: relative;
  overflow: hidden;
}

.track-column {
  background: #1E1E1E;
  position: relative;
  min-height: 100%;
  min-width: 30px;
  width: 4vw;
  cursor: pointer;
}

.track-column:hover {
  background: #2A2A2A;
}

.note {
  position: absolute;
  width: calc(100% - 8px);
  left: 4px;
  border-radius: 4px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: move;
  user-select: none;
  transition: background-color 0.2s;
}

.note.is-falling {
  transition: top 0.1s linear;
}

.scale-notes {
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 1px;
  padding: 8px 0;
  background: #2D2D2D;
}

.scale-note-chip {
  margin: 0;
  justify-self: center;
}

.title-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  width: 100%;
}
</style>
