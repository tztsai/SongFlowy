<template>
  <v-card class="main-track-editor" elevation="3">
    <v-card-text class="track-container pa-0">
      <!-- Track Columns -->
      <div class="track-columns">
        <div v-for="col in cols" :key="col" class="track-column" @click="addNote($event, col)">
          <div v-for="note in getNotesInColumn(col)" :key="note.id" class="note" 
            :style="getNoteStyle(note)"
            @mousedown="startDragging(note, $event)"
            @mouseup="stopDragging($event)"
            @mousemove="handleDrag($event)">
            {{ note.noteName }}
          </div>
        </div>
      </div>

      <!-- Scale Notes at the Bottom -->
      <div class="scale-notes">
        <v-chip 
          v-for="col in cols" 
          :key="col" 
          :color="noteColors[getScaleNoteForColumn(col)]" 
          class="scale-note-chip"
        >
          {{ getScaleNoteForColumn(col) }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMusicStore, scaleMap } from '@/stores/music'

const cols = ref(14)
const audioContext = ref(null)
const musicStore = useMusicStore()
const scaleNotes = computed(() => scaleMap[musicStore.currentKey])
const isPlaying = computed(() => musicStore.isPlaying)
const notes = computed(() => musicStore.getNotes)

const noteColors = {
  'D': '#8100FF',
  'd': '#5900FF',
  'C': '#001CFF',
  'B': '#008BD6',
  'b': '#00C986',
  'A': '#00FF00',
  'a': '#00FF00',
  'G': '#00FF00',
  'g': '#E0FF00',
  'F': '#FFCD00',
  'E': '#FF5600',
  'e': '#FF0000'
}

const noteFrequencies = {
  'C': 261.63,
  'd': 277.18,
  'D': 293.66,
  'e': 311.13,
  'E': 329.63,
  'F': 349.23,
  'g': 369.99,
  'G': 392.00,
  'a': 415.30,
  'A': 440.00,
  'b': 466.16,
  'B': 493.88
}

const keyboardMap = {
  'a': 0,  // 1
  'w': 1,  // 2b
  's': 2,  // 2
  'e': 3,  // 3b
  'd': 4,  // 3
  'f': 5,  // 4
  't': 6,  // 5b
  'g': 7,  // 5
  'y': 8,  // 6b
  'h': 9,  // 6
  'u': 10, // 7b
  'j': 11, // 7
  'k': 12, // 8
  'o': 13, // 9b
  'l': 14, // 9
  'p': 15, // 10b
  ';': 16, // 10
  "'": 17  // 11
}

let nextNoteId = 0
let draggedNote = null
let dragStartY = 0
let animationFrame = null

function addNote(event, col) {
  if (draggedNote) return
  const rect = event.target.getBoundingClientRect()
  const y = event.clientY - rect.top
  const noteName = scaleNotes.value[col % scaleNotes.value.length]
  
  const newNote = {
    id: nextNoteId++,
    column: col,
    y,
    length: 60,
    noteName,
    color: noteColors[noteName]
  }
  
  musicStore.addNote(newNote)
}

function getNotesInColumn(col) {
  return notes.value.filter(note => note.column === col)
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

function stopDragging(event) {
  event.stopPropagation()
  setTimeout(() => {
    draggedNote = null
  }, 10)
}

function handleDrag(event) {
  if (!draggedNote) return
  const newY = event.clientY - dragStartY
  draggedNote.y = Math.max(0, newY)
  event.preventDefault()
}

function getScaleNoteForColumn(col) {
  const scale = scaleNotes.value
  if (!scale) return ''
  return scale[(col - 1) % scale.length]
}

function updateNotes() {
  if (!isPlaying.value) {
    cancelAnimationFrame(animationFrame)
    return
  }

  const containerHeight = document.querySelector('.track-columns').clientHeight
  notes.value.forEach(note => {
    const oldY = note.y
    note.y += (musicStore.bpm / 60) * 2

    if (oldY < containerHeight && note.y >= containerHeight) {
      playNote(note.noteName)
      note.y = 0
    }
  })

  animationFrame = requestAnimationFrame(updateNotes)
}

function handleKeyPress(event) {
  if (event.repeat) return // Prevent key repeat
  const key = event.key.toLowerCase()
  const notes = 'aAbBCdDeEFgG'
  if (key in keyboardMap) {
    event.preventDefault()
    let i = keyboardMap[key]
    let j = notes.indexOf(scaleNotes.value[0])
    let k = (i + j) % notes.length
    let octave = Math.floor(i / notes.length) + 4
    playNote(notes[k] + octave)
  }
}

// Watch for play state changes
watch(isPlaying, (newValue) => {
  console.log('Play state changed:', newValue)
  if (newValue) {
    updateNotes()
  } else if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})

function playNote(noteName) {
  if (!audioContext.value) return

  const oscillator = audioContext.value.createOscillator()
  const gainNode = audioContext.value.createGain()
  
  // Set note frequency
  let m = noteName.match(/\d+$/);
  const octave = m ? parseInt(m[0]) : 4;
  const baseFreq = noteFrequencies[noteName.replace(/\d+/, '')]
  const octaveFreq = baseFreq * Math.pow(2, octave - 4)
  oscillator.frequency.setValueAtTime(octaveFreq, audioContext.value.currentTime)
  
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
  height: calc(100vh - 112px);
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
</style>
