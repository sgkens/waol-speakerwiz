// ─────────────────────────────────────────────────────────────────
// @waol-speakerwiz/core  —  index.ts (public barrel)
// ─────────────────────────────────────────────────────────────────

// Types
export type {
  DriverKey, DriverGains, BeatHit,
  SpringDriverConfig, SpringConfig, SpringDriverState, SpringState,
  StepHit, BeatPattern, StepEvent, BeatEvent, BuiltInPattern,
  BandEnergy, AnalyserOptions,
  BuiltInTheme, WaolSpeakerWizTheme,
  SpeakerOptions,
  WaolSpeakerWizOptions, RenderState,
  WaolSpeakerWizEventMap, WaolSpeakerWizEventHandler,
} from './types'

// Physics
export { SpringEngine, DEFAULT_SPRING_CONFIG } from './physics/SpringEngine'
export { BeatSequencer, PATTERNS }             from './physics/BeatSequencer'

// Audio
export { AudioAnalyser } from './audio/AudioAnalyser'

// Renderers
export { SpeakerRenderer } from './renderers/SpeakerRenderer'
export { GlowRenderer }    from './renderers/GlowRenderer'

// Orchestrator
export { WaolSpeakerWiz } from './WaolSpeakerWiz'

// Themes
export { THEMES, resolveTheme } from './themes'
