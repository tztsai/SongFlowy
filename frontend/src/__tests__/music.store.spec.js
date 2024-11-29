import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMusicStore, scaleMap } from '../stores/music'

describe('Music Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default state', () => {
    const store = useMusicStore()
    expect(store.getBpm).toBeDefined()
    expect(store.getIsPlaying).toBeDefined()
    expect(store.getCurrentKey).toBeDefined()
    expect(store.getNotes).toBeDefined()
  })

  it('sets and gets BPM correctly', () => {
    const store = useMusicStore()
    store.setBpm(120)
    expect(store.getBpm).toBe(120)
  })

  it('sets and gets isPlaying correctly', () => {
    const store = useMusicStore()
    store.setIsPlaying(true)
    expect(store.getIsPlaying).toBe(true)
    store.setIsPlaying(false)
    expect(store.getIsPlaying).toBe(false)
  })

  it('sets and gets notes correctly', () => {
    const store = useMusicStore()
    const testNotes = ['C', 'D', 'E']
    store.setNotes(testNotes)
    expect(store.getNotes).toEqual(testNotes)
  })

  it('sets and gets key correctly', () => {
    const store = useMusicStore()
    store.setKey('C')
    expect(store.getCurrentKey).toBe('C')
  })

  it('has valid scale mappings', () => {
    // Test a few key scale mappings
    expect(scaleMap['C']).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(scaleMap['Am']).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(scaleMap['G']).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'g'])
  })
})
