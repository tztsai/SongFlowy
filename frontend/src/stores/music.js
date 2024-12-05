import { defineStore } from 'pinia'

export const beatPixels = 50
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
  constructor({ id, noteName, start, duration }) {
    if (noteName.length != 2)
      throw new Error(`Invalid note name: ${noteName}`)
    this.id = id
    this.noteName = noteName
    this.color = noteColors[noteName[0]]
    this.lyric = ''
    this._start = start  // in beats
    this._duration = duration  // in beats
    this._offset = 0
  }

  get start() { return this._start }
  get end() { return this._start + this._duration }
  get duration() { return this._duration }
  get top() { return this.start * beatPixels + this._offset }
  get bottom() { return this.end * beatPixels + this._offset }
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
    this.start = (top - this._offset) / beatPixels
  }
  set bottom(bottom) {
    this.end = (bottom - this._offset) / beatPixels
  }
  set height(height) {
    this.duration = height / beatPixels
  }

  move(offset) {
    this._offset += offset
  }
  update({ start, end, top, bottom }) {
    if (top) {
      this.height = this.bottom - top
      this.top = top
    }
    if (bottom)
      this.height = bottom - this.top
    if (start) {
      this.duration = this.end - start
      this.start = start
    }
    if (end)
      this.duration = end - this.start
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
    totalBeats: 60,
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
    step(dt = 1 / 60) {  // 60 FPS
      if (this.isPlaying) {
        this.currentBeats += this.bps * dt
        if (this.currentBeats >= this.totalBeats) {
          if (this.isLooping) {
            this.currentBeats = 0
          } else {
            this.currentBeats = this.totalBeats
            this.setIsPlaying(false)  // Stop playback
          }
        }
      }
      return beatPixels * this.bps * dt
    },
    setProgress(progress) {
      this.currentBeats = this.totalBeats * progress
    },
    setDuration(duration) {
      this.totalBeats = Math.ceil(duration / this.bps)
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
      this.currentKey = translateNote(key.replace('m', '')) + (key.includes('m') ? 'm' : '')
      if ('cd'.includes(key[0].toLowerCase())) {
        this.baseOctave = baseOctave + 1
      }
    },
    setTimeSignature(numerator, denominator) {
      this.beatsPerBar = numerator
      this.beatsPerWholeNote = denominator
    },
    setNotes(notes) {
      this.notes = []
      notes.slice(0, 100).forEach(note => this.addNote(note))
      this.totalBeats = Math.ceil(Math.max(...this.notes.map(note => note.end)))
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
            exNote.top > note.top && exNote.top <= note.bottom) {
          return exNote.update({ top: note.top })
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
      if (!inserted) 
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
    barPixels: (state) => beatPixels * state.beatsPerBar,
    sheetPixels: (state) => state.barPixels * state.numBars,
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
