<template>
  <div class="lyrics-editor">
    <v-textarea
      v-model="lyrics"
      label="Lyrics"
      rows="10"
      hide-details
      density="compact"
      class="lyrics-input"
      @input="handleLyricsChange"
    ></v-textarea>
    <div class="lyrics-preview">
      <div v-for="(bar, index) in lyricsPerBar" :key="index" class="bar-lyrics">
        {{ bar }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()

const lyrics = computed({
  get: () => musicStore.lyrics,
  set: (value) => {
    // Split lyrics into characters and assign to notes
    const chars = value.replace(/[\s\n]/g, '').split('')
    musicStore.notes
      .sort((a, b) => a.start - b.start)
      .forEach((note, index) => {
        musicStore.setNoteLyric(note.id, chars[index] || '')
      })
  }
})

const lyricsPerBar = computed(() => {
  // Group notes by bars and show their lyrics
  const bars = {}
  musicStore.notes.forEach(note => {
    const barIndex = Math.floor(note.start / musicStore.beatsPerBar)
    if (!bars[barIndex]) bars[barIndex] = []
    bars[barIndex].push(note)
  })

  return Object.values(bars)
    .map(barNotes => 
      barNotes
        .sort((a, b) => a.start - b.start)
        .map(note => note.lyric || '_')
        .join('')
    )
})
</script>

<style scoped>
.lyrics-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  /* padding: 8px; */
  background: rgba(0, 0, 0, 0.1);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.lyrics-input {
  flex: 1;
  font-size: 16px;
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.lyrics-preview {
  margin-top: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.bar-lyrics {
  margin: 4px 0;
  padding: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
