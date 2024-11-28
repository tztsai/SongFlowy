import { defineStore } from 'pinia'

export const useMusicStore = defineStore('music', {
  state: () => ({
    currentScale: ['G', 'F', 'E', 'D', 'C', 'B', 'A'],
    bpm: 80,
    isPlaying: false,
    currentChord: 'Am'
  }),
  
  actions: {
    setScale(scale) {
      this.currentScale = scale
    },
    setBpm(bpm) {
      this.bpm = bpm
    },
    setIsPlaying(isPlaying) {
      this.isPlaying = isPlaying
    },
    setCurrentChord(chord) {
      this.currentChord = chord
    }
  },

  getters: {
    getCurrentScale: (state) => state.currentScale,
    getBpm: (state) => state.bpm,
    getIsPlaying: (state) => state.isPlaying,
    getCurrentChord: (state) => state.currentChord
  }
})
