const FFT_SIZE = 2048
const BUFFER_SIZE = FFT_SIZE * 2
const MIN_FREQ = 45
const MAX_FREQ = 5000
const MIN_LEVEL = -60 // dB
const TONE_STABILITY_COUNT = 3

// Note frequencies for pitch detection (A4 = 440Hz)
const NOTE_FREQUENCIES = {
  'C4': 261.63,
  'd4': 277.18,
  'D4': 293.66,
  'e4': 311.13,
  'E4': 329.63,
  'F4': 349.23,
  'g4': 369.99,
  'G4': 392.00,
  'a4': 415.30,
  'A4': 440.00,
  'b4': 466.16,
  'B4': 493.88,
  'C5': 523.25
}

class Tone {
  constructor(freq = 0, db = -Infinity) {
    this.freq = freq
    this.db = db
    this.stableDb = db
    this.age = 0
    this.harmonics = new Float32Array(12) // Store up to 12 harmonics
  }

  matches(freq) {
    return Math.abs(this.freq / freq - 1.0) < 0.1
  }

  isStable() {
    return this.age >= TONE_STABILITY_COUNT
  }
}

class Peak {
  constructor(freq = 0, db = -Infinity) {
    this.freq = freq
    this.db = db
    this.harmonics = new Array(12)
  }

  static findBestMatch(peaks, pos) {
    let best = pos
    if (peaks[pos - 1]?.db > peaks[best].db) best = pos - 1
    if (peaks[pos + 1]?.db > peaks[best].db) best = pos + 1
    return peaks[best]
  }
}

export class PitchDetector {
  constructor() {
    this.audioContext = null
    this.analyser = null
    this.mediaStream = null
    this.isListening = false
    this.onPitch = null
    
    this.data = new Float32Array(FFT_SIZE)
    this.buffer = new Float32Array(BUFFER_SIZE)
    this.window = this.calculateWindow()
    this.fftLastPhase = new Float32Array(BUFFER_SIZE)
    this.tones = []
    
    this.sampleRate = 44100
    this.bufferPos = 0
    this.lastPitch = 0
  }

  calculateWindow() {
    const window = new Float32Array(FFT_SIZE)
    for (let i = 0; i < FFT_SIZE; i++) {
      // Hamming window
      window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1))
    }
    return window
  }

  async start(callback) {
    if (this.isListening) return
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = FFT_SIZE
      source.connect(this.analyser)
      
      this.onPitch = callback
      this.isListening = true
      this.detectPitch()
    } catch (error) {
      console.error('Error accessing microphone:', error)
      throw error
    }
  }

  stop() {
    if (!this.isListening) return
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
    }
    if (this.audioContext) {
      this.audioContext.close()
    }
    
    this.isListening = false
    this.onPitch = null
    this.tones = []
    this.lastPitch = 0
  }

  detectPitch() {
    if (!this.isListening) return

    // Get time-domain data
    this.analyser.getFloatTimeDomainData(this.data)
    
    // Apply window function
    for (let i = 0; i < FFT_SIZE; i++) {
      this.buffer[i] = this.data[i] * this.window[i]
    }
    
    // Perform FFT
    const fft = new Float32Array(FFT_SIZE)
    this.performFFT(this.buffer, fft)
    
    // Find peaks in frequency domain
    const peaks = this.findPeaks(fft)
    
    // Analyze tones
    this.analyzeTones(peaks)
    
    // Find most prominent tone
    const tone = this.findBestTone()
    
    if (tone && tone.isStable() && tone.db > MIN_LEVEL) {
      const note = this.getClosestNote(tone.freq)
      if (note && this.onPitch) {
        this.onPitch(note)
      }
      this.lastPitch = tone.freq
    }
    
    requestAnimationFrame(() => this.detectPitch())
  }

  performFFT(input, output) {
    // Simple FFT implementation using Web Audio API's analyser
    this.analyser.getFloatFrequencyData(output)
    
    // Convert to magnitude
    for (let i = 0; i < output.length; i++) {
      output[i] = Math.pow(10, output[i] / 20) // Convert from dB to magnitude
    }
  }

  findPeaks(fft) {
    const peaks = []
    const minFreqBin = Math.floor(MIN_FREQ * FFT_SIZE / this.sampleRate)
    const maxFreqBin = Math.ceil(MAX_FREQ * FFT_SIZE / this.sampleRate)
    
    for (let i = minFreqBin; i < maxFreqBin - 1; i++) {
      if (fft[i] > fft[i-1] && fft[i] > fft[i+1]) {
        const freq = i * this.sampleRate / FFT_SIZE
        const db = 20 * Math.log10(fft[i])
        if (db > MIN_LEVEL) {
          peaks.push(new Peak(freq, db))
        }
      }
    }
    
    return peaks
  }

  analyzeTones(peaks) {
    const newTones = []
    
    // Find fundamental frequencies
    for (const peak of peaks) {
      let isHarmonic = false
      for (const tone of newTones) {
        const harmonic = Math.round(peak.freq / tone.freq)
        if (harmonic > 1 && harmonic <= 12 && Math.abs(peak.freq / tone.freq - harmonic) < 0.05) {
          tone.harmonics[harmonic - 1] = peak.db
          isHarmonic = true
          break
        }
      }
      
      if (!isHarmonic) {
        newTones.push(new Tone(peak.freq, peak.db))
      }
    }
    
    // Update existing tones
    this.tones = this.mergeWithOldTones(newTones)
  }

  mergeWithOldTones(newTones) {
    const merged = []
    
    // Match new tones with old ones
    for (const newTone of newTones) {
      let foundMatch = false
      for (const oldTone of this.tones) {
        if (oldTone.matches(newTone.freq)) {
          oldTone.freq = newTone.freq
          oldTone.db = newTone.db
          oldTone.stableDb = (oldTone.stableDb * oldTone.age + newTone.db) / (oldTone.age + 1)
          oldTone.age++
          merged.push(oldTone)
          foundMatch = true
          break
        }
      }
      if (!foundMatch) {
        merged.push(newTone)
      }
    }
    
    return merged
  }

  findBestTone() {
    let best = null
    let bestScore = -Infinity
    
    for (const tone of this.tones) {
      if (tone.db < MIN_LEVEL) continue
      
      // Calculate score based on volume and stability
      let score = tone.db
      if (tone.isStable()) score += 10
      if (tone.freq === this.lastPitch) score += 5
      
      // Prefer frequencies closer to last pitch
      if (this.lastPitch > 0) {
        const ratio = tone.freq / this.lastPitch
        if (ratio > 0.5 && ratio < 2.0) {
          score += 5 * (1.0 - Math.abs(Math.log2(ratio)))
        }
      }
      
      if (score > bestScore) {
        bestScore = score
        best = tone
      }
    }
    
    return best
  }

  getClosestNote(freq) {
    let minDiff = Infinity
    let closestNote = null
    
    for (const [note, noteFreq] of Object.entries(NOTE_FREQUENCIES)) {
      const diff = Math.abs(Math.log2(freq / noteFreq))
      if (diff < minDiff) {
        minDiff = diff
        closestNote = note
      }
    }
    
    // Only return note if it's within 50 cents (half semitone)
    return minDiff < 0.5 ? closestNote : null
  }
}
