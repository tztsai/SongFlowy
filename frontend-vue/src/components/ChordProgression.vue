<template>
  <v-card>
    <v-card-title>Chord Progression</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <div class="chord-display">
            <v-chip
              v-for="(chord, index) in commonChords"
              :key="index"
              class="ma-1"
              :color="currentChord === chord ? 'primary' : ''"
              @click="selectChord(chord)"
            >
              {{ chord }}
            </v-chip>
          </div>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-text-field
            v-model="customChord"
            label="Custom Chord"
            @keyup.enter="addCustomChord"
            append-icon="mdi-plus"
            @click:append="addCustomChord"
          ></v-text-field>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()
const customChord = ref('')

const commonChords = [
  'Am', 'C', 'Dm', 'Em', 'F', 'G',
  'A', 'Bm', 'D', 'E'
]

const currentChord = computed({
  get() {
    return musicStore.currentChord
  },
  set(value) {
    musicStore.setCurrentChord(value)
  }
})

const selectChord = (chord) => {
  currentChord.value = chord
}

const addCustomChord = () => {
  if (customChord.value.trim()) {
    currentChord.value = customChord.value
    customChord.value = ''
  }
}
</script>

<style scoped>
.chord-display {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
