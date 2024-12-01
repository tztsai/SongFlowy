// test cases:
// - when clicking somewhere on the main track, a note whose top is the same as the click position should be added
// - when dragging a note, it should move to the new position, keep the same length
// - when clicking somewhere beneath a note and the new note to be added is overlapping with an existing note, the new note should be merged with the existing note - the existing note should now have its top at the click position and its bottom remains the same
// - when the music starts playing, after 1 second, the notes should move down by `scrollingSpeed` pixels
// - the distance between two bar lines should be `beatsPerBar / bpm * 60 * scrollingSpeed` pixels
// - if a note is added by clicking on the main track, its height should be the same as `scrollingSpeed / bpm * 60` pixels

import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMusicStore } from '@/stores/music'

describe('Music Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should correctly calculate beat positions', () => {
    const store = useMusicStore()
    store.addNote({ noteName: 'C4', start: 1, duration: 2 })
    const note = store.notes[0]
    expect(note.top).toBe(30) // beatPixels * start
    expect(note.height).toBe(60) // beatPixels * duration
  })

  it('should handle note overlaps correctly', () => {
    const store = useMusicStore()
    store.addNote({ noteName: 'C4', start: 1, duration: 2 })
    store.addNote({ noteName: 'C4', start: 2, duration: 2 })
    expect(store.notes.length).toBe(1)
    expect(store.notes[0].duration).toBe(3)
  })

  it('should correctly update progress', () => {
    const store = useMusicStore()
    store.setProgress(0.5)
    expect(store.currentBeats).toBe(store.totalBeats * 0.5)
  })
})