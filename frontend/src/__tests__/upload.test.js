import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMusicStore } from '../stores/music'
import { mount } from '@vue/test-utils'
import TopPanel from '../components/TopPanel.vue'
import MainTrackEditor from '../components/MainTrackEditor.vue'

// Mock response data from backend
const mockUploadResponse = {
  tempo: 120,
  key: 'C4',
  notes: [
    { noteName: 'C4', start: 0, duration: 1 },
    { noteName: 'E4', start: 1, duration: 0.5 },
    { noteName: 'G4', start: 1.5, duration: 0.5 },
    { noteName: 'F#4', start: 2, duration: 1 },
    { noteName: 'Bb4', start: 3, duration: 2 }
  ]
}

// Mock the fetch function
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockUploadResponse)
  })
)

describe('Upload and Track Processing', () => {
  let store
  let wrapper
  let mockClientHeight = 600

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    store = useMusicStore()

    // Mock document.querySelector
    document.querySelector = vi.fn(() => ({
      clientHeight: mockClientHeight
    }))

    // Mount the TopPanel component
    wrapper = mount(TopPanel, {
      global: {
        plugins: [store]
      }
    })
  })

  describe('translateKey function', () => {
    const translateKey = wrapper.vm.translateKey

    it('handles natural notes with octaves', () => {
      expect(translateKey('C4')).toBe('C4')
      expect(translateKey('G3')).toBe('G3')
    })

    it('handles sharp notes', () => {
      expect(translateKey('F#4')).toBe('g4')
      expect(translateKey('C#4')).toBe('d4')
    })

    it('handles flat notes', () => {
      expect(translateKey('Bb4')).toBe('b4')
      expect(translateKey('Eb4')).toBe('e4')
    })

    it('handles notes without octaves', () => {
      expect(translateKey('C')).toBe('C4')
      expect(translateKey('F#')).toBe('g4')
    })

    it('handles G# special case', () => {
      expect(translateKey('G#4')).toBe('a4')
      expect(translateKey('G#5')).toBe('a5')
    })
  })

  describe('File Upload Processing', () => {
    it('processes upload response correctly', async () => {
      const file = new File([''], 'test.mid', { type: 'audio/midi' })
      const event = { target: { files: [file] } }

      await wrapper.vm.handleFileUpload(event)

      // Check if store was updated correctly
      expect(store.bpm).toBe(120)
      expect(store.currentKey).toBe('C')

      // Verify notes were processed correctly
      const notes = store.getNotes
      expect(notes).toHaveLength(5)

      // Check first note properties
      expect(notes[0]).toMatchObject({
        noteName: 'C4',
        column: 0, // C is first in C major scale
        y: mockClientHeight - 0, // start at 0 beats
        length: 60, // 1 beat * 60
        color: expect.any(String)
      })

      // Check sharp note conversion
      const sharpNote = notes[3] // F#4
      expect(sharpNote).toMatchObject({
        noteName: 'g4',
        column: 4, // G position in C major scale
        y: mockClientHeight - 120, // start at 2 beats * 60
        length: 60 // 1 beat * 60
      })

      // Check flat note conversion
      const flatNote = notes[4] // Bb4
      expect(flatNote).toMatchObject({
        noteName: 'b4',
        column: 6, // B position in C major scale
        y: mockClientHeight - 180, // start at 3 beats * 60
        length: 120 // 2 beats * 60
      })
    })

    it('handles invalid notes gracefully', async () => {
      const invalidResponse = {
        ...mockUploadResponse,
        notes: [
          { noteName: 'X4', start: 0, duration: 1 }, // Invalid note
          { noteName: 'C4', start: 1, duration: 1 } // Valid note
        ]
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(invalidResponse)
        })
      )

      const file = new File([''], 'test.mid', { type: 'audio/midi' })
      const event = { target: { files: [file] } }

      await wrapper.vm.handleFileUpload(event)

      // Only valid notes should be processed
      const notes = store.getNotes
      expect(notes).toHaveLength(1)
      expect(notes[0].noteName).toBe('C4')
    })

    it('handles upload errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request'
        })
      )

      const file = new File([''], 'test.mid', { type: 'audio/midi' })
      const event = { target: { files: [file] } }

      await wrapper.vm.handleFileUpload(event)

      // Check if error was handled
      expect(wrapper.vm.uploadError).toBeTruthy()
      expect(store.getNotes).toHaveLength(0)
    })
  })
})
