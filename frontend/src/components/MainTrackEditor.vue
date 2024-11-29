<template>
  <v-card class="main-track-editor">
    <v-container class="track-container">
      <v-col>
        <!-- Track Columns -->
        <div class="track-columns">
          <div class="hit-band"></div>
          <div v-for="bar in barLines" :key="'bar-' + bar.id" class="bar-line" :style="{ top: bar.y + 'px' }">
          </div>
          <div v-for="col in cols" :key="col" class="track-column" @click="addNote($event, col)"
            @mousemove="handleDrag($event)" @mouseup="stopDragging($event)">
            <div v-for="note in getNotesInColumn(col)" :key="note.id" class="note" :style="getNoteStyle(note)"
              @mousedown="startDragging(note, $event)">
              {{ note.noteName }}
            </div>
          </div>
        </div>
        <!-- Scale Notes at the Bottom -->
        <div class="scale-notes">
          <v-chip v-for="col in cols" :key="col" :color="noteColors[getScaleNoteForColumn(col)[0]]"
            class="scale-note-chip" @click="playNote(getScaleNoteForColumn(col))">
            {{ getScaleNoteForColumn(col) }}
          </v-chip>
        </div>
      </v-col>
      <v-col>
        <div class="progress-bar-container" @mousedown="startProgressDrag" @mousemove="handleProgressDrag"
          @mouseup="stopProgressDrag" @mouseleave="stopProgressDrag">
          <div class="progress-bar" :style="{ height: progressPercentage + '%' }"></div>
        </div>
      </v-col>
    </v-container>

    <!-- Score Display -->
    <div class="score-display">
      Score: {{ score }}<br>
      Combo: <span class="combo">{{ combo }}</span>
    </div>
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
let isLooping = false

const barLines = ref([])
const barHeight = 4 * beatHeight
const numBars = 24
const sheetHeight = numBars * barHeight
const hitBandTop = 120
const hitBandBottom = 80
const goodHitWidth = 5
const score = ref(0)
const combo = ref(0)

// Track which notes are currently in the hit band
const activeHitNotes = new Set()

const isDraggingProgress = ref(false)
const currentProgress = ref(0)
const progressPercentage = computed(() => {
  return (currentProgress.value / sheetHeight) * 100
})

function initBarLines() {
  const container = document.querySelector('.track-columns')
  if (!container) return
  barLines.value = []

  // Create bar lines every 4 beats
  for (let i = 0; i < numBars; i++) {
    barLines.value.push({
      id: i,
      y: i * barHeight + hitBandTop
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

function startProgressDrag(event) {
  isDraggingProgress.value = true
  updateProgressFromMouseY(event)
}

function handleProgressDrag(event) {
  if (!isDraggingProgress.value) return
  updateProgressFromMouseY(event)
}

function stopProgressDrag() {
  isDraggingProgress.value = false
}

function updateProgressFromMouseY(event) {
  if (!isDraggingProgress.value) return
  const container = event.currentTarget
  const rect = container.getBoundingClientRect()
  const percentage = (event.clientY - rect.top) / rect.height
  const clampedPercentage = Math.max(0, Math.min(1, percentage))
  const newProgress = clampedPercentage * sheetHeight
  const delta = currentProgress.value - newProgress
  currentProgress.value = newProgress

  notes.value.forEach(note => {
    note.setVisualPosition((note.y + delta) % sheetHeight)
  })
  barLines.value.forEach(bar => {
    bar.y = (bar.y + delta) % sheetHeight
  })
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

  const dy = (musicStore.bpm / 60) * 2

  if (currentProgress.value >= sheetHeight) {
    if (isLooping) {
      currentProgress.value -= sheetHeight
    } else {
      musicStore.setIsPlaying(false)
      return
    }
  }

  currentProgress.value += dy

  notes.value.forEach(note => {
    const old_b = note.y
    note.setVisualPosition(note.y - dy)
    const new_b = note.y

    const hitBandCenter = (hitBandTop + hitBandBottom) / 2

    // Check if note enters hit band
    if (old_b > hitBandTop && new_b <= hitBandTop) {
      activeHitNotes.add(note.id)
    }
    // Play the note right in the center
    if (old_b > hitBandCenter && new_b <= hitBandCenter) {
      playNote(note.noteName)
    }
    // Check if note leaves hit band without being hit
    if (old_b > hitBandBottom && new_b <= hitBandBottom) {
      if (activeHitNotes.has(note.id)) {
        // Miss - reset combo
        combo.value = 0
        // Visual feedback for miss
        note.color = 'rgba(255, 0, 0, 0.5)'
      }
      activeHitNotes.delete(note.id)
    }
    if (note.y <= -note.length) {
      note.setVisualPosition(note.y + sheetHeight)
      // Reset note color
      note.color = noteColors[note.noteName[0]]
    }
  })

  barLines.value.forEach(bar => {
    bar.y -= dy
    if (bar.y / barHeight <= -1) {
      bar.y += sheetHeight
    }
  })

  animationFrame = requestAnimationFrame(updateNotes)
}

function note2piano(note) {
  const notes = 'AbBCdDeEFgGa'
  const m = note.match(/\d+$/);
  const octave = m ? parseInt(m[0]) : baseOctave;
  note = note.replace(/\d+$/, '');
  return notes.indexOf(note) + octave * 12 - 3
}

function playNote(note) {
  const pianoNote = note2piano(note)
  instrument.keyDown(pianoNote)
  setTimeout(() => {
    instrument.keyUp(pianoNote)
  }, (note.length * 1000 / musicStore.bpm))
}

const keyboardChars = "zsxdcvgbhnjm,l.;/"

function keyboard2piano(note) {
  return keyboardChars.indexOf(note.toLowerCase()) + 12 * baseOctave
}

const handleKeyDown = async (event) => {
  if (event.repeat) return // Prevent key repeat
  
  const key = event.key.toLowerCase()
  
  if (!keyboardChars.includes(key)) return
  
  event.preventDefault()

  const pianoKey = keyboard2piano(key)

  // hightlight the corresponding scale note
  for (const pitch of document.querySelectorAll('.scale-note-chip')) {
    const note = pitch.textContent
    if (note2piano(note) === pianoKey) {
      pitch.style.border = '1px solid #fff'
      setTimeout(() => {
        pitch.style.border = ''
      }, 200)
      break
    }
  }

  // Check if any notes in the hit band match this key
  for (const noteId of activeHitNotes) {
    const note = notes.value.find(n => n.id === noteId)
    if (!note) continue

    if (note2piano(note.noteName) === pianoKey) {
      const hitAccuracy = Math.abs((hitBandTop + hitBandBottom) / 2 - note.y)
      const points = hitAccuracy <= goodHitWidth ? 20 : 10
      score.value += points
      combo.value++
      activeHitNotes.delete(noteId)
      // Add visual feedback
      note.color = 'rgba(0, 255, 0, 0.5)'
      return
    }
  }
  // Miss - reset combo
  combo.value = 0

  await instrument.keyDown(keyboard2piano(key))
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
  initBarLines()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
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
  display: flex;
  flex-direction: column;
}

.track-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0;
}

.track-container > .v-col {
  padding: 0;
}

.track-columns {
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 1px;
  background: #2D2D2D;
  height: calc(100vh - 160px);
  position: relative;
  transform: scaleY(-1);
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

.hit-band {
  position: absolute;
  top: v-bind(hitBandBottom + 'px');
  height: v-bind(hitBandTop - hitBandBottom + 'px');
  left: 0;
  right: 0;
  background: linear-gradient(to bottom,
      rgba(255, 255, 255, 0.1),
      rgba(242, 233, 151, 0.58) 50%,
      rgba(255, 255, 255, 0.1));
  pointer-events: none;
  z-index: 2;
}

.progress-bar-container {
  width: 20px;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  z-index: 10;
}

.progress-bar {
  position: absolute;
  top: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.5);
  transition: height 0.1s ease-out;
}

.progress-bar-container:hover .progress-bar {
  background: rgba(255, 255, 255, 0.7);
}

.score-display {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 10px;
  border-radius: 5px;
  color: white;
  font-family: 'Arial', sans-serif;
  z-index: 3;
}

.combo {
  color: #ffff00;
  font-size: 1.2em;
}
</style>
