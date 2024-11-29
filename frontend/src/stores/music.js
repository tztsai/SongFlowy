import { defineStore } from 'pinia'

export const scaleMap = {
  'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'G': ['G', 'A', 'B', 'C', 'D', 'E', 'g'],
  'D': ['D', 'E', 'g', 'G', 'A', 'B', 'd'],
  'A': ['A', 'B', 'd', 'D', 'E', 'g', 'a'],
  'E': ['E', 'g', 'a', 'A', 'B', 'd', 'e'],
  'B': ['B', 'd', 'e', 'E', 'g', 'a', 'b'],
  'F': ['F', 'G', 'A', 'b', 'C', 'D', 'E'],
  'b': ['b', 'C', 'D', 'e', 'F', 'G', 'A'],
  'e': ['e', 'F', 'G', 'a', 'b', 'C', 'D'],
  'a': ['a', 'b', 'C', 'd', 'e', 'F', 'G'],
  'd': ['d', 'e', 'F', 'g', 'a', 'b', 'C'],
  'g': ['g', 'a', 'b', 'B', 'd', 'e', 'F'],
  'Am': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  'Em': ['E', 'g', 'G', 'A', 'B', 'C', 'D'],
  'Bm': ['B', 'd', 'D', 'E', 'g', 'G', 'A'],
  'gm': ['g', 'a', 'A', 'B', 'd', 'D', 'E'],
  'dm': ['d', 'e', 'E', 'g', 'a', 'A', 'B'],
  'am': ['a', 'b', 'B', 'd', 'e', 'E', 'g'],
  'em': ['e', 'F', 'g', 'a', 'b', 'B', 'd'],
  'Dm': ['D', 'E', 'F', 'G', 'A', 'b', 'C'],
  'Gm': ['G', 'A', 'b', 'C', 'D', 'e', 'F'],
  'Cm': ['C', 'D', 'e', 'F', 'G', 'a', 'b'],
  'Fm': ['F', 'G', 'a', 'b', 'C', 'd', 'e'],
  'bm': ['b', 'C', 'd', 'e', 'F', 'g', 'a'],
}

export const noteColors = {
  'D': '#8100FF',
  'd': '#5900FF',
  'C': '#001CFF',
  'B': '#008BD6',
  'b': '#00C986',
  'A': '#00FF00',
  'a': '#00FF00',
  'G': '#00FF00',
  'g': '#E0FF00',
  'F': '#FFCD00',
  'E': '#FF5600',
  'e': '#FF0000'
}

export const useMusicStore = defineStore('music', {
  state: () => ({
    bpm: 80,
    isPlaying: false,
    currentKey: 'C',
    notes: []
  }),

  actions: {
    setBpm(bpm) {
      this.bpm = bpm
    },
    setIsPlaying(isPlaying) {
      this.isPlaying = isPlaying
    },
    setNotes(notes) {
      this.notes = notes
    },
    setKey(key) {
      this.currentKey = key
      this.currentScale = scaleMap[key]
    },
    addNote(note) {
      this.notes.push(note)
    }
  },

  getters: {
    getBpm: (state) => state.bpm,
    getIsPlaying: (state) => state.isPlaying,
    getCurrentKey: (state) => state.currentKey,
    getNotes: (state) => state.notes
  }
})
