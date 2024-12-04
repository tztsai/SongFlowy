<template>
  <v-card class="main-track-editor" :style="{ '--num-columns': cols }">
    <div class="controls">
      <button class="mic-button" :class="{ active: isMicActive }" @click="toggleMicrophone">
        {{ isMicActive ? '🎤 Stop' : '🎤 Start' }}
      </button>
      <div v-if="isMicActive" class="pitch-indicator" :style="pitchIndicatorStyle">
        {{ currentPitch || 'No pitch detected' }}
      </div>
    </div>
    <v-container fluid class="track-container" :style="{ '--num-columns': cols }">
      <!-- Main Track Area -->
      <div class="main-track-area">
        <!-- Track Columns -->
        <div class="track-columns">
          <div class="hit-band"></div>
          <div class="hit-line" :style="{ top: (hitZoneTop+hitZoneBottom)/2 + 'px' }"></div>
          <div v-for="bar in barLines" :key="'bar-' + bar.id" class="bar-line" :style="{ top: bar.y + 'px' }">
          </div>
          <div v-for="col in cols" :key="col" class="track-column" @click="addNote($event, col)"
            @mousemove="handleDrag($event)" @mouseup="stopDragging($event)">
            <div v-for="note in getNotesInColumn(col)" :key="note.id" class="note" :style="getNoteStyle(note)"
              @mousedown="startDragging(note, $event)" @dblclick="editNoteLyric(note)" :data-note-id="note.id">
              {{ note.lyric || note.noteName }}
            </div>
          </div>
        </div>
        <!-- Scale Notes at the Bottom -->
        <div class="scale-notes">
          <v-chip v-for="note in columnNotes" :key="note" 
            :color="noteColors[note[0]]"
            :variant="isNoteInScale(note) ? 'elevated' : 'outlined'"
            class="scale-note-chip"
            @click="playNote(note)">
            {{ note }}
          </v-chip>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-bar-container" @mousedown="startProgressDrag" @mousemove="handleProgressDrag"
        @mouseup="stopProgressDrag">
        <div class="progress-bar" :style="{ height: currentProgress + '%' }"></div>
      </div>
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
import { useMusicStore, noteColors, allNotes } from '@/stores/music'
import { Piano } from '@/sound/piano'
import { PitchDetector } from '@/sound/pitch'
import { reactive } from 'vue'

const cols = ref(24)
const barLines = ref([])
const score = ref(0)
const combo = ref(0)
const instrument = new Piano()
const musicStore = useMusicStore()
const isPlaying = computed(() => musicStore.isPlaying)
const isMicActive = ref(false)
const scaleNotes = computed(() => musicStore.currentScale)
const notes = computed(() => musicStore.notes)
const currentProgress = computed(() => musicStore.progressPercent)
const pitchDetector = new PitchDetector()
const currentPitch = ref(null)
const pitchTimeout = ref(null)
const barHeight = musicStore.barPixels
const sheetHeight = musicStore.sheetPixels
const hitZoneHeight = 30
const hitZoneTop = 100
const hitZoneBottom = hitZoneTop - hitZoneHeight
const pitchDebounce = 100 // ms between pitch detections
const silenceThresh = 200 // ms of silence before considering note released
const minNoteDuration = 50 // ms minimum duration for a note to be considered valid

const columnNotes = computed(() => {
  const notes = []
  for (let i = 1; i <= cols.value; i++) {
    notes.push(getScaleNoteForColumn(i))
  }
  return notes
})

const pitchIndicatorStyle = computed(() => {
  if (!currentPitch.value) return { opacity: 0.5 }
  return {
    opacity: 1,
    color: 'white'
  }
})

// Track which notes are currently in the hit band
const activeHitNotes = new Map()

let lastPitchTime = ref(0)
let silenceTimeout = ref(null)
let draggedNote = null
let dragStartY = 0
let animationFrame = null
let isDraggingProgress = false

function initBarLines() {
  const container = document.querySelector('.track-columns')
  if (!container) return
  barLines.value = []

  // Create bar lines every 4 beats
  for (let i = 0; i < musicStore.numBars; i++) {
    barLines.value.push({
      id: i,
      y: i * barHeight + hitZoneTop
    })
  }
}

function getNotesInColumn(col) {
  return notes.value.filter(note => note.noteName === getScaleNoteForColumn(col))
}

function getScaleNoteForColumn(col) {
  const key = musicStore.currentKey[0]
  const ki = allNotes.indexOf(key)
  const note = allNotes[(col + ki - 1) % 12]
  const octave = musicStore.baseOctave + Math.floor((col + ki - 1) / 12)
  return note + octave
}

function getNoteStyle(note) {
  return {
    top: `${note.top}px`,
    height: `${note.height}px`,
    backgroundColor: note.color
  }
}

function startDragging(note, event) {
  draggedNote = note
  dragStartY = note.top + event.clientY
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
  draggedNote.top = dragStartY - event.clientY
  event.preventDefault()
}

function startProgressDrag(event) {
  isDraggingProgress = true
  updateProgressFromMouseY(event)
}

function handleProgressDrag(event) {
  if (!isDraggingProgress) return
  updateProgressFromMouseY(event)
}

function stopProgressDrag() {
  isDraggingProgress = false
}

function updateProgressFromMouseY(event) {
  const container = event.currentTarget
  const rect = container.getBoundingClientRect()
  const progress = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  const delta = (currentProgress.value / 100 - progress) * sheetHeight
  musicStore.setProgress(progress)

  notes.value.forEach(note => {
    note.move(delta)
    if (note.top <= 0) {
      note.move(sheetHeight)
      note.resetColor()
    } else if (note.top >= sheetHeight) {
      note.move(-sheetHeight)
    }
  })
  barLines.value.forEach(bar => {
    bar.y = (bar.y + delta) % sheetHeight
  })
}

function addNote(event, col) {
  if (draggedNote) return
  const rect = event.target.getBoundingClientRect()
  const y = rect.bottom - event.clientY
  const noteName = getScaleNoteForColumn(col)
  musicStore.addNote({ noteName, duration: 1, y })
}

function updateNotes() {
  const dy = musicStore.step()

  notes.value.forEach(note => {
    const old_b = note.top
    note.move(-dy)
    const new_b = note.top

    // Check if note enters hit band
    if (old_b > hitZoneTop && new_b <= hitZoneTop) {
      activeHitNotes.set(note.id, note)
    }
    // Check if note leaves hit band without being hit
    if (old_b > hitZoneBottom && new_b <= hitZoneBottom) {
      if (activeHitNotes.has(note.id)) {
        // Miss - reset combo
        combo.value = 0
        // Visual feedback for miss
        note.color = 'rgba(128, 128, 128, 0.5)'
      }
      activeHitNotes.delete(note.id)
    }
    if (note.top <= 0) {
      note.move(sheetHeight)
      note.resetColor()
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

function editNoteLyric(note) {
  const noteEl = document.querySelector(`[data-note-id="${note.id}"]`)
  noteEl.contentEditable = true
  noteEl.textContent = ''
  noteEl.focus()

  const saveLyric = () => {
    for (const note of musicStore.notes) {
      if (note.id === noteEl.dataset.noteId) {
        note.lyric = noteEl.textContent.trim()
        noteEl.textContent = note.lyric
      }
    }
    noteEl.contentEditable = false
    musicStore.updateLyrics()
  }
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveLyric()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  noteEl.addEventListener('blur', saveLyric)
}

function playNote(note) {
  const pianoNote = note2piano(note)
  instrument.keyDown(pianoNote)
  setTimeout(() => {
    instrument.keyUp(pianoNote)
  }, note.duration * 1000)
}

function note2piano(note) {
  const notes = 'AbBCdDeEFgGa'
  const m = note.match(/\d+$/);
  const octave = m ? parseInt(m[0]) : musicStore.baseOctave;
  note = note.replace(/\d+$/, '');
  return notes.indexOf(note) + octave * 12 - 3
}

async function toggleMicrophone() {
  try {
    if (!isMicActive.value) {
      await pitchDetector.start((detectedNote) => {
        handlePitchDetection(detectedNote)
      })
      isMicActive.value = true
    } else {
      pitchDetector.stop()
      isMicActive.value = false
      currentPitch.value = null
      clearTimeout(pitchTimeout.value)
    }
  } catch (error) {
    console.error('Failed to toggle microphone:', error)
    isMicActive.value = false
  }
}

function handlePitchDetection(detectedNote) {
  const now = Date.now()
  
  // Debounce pitch detection
  if (now - lastPitchTime.value < pitchDebounce) return
  lastPitchTime.value = now

  // Update current pitch display
  currentPitch.value = detectedNote
  
  // Clear silence timeout if we have a new pitch
  if (detectedNote) {
    clearTimeout(silenceTimeout.value)
  } else {
    // Start silence timeout to handle note release
    silenceTimeout.value = setTimeout(() => {
      handleSilence()
    }, silenceThresh)
    return
  }

  // Find matching notes in the hit zone
  for (const [noteId, note] of activeHitNotes) {
    if (note.noteName === detectedNote && !pressedKeys.has(detectedNote)) {
      const noteEl = document.querySelector(`[data-note-id="${note.id}"]`)
      if (noteEl) {
        handleNoteHit(note, noteEl, detectedNote)
      }
      activeHitNotes.delete(noteId)
    }
  }
}

function handleNoteHit(note, noteEl, detectedNote) {
  // Visual feedback
  noteEl.style.boxShadow = `0 0 20px ${note.color}`
  note.color = 'white'
  
  // Calculate accuracy
  const startAccuracy = Math.abs((hitZoneBottom + hitZoneTop) / 2 - note.top) / hitZoneHeight
  
  // Track the note
  pressedKeys.set(detectedNote, {
    note,
    noteEl,
    startAccuracy,
    startTime: Date.now(),
    expectedDuration: note.duration / musicStore.bpm * 60000
  })
}

function handleSilence() {
  // Release all currently held notes
  for (const [note] of pressedKeys) {
    handleNoteRelease(note)
  }
  currentPitch.value = null
}

function handleNoteRelease(note) {
  const keyInfo = pressedKeys.get(note)
  if (!keyInfo) return

  const { note: noteObj, startAccuracy, noteEl, startTime, expectedDuration } = keyInfo
  const actualDuration = Date.now() - startTime
  
  // Ignore very short notes (probably noise)
  if (actualDuration < minNoteDuration) {
    pressedKeys.delete(note)
    return
  }

  const durationAccuracy = Math.abs(actualDuration - expectedDuration) / expectedDuration
  const points = calculatePoints(startAccuracy, durationAccuracy)
  
  updateScoreAndVisuals(points, noteObj, noteEl)
  pressedKeys.delete(note)
}

function calculatePoints(startAccuracy, durationAccuracy) {
  return Math.max(0, 1 - Math.max(startAccuracy, durationAccuracy * 0.8)) * 10
}

function updateScoreAndVisuals(points, noteObj, noteEl) {
  if (points < 3) {
    noteObj.color = 'rgba(128, 128, 128, 0.5)'
    combo.value = 0
  } else {
    noteObj.resetColor()
    score.value += Math.round(points)
    combo.value++
    showScorePopup(points, noteEl)
  }
  noteEl.style.boxShadow = ''
}

function showScorePopup(points, noteEl) {
  const popup = document.createElement('div')
  popup.classList.add('score-popup')
  popup.textContent = `+${Math.round(points)}`
  popup.style.left = `${noteEl.offsetLeft + noteEl.offsetWidth / 2}px`
  popup.style.top = `${noteEl.offsetTop}px`
  
  noteEl.parentElement.appendChild(popup)
  popup.addEventListener('animationend', () => {
    popup.remove()
  })
}

const keyboardChars = "qwertyuiop[]1234567890-="

function keyboard2piano(key) {
  const i = keyboardChars.indexOf(key.toLowerCase())
  return note2piano(getScaleNoteForColumn(i + 1))
}

const pressedKeys = reactive(new Map()) // key -> { note, startTime }

const handleKeyDown = async (event) => {
  // Ignore if target is an input or textarea
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return
  
  if (event.repeat) return // Prevent key repeat

  const key = event.key.toLowerCase()

  if (!keyboardChars.includes(key)) return

  event.preventDefault()

  const pianoKey = keyboard2piano(key)

  // hightlight the corresponding scale note
  for (const pitch of document.querySelectorAll('.scale-note-chip')) {
    if (note2piano(pitch.textContent) === pianoKey) {
      pitch.style.border = '1px solid #fff'
      setTimeout(() => {
        pitch.style.border = ''
      }, 200)
      break
    }
  }

  // Check if any notes in the hit band match this key
  for (const [noteId, note] of activeHitNotes) {
    if (note2piano(note.noteName) === pianoKey && !pressedKeys.has(key)) {
      // Add hit class to note element and track the pressed key
      const noteEl = document.querySelector(`[data-note-id="${note.id}"]`)
      if (noteEl) {
        noteEl.style.boxShadow = `0 0 20px ${note.color}`
        note.color = 'white'
        const startAccuracy = Math.abs((hitZoneBottom + hitZoneTop) / 2 - note.top) / hitZoneHeight
        pressedKeys.set(key, { 
          note, 
          noteEl,
          startAccuracy,
          startTime: Date.now(),
          expectedDuration: note.duration / musicStore.bpm * 60000 // Convert to ms
        })
      }
      activeHitNotes.delete(noteId)
    }
  }
  await instrument.keyDown(keyboard2piano(key))
}

const handleKeyUp = async (event) => {
  // Ignore if target is an input or textarea
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return
  
  const key = event.key.toLowerCase()
  if (!keyboardChars.includes(key)) return

  // Check duration accuracy if key was being tracked
  const keyInfo = pressedKeys.get(key)
  if (keyInfo) {
    const { note: noteObj, startAccuracy, noteEl, startTime, expectedDuration } = keyInfo
    const actualDuration = Date.now() - startTime
    const durationAccuracy = Math.abs(actualDuration - expectedDuration) / expectedDuration
    const points = calculatePoints(startAccuracy, durationAccuracy)
    
    updateScoreAndVisuals(points, noteObj, noteEl)
    pressedKeys.delete(key)
  }

  await instrument.keyUp(keyboard2piano(key))
}

// Watch for play state changes
watch(isPlaying, (newValue) => {
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
  if (isMicActive.value) {
    pitchDetector.stop()
  }
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

// Check if a note is in the current scale
function isNoteInScale(note) {
  const scale = musicStore.currentScale
  console.log(scale, note)
  return scale ? scale.includes(note[0]) : false
}
</script>

<style scoped>
.main-track-editor {
  background: #1E1E1E;
  border-radius: 0px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  --column-width: 45px;
  width: calc(var(--column-width) * var(--num-columns)); /* Add some padding for progress bar and scrollbar */
  min-width: min-content;
}

.track-container {
  display: flex;
  flex: 1;
  padding: 0;
  overflow: hidden;
  width: 100%;
}

.main-track-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.track-columns {
  display: grid;
  grid-template-columns: repeat(var(--num-columns), var(--column-width));
  gap: 1px;
  flex: 1;
  background: #2D2D2D;
  position: relative;
  transform: scaleY(-1);
}

.track-column {
  background: #1E1E1E;
  position: relative;
  min-height: 100%;
  /* width: var(--column-width); */
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
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(32, 32, 32);
  font-size: 12px;
  font-weight: bold;
  cursor: move;
  user-select: none;
  /* transition: all 0.2s; */
  transform: scaleY(-1);
  z-index: 2;
}

.scale-notes {
  display: flex;
  justify-content: space-around;
  grid-template-columns: repeat(var(--num-columns), var(--column-width));
  padding: 4px 0px;
}

.scale-note-chip {
  margin: 0;
  font-weight: bold;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: 50%;
  min-height: 24px;
  padding: 0;
}

.bar-line {
  position: absolute;
  width: 100%;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
  z-index: 3;
}

.hit-band {
  position: absolute;
  top: v-bind(hitZoneBottom + 'px');
  height: v-bind(hitZoneTop - hitZoneBottom + 'px');
  left: 0;
  right: 0;
  background: linear-gradient(to bottom,
      rgba(255, 255, 255, 0.1),
      rgba(204, 197, 139, 0.58) 50%,
      rgba(255, 255, 255, 0.1));
  pointer-events: none;
  z-index: 2;
}

.hit-line {
  position: absolute;
  width: 100%;
  height: 1px;
  background: rgba(237, 152, 25, 0.79);
  pointer-events: none;
  z-index: 3;
}

.controls {
  position: absolute;
  top: 20px;
  right: 30px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.mic-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.mic-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.mic-button.active {
  background: rgba(255, 82, 82, 0.4);
  border-color: rgba(255, 82, 82, 0.6);
}

.pitch-indicator {
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;
}

.progress-bar-container {
  width: 15px;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  position: relative;
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
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.5);
  padding: 10px;
  border-radius: 5px;
  color: white;
  font-family: 'Arial', sans-serif;
}

.combo {
  color: #ffff00;
  font-size: 1.2em;
}
</style>

<style>
.score-popup {
  position: absolute;
  transform: translate(-50%, -100%) scaleY(-1);
  color: #ffff00;
  font-size: 30px;
  font-weight: bold;
  pointer-events: none;
  animation: score-popup-anim 1s ease-out forwards;
  z-index: 100;
}

@keyframes score-popup-anim {
  0% {
    opacity: 1;
    transform: translate(-50%, -100%) scaleY(-1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -200%) scaleY(-1);
  }
}
</style>
