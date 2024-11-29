<template>
  <v-card class="main-track-editor" elevation="3">
    <v-card-text class="track-container pa-0">
      <!-- Track Columns -->
      <div class="track-columns-container">
        <div class="track-columns">
          <!-- Bar Lines -->
          <div v-for="bar in barLines" :key="'bar-' + bar.id" class="bar-line"
            :style="{ top: bar.y + 'px' }">
          </div>
          <div v-for="col in cols" :key="col" class="track-column" 
            @click="addNote($event, col)"
            @mousemove="handleDrag($event)"
            @mouseup="stopDragging($event)">
            <div v-for="note in getNotesInColumn(col)"
              :key="note.id" class="note" 
              :style="getNoteStyle(note)"
              @mousedown="startDragging(note, $event)">
              {{ note.noteName }}
            </div>
          </div>
        </div>
      </div>

      <!-- Scale Notes at the Bottom -->
      <div class="scale-notes">
        <v-chip 
          v-for="col in cols" 
          :key="col" 
          :color="noteColors[getScaleNoteForColumn(col)[0]]" 
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
import { useMusicStore, scaleMap, noteColors, baseOctave, beatHeight } from '@/stores/music'
import { Piano } from '@/sound/piano'

const cols = ref(14)
const instrument = new Piano()
const musicStore = useMusicStore()
const scaleNotes = computed(() => scaleMap[musicStore.currentKey])
const isPlaying = computed(() => musicStore.isPlaying)
const notes = computed(() => musicStore.getNotes)

let draggedNote = null
let dragStartY = 0
let animationFrame = null

const barLines = ref([])
const barHeight = 4 * beatHeight
const numBars = 10

function initBarLines() {
  const container = document.querySelector('.track-columns')
  if (!container) return
  barLines.value = []
  
  // Create bar lines every 4 beats
  for (let i = 0; i < numBars; i++) {
    barLines.value.push({
      id: i,
      y: i * barHeight
    })
  }
}

function addNote(event, col) {
  if (draggedNote) return
  const rect = event.target.getBoundingClientRect()
  const y = rect.bottom - event.clientY
  const noteName = getScaleNoteForColumn(col)
  console.log("Clicked on column", col, "note", noteName)
  musicStore.addNote({
    noteName: noteName,
    duration: 1,
    y
  })
}

function getNotesInColumn(col) {
  return notes.value.filter(note => note.noteName === getScaleNoteForColumn(col))
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
  dragStartY = note.y + event.clientY
  console.log(event.clientY, note.y)
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
  const newY = dragStartY - event.clientY
  draggedNote.setVisualPosition(newY)
  event.preventDefault()
}

function getScaleNoteForColumn(col) {
  const scale = scaleNotes.value
  if (!scale) return ''
  const note = scale[(col - 1) % scale.length]
  const index = 'ABCDEFG'.indexOf(scale[0].toUpperCase()) + col - 1
  const octave = baseOctave + Math.floor(index / scale.length)
  return note + octave
}

function updateNotes() {
  if (!isPlaying.value) {
    cancelAnimationFrame(animationFrame)
    return
  }

  notes.value.forEach(note => {
    const old_y = note.y
    note.y -= (musicStore.bpm / 60) * 2

    if (old_y > 0 && note.y <= 0) {
      playNote(note.noteName)
    }
    if (note.y <= -note.length) {
      note.y += numBars * barHeight
    }
  })

  barLines.value.forEach(bar => {
    const dy = (musicStore.bpm / 60) * 2
    bar.y -= dy
    if (bar.y / barHeight <= -1) {
      bar.y += numBars * barHeight
    }
  })

  animationFrame = requestAnimationFrame(updateNotes)
}

function note2piano(note) {
  const notes = 'CdDeEFgGaAbB'
  const m = note.match(/\d+$/);
  const octave = m ? parseInt(m[0]) : baseOctave;
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

.track-columns-container {
  flex: 1;
  overflow-y: auto;
  position: relative;
  transform: scaleY(-1);  /* Flip the container */
}

.track-columns {
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 1px;
  background: #2D2D2D;
  padding: 1px;
  position: relative;
  min-height: 2400px;  /* Gives enough space for scrolling */
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
  transform: scaleY(-1);
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
