<template>
  <div class="lyrics-editor">
    <div v-for="(bar, barIndex) in barNotes" :key="barIndex" class="bar-input">
      <v-text-field
        :ref="el => textFieldRefs[barIndex] = el"
        :model-value="getBarLyrics(bar)"
        @update:model-value="value => updateBarLyrics(barIndex, value)"
        :placeholder="'Bar ' + (barIndex + 1)"
        hide-details
        density="compact"
        variant="outlined"
        bg-color="rgba(0, 0, 0, 0.2)"
        :maxlength="isLastBar(barIndex) ? bar.length : undefined"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const textFieldRefs = ref({})

const barNotes = computed(() => {
  // Group notes by bars
  const bars = {}
  musicStore.notes.forEach(note => {
    const barIndex = Math.floor(note.start / musicStore.beatsPerBar)
    if (!bars[barIndex]) bars[barIndex] = []
    bars[barIndex].push(note)
  })

  // Convert to array maintaining bar order
  return Object.keys(bars).map(barIndex => bars[barIndex])
})

function isLastBar(barIndex) {
  return barIndex === barNotes.value.length - 1
}

function getBarLyrics(notes) {
  return notes.map(note => note.lyric || '').filter(w => w.length > 0).join(',')
}

async function focusNextBar(barIndex) {
  await nextTick()
  const nextField = textFieldRefs.value[barIndex + 1]?.$el.querySelector('input')
  if (nextField) {
    nextField.focus()
    nextField.setSelectionRange(1, 1)
  }
}

function splitLyrics(value) {
  if (/[ -~]+/.test(value)) {  // ascii characters
    return value.split(/[\s,]+/).filter(w => w.length > 0)
  }
  return value.split(/[\s,]+/).filter(w => w.length > 0)
}

function updateBarLyrics(barIndex, value) {
  const currentBar = barNotes.value[barIndex]
  if (!currentBar) return

  const chars = splitLyrics(value)
  const maxChars = currentBar.length
  
  // If we're in the last bar, just update normally and return
  // if (isLastBar(barIndex)) {
  //   currentBar.forEach((note, index) => {
  //     if (note && index < maxChars) {
  //       musicStore.setNoteLyric(note.id, chars[index] || '')
  //     }
  //   })
  //   return value.slice(0, maxChars)
  // }
  
  // If we have more characters than notes in current bar
  if (false && chars.length > maxChars) {
    // Update current bar
    currentBar.forEach((note, index) => {
      if (note) {
        musicStore.setNoteLyric(note.id, chars[index] || '')
      }
    })
    
    // Get overflow characters
    const overflow = chars.slice(maxChars)
    
    // Update next bar if it exists
    const nextBar = barNotes.value[barIndex + 1]
    if (nextBar) {
      const nextBarCurrentLyrics = getBarLyrics(nextBar).split('')
      const combinedLyrics = [...overflow, ...nextBarCurrentLyrics]
      
      nextBar.forEach((note, index) => {
        if (note) {
          musicStore.setNoteLyric(note.id, combinedLyrics[index] || '')
        }
      })
      
      // Focus next bar
      focusNextBar(barIndex)
    }
    
    // Trim the value to max length for current bar
    return chars.slice(0, maxChars).join(' ')
  } else {
    // Normal update for current bar
    currentBar.forEach((note, index) => {
      if (note) {
        musicStore.setNoteLyric(note.id, chars[index] || '')
      }
    })
  }
}
</script>

<style scoped>
.lyrics-editor {
  height: 100%;
  min-width: 230px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px;
  overflow-y: auto;
}

.bar-input {
  margin-bottom: 8px;
}

:deep(.v-field__input) {
  font-family: 'Roboto Mono', monospace;
  padding: 4px 12px !important;
}

:deep(.v-field__outline) {
  opacity: 0.2;
}
</style>
