<template>
  <v-card class="main-track-editor" :style="{ '--num-columns': cols, '--column-width': columnWidth + 'vw' }">
    <div class="controls">
      <button class="mic-button" :class="{ active: isMicActive }" @click="toggleMicrophone">
        {{ isMicActive ? '🎤 Stop' : '🎤 Start' }}
      </button>
      <div v-if="isMicActive" class="pitch-indicator" :style="pitchIndicatorStyle">
        {{ pitchDetector.getClosestNote(currentPitch) || 'No pitch detected' }}
      </div>
    </div>
    <v-container fluid class="track-container">
      <!-- Main Track Area -->
      <div class="main-track-area">
        <!-- Track Columns -->
        <div class="track-columns">
          <div class="hit-band"></div>
          <div class="hit-line" :style="{ top: hitLineY + 'px' }">
            <div v-if="isMicActive && currentPitch" class="pitch-dot" :style="pitchDotStyle"></div>
            <canvas ref="pitchTrailCanvas" class="pitch-trail" v-if="isMicActive"></canvas>
          </div>
          <div v-for="bar in visibleBarLines" :key="'bar-' + bar.id" class="bar-line" :style="{ top: bar.y + 'px' }">
          </div>
          <div v-for="col in cols" :key="col" class="track-column" @click="addNote($event, col)"
            @mousemove="handleDrag($event)" @mouseup="stopDragging($event)">
            <div v-for="note in visibleNotesInColumn(col)" :key="note.id" class="note" :style="getNoteStyle(note)"
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
import { PitchDetector, NoteFrequencies } from '@/sound/pitch'
import { reactive } from 'vue'

const cols = ref(24)
const barLines = ref([])
const score = ref(0)
const combo = ref(0)
const instrument = new Piano()
const musicStore = useMusicStore()
const isPlaying = computed(() => musicStore.isPlaying)
const isMicActive = ref(false)
const notes = computed(() => musicStore.notes)
const currentProgress = computed(() => musicStore.progressPercent)
const pitchDetector = new PitchDetector()
const currentPitch = ref(null)
const lastPitchTime = ref(0)
const pitchTimeout = ref(null)
const barHeight = computed(() => musicStore.barPixels)
const sheetHeight = computed(() => musicStore.sheetPixels)
const columnWidth = computed(() => 75 / cols.value)
const autoPlayHitNotes = ref(true)
const hitZoneHeight = 30
const hitZoneTop = 100
const hitZoneBottom = hitZoneTop - hitZoneHeight
const hitLineY = (hitZoneTop + hitZoneBottom) / 2
const silenceThresh = 1500 // ms of silence before considering note released
const pitchTrailCanvas = ref(null)
const pitchHistory = ref([])
const pitchLifeSpan = 3000  // ms

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

// Calculate x position based on frequency
function freqToX(freq) {
  if (!freq) return 0
  if (typeof freq === 'string') {
    freq = NOTE_FREQUENCIES[freq]
  }
  const baseKey = musicStore.currentKey[0] + musicStore.baseOctave
  const baseFreq = NoteFrequencies[baseKey]
  const colWidth = document.querySelector('.main-track-area').offsetWidth / cols.value
  const relativePos = Math.log2(freq / baseFreq) * 12 + 0.5
  return Math.max(0, Math.min(cols.value, relativePos)) * colWidth
}

// Update pitch history and draw trail
function updatePitchTrail(freq) {
  if (!pitchTrailCanvas.value || !freq) return

  const now = Date.now()

  // Add new pitch to history with initial drift velocity
  pitchHistory.value.push({ 
    freq,
    x: freqToX(freq),
    time: now,
    drift: 0,
    velocity: 0  // Initial falling velocity
  })

  // Remove old pitches
  pitchHistory.value = pitchHistory.value.filter(p => now - p.time < pitchLifeSpan)
}

// Compute pitch dot position and style
const pitchDotStyle = computed(() => {
  if (!currentPitch.value) return {}
  const x = freqToX(currentPitch.value)
  const note = pitchDetector.getClosestNote(currentPitch.value)
  return {
    left: `${x}px`,
    transform: 'translate(-50%, -50%)',
    boxShadow: `0 0 10px 5px ${noteColors[note[0]] || '#fff'}`
  }
})

// Track which notes are currently in the hit band
const activeHitNotes = new Map()

let draggedNote = null
let dragStartY = 0
let animationFrame = null
let isDraggingProgress = false

const scrollTop = ref(0)
const containerHeight = ref(window.innerHeight)

function initBarLines() {
  const container = document.querySelector('.track-columns')
  if (!container) return
  barLines.value = []

  for (let i = 0; i < musicStore.numBars; i++) {
    barLines.value.push({
      id: i,
      y: i * barHeight + hitLineY
    })
  }
}

// Only show bar lines within the visible area
const visibleBarLines = computed(() => {
  const visibleStart = scrollTop.value - 100 // Add some buffer
  const visibleEnd = scrollTop.value + containerHeight.value + 100
  return barLines.value.filter(bar => 
    bar.y >= visibleStart && bar.y <= visibleEnd
  )
})

function visibleNotesInColumn(col) {
  const visibleStart = scrollTop.value - hitLineY - 100 // Add some buffer
  const visibleEnd = scrollTop.value + containerHeight.value - hitLineY + 100
  return notes.value.filter(note => {
    if (note.noteName !== getScaleNoteForColumn(col)) return false
    const noteTop = note.top + hitLineY
    const noteBottom = noteTop + note.height
    return noteBottom >= visibleStart && noteTop <= visibleEnd
  })
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
    top: `${note.top + hitLineY}px`,
    height: `${note.height}px`,
    backgroundColor: note.color
  }
}

function isNoteInScale(note) {
  const scale = musicStore.currentScale
  return scale ? scale.includes(note[0]) : false
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
    if (note.bottom <= -hitZoneHeight) {
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
  const y = rect.bottom - event.clientY - hitLineY
  // TODO: take offset (scroll position) into account
  if (y < 0) return
  const noteName = getScaleNoteForColumn(col)
  musicStore.addNote({ noteName, duration: 1, y })
}

function updateNotes() {
  const dy = musicStore.step()
  const dt = 1000 / 60  // Assuming 60fps
  const gravity = 0.0001  // Gravity constant for natural falling motion

  notes.value.forEach(note => {
    const pre = note.top
    note.move(-dy)
    const cur = note.top

    // Check if note enters hit band
    if (pre > hitZoneHeight/2 && cur <= hitZoneHeight/2) {
      activeHitNotes.set(note.id, note)
    }

    if (pre > 0 && cur <= 0) {
      playNote(note.noteName, note.duration / musicStore.bps)
    }

    // Check if note leaves hit band without being hit
    else if (pre > -hitZoneHeight/2 && cur <= -hitZoneHeight/2) {
      if (activeHitNotes.has(note.id)) {
        // Miss - reset combo
        combo.value = 0
        // Visual feedback for miss
        note.color = 'rgba(128, 128, 128, 0.5)'
        activeHitNotes.delete(note.id)
      }
    }
    
    else if (note.bottom <= -hitZoneHeight) {
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
  return

  // Update pitch trail with physics
  pitchHistory.value.forEach(p => {
    p.velocity += gravity * dt  // Increase falling speed
    p.drift += p.velocity * dt + dy  // Add both gravity and scroll movement
  })

  const ctx = pitchTrailCanvas.value.getContext('2d')
  const canvas = pitchTrailCanvas.value
  const now = Date.now()

  // Update canvas size if needed
  const parentWidth = canvas.parentElement.offsetWidth
  const trackColumns = document.querySelector('.track-columns')
  if (canvas.width !== parentWidth || canvas.height !== trackColumns.offsetHeight) {
    canvas.width = parentWidth
    canvas.height = trackColumns.offsetHeight
  }

  // Clear canvas with a slight fade effect for smoother trails
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Sort pitches by age so newer ones are drawn on top
  const sortedPitches = [...pitchHistory.value].sort((a, b) => a.time - b.time)

  // Draw trail with gradient
  sortedPitches.forEach(pitch => {
    const age = now - pitch.time
    const normalizedDrift = pitch.drift / canvas.height
    
    // Calculate alpha based on both age and position
    const ageAlpha = 1 - age / pitchLifeSpan
    const driftAlpha = Math.max(0, 1 - normalizedDrift * 1.5) // Fade out as it falls
    const alpha = Math.min(ageAlpha, driftAlpha) * 0.8  // Increased visibility

    // Skip if fully transparent
    if (alpha <= 0) return

    const closestNote = pitchDetector.getClosestNote(pitch.freq)
    const color = closestNote ? noteColors[closestNote[0]] : '#fff'
    
    // Calculate y position starting from 0 (hit line) and moving down
    const y = pitch.drift
    
    // Skip if outside visible area (with some padding)
    if (y < -20 || y > canvas.height + 20) return
    
    // Create gradient for each point with improved glow effect
    const gradient = ctx.createRadialGradient(
      pitch.x, y, 0,
      pitch.x, y, 15  // Increased radius for better visibility
    )
    gradient.addColorStop(0, `${color}`)
    gradient.addColorStop(0.5, `${color}88`)  // Semi-transparent middle
    gradient.addColorStop(1, `${color}00`)
    
    ctx.fillStyle = gradient
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(pitch.x, y, 15, 0, Math.PI * 2)
    ctx.fill()

    // Add a small core for better visibility
    ctx.beginPath()
    ctx.arc(pitch.x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  })
  ctx.globalAlpha = 1
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

function playNote(note, duration = 0.1) {
  const pianoNote = note2piano(note)
  instrument.keyDown(pianoNote)
  setTimeout(() => {
    instrument.keyUp(pianoNote)
  }, duration * 1000)
}

function note2piano(note) {
  const notes = 'CdDeEFgGaAbB'
  const m = note.match(/\d+$/);
  const octave = m ? parseInt(m[0]) : musicStore.baseOctave;
  note = note.replace(/\d+$/, '');
  return notes.indexOf(note) + (octave + 1) * 12
}

async function toggleMicrophone() {
  try {
    if (!isMicActive.value) {
      await pitchDetector.start(handlePitchDetection)
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

function handlePitchDetection({ freq, note }) {
  if (!freq) {
    if (Date.now() - lastPitchTime.value > silenceThresh) {
      currentPitch.value = null
    }
    return
  }

  lastPitchTime.value = Date.now()
  currentPitch.value = freq
  updatePitchTrail(freq)

  // Check for note hits
  for (const [noteId, noteObj] of activeHitNotes) {
    if (noteObj.noteName === note) {
      const noteEl = document.querySelector(`[data-note-id="${noteObj.id}"]`)
      if (noteEl) handleNoteHit(noteObj, noteEl, note)
    }
  }
}

function handleNoteHit(note, noteEl, key) {
  // Visual feedback
  noteEl.style.boxShadow = `0 0 20px ${note.color}`
  noteEl.style.filter = 'brightness(1.8)'

  // Calculate accuracy
  const startAccuracy = Math.abs(note.top) / hitZoneHeight
  
  // Track the note
  pressedKeys.set(key, {
    note,
    noteEl,
    startAccuracy,
    startTime: Date.now(),
    expectedDuration: note.duration / musicStore.bpm * 60000
  })

  activeHitNotes.delete(note.id)
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
  popup.style.left = `${noteEl.offsetLeft}px`
  popup.style.bottom = `${noteEl.offsetBottom}px`
  
  noteEl.parentElement.appendChild(popup)
  popup.addEventListener('animationend', () => popup.remove())
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

  // Handle keyboard shortcuts for note delay
  if (event.key === 'ArrowUp') {
    return musicStore.addDelay(1)
  } else if (event.key === 'ArrowDown') {
    return musicStore.addDelay(-1)
  }

  const key = event.key.toLowerCase()

  if (!keyboardChars.includes(key)) return

  event.preventDefault()

  const pianoKey = keyboard2piano(key)

  // hightlight the corresponding scale note
  for (const chip of document.querySelectorAll('.scale-note-chip')) {
    if (note2piano(chip.textContent) === pianoKey) {
      chip.style.boxShadow = '0 0 10px #fff'
      setTimeout(() => {
        chip.style.boxShadow = ''
      }, 200)
      break
    }
  }

  // Check if any notes in the hit band match this key
  for (const [noteId, note] of activeHitNotes) {
    if (note2piano(note.noteName) === pianoKey && !pressedKeys.has(key)) {
      // Add hit class to note element and track the pressed key
      const noteEl = document.querySelector(`[data-note-id="${note.id}"]`)
      if (noteEl) handleNoteHit(note, noteEl, key)
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
    const { note, startAccuracy, noteEl, startTime, expectedDuration } = keyInfo
    const actualDuration = Date.now() - startTime
    const durationAccuracy = Math.abs(actualDuration - expectedDuration) / expectedDuration
    const points = calculatePoints(startAccuracy, durationAccuracy)
    console.log(note.noteName, startAccuracy, durationAccuracy, points)
    
    updateScoreAndVisuals(points, note, noteEl)
    pressedKeys.delete(key)
  }

  await instrument.keyUp(keyboard2piano(key))
}

// Watch for play state changes
watch(isPlaying, (playing) => {
  if (playing) {
    updateNotes()
  } else if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})

onMounted(() => {
  initBarLines()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  const container = document.querySelector('.track-container')
  if (container) {
    const observer = new ResizeObserver((entries) => {
      containerHeight.value = entries[0].contentRect.height
    })
    observer.observe(container)
    
    container.addEventListener('scroll', () => {
      scrollTop.value = container.scrollTop
    })
  }
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
  pitchHistory.value = []
})
</script>

<style scoped>
.main-track-editor {
  background: #1E1E1E;
  border-radius: 0px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  width: calc(var(--column-width) * var(--num-columns));
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
  height: v-bind(hitZoneHeight + 'px');
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
  height: 2px;
  background: rgba(255, 255, 255, 0.2);
  z-index: 3;
}

.pitch-dot {
  position: absolute;
  width: 16px;
  height: 16px;
  background: radial-gradient(circle, #fff 0%, rgba(255,255,255,0.3) 70%, transparent 100%);
  border-radius: 50%;
  z-index: 4;
  transition: all 0.2s ease-out;
}

.pitch-trail {
  position: absolute;
  bottom: 0px;
  width: 100%;
  pointer-events: none;
  z-index: 3;
  transform: scaleY(-1);  /* Flip the canvas to match note direction */
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
  color: #ffff00;
  font-size: 30px;
  font-weight: bold;
  pointer-events: none;
  animation: score-popup-anim 1s ease-out forwards;
  transform-origin: center bottom;
  z-index: 100;
}

@keyframes score-popup-anim {
  0% {
    opacity: 1;
    transform: translate(0%, 100%) scaleY(-1);
  }
  100% {
    opacity: 0;
    transform: translate(0%, 300%) scaleY(-1);
  }
}
</style>
