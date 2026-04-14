// ─────────────────────────────────────────────────────────────────
// @waol-speakerwiz/core  —  audio/AudioAnalyser.ts
// Web Audio API AnalyserNode wrapper with band energy extraction
// and MediaElement bridge support
// ─────────────────────────────────────────────────────────────────

import type { BandEnergy, AnalyserOptions, DriverGains } from '../types'

const DEFAULT_OPTS: Required<AnalyserOptions> = {
  fftSize:               2048,
  smoothingTimeConstant: 0.8,
  minDecibels:           -90,
  maxDecibels:           -10,
}

// Frequency band boundaries (Hz)
const BANDS = {
  sub:  [20,   80  ],
  low:  [80,   300 ],
  mid:  [300,  2000],
  high: [2000, 8000],
  air:  [8000, 20000],
} as const

export class AudioAnalyser {
  private context:  AudioContext  | null = null
  private analyser: AnalyserNode  | null = null
  private source:   AudioNode     | null = null
  private mediaSource: MediaElementAudioSourceNode | null = null

  private freqBuffer:   Uint8Array   = new Uint8Array(0)
  private waveBuffer:   Float32Array = new Float32Array(0)
  private windowBuffer: Float32Array = new Float32Array(0)
  private opts: Required<AnalyserOptions>

  // Smoothed band energy (exponential moving average)
  private smoothed: BandEnergy = { sub:0, low:0, mid:0, high:0, air:0 }
  private readonly smoothAlpha = 0.15  // how fast to track peaks

  constructor(opts: AnalyserOptions = {}) {
    this.opts = { ...DEFAULT_OPTS, ...opts }
  }

  // ── Connection ───────────────────────────────────────────────────

  /** Connect to an HTMLMediaElement (audio/video) */
  connectMedia(el: HTMLMediaElement): this {
    this.ensureContext()
    this.disconnectSource()

    this.mediaSource = this.context!.createMediaElementSource(el)
    this.mediaSource.connect(this.analyser!)
    this.analyser!.connect(this.context!.destination)
    this.source = this.mediaSource

    return this
  }

  /** Connect to an existing AudioNode (e.g. OscillatorNode, GainNode) */
  connectNode(node: AudioNode): this {
    this.ensureContext()
    this.disconnectSource()

    node.connect(this.analyser!)
    this.analyser!.connect(this.context!.destination)
    this.source = node

    return this
  }

  /** Resume AudioContext (required after user gesture) */
  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume()
    }
  }

  // ── Data accessors ────────────────────────────────────────────────

  /** Raw time-domain waveform data */
  getWaveform(): Float32Array {
    if (!this.analyser) return this.waveBuffer
    this.analyser.getFloatTimeDomainData(this.waveBuffer as any)
    return this.waveBuffer
  }

  /** Time-domain waveform with Hanning window applied */
  getWindowedWaveform(): Float32Array {
    const raw = this.getWaveform()
    const out = new Float32Array(raw.length)
    if (this.windowBuffer.length !== raw.length) return raw
    for (let i = 0; i < raw.length; i++) {
      out[i] = raw[i] * this.windowBuffer[i]
    }
    return out
  }

  /** Raw frequency-domain data (0–255) */
  getFrequency(): Uint8Array {
    if (!this.analyser) return this.freqBuffer
    this.analyser.getByteFrequencyData(this.freqBuffer as any)
    return this.freqBuffer
  }

  /**
   * Compute smoothed energy for each frequency band.
   * Call once per frame.
   */
  getBands(): BandEnergy {
    if (!this.analyser) return this.smoothed

    this.analyser.getByteFrequencyData(this.freqBuffer as any)

    const sampleRate = this.context!.sampleRate
    const binHz      = sampleRate / this.opts.fftSize
    const len        = this.freqBuffer.length

    const raw = {
      sub:  this.bandEnergy(BANDS.sub,  binHz, len),
      low:  this.bandEnergy(BANDS.low,  binHz, len),
      mid:  this.bandEnergy(BANDS.mid,  binHz, len),
      high: this.bandEnergy(BANDS.high, binHz, len),
      air:  this.bandEnergy(BANDS.air,  binHz, len),
    }

    // Exponential moving average smoothing
    const a = this.smoothAlpha
    const s = this.smoothed
    s.sub  = s.sub  + a * (raw.sub  - s.sub)
    s.low  = s.low  + a * (raw.low  - s.low)
    s.mid  = s.mid  + a * (raw.mid  - s.mid)
    s.high = s.high + a * (raw.high - s.high)
    s.air  = s.air  + a * (raw.air  - s.air)

    return { ...s }
  }

  /**
   * Map band energy to driver gains for SpringEngine.
   */
  toDriverImpulses(bands: BandEnergy, sensitivity = 1.0): Partial<DriverGains> {
    return {
      sub: Math.min(1, bands.sub  * sensitivity * 1.4),
      mid: Math.min(1, ((bands.low + bands.mid) / 2) * sensitivity * 1.2),
      hi:  Math.min(1, ((bands.high + bands.air) / 2) * sensitivity * 1.1),
    }
  }

  get isConnected(): boolean {
    return this.analyser !== null && this.source !== null
  }

  get sampleRate(): number {
    return this.context?.sampleRate ?? 44100
  }

  get fftSize(): number {
    return this.analyser?.fftSize ?? this.opts.fftSize
  }

  destroy(): void {
    this.disconnectSource()
    this.context?.close().catch(() => {})
    this.context  = null
    this.analyser = null
  }

  // ── Private ───────────────────────────────────────────────────────

  private ensureContext(): void {
    if (this.context) return

    this.context  = new AudioContext()
    this.analyser = this.context.createAnalyser()

    this.analyser.fftSize               = this.opts.fftSize
    this.analyser.smoothingTimeConstant = this.opts.smoothingTimeConstant
    this.analyser.minDecibels           = this.opts.minDecibels
    this.analyser.maxDecibels           = this.opts.maxDecibels

    const bufLen     = this.analyser.frequencyBinCount
    this.freqBuffer  = new Uint8Array(bufLen)
    this.waveBuffer  = new Float32Array(this.opts.fftSize)

    // Pre-calculate Hanning window
    this.windowBuffer = new Float32Array(this.opts.fftSize)
    for (let i = 0; i < this.opts.fftSize; i++) {
      this.windowBuffer[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.opts.fftSize - 1)))
    }
  }

  private disconnectSource(): void {
    try { this.source?.disconnect() } catch { /* ok */ }
    try { this.mediaSource?.disconnect() } catch { /* ok */ }
    this.source      = null
    this.mediaSource = null
  }

  /** Average energy (0–1) across a Hz range */
  private bandEnergy(
    [lo, hi]: readonly [number, number],
    binHz: number,
    len: number
  ): number {
    const startBin = Math.max(0,   Math.floor(lo / binHz))
    const endBin   = Math.min(len, Math.ceil(hi  / binHz))
    if (endBin <= startBin) return 0

    let sum = 0
    for (let i = startBin; i < endBin; i++) sum += this.freqBuffer[i]
    return sum / ((endBin - startBin) * 255)  // normalise 0–1
  }
}
