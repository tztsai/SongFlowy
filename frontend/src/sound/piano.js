import * as Tone from 'tone'

class Piano {
  constructor() {
    // Make the samples loaded based on the screen size
    if (screen.availWidth < 750 && screen.availHeight < 750) {
      this._range = [48, 72] // 2 octaves for small screens
    } else if (screen.availWidth < 1000 && screen.availHeight < 1000) {
      this._range = [36, 84] // 4 octaves for medium screens
    } else {
      this._range = [21, 108] // Full range for large screens
    }

    // Create a Tone.js sampler with our piano samples
    this._sampler = new Tone.Sampler({
      urls: {
        "A0": "A0.mp3",
        "C1": "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        "A1": "A1.mp3",
        "C2": "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        "A2": "A2.mp3",
        "C3": "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        "A3": "A3.mp3",
        "C4": "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        "A4": "A4.mp3",
        "C5": "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        "A5": "A5.mp3",
        "C6": "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        "A6": "A6.mp3",
        "C7": "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        "A7": "A7.mp3",
        "C8": "C8.mp3"
      },
      baseUrl: "/audio/Salamander/",
      onload: () => {
        console.log("Piano samples loaded!")
      }
    }).toDestination()

    // Set initial volume
    this._sampler.volume.value = -6
  }

  async keyDown(note, time = Tone.now()) {
    if (note >= this._range[0] && note <= this._range[1]) {
      const freq = Tone.Frequency(note, "midi")
      this._sampler.triggerAttack(freq, time)
    }
  }

  keyUp(note, time = Tone.now()) {
    if (note >= this._range[0] && note <= this._range[1]) {
      const freq = Tone.Frequency(note, "midi")
      this._sampler.triggerRelease(freq, time + 0.5)
    }
  }

  set volume(vol) {
    if (this._sampler) {
      this._sampler.volume.value = vol
    }
  }
}

export { Piano }