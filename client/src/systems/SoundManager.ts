export class SoundManager {
  private static instance: SoundManager
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private bgmSource: AudioBufferSourceNode | null = null
  private bgmGain: GainNode | null = null
  private enabled: boolean = true
  private bufferCache: Map<string, AudioBuffer> = new Map()

  private constructor() {}

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.4
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setEnabled(v: boolean) {
    this.enabled = v
    if (!v) this.stopBGM()
  }

  // --- Utility: generate noise buffer ---
  private generateNoiseBuffer(duration: number): AudioBuffer {
    const key = `noise_${duration}`
    if (this.bufferCache.has(key)) return this.bufferCache.get(key)!
    const sampleRate = this.ctx!.sampleRate
    const length = sampleRate * duration
    const buffer = this.ctx!.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    this.bufferCache.set(key, buffer)
    return buffer
  }

  // --- Utility: play a tone ---
  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3, startTime?: number) {
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = startTime ?? this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(t)
    osc.stop(t + duration)
  }

  // --- Utility: play noise burst ---
  private playNoise(duration: number, volume: number = 0.2, startTime?: number) {
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = startTime ?? this.ctx.currentTime
    const buffer = this.generateNoiseBuffer(duration)
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    source.start(t)
    source.stop(t + duration)
  }

  // ===== SOUND EFFECTS =====

  playThrow() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const noise = this.generateNoiseBuffer(0.15)
    const source = this.ctx.createBufferSource()
    source.buffer = noise
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.15, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(500, t)
    filter.frequency.exponentialRampToValueAtTime(1500, t + 0.15)
    filter.Q.value = 2
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    source.start(t)
    source.stop(t + 0.15)
  }

  playHit() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.playNoise(0.08, 0.25, t)
    this.playTone(120, 0.08, 'sine', 0.2, t)
  }

  playCritical() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.playNoise(0.12, 0.3, t)
    this.playTone(880, 0.15, 'sine', 0.25, t)
    this.playTone(1320, 0.12, 'sine', 0.2, t + 0.05)
  }

  playCombo(level: number) {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const baseFreq = 523 + level * 80
    this.playTone(baseFreq, 0.15, 'sine', 0.2, t)
    this.playTone(baseFreq * 1.25, 0.2, 'sine', 0.25, t + 0.12)
    this.playTone(baseFreq * 1.5, 0.3, 'sine', 0.3, t + 0.24)
  }

  playDeath() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(400, t)
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.5)
    gain.gain.setValueAtTime(0.2, t)
    gain.gain.linearRampToValueAtTime(0.1, t + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(t)
    osc.stop(t + 0.6)
  }

  playEmoji() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.playTone(1200, 0.06, 'sine', 0.1, t)
    this.playTone(900, 0.04, 'sine', 0.08, t + 0.03)
  }

  playTaunt() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.playTone(400, 0.1, 'square', 0.08, t)
    this.playTone(500, 0.1, 'square', 0.08, t + 0.1)
    this.playTone(600, 0.15, 'square', 0.1, t + 0.2)
  }

  playTurnStart() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.playTone(660, 0.1, 'sine', 0.15, t)
    this.playTone(880, 0.15, 'sine', 0.2, t + 0.08)
  }

  playTimeout() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    for (let i = 0; i < 3; i++) {
      this.playTone(440, 0.1, 'square', 0.12, t + i * 0.15)
    }
  }

  playExplosion() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.playNoise(0.35, 0.35, t)
    this.playTone(60, 0.3, 'sine', 0.25, t)
    this.playTone(40, 0.4, 'sine', 0.15, t + 0.05)
  }

  playClick() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.playTone(800, 0.03, 'sine', 0.08, t)
  }

  playJump() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(200, t)
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.12)
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(t)
    osc.stop(t + 0.15)
  }

  playWin() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.25, 'sine', 0.2, t + i * 0.15)
    })
  }

  playLose() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const notes = [392, 349, 330, 262]
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.3, 'sine', 0.15, t + i * 0.2)
    })
  }

  playWindChange() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const noise = this.generateNoiseBuffer(0.3)
    const source = this.ctx.createBufferSource()
    source.buffer = noise
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.06, t)
    gain.gain.linearRampToValueAtTime(0.02, t + 0.3)
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(300, t)
    filter.frequency.linearRampToValueAtTime(800, t + 0.3)
    filter.Q.value = 1
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)
    source.start(t)
    source.stop(t + 0.3)
  }

  // ===== BGM =====

  startBGM() {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return
    if (this.bgmSource) return

    this.bgmGain = this.ctx.createGain()
    this.bgmGain.gain.value = 0.06
    this.bgmGain.connect(this.masterGain)

    const playNote = (freq: number, start: number, dur: number) => {
      const osc = this.ctx!.createOscillator()
      const g = this.ctx!.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(1, start + 0.05)
      g.gain.setValueAtTime(1, start + dur - 0.05)
      g.gain.linearRampToValueAtTime(0, start + dur)
      osc.connect(g)
      g.connect(this.bgmGain!)
      osc.start(start)
      osc.stop(start + dur)
    }

    const melody = [
      262, 294, 330, 349, 392, 349, 330, 294,
      262, 330, 392, 523, 392, 330, 294, 262,
      349, 392, 440, 523, 440, 392, 349, 330,
      262, 294, 330, 349, 330, 294, 262, 262
    ]
    const noteLength = 0.5
    const loopDuration = melody.length * noteLength

    const scheduleLoop = (offset: number) => {
      melody.forEach((freq, i) => {
        playNote(freq, offset + i * noteLength, noteLength * 0.8)
      })
      // Bass drone
      const bassOsc = this.ctx!.createOscillator()
      const bassG = this.ctx!.createGain()
      bassOsc.type = 'sine'
      bassOsc.frequency.value = 65
      bassG.gain.setValueAtTime(0.08, offset)
      bassG.gain.linearRampToValueAtTime(0.02, offset + loopDuration)
      bassOsc.connect(bassG)
      bassG.connect(this.bgmGain!)
      bassOsc.start(offset)
      bassOsc.stop(offset + loopDuration)
    }

    // Schedule first 3 loops
    for (let i = 0; i < 3; i++) {
      scheduleLoop(i * loopDuration)
    }

    // Re-schedule periodically
    const interval = setInterval(() => {
      if (!this.bgmGain) { clearInterval(interval); return }
      scheduleLoop(this.ctx!.currentTime)
    }, loopDuration * 1000)
  }

  stopBGM() {
    if (this.bgmGain) {
      this.bgmGain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.5)
      setTimeout(() => {
        this.bgmGain?.disconnect()
        this.bgmGain = null
      }, 600)
    }
  }
}
