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

export const beatHeight = 60
export const baseOctave = 3

// Note prototype for consistent note creation
export class Note {
  constructor({ id, noteName, start, y, duration }) {
    if (!/.*\d/.test(noteName))
      noteName += baseOctave
    if (noteName.length != 2)
      throw new Error(`Invalid note name: ${noteName}`)
    this.id = id
    this.noteName = noteName
    this.duration = duration
    this.color = noteColors[noteName[0]]
    if (start === undefined) {
      this.setVisualPosition(y)
    } else {
      this.start = start
    }
    this._updatePosition()
  }

  get end() {
    return this.start + this.duration
  }

  set end(value) {
    if (value < this.start)
      throw new Error('End time must be greater than start time')
    this.duration = value - this.start
    this._updatePosition()
  }

  _updatePosition() {
    // Convert musical timing (beats) to visual position (pixels)
    this.y = this.start * beatHeight
    this.length = this.duration * beatHeight
  }

  // Update note position based on visual coordinates
  setVisualPosition(y) {
    this.y = y
    this.start = y / beatHeight // Convert back to beats
  }
}

export const useMusicStore = defineStore('music', {
  state: () => ({
    bpm: 80,
    isPlaying: false,
    currentKey: 'C',
    currentScale: scaleMap['C'],
    notes: [],
    nextNoteId: 0
  }),

  actions: {
    setBpm(bpm) {
      this.bpm = bpm
    },
    setIsPlaying(isPlaying) {
      this.isPlaying = isPlaying
    },
    setKey(key) {
      key = translateNote(key.replace('m', '')) + (key.includes('m') ? 'm' : '')
      this.currentKey = key
      this.currentScale = scaleMap[key]
    },
    setNotes(notes) {
      this.notes = []
      notes.forEach(note => this.addNote(note))
    },
    addNote(note) {
      if (!note) return
      note = note instanceof Note ? note : new Note({
        id: note.id ?? this.nextNoteId++,
        noteName: translateNote(note.noteName),
        start: note.start,
        y: note.y,  // only needs one of start and y
        duration: note.duration
      })
      // Find any overlapping notes with the same name
      for (const exNote of this.notes) {
        if (exNote.noteName === note.noteName && 
            ((exNote.start <= note.end && exNote.end >= note.start) || 
             (exNote.end >= note.start && exNote.start <= note.end))) {
          const newStart = Math.min(exNote.start, note.start)
          const newEnd = Math.max(exNote.end, note.end)
          exNote.start = newStart
          exNote.end = newEnd
          return
        }
      }
      this.notes.push(note)
    },
    removeNote(id) {
      const index = this.notes.findIndex(note => note.id === id)
      if (index !== -1) {
        this.notes.splice(index, 1)
      }
    }
  },

  getters: {
    getBpm: (state) => state.bpm,
    getIsPlaying: (state) => state.isPlaying,
    getCurrentKey: (state) => state.currentKey,
    getNotes: (state) => state.notes
  }
})

// translate notes with sharps or flats to lowercase letters
function translateNote(key) {
  if (key === key.toLowerCase()) {
    return key
  }
  const keys = 'ABCDEFG'
  let octave = key[key.length - 1]
  if (!/\d/.test(octave)) {
    octave = ''
  } else {
    key = key.slice(0, key.length - 1)
  }
  let i = keys.indexOf(key[0])
  if (key.includes('b')) {
    return keys[i].toLowerCase() + octave
  } else if (key.includes('#')) {
    if (i === keys.length - 1) {
      i = -1
      if (octave) {
        octave = parseInt(octave) + 1
      }
    }
    return keys[i + 1].toLowerCase() + octave
  } else {
    return keys[i] + octave
  }
}
