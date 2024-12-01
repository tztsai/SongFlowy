import { defineStore } from 'pinia'

const beatPixels = 30

const scaleMap = {
  'T': ['C', 'd', 'D', 'e', 'E', 'F', 'g', 'G', 'a', 'A', 'b', 'B'],
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

// Note prototype for consistent note creation
export class Note {
  constructor({ id, noteName, start, duration }) {
    if (noteName.length != 2)
      throw new Error(`Invalid note name: ${noteName}`)
    this.id = id
    this.noteName = noteName
    this.color = noteColors[noteName[0]]
    this._start = start
    this._duration = duration
    // start and duration are in beats
  }

  get start() { return this._start }
  get end() { return this._start + this._duration }
  get duration() { return this._duration }
  get top() { return this.start * beatPixels }
  get bottom() { return this.end * beatPixels }
  get height() { return this.duration * beatPixels }

  set start(start) {
    this._start = start
  }
  set end(end) {
    this._start = end - this._duration
  }
  set duration(duration) {
    this._duration = duration
  }
  set top(top) {
    this.start = top / beatPixels
  }
  set bottom(bottom) {
    this.end = bottom / beatPixels
  }

  resetColor() {
    this.color = noteColors[this.noteName[0]]
  }
}

export const useMusicStore = defineStore('music', {
  state: () => ({
    bpm: 80,
    beatsPerBar: 4,
    beatsPerWholeNote: 4,
    totalBeats: 24,
    currentBeats: 0,
    isPlaying: false,
    isLooping: false,
    currentKey: 'T',
    baseOctave: 3,
    notes: [],
  }),

  actions: {
    setBpm(bpm) {
      this.bpm = bpm
    },
    step(dt = 1 / 60) {  // 60 FPS
      if (this.isPlaying) {
        this.currentBeats += this.bps * dt
        if (this.currentBeats >= this.totalBeats) {
          if (this.isLooping) {
            this.currentBeats = 0
          } else {
            this.currentBeats = this.totalBeats
            this.isPlaying = false
          }
        }
      }
      return beatPixels * this.bps * dt
    },
    setProgress(progress) {
      this.currentBeats = this.totalBeats * progress
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
        id: note.id ?? this.notes.length,
        noteName: translateNote(note.noteName),
        start: note.start ?? note.y / beatPixels,
        duration: note.duration ?? note.beats / this.bps
      })
      // Find any overlapping notes with the same name
      for (const exNote of this.notes) {
        if (exNote.noteName === note.noteName && 
            ((exNote.start <= note.end && exNote.end >= note.start) || 
             (exNote.end >= note.start && exNote.start <= note.end))) {
          const start = Math.min(exNote.start, note.start)
          exNote.duration = Math.max(exNote.end, note.end) - start
          exNote.start = start
          return
        }
      }
      this.notes.push(note)
    },
    updateNote(id, note) {
      const index = this.notes.findIndex(note => note.id === id)
      if (index !== -1) {
        this.notes[index] = note
      }
    },
    removeNote(id) {
      const index = this.notes.findIndex(note => note.id === id)
      if (index !== -1) {
        this.notes.splice(index, 1)
      }
    }
  },

  getters: {
    bps: (state) => state.bpm / 60,
    barPixels: (state) => beatPixels * state.beatsPerBar,
    sheetPixels: (state) => state.barPixels * state.numBars,
    numBars: (state) => Math.ceil(state.totalBeats / state.beatsPerBar),
    totalTime: (state) => state.totalBeats / state.bps,
    currentTime: (state) => state.currentBeats / state.bps,
    progressPercent: (state) => state.currentBeats / state.totalBeats * 100,
    timeSignature: (state) => [state.beatsPerBar, state.beatsPerWholeNote],
    currentScale: (state) => scaleMap[state.currentKey],
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
