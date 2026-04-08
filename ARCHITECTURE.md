# speakerwiz — Library Architecture

## Package Identity
- **Name:** `speakerwiz`
- **npm:** `@speakerwiz/core` + `@speakerwiz/react`
- **Tagline:** Physics-simulated audio visualization for the web
- **License:** MIT

---

## Module Structure

```
speakerwiz/
├── packages/
│   ├── core/                      # @speakerwiz/core — zero dependency
│   │   ├── src/
│   │   │   ├── index.ts           # Public API barrel
│   │   │   ├── physics/
│   │   │   │   ├── SpringEngine.ts      # Mass-spring-damper model
│   │   │   │   └── BeatSequencer.ts     # BPM-locked step sequencer
│   │   │   ├── renderers/
│   │   │   │   ├── SpeakerRenderer.ts   # SVG speaker (speakerwiz, basket, surround)
│   │   │   │   ├── WaveformRenderer.ts  # Canvas waveform (oscilloscope style)
│   │   │   │   ├── EQRenderer.ts        # Canvas EQ bars / curve
│   │   │   │   └── GlowRenderer.ts      # Canvas bloom / corona layer
│   │   │   ├── audio/
│   │   │   │   ├── AudioAnalyser.ts     # Web Audio API AnalyserNode wrapper
│   │   │   │   └── MediaBridge.ts       # HTMLMediaElement → analyser bridge
│   │   │   ├── components/
│   │   │   │   └── SpeakerWiz.ts           # Orchestrator — wires all modules
│   │   │   └── types.ts                 # All public types / interfaces
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── react/                     # @speakerwiz/react — React bindings
│       ├── src/
│       │   ├── index.ts
│       │   ├── SpeakerWiz.tsx        # Main component
│       │   ├── Waveform.tsx       # Standalone waveform component
│       │   ├── EQVisualizer.tsx   # Standalone EQ component
│       │   ├── SpeakerViz.tsx     # Standalone speaker component
│       │   └── hooks/
│       │       ├── useAudioAnalyser.ts   # Hook: Web Audio analyser
│       │       ├── useBeatSequencer.ts   # Hook: step sequencer
│       │       └── useSpeakerWizPhysics.ts     # Hook: spring physics state
│       ├── package.json
│       └── tsconfig.json
│
├── demo/                          # Vite demo app (your beat app reference)
├── docs/
├── package.json                   # Workspace root
└── README.md
```

---

## Core Public API  (@speakerwiz/core)

### SpeakerWiz — Main Orchestrator
```ts
const viz = new SpeakerWiz(container: HTMLElement, options: SpeakerWizOptions)

viz.mount()                          // Attach to DOM
viz.destroy()                        // Clean teardown
viz.trigger(hit: BeatHit)            // Manual beat trigger
viz.connectMedia(el: HTMLMediaElement) // Wire to audio element
viz.connectAnalyser(node: AnalyserNode) // Wire to Web Audio node
viz.setGains(gains: DriverGains)     // Sub / mid / hi gain
viz.setPattern(pattern: BeatPattern) // Load sequencer pattern
viz.play() / viz.pause() / viz.stop()
viz.setBPM(bpm: number)
viz.setTheme(theme: SpeakerWizTheme)       // Full visual theming
viz.on(event, handler)               // Event emitter
viz.off(event, handler)
```

### SpringEngine — Physics
```ts
const engine = new SpringEngine(config: SpringConfig)

engine.impulse(driver: DriverKey, force: number)
engine.step(dt: number): SpringState
engine.getState(): SpringState
engine.reset()
engine.configure(config: Partial<SpringConfig>)
```

### AudioAnalyser — Web Audio Bridge
```ts
const analyser = new AudioAnalyser(options: AnalyserOptions)

analyser.connectSource(source: AudioNode | HTMLMediaElement)
analyser.getWaveform(): Float32Array       // time domain
analyser.getFrequency(): Uint8Array        // frequency domain
analyser.getBands(): BandEnergy            // { sub, low, mid, high, air }
analyser.destroy()
```

### BeatSequencer — Step Sequencer
```ts
const seq = new BeatSequencer(options: SequencerOptions)

seq.loadPattern(pattern: BeatPattern)
seq.setBPM(bpm: number)
seq.play() / seq.pause() / seq.stop()
seq.on('step', (step: StepEvent) => void)
seq.on('beat', (beat: BeatEvent) => void)
seq.currentStep: number
```

### Renderers — Individual modules
```ts
// Each renderer is standalone + composable
const speaker  = new SpeakerRenderer(canvas: SVGElement, opts: SpeakerOptions)
const waveform = new WaveformRenderer(canvas: HTMLCanvasElement, opts: WaveformOptions)
const eq       = new EQRenderer(canvas: HTMLCanvasElement, opts: EQOptions)
const glow     = new GlowRenderer(canvas: HTMLCanvasElement, opts: GlowOptions)

// All renderers share same interface:
renderer.update(state: RenderState): void
renderer.resize(w: number, h: number): void
renderer.setTheme(theme: Partial<SpeakerWizTheme>): void
renderer.destroy(): void
```

---

## React API  (@speakerwiz/react)

### Components
```tsx
// All-in-one
<SpeakerWiz
  src="/track.mp3"              // or mediaRef={ref}
  pattern="hiphop"              // built-in or custom BeatPattern
  bpm={128}
  gains={{ sub: 0.8, mid: 0.7, hi: 0.6 }}
  theme="neon-dark"             // built-in or SpeakerWizTheme object
  showWaveform
  showEQ
  showSpeaker
  width={620}
  height={560}
  onBeat={(hit) => void}
  onStep={(step) => void}
/>

// Standalone pieces
<SpeakerViz gains={gains} physicsState={state} theme={theme} />
<Waveform    analyser={analyser} theme={theme} height={80} />
<EQVisualizer analyser={analyser} theme={theme} bands={10} mode="bars" />
```

### Hooks
```ts
// Web Audio analyser
const { analyser, waveform, frequency, bands } = useAudioAnalyser(source)

// Physics state — driven by analyser bands or manual trigger
const { state, trigger, setGains } = useSpeakerWizPhysics(options)

// Step sequencer
const { play, pause, stop, currentStep, setBPM } = useBeatSequencer(pattern, bpm)
```

---

## Types

```ts
interface SpeakerWizOptions {
  width?: number
  height?: number
  theme?: SpeakerWizTheme | BuiltInTheme
  speaker?: SpeakerOptions
  waveform?: WaveformOptions
  eq?: EQOptions
  physics?: SpringConfig
  sequencer?: SequencerOptions
  autoPlay?: boolean
}

interface SpeakerWizTheme {
  background: string
  cabinet: string
  cabinetEdge: string
  speakerwiz: string                   // primary speakerwiz color
  speakerwizGlow: string               // neon glow color
  surround: string
  basket: string
  screws: string
  waveform: string
  waveformGlow: string
  eq: string[]                   // array of band colors
  eqGlow: string
  bloom: string
  bloomIntensity: number
}

type BuiltInTheme = 'neon-dark' | 'amber-studio' | 'monochrome' | 'vapor'

interface SpringConfig {
  sub:  { k: number; damp: number; mass?: number }
  mid:  { k: number; damp: number; mass?: number }
  hi:   { k: number; damp: number; mass?: number }
  subSteps?: number
}

interface DriverGains {
  sub: number   // 0–1
  mid: number   // 0–1
  hi:  number   // 0–1
}

interface BeatHit {
  sub?: number  // 0–1 impulse
  mid?: number
  hi?:  number
}

interface BeatPattern {
  steps: StepHit[]        // length 16 or 32
  subdivision?: 4 | 8 | 16 | 32
}

interface BandEnergy {
  sub:  number  // 20–80Hz
  low:  number  // 80–300Hz
  mid:  number  // 300–2kHz
  high: number  // 2k–8kHz
  air:  number  // 8k–20kHz
}

interface SpeakerOptions {
  drivers?: 1 | 3             // single sub or 3-way stack
  subRadius?: number
  speakerwizRings?: number
  showScrews?: boolean
  showPort?: boolean
}

interface WaveformOptions {
  mode?: 'oscilloscope' | 'mirror' | 'filled'
  lineWidth?: number
  height?: number
}

interface EQOptions {
  mode?: 'bars' | 'curve' | 'filled-curve'
  bands?: number              // 10, 20, 32
  height?: number
  showLabels?: boolean
  showGrid?: boolean
  peakHold?: boolean
}
```

---

## Built-in Themes

| Name           | SpeakerWiz Color    | Glow        | Cabinet     | Use case             |
|----------------|---------------|-------------|-------------|----------------------|
| `neon-dark`    | cyan #00d4ff  | cyan bloom  | dark teal   | Beat apps, DJ tools  |
| `amber-studio` | amber #ff8800 | amber glow  | dark slate  | Recording / DAW      |
| `monochrome`   | white #e8e8e8 | white bloom | near-black  | Minimal / clean UI   |
| `vapor`        | magenta+cyan  | pink glow   | dark purple | Synthwave / retro    |

---

## Built-in Patterns

```ts
import { PATTERNS } from '@speakerwiz/core'
// hiphop | house | dnb | trap | techno | jazz | reggaeton | breakbeat
```

---

## Media Player QoL (MediaBridge)

The `MediaBridge` class means zero Web Audio boilerplate for media player use:

```ts
// Attach to any <audio> or <video> element
const bridge = new MediaBridge(audioElement)
const viz    = new SpeakerWiz(container, { theme: 'neon-dark', showWaveform: true, showEQ: true })
viz.connectMedia(audioElement)
// Done — viz reacts to real audio automatically
```

React equivalent:
```tsx
const audioRef = useRef<HTMLAudioElement>(null)
<audio ref={audioRef} src="/track.mp3" />
<SpeakerWiz mediaRef={audioRef} showWaveform showEQ showSpeaker />
```

---

## Roadmap / Phases

### Phase 1 — Core extraction (now)
- [ ] SpringEngine.ts
- [ ] BeatSequencer.ts  
- [ ] SpeakerRenderer.ts (SVG)
- [ ] GlowRenderer.ts (Canvas)
- [ ] SpeakerWiz orchestrator
- [ ] types.ts
- [ ] Built-in themes: neon-dark, amber-studio

### Phase 2 — Audio reactive
- [ ] AudioAnalyser.ts
- [ ] MediaBridge.ts
- [ ] WaveformRenderer.ts
- [ ] EQRenderer.ts
- [ ] Band → physics mapping

### Phase 3 — React package
- [ ] @speakerwiz/react components
- [ ] useAudioAnalyser, useSpeakerWizPhysics, useBeatSequencer hooks
- [ ] Full TSX types

### Phase 4 — Polish + release
- [ ] Vite demo app
- [ ] Storybook / docs site
- [ ] npm publish workflow
- [ ] README + API docs
- [ ] Additional themes: vapor, monochrome
