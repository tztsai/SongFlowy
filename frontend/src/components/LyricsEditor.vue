<template>
  <div class="lyrics-editor">
    <div v-for="(bar, barIndex) in barNotes" :key="barIndex" class="bar-input">
      <v-text-field
        :ref="el => textFieldRefs[barIndex] = el"
        v-model="barValues[barIndex]"
        @keydown.enter="commitBarLyrics(barIndex)"
        @blur="commitBarLyrics(barIndex)"
        :placeholder="'Bar ' + (barIndex + 1)"
        hide-details
        density="compact"
        variant="outlined"
        bg-color="rgba(0, 0, 0, 0.2)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const textFieldRefs = ref({})
const barValues = ref({})  // Only used while editing

const barNotes = computed(() => {
  const bars = musicStore.barNotes
  const sortedKeys = Object.keys(bars).sort((a, b) => a - b)
  return sortedKeys.map(key => bars[key])
})

// Watch for changes in note lyrics when not editing
const updateBarValues = () => {
  barNotes.value.forEach((bar, index) => {
    barValues.value[index] = bar.map(note => note.lyric).filter(w => w.length > 0).join(' ')
  })
}

function splitLyrics(value) {
  if (/[ -~]+/.test(value)) {  // ascii characters
    return value.split(/[\s,.?!]+/).filter(w => w.length > 0)
  }
  return value.split(/[\s,.?!，。？！|]+/).filter(w => w.length > 0)
}

function commitBarLyrics(barIndex) {
  const currentBar = barNotes.value[barIndex]
  const value = barValues.value[barIndex]
  if (!currentBar || !value) return

  const words = splitLyrics(value)
  let currentIndex = barIndex
  let currentWords = [...words]

  while (currentWords.length > 0 && currentIndex < barNotes.value.length) {
    const bar = barNotes.value[currentIndex]
    const wordsForBar = currentWords.slice(0, bar.length)
    
    // Update lyrics for current bar
    bar.forEach((note, i) => {
      if (i < wordsForBar.length) {
        musicStore.setNoteLyric(note.id, wordsForBar[i])
      } else {
        musicStore.setNoteLyric(note.id, '')  // Clear any leftover lyrics
      }
    })

    // Move to next bar
    currentWords = currentWords.slice(bar.length)
    currentIndex++
  }

  updateBarValues()

  // Focus the next bar
  console.log(currentIndex, barNotes.value.length)
  if (currentIndex < barNotes.value.length) {
    focusOnBar(currentIndex)
  }
}

async function focusOnBar(barIndex) {
  await nextTick()
  const nextField = textFieldRefs.value[barIndex]?.$el.querySelector('input')
  if (nextField) nextField.focus()
}

onMounted(() => {
  addEventListener('note-lyric-changed', () => {
    updateBarValues()
  })
})

onUnmounted(() => {
  removeEventListener('note-lyric-changed', () => {
    updateBarValues()
  })
})
</script>

<style scoped>
.lyrics-editor {
  height: 100%;
  min-width: 280px;
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
