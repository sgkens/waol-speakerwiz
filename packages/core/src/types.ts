// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  types.ts
// All public types, interfaces, and enums for speakerwiz
// ─────────────────────────────────────────────────────────────────

// ── Drivers ────────────────────────────────────────────────────────

export type DriverKey = 'sub' | 'mid' | 'hi'

export interface DriverGains {
  sub: number  // 0–1
  mid: number  // 0–1
  hi:  number  // 0–1
}

export interface BeatHit {
  sub?: number  // 0–1 impulse amplitude
  mid?: number
  hi?:  number
}

// ── Physics ────────────────────────────────────────────────────────

export interface SpringDriverConfig {
  /** Spring stiffness — higher = faster return */
  k: number
  /** Damping ratio — 0 = no damping, 1 = critically damped */
  damp: number
  /** Effective mass (default 1.0) */
  mass?: number
}

export interface SpringConfig {
  sub: SpringDriverConfig
  mid: SpringDriverConfig
  hi:  SpringDriverConfig
  /** Physics sub-steps per frame for stability */
  subSteps?: number
}

export interface SpringDriverState {
  pos: number  // current displacement  -1 to 1
  vel: number  // current velocity
}

export interface SpringState {
  sub: SpringDriverState
  mid: SpringDriverState
  hi:  SpringDriverState
  energy: DriverGains  // smoothed energy per driver
}

// ── Sequencer ──────────────────────────────────────────────────────

export interface StepHit {
  s?: number  // sub  0–1
  m?: number  // mid  0–1
  h?: number  // hi   0–1
}

export interface BeatPattern {
  name?: string
  steps: StepHit[]          // 16 or 32 steps
  subdivision?: 4 | 8 | 16 | 32
}

export interface StepEvent {
  index:   number
  hit:     StepHit
  timeMs:  number
}

export interface BeatEvent {
  bar:     number
  beat:    number
  timeMs:  number
}

export type BuiltInPattern =
  | 'hiphop' | 'house' | 'dnb' | 'trap'
  | 'techno' | 'jazz'  | 'reggaeton' | 'breakbeat'

// ── Audio ──────────────────────────────────────────────────────────

export interface BandEnergy {
  sub:  number  // 20–80 Hz
  low:  number  // 80–300 Hz
  mid:  number  // 300–2000 Hz
  high: number  // 2000–8000 Hz
  air:  number  // 8000–20000 Hz
}

export interface AnalyserOptions {
  fftSize?:          256 | 512 | 1024 | 2048 | 4096 | 8192
  smoothingTimeConstant?: number  // 0–1
  minDecibels?:      number
  maxDecibels?:      number
}

// ── Theming ────────────────────────────────────────────────────────

export type BuiltInTheme = 'neon-dark' | 'amber-studio' | 'monochrome' | 'vapor'

export interface SpeakerWizTheme {
  background:      string
  cabinet:         string
  cabinetEdge:     string
  cabinetScrews:   string
  basket:          string
  surround:        string
  speakerwiz:            string       // primary speakerwiz fill color
  speakerwizRings:       string       // concentric ring stroke
  speakerwizGlow:        string       // neon glow color
  dustCap:         string
  bloom:           string       // canvas glow color
  bloomIntensity:  number       // 0–1
  waveform:        string
  waveformGlow:    string
  waveformFill:    string
  eq:              string[]     // per-band or gradient stops
  eqGlow:          string
  floorGlow:       string
}

// ── Renderer Options ───────────────────────────────────────────────

export interface SpeakerOptions {
  /** 1 = single sub only, 3 = full 3-way stack */
  drivers?:        1 | 3
  subRadius?:      number
  speakerwizRings?:      number
  showScrews?:     boolean
  showPort?:       boolean
  showTweeters?:   boolean
}

export type WaveformMode = 'oscilloscope' | 'mirror' | 'filled'

export interface WaveformOptions {
  mode?:           WaveformMode
  lineWidth?:      number
  height?:         number
  mirror?:         boolean
  filled?:         boolean
}

export type EQMode = 'bars' | 'curve' | 'filled-curve'

export interface EQOptions {
  mode?:           EQMode
  bands?:          number     // 10, 20, 32
  height?:         number
  showLabels?:     boolean
  showGrid?:       boolean
  peakHold?:       boolean
  peakDecay?:      number     // px per frame
  barGap?:         number
  barRadius?:      number
}

export type SpectrogramMode = 'waterfall' | 'heatmap'

export interface SpectrogramOptions {
  mode?:           SpectrogramMode
  height?:         number
  speed?:          number     // pixels per frame
  colorScale?:     string[]   // gradient stops
}

export interface ParticleOptions {
  count?:          number
  size?:           [number, number] // min, max
  speed?:          number
  colorScale?:     string[]
  gravity?:        number
  interaction?:    'volume' | 'frequency' | 'beat'
}

export interface Geometric3DOptions {
  type?:           'cube' | 'sphere' | 'torus' | 'tunnel'
  wireframe?:      boolean
  rotationSpeed?:  number
  sensitivity?:    number
}

export interface RadialOptions {
  mode?:           'bars' | 'rings' | 'wave'
  radius?:         number
  innerRadius?:    number
  lineWidth?:      number
  gap?:            number
}

// ── Main Viz Options ───────────────────────────────────────────────

export interface SpeakerWizOptions {
  width?:          number
  height?:         number
  theme?:          SpeakerWizTheme | BuiltInTheme
  speaker?:        SpeakerOptions | false
  waveform?:       WaveformOptions | false
  eq?:             EQOptions | false
  spectrogram?:    SpectrogramOptions | false
  particles?:      ParticleOptions | false
  geometric3d?:    Geometric3DOptions | false
  radial?:         RadialOptions | false
  physics?:        Partial<SpringConfig>
  gains?:          Partial<DriverGains>
  bpm?:            number
  pattern?:        BeatPattern | BuiltInPattern
  autoPlay?:       boolean
  /** Pixels per logical unit (for HiDPI / retina) */
  devicePixelRatio?: number
}

// ── Events ─────────────────────────────────────────────────────────

export type SpeakerWizEventMap = {
  beat:    BeatEvent
  step:    StepEvent
  play:    void
  pause:   void
  stop:    void
  resize:  { width: number; height: number }
  destroy: void
}

export type SpeakerWizEventHandler<K extends keyof SpeakerWizEventMap> =
  (payload: SpeakerWizEventMap[K]) => void

// ── Render State ───────────────────────────────────────────────────

/** Passed to every renderer each frame */
export interface RenderState {
  spring:    SpringState
  gains:     DriverGains
  waveform?: Float32Array
  frequency?: Uint8Array
  bands?:    BandEnergy
  timestamp: number
  deltaTime: number
}
