// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  physics/BeatSequencer.ts
// BPM-locked 16/32-step sequencer with typed event emitter
// ─────────────────────────────────────────────────────────────────

import type { BeatPattern, StepHit, StepEvent, BeatEvent, BuiltInPattern } from '../types'

// ── Built-in Patterns ──────────────────────────────────────────────

export const PATTERNS: Record<BuiltInPattern, BeatPattern> = {
  hiphop: {
    name: 'Hip Hop',
    steps: [
      {s:1.0,m:0,h:0},   {s:0,m:0,h:0.4},   {s:0,m:0,h:0.3},   {s:0,m:0,h:0.2},
      {s:0,m:1.0,h:0},   {s:0,m:0,h:0.3},   {s:0,m:0,h:0.4},   {s:0.3,m:0,h:0.2},
      {s:0.8,m:0,h:0},   {s:0,m:0,h:0.3},   {s:0,m:0,h:0.35},  {s:0,m:0,h:0.2},
      {s:0,m:1.0,h:0},   {s:0.4,m:0,h:0.4}, {s:0,m:0,h:0.3},   {s:0,m:0,h:0.5},
    ],
  },
  house: {
    name: 'House',
    steps: [
      {s:1.0,m:0,h:0.8}, {s:0,m:0,h:0.3},   {s:0,m:1.0,h:0.3}, {s:0,m:0,h:0.3},
      {s:1.0,m:0,h:0.8}, {s:0,m:0,h:0.3},   {s:0,m:1.0,h:0.3}, {s:0,m:0,h:0.3},
      {s:1.0,m:0,h:0.8}, {s:0,m:0,h:0.3},   {s:0,m:1.0,h:0.3}, {s:0,m:0,h:0.3},
      {s:1.0,m:0,h:0.8}, {s:0,m:0,h:0.3},   {s:0,m:1.0,h:0.3}, {s:0,m:0,h:0.3},
    ],
  },
  dnb: {
    name: 'Drum & Bass',
    steps: [
      {s:1.0,m:0,h:0.6}, {s:0,m:0,h:0.4},   {s:0,m:0,h:0.5},   {s:0,m:0,h:0.3},
      {s:0,m:0,h:0.5},   {s:0,m:0.9,h:0.3}, {s:0,m:0,h:0.6},   {s:0,m:0,h:0.4},
      {s:0.7,m:0,h:0.6}, {s:0,m:0,h:0.4},   {s:0,m:0,h:0.5},   {s:0,m:0,h:0.3},
      {s:0,m:0.8,h:0.5}, {s:0,m:0,h:0.7},   {s:0.5,m:0,h:0.6}, {s:0,m:0,h:0.4},
    ],
  },
  trap: {
    name: 'Trap',
    steps: [
      {s:1.0,m:0,h:0},   {s:0,m:0,h:0},     {s:0,m:0,h:0.9},   {s:0,m:0,h:0.9},
      {s:0,m:0.9,h:0},   {s:0,m:0,h:0.9},   {s:0,m:0,h:0.9},   {s:0.4,m:0,h:0},
      {s:0.8,m:0,h:0},   {s:0,m:0,h:0.9},   {s:0,m:0,h:0.9},   {s:0,m:0,h:0},
      {s:0,m:0.9,h:0},   {s:0,m:0,h:0.9},   {s:0.6,m:0,h:0.9}, {s:0,m:0,h:0.9},
    ],
  },
  techno: {
    name: 'Techno',
    steps: [
      {s:1.0,m:0,h:0.7}, {s:0,m:0,h:0.5},   {s:0,m:1.0,h:0.7}, {s:0,m:0,h:0.5},
      {s:1.0,m:0,h:0.7}, {s:0,m:0,h:0.5},   {s:0,m:1.0,h:0.7}, {s:0,m:0,h:0.5},
      {s:1.0,m:0,h:0.7}, {s:0,m:0,h:0.5},   {s:0,m:1.0,h:0.7}, {s:0,m:0,h:0.5},
      {s:1.0,m:0,h:0.7}, {s:0.5,m:0,h:0.5}, {s:0,m:1.0,h:0.7}, {s:0.5,m:0,h:0.8},
    ],
  },
  jazz: {
    name: 'Jazz',
    steps: [
      {s:0.7,m:0,h:0.3}, {s:0,m:0,h:0.2},   {s:0,m:0.6,h:0.5}, {s:0,m:0,h:0.3},
      {s:0.3,m:0,h:0.4}, {s:0,m:0,h:0.2},   {s:0,m:0.5,h:0.6}, {s:0.2,m:0,h:0.3},
      {s:0.6,m:0,h:0.3}, {s:0,m:0,h:0.4},   {s:0,m:0.7,h:0.5}, {s:0,m:0,h:0.2},
      {s:0.3,m:0,h:0.6}, {s:0.2,m:0,h:0.3}, {s:0,m:0.5,h:0.5}, {s:0.4,m:0,h:0.4},
    ],
  },
  reggaeton: {
    name: 'Reggaeton',
    steps: [
      {s:1.0,m:0,h:0.4}, {s:0,m:0,h:0.3},   {s:0,m:0,h:0.5},   {s:0.3,m:0,h:0.3},
      {s:0,m:0.8,h:0.4}, {s:0,m:0,h:0.3},   {s:0.5,m:0,h:0.5}, {s:0,m:0,h:0.3},
      {s:0.9,m:0,h:0.4}, {s:0,m:0,h:0.3},   {s:0,m:0,h:0.5},   {s:0.3,m:0,h:0.3},
      {s:0,m:0.8,h:0.4}, {s:0.4,m:0,h:0.3}, {s:0.5,m:0,h:0.5}, {s:0,m:0,h:0.6},
    ],
  },
  breakbeat: {
    name: 'Breakbeat',
    steps: [
      {s:1.0,m:0,h:0.5}, {s:0,m:0,h:0.3},   {s:0,m:0.7,h:0.4}, {s:0.3,m:0,h:0.3},
      {s:0,m:0,h:0.5},   {s:0.4,m:0,h:0.3}, {s:0,m:0.8,h:0.5}, {s:0,m:0,h:0.3},
      {s:0.7,m:0,h:0.5}, {s:0,m:0,h:0.3},   {s:0.5,m:0,h:0.4}, {s:0,m:0.6,h:0.3},
      {s:0,m:0,h:0.5},   {s:0,m:0,h:0.7},   {s:0.8,m:0,h:0.4}, {s:0,m:0,h:0.3},
    ],
  },
}

// ── Event emitter ──────────────────────────────────────────────────

type SequencerEvents = {
  step:  StepEvent
  beat:  BeatEvent
  play:  void
  pause: void
  stop:  void
}

type Handler<T> = T extends void ? () => void : (payload: T) => void

// ── BeatSequencer ──────────────────────────────────────────────────

export class BeatSequencer {
  private pattern:      BeatPattern
  private _bpm:         number
  private _playing:     boolean = false
  private stepIdx:      number  = 0
  private lastStepTime: number  = 0
  private barCount:     number  = 0
  private beatCount:    number  = 0
  private handlers:     Map<string, Set<Function>> = new Map()

  constructor(pattern: BeatPattern | BuiltInPattern = 'hiphop', bpm = 128) {
    this.pattern = typeof pattern === 'string' ? PATTERNS[pattern] : pattern
    this._bpm    = bpm
  }

  // ── Playback ─────────────────────────────────────────────────────

  play(): void {
    if (this._playing) return
    this._playing     = true
    this.lastStepTime = performance.now()
    this.emit('play', undefined as void)
  }

  pause(): void {
    if (!this._playing) return
    this._playing = false
    this.emit('pause', undefined as void)
  }

  stop(): void {
    this._playing = false
    this.stepIdx  = 0
    this.barCount = 0
    this.beatCount = 0
    this.emit('stop', undefined as void)
  }

  /**
   * Call this every frame with current timestamp (ms).
   * Returns the StepHit if a step fired this frame, null otherwise.
   */
  tick(now: number): StepHit | null {
    if (!this._playing) return null

    const stepMs = this.stepDurationMs
    if (now - this.lastStepTime < stepMs) return null

    const hit     = this.pattern.steps[this.stepIdx]
    const stepEvt: StepEvent = { index: this.stepIdx, hit, timeMs: now }
    this.emit('step', stepEvt)

    // Beat / bar tracking (16th-note grid, 4 steps = 1 beat, 16 steps = 1 bar)
    if (this.stepIdx % 4 === 0) {
      const beatEvt: BeatEvent = {
        bar:    this.barCount,
        beat:   this.beatCount % 4,
        timeMs: now,
      }
      this.emit('beat', beatEvt)
      this.beatCount++
      if (this.beatCount % 4 === 0) this.barCount++
    }

    this.stepIdx      = (this.stepIdx + 1) % this.pattern.steps.length
    this.lastStepTime = now

    return hit
  }

  // ── Configuration ─────────────────────────────────────────────────

  loadPattern(pattern: BeatPattern | BuiltInPattern): void {
    this.pattern  = typeof pattern === 'string' ? PATTERNS[pattern] : pattern
    this.stepIdx  = 0
    this.barCount = 0
  }

  setBPM(bpm: number): void {
    this._bpm = Math.max(20, Math.min(300, bpm))
  }

  get bpm():     number  { return this._bpm }
  get playing(): boolean { return this._playing }
  get currentStep(): number { return this.stepIdx }

  get stepDurationMs(): number {
    // 16th note duration in ms
    return (60 / this._bpm) * 1000 / 4
  }

  // ── Events ───────────────────────────────────────────────────────

  on<K extends keyof SequencerEvents>(event: K, handler: Handler<SequencerEvents[K]>): this {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    return this
  }

  off<K extends keyof SequencerEvents>(event: K, handler: Handler<SequencerEvents[K]>): this {
    this.handlers.get(event)?.delete(handler)
    return this
  }

  private emit<K extends keyof SequencerEvents>(event: K, payload: SequencerEvents[K]): void {
    this.handlers.get(event)?.forEach(h => (h as Function)(payload))
  }
}
