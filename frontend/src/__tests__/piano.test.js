import { Piano } from '../sound/piano'
import * as Tone from 'tone'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('tone', () => ({
  Sampler: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    volume: { value: -6 }
  })),
  Frequency: vi.fn().mockImplementation((note) => `note-${note}`),
  now: vi.fn().mockReturnValue(123)
}))

describe('Piano', () => {
  let piano
  let originalScreen

  beforeEach(() => {
    // Store original screen object
    originalScreen = global.screen
    // Mock the screen object
    global.screen = {
      availWidth: 1920,
      availHeight: 1080
    }
    piano = new Piano()
  })

  afterEach(() => {
    // Restore original screen object
    global.screen = originalScreen
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should set full range for large screens', () => {
      expect(piano._range).toEqual([21, 108])
    })

    it('should set medium range for medium screens', () => {
      global.screen.availWidth = 900
      global.screen.availHeight = 900
      piano = new Piano()
      expect(piano._range).toEqual([36, 84])
    })

    it('should set small range for small screens', () => {
      global.screen.availWidth = 700
      global.screen.availHeight = 700
      piano = new Piano()
      expect(piano._range).toEqual([48, 72])
    })

    it('should initialize sampler with correct base URL', () => {
      expect(Tone.Sampler).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: '/audio/Salamander/',
        })
      )
    })

    it('should set initial volume to -6', () => {
      expect(piano._sampler.volume.value).toBe(-6)
    })
  })

  describe('keyDown', () => {
    it('should trigger attack for notes within range', async () => {
      await piano.keyDown(60) // Middle C
      expect(piano._sampler.triggerAttack).toHaveBeenCalledWith('note-60', 123)
    })

    it('should not trigger attack for notes below range', async () => {
      await piano.keyDown(20)
      expect(piano._sampler.triggerAttack).not.toHaveBeenCalled()
    })

    it('should not trigger attack for notes above range', async () => {
      await piano.keyDown(109)
      expect(piano._sampler.triggerAttack).not.toHaveBeenCalled()
    })

    it('should use custom time when provided', async () => {
      await piano.keyDown(60, 456)
      expect(piano._sampler.triggerAttack).toHaveBeenCalledWith('note-60', 456)
    })
  })

  describe('keyUp', () => {
    it('should trigger release for notes within range', () => {
      piano.keyUp(60)
      expect(piano._sampler.triggerRelease).toHaveBeenCalledWith('note-60', 123.5)
    })

    it('should not trigger release for notes below range', () => {
      piano.keyUp(20)
      expect(piano._sampler.triggerRelease).not.toHaveBeenCalled()
    })

    it('should not trigger release for notes above range', () => {
      piano.keyUp(109)
      expect(piano._sampler.triggerRelease).not.toHaveBeenCalled()
    })

    it('should use custom time when provided', () => {
      piano.keyUp(60, 456)
      expect(piano._sampler.triggerRelease).toHaveBeenCalledWith('note-60', 456.5)
    })
  })

  describe('volume setter', () => {
    it('should update sampler volume', () => {
      piano.volume = -12
      expect(piano._sampler.volume.value).toBe(-12)
    })

    it('should handle undefined sampler', () => {
      piano._sampler = undefined
      expect(() => { piano.volume = -12 }).not.toThrow()
    })
  })
})
