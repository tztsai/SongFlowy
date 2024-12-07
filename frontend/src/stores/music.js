import { defineStore } from 'pinia'

export const baseOctave = 2
export const allNotes = ['C', 'd', 'D', 'e', 'E', 'F', 'g', 'G', 'a', 'A', 'b', 'B']

const scaleMap = {
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

export const noteColors = {'G': '#FF0000', 'g': '#FF8000', 'F': '#FFD700', 'E': '#00FF00', 'e': '#00FFAA', 'D': '#00FFFF', 'd': '#0084FF', 'C': '#0000FF', 'B': '#8000FF', 'b': '#FF00FF', 'A': '#FF0080', 'a': '#FF4040'}

// Note prototype for consistent note creation
export class Note {
  constructor({ id, noteName, start, duration, store }) {
    if (noteName.length != 2)
      throw new Error(`Invalid note name: ${noteName}`)
    this.id = id
    this.noteName = noteName
    this.color = noteColors[noteName[0]]
    this.store = store
    this.lyric = ''
    const [k, o] = noteName.split('')
    this._number = allNotes.indexOf(k) + 12 * parseInt(o)
    this._start = start  // in beats
    this._duration = duration  // in beats
  }

  get start() { return this._start }
  get end() { return this._start + this._duration }
  get duration() { return this._duration }
  get top() { return this.start * this.store.beatPixels - this.store.currentScroll }
  get bottom() { return this.end * this.store.beatPixels - this.store.currentScroll }
  get height() { return this.duration * this.store.beatPixels }
  get number() { return this._number }

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
    this.height = this.bottom - top
    this.start = (top - this.store.currentScroll) / this.store.beatPixels
  }
  set bottom(bottom) {
    this.height = bottom - this.top
    this.end = (bottom - this.store.currentScroll) / this.store.beatPixels
  }
  set height(height) {
    this.duration = height / this.store.beatPixels
  }
  set number(number) {
    this._number = number
    this.noteName = allNotes[number % 12] + ~~(number / 12)
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
    beatPixels: 50,
    totalBeats: 180,
    currentBeats: 0,
    isPlaying: false,
    isLooping: false,
    currentKey: 'G',
    baseOctave: baseOctave,
    notes: [],
    lyrics: '',  // Add lyrics property
    bgm: null,
  }),

  actions: {
    setBpm(bpm) {
      this.bpm = bpm
    },
    step(dt) {
      const beats = this.bps * dt
      if (this.isPlaying) {
        this.currentBeats += beats
        if (this.currentBeats >= this.totalBeats) {
          if (this.isLooping) {
            this.currentBeats -= this.totalBeats
          } else {
            this.currentBeats = this.totalBeats
            this.setIsPlaying(false)
          }
        }
      }
      return this.beatPixels * beats
    },
    setProgress(progress) {
      this.currentBeats = this.totalBeats * progress
      this.notes.forEach(note => note.resetColor())
    },
    setDuration(duration) {
      this.totalBeats = duration / this.bps
    },
    setIsPlaying(isPlaying) {
      this.isPlaying = isPlaying
      if (!this.bgm) return
      if (isPlaying) {
        this.bgm.currentTime = this.currentBeats
        this.bgm.play()
      } else {
        this.bgm.pause()
      }
    },
    setKey(key) {
      const prevKey = this.currentKey
      this.currentKey = translateNote(key.replace('m', '')) + (key.includes('m') ? 'm' : '')
      if ('cd'.includes(key[0].toLowerCase())) {
        this.baseOctave = baseOctave + 1
      }
      const d = allNotes.indexOf(this.currentKey[0]) - allNotes.indexOf(prevKey[0])
      for (const note of this.notes) {  // shift the pitch of all notes
        note.number += d
        note.resetColor()
      }
    },
    setTimeSignature(numerator, denominator) {
      this.beatsPerBar = numerator
      this.beatsPerWholeNote = denominator
    },
    setNotes(notes) {
      this.notes = []
      console.log('Adding', notes.length, 'notes')
      notes.forEach(note => this.addNote(note))
      console.log('Added', this.notes.length, 'notes')
      this.totalBeats = Math.max(...this.notes.map(note => note.end))
      this.setProgress(0)
    },
    addNote(note) {
      if (!note) return
      note = note instanceof Note ? note : new Note({
        id: note.id ?? this.notes.length,
        noteName: translateNote(note.noteName),
        start: note.start ?? note.y / this.beatPixels,
        duration: note.duration ?? note.beats / this.bps,
        store: this
      })
      // Find any overlapping notes with the same name
      for (const exNote of this.notes) {
        if (exNote.noteName === note.noteName) {
          if (exNote.top >= note.top - 1 && exNote.top <= note.bottom + 1) {
            exNote.top = note.top
            return
          } else if (exNote.bottom <= note.bottom + 1 && exNote.bottom >= note.top - 1) {
            exNote.bottom = note.bottom
            return
          }
        }
      }
      // Insert note at the correct position to keep this.notes sorted by start
      let inserted = false
      for (let i = 0; i < this.notes.length; i++) {
        if (this.notes[i].start > note.start) {
          this.notes.splice(i, 0, note)
          inserted = true
          break
        }
      }
      if (!inserted) this.notes.push(note)
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
    },
    addDelay(beats) {
      this.notes.forEach(note => note.start += beats)
    },
    setNoteLyric(noteId, lyric) {
      const note = this.notes.find(n => n.id === noteId)
      if (note) {
        note.lyric = lyric
        // Update lyrics string
        this.updateLyrics()
      }
    },
    updateLyrics() {
      // Group notes by bars
      const notesPerBar = this.notes.reduce((acc, note) => {
        const barIndex = Math.floor(note.start / this.beatsPerBar)
        if (!acc[barIndex]) acc[barIndex] = []
        acc[barIndex].push(note)
        return acc
      }, {})

      // Sort notes within each bar and create lyrics string
      this.lyrics = Object.values(notesPerBar)
        .map(barNotes => barNotes.map(note => note.lyric || '_').join(''))
        .join(' ')
    },
    setBGMPath(path) {
      // Stop any existing BGM
      if (this.bgm) {
        this.bgm.pause();
        this.bgm = null;
      }

      // Reset time to 0
      this.currentBeats = 0

      // Create new audio element for BGM
      const audio = new Audio();
      this.bgm = audio;
      audio.src = path;
      audio.preload = 'auto';
      
      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        console.log('BGM loaded, duration:', audio.duration)
        this.setDuration(audio.duration)
      })

      audio.addEventListener('error', (e) => {
        console.error('Error loading BGM:', e)
      })
    }
  },

  getters: {
    bps: (state) => state.bpm / 60,
    duration: (state) => state.totalBeats / state.bps,
    currentTime: (state) => state.currentBeats / state.bps,
    barPixels: (state) => state.beatPixels * state.beatsPerBar,
    sheetPixels: (state) => state.barPixels * state.numBars,
    scrollSpeed: (state) => state.beatPixels * state.bps,
    currentScroll: (state) => state.currentBeats * state.beatPixels,
    numBars: (state) => Math.ceil(state.totalBeats / state.beatsPerBar),
    totalTime: (state) => state.totalBeats / state.bps,
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
