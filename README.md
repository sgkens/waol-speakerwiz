<div align="center">

<img src="https://img.shields.io/badge/speakerwiz-v0.1.0-00d4ff?style=for-the-badge&labelColor=060a0c&color=00d4ff" alt="version"/>

# 🔊 speakerwiz

**Physics-simulated audio visualization for the web.**

Speaker speakerwiz excursion · Waveform · EQ · Beat sequencer · Web Audio reactive

[![pipeline status](https://gitlab.com/YOUR_USERNAME/speakerwiz/badges/main/pipeline.svg?style=flat-square)](https://gitlab.com/YOUR_USERNAME/speakerwiz/-/pipelines)
[![coverage report](https://gitlab.com/YOUR_USERNAME/speakerwiz/badges/main/coverage.svg?style=flat-square)](https://gitlab.com/YOUR_USERNAME/speakerwiz/-/commits/main)
[![Latest Release](https://gitlab.com/YOUR_USERNAME/speakerwiz/-/badges/release.svg?style=flat-square)](https://gitlab.com/YOUR_USERNAME/speakerwiz/-/releases)
[![npm @speakerwiz/core](https://img.shields.io/npm/v/@speakerwiz/core?style=flat-square&label=%40speakerwiz%2Fcore&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/core)
[![npm @speakerwiz/react](https://img.shields.io/npm/v/@speakerwiz/react?style=flat-square&label=%40speakerwiz%2Freact&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/react)
[![License: MIT](https://img.shields.io/badge/license-MIT-00d4ff?style=flat-square&labelColor=060a0c)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-00d4ff?style=flat-square&labelColor=060a0c&logo=typescript&logoColor=00d4ff)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-00d4ff?style=flat-square&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-00d4ff?style=flat-square&labelColor=060a0c)](CONTRIBUTING.md)

</div>

---

## Overview

speakerwiz is a physics-first audio visualization library. Rather than mapping audio data directly to visual properties, it uses a **mass-spring-damper model** — the same physics that governs real speaker drivers — to simulate speakerwiz excursion, overshoot, and decay. The result is animation that feels physical and alive, not just reactive.

```
                    impulse (beat hit)
                          │
                          ▼
              ┌─────────────────────┐
              │    SpringEngine     │  ← mass · stiffness · damping
              │   sub · mid · hi   │
              └────────┬────────────┘
                       │  state.pos / state.energy
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   SpeakerRenderer  GlowRenderer  WaveformRenderer / EQRenderer
   (SVG excursion)  (canvas bloom)   (canvas audio data)
```

---

## Packages

| Package | Version | Size (gzip) | Description |
|---|---|---|---|
| [`@speakerwiz/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@speakerwiz/core?style=flat-square&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/core) | ~8 kb | Physics, renderers, audio analyser — **zero dependencies** |
| [`@speakerwiz/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@speakerwiz/react?style=flat-square&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/react) | ~3 kb | React components + hooks — peer: React ≥ 18 |

---

## Installation

```bash
# Core only (vanilla JS / any framework)
npm install @speakerwiz/core

# React bindings
npm install @speakerwiz/react

# pnpm
pnpm add @speakerwiz/core @speakerwiz/react

# yarn
yarn add @speakerwiz/core @speakerwiz/react
```

---

## Quick Start

### Drop-in React component

```tsx
import { SpeakerWiz } from '@speakerwiz/react'

export function Demo() {
  return (
    <SpeakerWiz
      pattern="house"
      bpm={128}
      theme="neon-dark"
      waveform={{ mode: 'mirror', height: 72 }}
      eq={{ mode: 'bars', bands: 32, height: 96, peakHold: true }}
      autoPlay
    />
  )
}
```

### Connect to a real audio source

```tsx
import { useRef } from 'react'
import { SpeakerWiz } from '@speakerwiz/react'

export function MediaPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)

  return (
    <>
      <audio ref={audioRef} src={src} controls />
      <SpeakerWiz
        mediaRef={audioRef}
        theme="amber-studio"
        waveform={{ mode: 'filled', height: 80 }}
        eq={{ mode: 'filled-curve', bands: 20, height: 100 }}
      />
    </>
  )
}
```

### Vanilla JS

```ts
import { SpeakerWiz } from '@speakerwiz/core'

const viz = new SpeakerWiz(document.getElementById('viz')!, {
  theme:    'neon-dark',
  pattern:  'hiphop',
  bpm:      128,
  waveform: { mode: 'mirror', height: 72 },
  eq:       { mode: 'bars', bands: 32, height: 96 },
})

viz.mount()
viz.connectMedia(document.querySelector('audio')!)
viz.play()

// Manual beat trigger — MIDI, drum pads, your own sequencer
viz.trigger({ sub: 1.0 })   // kick
viz.trigger({ hi: 0.9 })    // hi-hat
viz.trigger({ mid: 0.8 })   // snare
```

---

## Composable Hooks

Use individual pieces and wire them yourself:

```tsx
import {
  SpeakerViz,
  Waveform,
  EQVisualizer,
  useAudioAnalyser,
  useSpeakerWizPhysics,
} from '@speakerwiz/react'

export function ComposablePlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)

  // Web Audio — returns live typed arrays every frame
  const { waveform, frequency, bands } = useAudioAnalyser(audioRef)

  // Spring physics driven by audio band energy
  const { state } = useSpeakerWizPhysics({ bands, sensitivity: 1.2 })

  return (
    <div>
      <audio ref={audioRef} src={src} controls />
      <SpeakerViz   state={state}     theme="neon-dark" showGlow />
      <Waveform     data={waveform}   theme="neon-dark" height={72} />
      <EQVisualizer data={frequency}  theme="neon-dark" height={96} />
    </div>
  )
}
```

### Imperative handle — trigger from your own engine

```tsx
import { useRef } from 'react'
import { SpeakerWiz, type SpeakerWizHandle } from '@speakerwiz/react'

export function BeatApp() {
  const vizRef = useRef<SpeakerWizHandle>(null)

  const onKick  = () => vizRef.current?.trigger({ sub: 1.0, mid: 0.3 })
  const onSnare = () => vizRef.current?.trigger({ mid: 0.9, hi: 0.4 })
  const onHat   = () => vizRef.current?.trigger({ hi: 0.85 })

  return <SpeakerWiz ref={vizRef} theme="neon-dark" />
}
```

---

## API Reference

### `SpeakerWiz` options

| Option | Type | Default | Description |
|---|---|---|---|
| `theme` | `SpeakerWizTheme \| BuiltInTheme` | `'neon-dark'` | Visual theme |
| `pattern` | `BeatPattern \| BuiltInPattern` | `'hiphop'` | Sequencer pattern |
| `bpm` | `number` | `128` | Beats per minute |
| `gains` | `DriverGains` | `{sub:0.85, mid:0.7, hi:0.6}` | Per-driver amplitude |
| `waveform` | `WaveformOptions \| false` | `{mode:'mirror'}` | Waveform config |
| `eq` | `EQOptions \| false` | `{mode:'bars', bands:32}` | EQ config |
| `physics` | `Partial<SpringConfig>` | `{}` | Spring tuning |
| `autoPlay` | `boolean` | `false` | Start on mount |

### `SpeakerWiz` methods

```ts
viz.mount()                            // attach to DOM
viz.destroy()                          // full teardown + cleanup
viz.play() / viz.pause() / viz.stop()  // sequencer transport
viz.setBPM(bpm: number)
viz.trigger(hit: BeatHit)              // { sub?, mid?, hi? } — 0–1
viz.setGains(gains: Partial<DriverGains>)
viz.setPattern(pattern)
viz.setTheme(theme)
viz.connectMedia(el: HTMLMediaElement)
viz.connectAnalyser(node: AudioNode)
viz.resize(w: number, h: number)
viz.on('beat' | 'step' | 'play' | 'pause' | 'stop' | 'resize' | 'destroy', handler)
```

---

### `SpringEngine`

```ts
import { SpringEngine } from '@speakerwiz/core'

const engine = new SpringEngine({
  sub:      { k: 280, damp: 0.62 },  // heavy, slow return
  mid:      { k: 320, damp: 0.58 },
  hi:       { k: 400, damp: 0.55 },  // light, fast
  subSteps: 4,
})

engine.impulse('sub', 14)
engine.impulseAll({ sub: 12, hi: 18 })

const state = engine.step(dt)
// state.sub.pos      → displacement  −1.2 to +1.2
// state.sub.vel      → velocity
// state.energy.sub   → smoothed energy  0–1

engine.reset()
engine.configure(config)
```

---

### `AudioAnalyser`

```ts
import { AudioAnalyser } from '@speakerwiz/core'

const analyser = new AudioAnalyser({ fftSize: 2048 })

analyser.connectMedia(audioEl)
await analyser.resume()  // call after user gesture

const waveform  = analyser.getWaveform()    // Float32Array
const frequency = analyser.getFrequency()   // Uint8Array

const bands = analyser.getBands()
// { sub, low, mid, high, air } — all 0–1
// sub:  20–80 Hz   | low:  80–300 Hz   | mid:  300–2 kHz
// high: 2–8 kHz    | air:  8–20 kHz

const impulses = analyser.toDriverImpulses(bands, 1.0)
engine.impulseAll(impulses)
```

---

### `BeatSequencer`

```ts
import { BeatSequencer, PATTERNS } from '@speakerwiz/core'

const seq = new BeatSequencer('hiphop', 128)

seq.on('step', ({ index, hit, timeMs }) => {
  // hit.s → sub  0–1
  // hit.m → mid  0–1
  // hit.h → hi   0–1
})
seq.on('beat', ({ bar, beat, timeMs }) => { /* quarter note */ })

seq.play()
seq.setBPM(140)
seq.loadPattern(PATTERNS.techno)
seq.tick(performance.now())  // call each rAF frame
```

---

### React Hooks

#### `useAudioAnalyser(mediaRef, opts?)`

```ts
const { analyser, waveform, frequency, bands, connected, resume }
  = useAudioAnalyser(audioRef)
```

#### `useSpeakerWizPhysics(opts?)`

```ts
const { state, trigger, setGains, reset }
  = useSpeakerWizPhysics({ bands, sensitivity: 1.2, gains: { sub: 0.9 } })
// state.sub.pos     → speakerwiz displacement
// state.energy.sub  → glow intensity
```

#### `useBeatSequencer(opts?)`

```ts
const { play, pause, stop, setBPM, loadPattern, currentStep, playing, bpm }
  = useBeatSequencer({ pattern: 'techno', bpm: 132, autoPlay: true, onStep, onBeat })
```

---

## Themes

```ts
import { THEMES } from '@speakerwiz/core'
```

| Name | SpeakerWiz colour | Best for |
|---|---|---|
| `neon-dark` | `#00d4ff` cyan | Beat apps · DJ tools |
| `amber-studio` | `#ff8800` amber | DAW · recording |
| `monochrome` | `#e0e0e0` white | Minimal · clean UI |
| `vapor` | `#ff00ff` magenta | Synthwave · retro |

---

## Built-in Patterns

| Pattern | Feel |
|---|---|
| `hiphop` | Kick-snare, loose 16th hi-hats |
| `house` | 4-on-the-floor, upbeat open hat |
| `dnb` | Amen-style broken beat |
| `trap` | Rolling 32nd hi-hats, heavy sub |
| `techno` | Driving 4/4 with clap |
| `jazz` | Swung, sparse, ride-cymbal |
| `reggaeton` | Dembow offbeat rhythm |
| `breakbeat` | Syncopated with ghost notes |

---

## Performance

| Technique | Detail |
|---|---|
| SVG transforms | `translateY` + `scale` only — zero layout thrash |
| `will-change` | GPU layer pre-promoted on all animated groups |
| Delta culling | DOM writes skipped when Δ < 0.0005 |
| Physics sub-stepping | 4 substeps/frame, stable at any BPM |
| Canvas glow | Separate composited layer, `pointer-events: none` |
| Audio buffers | Typed arrays reused — zero heap allocs per frame |

---

## Repository Structure

```
speakerwiz/
├── packages/
│   ├── core/                       # @speakerwiz/core — zero deps
│   │   └── src/
│   │       ├── physics/
│   │       │   ├── SpringEngine.ts
│   │       │   └── BeatSequencer.ts
│   │       ├── audio/
│   │       │   └── AudioAnalyser.ts
│   │       ├── renderers/
│   │       │   ├── SpeakerRenderer.ts
│   │       │   ├── GlowRenderer.ts
│   │       │   ├── WaveformRenderer.ts
│   │       │   └── EQRenderer.ts
│   │       ├── SpeakerWiz.ts
│   │       ├── themes.ts
│   │       ├── types.ts
│   │       └── index.ts
│   │
│   └── react/                      # @speakerwiz/react — React ≥ 18
│       └── src/
│           ├── SpeakerWiz.tsx
│           ├── components.tsx
│           ├── hooks/index.ts
│           └── index.ts
│
├── demo/                           # Vite demo app
├── USAGE_EXAMPLES.tsx
├── ARCHITECTURE.md
└── README.md
```

---

## Contributing

```bash
# Clone
git clone https://gitlab.com/YOUR_USERNAME/speakerwiz.git
cd speakerwiz

# Install (pnpm workspaces)
pnpm install

# Dev — watch all packages
pnpm dev

# Build
pnpm build

# Type check
pnpm typecheck

# Tests
pnpm test
```

Please open an issue before large PRs.

---

## Roadmap

- [x] `SpringEngine` — mass-spring-damper physics
- [x] `BeatSequencer` — BPM sequencer + 8 built-in patterns
- [x] `AudioAnalyser` — Web Audio API, band extraction
- [x] `SpeakerRenderer` — programmatic SVG, no assets required
- [x] `GlowRenderer` — canvas bloom / corona / floor reflection
- [x] `WaveformRenderer` — oscilloscope · mirror · filled
- [x] `EQRenderer` — bars · curve · filled-curve, peak hold, log grid
- [x] `SpeakerWiz` — full orchestrator
- [x] `@speakerwiz/react` — `<SpeakerWiz>`, `<SpeakerViz>`, `<Waveform>`, `<EQVisualizer>`, hooks
- [ ] Vite build config + tsconfig per package
- [ ] Vitest unit tests
- [ ] Web Component `<speaker-wiz>` (Vue · Svelte · plain HTML)
- [ ] Demo app (Vite)
- [ ] Storybook / interactive docs
- [ ] Additional themes: `arctic`, `lava`
- [ ] MIDI input support

---

## License

[MIT](LICENSE) — built for the open audio community.

---

<div align="center">

Made with physics and neon cyan.

[![@speakerwiz/core downloads](https://img.shields.io/npm/dm/@speakerwiz/core?style=flat-square&label=%40speakerwiz%2Fcore%20downloads&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/core)
[![@speakerwiz/react downloads](https://img.shields.io/npm/dm/@speakerwiz/react?style=flat-square&label=%40speakerwiz%2Freact%20downloads&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/react)

</div>
