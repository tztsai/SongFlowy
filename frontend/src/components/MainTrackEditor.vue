<template>
  <v-card class="main-track-editor" elevation="3">
    <v-card-text class="track-container pa-0">
      <!-- Track Columns -->
      <div class="track-columns">
        <!-- Bar Lines -->
        <div v-for="bar in barLines" :key="'bar-' + bar.id" class="bar-line"
          :style="{ top: bar.y + 'px' }">
        </div>
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
          @click="playNote(getScaleNoteForColumn(col))"
        >
          {{ getScaleNoteForColumn(col) }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMusicStore, scaleMap, noteColors } from '@/stores/music'
import { Piano } from '@/sound/piano'

const cols = ref(14)
const instrument = new Piano()
const musicStore = useMusicStore()
const scaleNotes = computed(() => scaleMap[musicStore.currentKey])
const isPlaying = computed(() => musicStore.isPlaying)
const notes = computed(() => musicStore.getNotes)

let nextNoteId = 0
let draggedNote = null
let dragStartY = 0
let animationFrame = null

const barLines = ref([])

function initBarLines() {
  barLines.value = []
  const containerHeight = document.querySelector('.track-columns')?.clientHeight || 0
  const numBars = Math.ceil(containerHeight / 240)
  for (let i = 0; i < numBars; i++) {
    barLines.value.push({ y: i * 240 })
  }
}

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
    const oldBottom = note.y + note.length
    note.y += (musicStore.bpm / 60) * 2
    const newBottom = note.y + note.length

    if (oldBottom < containerHeight && newBottom >= containerHeight) {
      playNote(note.noteName)
    }
    if (note.y >= containerHeight) {
      note.y = 0
    }
  })

  barLines.value.forEach(bar => {
    const dy = (musicStore.bpm / 60) * 2
    bar.y += dy
    if (bar.y >= containerHeight && bar.y % 240 < dy) {
      bar.y = 0
    }
  })

  animationFrame = requestAnimationFrame(updateNotes)
}

function note2piano(note) {
  const notes = 'CdDeEFgGaAbB'
  const m = note.match(/\d+$/);
  const octave = m ? parseInt(m[0]) : 4;
  note = note.replace(/\d+$/, '');
  return notes.indexOf(note) + octave * 12
}

function playNote(note) {
  const pianoNote = note2piano(note)
  instrument.keyDown(pianoNote)
  setTimeout(() => {
    instrument.keyUp(pianoNote)
  }, (note.length * 1000 / musicStore.bpm))
}

const keyboardChars = "awsedftgyhujkolp;'"

function keyboard2piano(note) {
  return keyboardChars.indexOf(note.toLowerCase()) + 48
}

async function handleKeyDown(event) {
  if (event.repeat) return // Prevent key repeat
  const key = event.key.toLowerCase()
  if (keyboardChars.includes(key)) {
    event.preventDefault()
    await instrument.keyDown(keyboard2piano(key))
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase()
  if (keyboardChars.includes(key)) {
    event.preventDefault()
    instrument.keyUp(keyboard2piano(key))
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

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  initBarLines()
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
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

.bar-line {
  position: absolute;
  width: 100%;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
  z-index: 1;
}
</style>
