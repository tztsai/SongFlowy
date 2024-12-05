import { describe, it, expect, beforeEach, vi } from 'vitest'

// Initialize navigator object first with proper bind support
global.navigator = {
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue('mock-stream'),
    bind: function(obj) {
      return this.getUserMedia
    }
  }
}

// Mock Web Audio API
class MockAudioContext {
  constructor() {
    this.state = 'suspended'
    this.sampleRate = 44100
  }
  createMediaStreamSource() {
    return {
      connect: vi.fn()
    }
  }
  createScriptProcessor() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn()
    }
  }
}

// Mock AudioContext
global.AudioContext = MockAudioContext
global.webkitAudioContext = MockAudioContext

import { PitchDetector } from '../sound/pitch'

describe('PitchDetector', () => {
  let detector

  beforeEach(() => {
    detector = new PitchDetector()
  })

  describe('getClosestNote', () => {
    const testCases = [
      // Test standard A4 = 440Hz
      { freq: 440, expected: 'A4' },
      // Test octaves of A
      { freq: 220, expected: 'A3' },  // A3
      { freq: 880, expected: 'A5' },  // A5
      // Test other notes
      { freq: 261.63, expected: 'C4' },  // Middle C
      { freq: 329.63, expected: 'E4' },  // E4
      { freq: 392.00, expected: 'G4' },  // G4
      // Test notes that should be mapped to lowercase (flat) notes
      { freq: 466.16, expected: 'b4' },  // Bb4
      { freq: 311.13, expected: 'e4' },  // Eb4/D#4
      { freq: 415.30, expected: 'a4' },  // Ab4/G#4
      // Test edge cases
      { freq: 0, expected: null },
      { freq: null, expected: null },
      { freq: undefined, expected: null }
    ]

    testCases.forEach(({ freq, expected }) => {
      it(`converts ${freq}Hz to ${expected}`, () => {
        expect(detector.getClosestNote(freq)).toBe(expected)
      })
    })

    it('handles frequencies at note boundaries correctly', () => {
      // Test frequencies exactly between two notes
      // A4 (440Hz) and A#4/Bb4 (466.16Hz) midpoint
      const midFreq = Math.sqrt(440 * 466.16)
      expect(detector.getClosestNote(midFreq - 0.01)).toBe('A4')
      expect(detector.getClosestNote(midFreq + 0.01)).toBe('b4')
    })
  })

  describe('getNoteFreq', () => {
    const testCases = [
      { note: 'A4', expected: 440 },
      { note: 'C4', expected: 261.63 },
      { note: 'E4', expected: 329.63 },
      { note: 'G4', expected: 392.00 }
    ]

    testCases.forEach(({ note, expected }) => {
      it(`converts ${note} to approximately ${expected}Hz`, () => {
        const freq = detector.getNoteFreq(note)
        // Allow for small floating point differences
        expect(Math.abs(freq - expected)).toBeLessThan(0.1)
      })
    })
  })
})
