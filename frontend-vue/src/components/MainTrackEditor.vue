<template>
  <v-card class="main-track-editor" elevation="3">
    <v-card-title class="text-h5 font-weight-bold">
      <v-chip :color="isPlaying ? 'success' : 'primary'" class="ml-2">
        {{ isPlaying ? 'Playing' : 'Paused' }}
      </v-chip>
    </v-card-title>

    <!-- Track Grid -->
    <v-card-text>
      <div class="track-grid">
        <!-- Rows for time -->
        <div v-for="row in rows" :key="row" class="time-row">
          <!-- Columns for pitch -->
          <div v-for="col in cols" :key="col" class="grid-cell" :class="{ 'grid-cell-beat': col % 4 === 0 }"
            @click="toggleNote(row, col)">
            <div v-if="isNoteActive(row, col)" class="note-block" :style="{ backgroundColor: getNoteColor(row, col) }">
              <span class="note-label">{{ getNoteLabel(row, col) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Scale Notes at the Bottom -->
      <div class="scale-notes" :style="{ 'grid-template-columns': `repeat(${cols}, 1fr)` }">
        <v-chip v-for="col in cols" :key="col" :color="isScaleNoteHighlighted(scaleNotes[col % scaleNotes.length]) ? 'primary' : ''"
          :variant="isScaleNoteHighlighted(scaleNotes[col % scaleNotes.length]) ? 'elevated' : 'outlined'" class="scale-note-chip">
          {{ scaleNotes[col % scaleNotes.length] }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const isPlaying = computed(() => musicStore.isPlaying)

const rows = ref(10)
const cols = ref(14)
const scaleNotes = computed(() => musicStore.currentScale)
const activeNotes = ref([])

const noteColors = {'D': '#8100FF', 'C#': '#5900FF', 'C': '#001CFF', 'B': '#008BD6', 'A#': '#00C986', 'A': '#00FF00', 'G#': '#00FF00', 'G': '#00FF00', 'F#': '#E0FF00', 'F': '#FFCD00', 'E': '#FF5600', 'D#': '#FF0000'}

function toggleNote(row, col) {
  const existingNoteIndex = activeNotes.value.findIndex(
    note => note.row === row && note.col === col
  )

  if (existingNoteIndex >= 0) {
    activeNotes.value.splice(existingNoteIndex, 1)
  } else {
    const note = scaleNotes.value[col % scaleNotes.value.length] // Use column index to determine note
    activeNotes.value.push({
      row,
      col,
      note,
      color: noteColors[note] || '#757575'
    })
  }
}

function isNoteActive(row, col) {
  return activeNotes.value.some(note => note.row === row && note.col === col)
}

function getNoteColor(row, col) {
  const note = activeNotes.value.find(note => note.row === row && note.col === col)
  return note ? note.color : 'transparent'
}

function getNoteLabel(row, col) {
  const note = activeNotes.value.find(note => note.row === row && note.col === col)
  return note ? note.note : ''
}

function isScaleNoteHighlighted(note) {
  return activeNotes.value.some(activeNote => activeNote.note === note)
}
</script>

<style scoped>
.main-track-editor {
  background: #1E1E1E;
  border-radius: 8px;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.track-grid {
  position: relative;
  display: grid;
  grid-template-rows: repeat(10, 1fr);
  grid-template-columns: repeat(14, 1fr);
  gap: 1px;
  background: #2D2D2D;
  border-radius: 4px;
  padding: 1px;
  margin: 16px 0;
  aspect-ratio: 14/10;
}

.time-markers {
  position: absolute;
  top: -24px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
}

.time-marker {
  color: #757575;
  font-size: 0.8rem;
}

.time-row {
  display: contents;
}

.grid-cell {
  background: #363636;
  transition: background-color 0.2s;
  cursor: pointer;
  position: relative;
}

.grid-cell:hover {
  background: #404040;
}

.grid-cell-beat {
  background: #404040;
}

.grid-cell-beat:hover {
  background: #484848;
}

.note-block {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.note-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8rem;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.scale-notes {
  display: grid;
  gap: 1px;
  padding: 8px;
  margin-top: 16px;
}

.scale-note-chip {
  margin: 0 !important;
  justify-self: center;
}
</style>
