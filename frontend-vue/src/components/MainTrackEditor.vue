<template>
  <v-card class="main-track-editor" elevation="3">
    <v-card-title class="text-h5 font-weight-bold">
      Track Editor
      <v-spacer></v-spacer>
      <v-chip :color="isPlaying ? 'success' : 'primary'" class="ml-2">
        {{ isPlaying ? 'Playing' : 'Paused' }}
      </v-chip>
    </v-card-title>

    <!-- Track Grid -->
    <v-card-text>
      <div class="track-grid">
        <div class="time-markers">
          <div v-for="beat in 16" :key="'marker-' + beat" class="time-marker">
            {{ beat }}
          </div>
        </div>
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
      <div class="scale-notes">
        <v-chip v-for="(note, index) in scaleNotes" :key="index" :color="isScaleNoteHighlighted(note) ? 'primary' : ''"
          :variant="isScaleNoteHighlighted(note) ? 'elevated' : 'outlined'" class="ma-1">
          {{ note }}
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
const cols = ref(16)
const scaleNotes = computed(() => musicStore.currentScale)
const activeNotes = ref([])

const noteColors = { 
  'F': '#F6CA32', 'g': '#FFAD5B', 'G': '#FF9398', 'a': '#FF8CDE', 
  'A': '#FF9FFF', 'b': '#D3BEFF', 'B': '#3FD8FF', 'C': '#00E9FF', 
  'd': '#00F1FF', 'D': '#00F2C1', 'e': '#49EC79', 'E': '#AFDF40' 
}

function toggleNote(row, col) {
  const existingNoteIndex = activeNotes.value.findIndex(
    note => note.row === row && note.col === col
  )

  if (existingNoteIndex >= 0) {
    activeNotes.value.splice(existingNoteIndex, 1)
  } else {
    const note = scaleNotes.value[row % scaleNotes.value.length]
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
  grid-template-columns: repeat(16, 1fr);
  gap: 1px;
  background: #2D2D2D;
  border-radius: 4px;
  padding: 1px;
  margin: 16px 0;
  aspect-ratio: 16/10;
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
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding: 8px;
  background: #2D2D2D;
  border-radius: 4px;
}
</style>
