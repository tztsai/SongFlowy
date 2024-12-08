<template>
  <v-card class="main-track-editor" :style="{ '--num-columns': cols, '--column-width': columnWidth + 'vw' }">
    <div class="controls">
      <button class="mic-button" :class="{ active: isMicActive }" @click="toggleMicrophone">
        {{ isMicActive ? '🎤 Stop' : '🎤 Start' }}
      </button>
      <div v-if="isMicActive" class="pitch-indicator" :style="pitchIndicatorStyle">
        {{ currentVocalNote || 'No pitch detected' }}
      </div>
    </div>
    <v-container fluid class="track-container" ref="trackContainer">
      <!-- Main Track Area -->
      <div class="main-track-area" @mousemove="handleDrag($event)" @mouseup="stopDragging($event)">
        <!-- Track Columns -->
        <div class="track-columns">
          <div class="hit-zone"></div>
          <div class="hit-line" :style="{ top: hitLineY + 'px' }">
            <div v-if="isMicActive && currentVocalPitch" class="pitch-dot" :style="pitchDotStyle"></div>
            <canvas ref="pitchTrailCanvas" class="pitch-trail" v-if="isMicActive"></canvas>
          </div>
          <div v-for="{ i, y } in barLines" :key="'bar' + i" class="bar-line" :style="{ top: y + 'px' }">
          </div>
          <div v-for="col in cols" :key="'col' + col" class="track-column" @click="addNote($event, col)">
            <div v-for="{ note, style } in visibleNotes[col-1]" :key="'note' + note.id" class="note"
              :style="style" @mousedown="startDragging(note, $event)" @dblclick="editNoteLyric(note)"
              :data-note-id="note.id">
              {{ note.lyric || note.noteName }}
            </div>
          </div>
        </div>
        <!-- Scale Notes at the Bottom -->
        <div class="scale-notes">
          <v-chip v-for="note in columnNotes" :key="note" :color="noteColors[note[0]]"
            :variant="isNoteInScale(note) ? 'elevated' : 'outlined'" class="scale-note-chip" @click="playNote(note)">
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
import { ref, computed, onMounted, onUnmounted, watch, shallowRef, watchEffect } from 'vue'
import { 
  useElementSize, 
  useRafFn, 
  useThrottleFn, 
  useEventListener,
  computedAsync,
  computedEager,
  debouncedWatch,
  throttledWatch
} from '@vueuse/core'
import { useMusicStore, noteColors, allNotes } from '@/stores/music'
import { Piano } from '@/sound/piano'
import { PitchDetector, NoteFrequencies } from '@/sound/pitch'
import { reactive } from 'vue'

const cols = ref(24)
const score = ref(0)
const combo = ref(0)
const instrument = new Piano()
const musicStore = useMusicStore()
const isPlaying = computed(() => musicStore.isPlaying)
const isMicActive = ref(false)
const notes = computed(() => musicStore.notes)
const lastFrameTime = ref(null)
const currentProgress = computedEager(() => 
  musicStore.progressPercent, 
  { debounce: 32 }
)
const pitchDetector = new PitchDetector()
const currentVocalPitch = ref(null)
const currentVocalNote = computedEager(() => 
  pitchDetector.getClosestNote(currentVocalPitch.value),
  { debounce: 50 }  // 20fps is enough for pitch display
)
const lastPitchTime = ref(0)
const pitchTimeout = ref(null)
const trackContainer = ref()
const columnShift = ref(0)
const { width: containerWidth, height: containerHeight } = useElementSize(trackContainer)
const autoPlayNotes = ref(true)
const hitZoneHeight = 40
const hitZoneTop = 100
const hitZoneBottom = hitZoneTop - hitZoneHeight
const hitLineY = (hitZoneTop + hitZoneBottom) / 2
const silenceThresh = 1500 // ms of silence before considering note released
const pitchTrailCanvas = ref(null)
const pitchHistory = ref([])
const pitchLifeSpan = 3000  // ms

// Track which notes are currently in the hit band
const activeHitNotes = new Map()

const barLines = computedEager(() => {
  const B = musicStore.barPixels
  const C = containerHeight.value
  const H = Math.ceil(C / B) * B
  return [...Array(~~(H / B)).keys()].map(i => ({
    i, y: ((i * B + hitLineY - musicStore.currentScroll) % H + H) % H
  }))
}, { debounce: 32 })  // ~30fps updates

const columnNotes = computed(() => {
  const notes = []
  for (let i = 1; i <= cols.value; i++) {
    notes.push(getScaleNoteForColumn(i))
  }
  return notes
})

const pitchIndicatorStyle = computed(() => {
  return currentVocalPitch.value ? {
    opacity: 1,
    color: 'white'
  } : { opacity: 0.5 }
})

// Compute pitch dot position and style
const pitchDotStyle = computed(() => {
  if (!currentVocalPitch.value) return {}
  const x = freqToX(currentVocalPitch.value)
  const color = noteColors[currentVocalNote.value[0]] || '#fff'
  return {
    left: `${x}px`,
    transform: 'translate(-50%, -50%)',
    boxShadow: `0 0 10px 5px ${color}`
  }
})

const visibleNotes = computedAsync(
  async () => {
    const res = Array(cols.value).fill(null).map(() => [])
    notes.value.forEach(note => {
      const top = note.top + hitLineY
      const bottom = top + note.height
      if (bottom >= 0 && top <= containerHeight.value) {
        const i = columnNotes.value.indexOf(note.noteName)
        if (i >= 0) res[i].push({
          note,
          style: {
            top: `${top}px`,
            height: `${bottom - top}px`,
            backgroundColor: note.color
          }
        })
      }
    })
    return res
  },
  [], // Default empty array while computing
  { throttle: 16 }  // ~60fps updates
)

const columnWidth = computed(() => 72 / cols.value)

var draggedNote = null
var dragStartX = 0
var dragStartY = 0
var isDraggingProgress = false

function getScaleNoteForColumn(col) {
  const key = musicStore.currentKey[0]
  const i = col + allNotes.indexOf(key) + columnShift.value - 1
  const note = allNotes[(i % 12 + 12) % 12]
  const octave = musicStore.baseOctave + Math.floor(i / 12)
  return note + octave
}

function isNoteInScale(note) {
  const scale = musicStore.currentScale
  return scale ? scale.includes(note[0]) : false
}

function startDragging(note, event) {
  draggedNote = note
  dragStartX = event.clientX
  dragStartY = draggedNote.start * musicStore.beatPixels + event.clientY
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
  const dx = (event.clientX - dragStartX) / containerWidth.value * cols.value
  if (Math.abs(dx) >= 1) {
    draggedNote.number += ~~(dx)
    dragStartX = event.clientX
  }
  draggedNote.start = (dragStartY - event.clientY) / musicStore.beatPixels
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
  musicStore.setProgress(progress)
}

function addNote(event, col) {
  if (draggedNote) return
  const rect = event.target.getBoundingClientRect()
  const start = (rect.bottom - event.clientY - hitLineY + musicStore.currentScroll) / musicStore.beatPixels
  if (start < 0) return
  const noteName = getScaleNoteForColumn(col)
  musicStore.addNote({ noteName, duration: 1, start })
}

// falling notes animation
const { pause: pauseAnimation, resume: resumeAnimation } = useRafFn(() => {
  const now = performance.now() / 1000
  const dy = musicStore.step(lastFrameTime.value ? now - lastFrameTime.value : 1 / 60)
  lastFrameTime.value = now

  for (const notes of visibleNotes.value) {
    for (const { note } of notes) {
      const y1 = note.top
      const y2 = y1 - hitZoneHeight / 2
      const y3 = y1 + note.height

      // Check if note is entering the hit zone
      if (y2 > -dy && y2 <= 0) {
        activeHitNotes.set(note.id, note)
      }

      // Check if note is hitting the central line
      else if (y1 > -dy && y1 <= 0 && autoPlayNotes.value) {
        playNote(note.noteName, note.duration / musicStore.bps)
      }

      // Check if note is leaving the hit zone
      else if (y3 > -dy && y3 <= 0) {
        if (activeHitNotes.has(note.id)) {
          combo.value = 0
          note.color = 'rgba(128, 128, 128, 0.5)'  // gray
          activeHitNotes.delete(note.id)
        } else if (pressedKeys.has(note.noteName)) {
          handleNoteRelease(note.noteName)
        }
      }
    }
  }
}, { immediate: false })

function editNoteLyric(note) {
  const noteEl = document.querySelector(`[data-note-id="${note.id}"]`)
  noteEl.contentEditable = true
  noteEl.focus()
  
  const range = document.createRange();
  range.selectNodeContents(noteEl);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const saveEdit = () => {
    const lyric = noteEl.textContent.trim()
    noteEl.contentEditable = false
    musicStore.setNoteLyric(note.id, lyric)
    window.dispatchEvent(new CustomEvent('note-lyric-changed'))
  }

  const handleBlur = () => {
    saveEdit()
    noteEl.removeEventListener('blur', handleBlur)
    noteEl.removeEventListener('keydown', handleKeyDown)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      saveEdit()
      noteEl.removeEventListener('blur', handleBlur)
      noteEl.removeEventListener('keydown', handleKeyDown)
    }
  }

  noteEl.addEventListener('blur', handleBlur)
  noteEl.addEventListener('keydown', handleKeyDown)
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

function handleNoteHit(note, noteEl, key) {
  // Visual feedback
  noteEl.style.boxShadow = `0 0 20px ${note.color}`
  noteEl.style.filter = 'brightness(1.8)'

  // Calculate accuracy
  const startPenalty = note.top / hitZoneHeight

  // Track the note
  pressedKeys.set(key, {
    note,
    noteEl,
    startPenalty,
    startTime: Date.now(),
    expectedDuration: note.duration / musicStore.bpm * 60000
  })

  activeHitNotes.delete(note.id)
}

function handleNoteRelease(key) {
  // if key.length == 1, then it is a keyboard input (character)
  // if key.length == 2, then it is a vocal input (note name)
  const keyInfo = pressedKeys.get(key)

  if (keyInfo) {
    const { note, startPenalty, noteEl, startTime, expectedDuration } = keyInfo
    const actualDuration = Date.now() - startTime
    const points = calculatePoints(startPenalty, actualDuration, expectedDuration, key.length > 1)
    updateScoreAndVisuals(points, note, noteEl)
    pressedKeys.delete(key)
  }
}

function calculatePoints(startPenalty, actualDuration, expectedDuration, isVocal = false) {
  const p = actualDuration / expectedDuration - 1
  let durationPenalty
  if (isVocal) {
    startPenalty = Math.max(0, -startPenalty)  // no penalty for early start
    durationPenalty = Math.abs(p) * 0.2
  } else {
    startPenalty = Math.abs(startPenalty)
    durationPenalty = Math.abs(p) * 0.8
  }
  console.log("Penalties:", startPenalty, durationPenalty)
  return (1 - (startPenalty + durationPenalty) / 2) * 10
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

async function toggleMicrophone() {
  try {
    if (!isMicActive.value) {
      await pitchDetector.start(handlePitchDetection)
      isMicActive.value = true
    } else {
      pitchDetector.stop()
      isMicActive.value = false
      currentVocalPitch.value = null
      clearTimeout(pitchTimeout.value)
    }
  } catch (error) {
    console.error('Failed to toggle microphone:', error)
    isMicActive.value = false
  }
}

function freqToX(freq) {
  if (!freq) return 0
  if (typeof freq === 'string')
    freq = NoteFrequencies[freq]
  const baseKey = getScaleNoteForColumn(1)
  const baseFreq = NoteFrequencies[baseKey]
  const colWidth = document.querySelector('.main-track-area').offsetWidth / cols.value
  const relativePos = Math.log2(freq / baseFreq) * 12 + 0.5
  return Math.max(0, Math.min(cols.value, relativePos)) * colWidth
}

function handlePitchDetection({ freq, db }) {
  const prevKey = currentVocalNote.value

  if (!freq) {
    const dt = Date.now() - lastPitchTime.value
    if (dt > silenceThresh)
      currentVocalPitch.value = null
    else if (pressedKeys.has(prevKey) && dt > silenceThresh / 3) {
      handleNoteRelease(prevKey)
    }
    return
  }
  lastPitchTime.value = Date.now()

  currentVocalPitch.value = freq
  const key = currentVocalNote.value
  // updatePitchTrail(freq)

  if (key !== prevKey && pressedKeys.has(prevKey)) {
    handleNoteRelease(prevKey)
  }

  // Check for note hits
  for (const [noteId, noteObj] of activeHitNotes) {
    if (noteObj.noteName === key) {
      const noteEl = document.querySelector(`[data-note-id="${noteObj.id}"]`)
      if (noteEl) handleNoteHit(noteObj, noteEl, key)
    }
  }
}

const keyboardChars = "qwertyuiop[]1234567890-="

function keyboard2piano(key) {
  const i = keyboardChars.indexOf(key.toLowerCase())
  return note2piano(getScaleNoteForColumn(i + 1))
}

const pressedKeys = reactive(new Map()) // key -> { note, startTime }

const handleKeyDown = async (event) => {
  // Ignore if target is an input or textarea
  if (['INPUT', 'TEXTAREA', 'DIV'].includes(event.target.tagName)) return

  if (event.repeat) return // Prevent key repeat

  // Handle keyboard shortcuts for note delay
  if (event.key === 'ArrowUp') {
    musicStore.currentBeats -= 1
  } else if (event.key === 'ArrowDown') {
    musicStore.currentBeats += 1
  } else if (event.key === 'ArrowLeft') {
    columnShift.value -= 1
  } else if (event.key === 'ArrowRight') {
    columnShift.value += 1
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

  handleNoteRelease(key)
  instrument.keyUp(keyboard2piano(key))
}

// Watch for play state changes
watch(isPlaying, (playing) => {
  if (playing) {
    resumeAnimation()
  } else {
    pauseAnimation()
    lastFrameTime.value = null
  }
})

useEventListener(window, 'resize', useThrottleFn(() => {
  if (trackContainer.value) {
    containerWidth.value = trackContainer.value.offsetWidth
    containerHeight.value = trackContainer.value.offsetHeight
  }
}, 100))

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  new ResizeObserver((entries) => {
    containerHeight.value = entries[0].contentRect.height
  }).observe(document.querySelector('.track-columns'))
  resumeAnimation()
})

onUnmounted(() => {
  pauseAnimation()
  if (isMicActive.value) pitchDetector.stop()
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
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

.hit-zone {
  position: absolute;
  top: v-bind(hitZoneBottom + 'px');
  height: v-bind(hitZoneHeight + 'px');
  left: 0;
  right: 0;
  background: linear-gradient(to bottom,
      rgba(255, 255, 255, 0.02),
      rgba(150, 150, 100, 0.36) 50%,
      rgba(255, 255, 255, 0.02));
  pointer-events: none;
  z-index: 2;
}

.hit-line {
  position: absolute;
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
  z-index: 3;
}

.pitch-dot {
  position: absolute;
  width: 16px;
  height: 16px;
  background: radial-gradient(circle, #fff 0%, rgba(255, 255, 255, 0.3) 70%, transparent 100%);
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
  transform: scaleY(-1);
  /* Flip the canvas to match note direction */
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
