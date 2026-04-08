// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  index.ts  (public barrel)
// ─────────────────────────────────────────────────────────────────

// Types
export type {
  DriverKey, DriverGains, BeatHit,
  SpringDriverConfig, SpringConfig, SpringDriverState, SpringState,
  StepHit, BeatPattern, StepEvent, BeatEvent, BuiltInPattern,
  BandEnergy, AnalyserOptions,
  BuiltInTheme, SpeakerWizTheme,
  SpeakerOptions, WaveformOptions, WaveformMode, EQOptions, EQMode,
  SpectrogramOptions, SpectrogramMode, ParticleOptions, Geometric3DOptions, RadialOptions,
  SpeakerWizOptions, RenderState,
  SpeakerWizEventMap, SpeakerWizEventHandler,
} from './types'

// Physics
export { SpringEngine, DEFAULT_SPRING_CONFIG } from './physics/SpringEngine'
export { BeatSequencer, PATTERNS }             from './physics/BeatSequencer'

// Audio
export { AudioAnalyser } from './audio/AudioAnalyser'

// Renderers
export { SpeakerRenderer } from './renderers/SpeakerRenderer'
export { GlowRenderer }    from './renderers/GlowRenderer'
export { WaveformRenderer } from './renderers/WaveformRenderer'
export { EQRenderer }       from './renderers/EQRenderer'
export { SpectrogramRenderer } from './renderers/SpectrogramRenderer'
export { ParticleRenderer } from './renderers/ParticleRenderer'
export { Geometric3DRenderer } from './renderers/Geometric3DRenderer'
export { RadialRenderer } from './renderers/RadialRenderer'

// Orchestrator
export { SpeakerWiz } from './SpeakerWiz'

// Themes
export { THEMES, resolveTheme } from './themes'
