<div align="center">

<img src="https://img.shields.io/badge/speakerwiz-v0.1.0-00d4ff?style=for-the-badge&labelColor=060a0c&color=00d4ff" alt="version"/>

# 🔊 SpeakerWiz

**High-Performance, Physics-Simulated Audio Visualization for the Web**

[![npm](https://img.shields.io/npm/v/@speakerwiz/core?style=flat-square&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/core)
[![@speakerwiz/core downloads](https://img.shields.io/npm/dm/@speakerwiz/core?style=flat-square&label=%40speakerwiz%2Fcore%20downloads&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/core)
[![@speakerwiz/react downloads](https://img.shields.io/npm/dm/@speakerwiz/react?style=flat-square&label=%40speakerwiz%2Freact%20downloads&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@speakerwiz/react)

</div>

## Overview

**SpeakerWiz** is a professional-grade, zero-dependency audio visualization library. It models speaker cone excursion using a real-time mass-spring-damper physics engine, ensuring that visual reactions to audio feel heavy, realistic, and instantly responsive. 

Alongside the SVG speaker simulation, SpeakerWiz provides a suite of high-performance canvas visualizers:
- **Time-Domain Oscillogram (Waveform)** (with Hanning windowing for crisp signals)
- **Frequency Spectrum (EQ Bars/Curves)**
- **Waterfall Spectrograms**
- **Audio-Reactive Particle Systems**
- **3D Wireframe Geometry** (Torus, Sphere, Cube)
- **Radial & Circular Spectrum Rings**

All components are completely **atomic**, allowing you to render independent visualizers anywhere in the DOM without canvas overlapping or layout thrashing. 

## Features
- 🏎️ **Ultra-Fast Physics Engine:** 4 sub-steps per frame, capable of handling 200+ BPM without glitching.
- ⚛️ **Atomic React Components:** Plug-and-play components like `<SpeakerViz />`, `<Spectrogram />`, and `<Radial />`.
- 🎛️ **Audio & Manual Triggers:** Feed it a live `MediaElement`, an `AnalyserNode`, or manually trigger the engine via a built-in Beat Sequencer.
- 🎨 **Theme Engine:** Switch instantly between predefined aesthetics (`neon-dark`, `vapor`, `amber-studio`, `monochrome`) or provide your own.
- 🐳 **Dockerized Demo:** Try the full-screen dashboard locally with the included Docker setup.

## Installation

### Core (Vanilla JS/TS)
```bash
npm i @speakerwiz/core
# or
bun add @speakerwiz/core
```

### React
```bash
npm i @speakerwiz/react @speakerwiz/core
# or
bun add @speakerwiz/react @speakerwiz/core
```

## Quick Start (Vanilla)

```typescript
import { SpeakerWiz } from '@speakerwiz/core'

const root = document.getElementById('viz-container')
const viz = new SpeakerWiz(root, {
  theme: 'neon-dark',
  speaker: { drivers: 3 },
  radial: { mode: 'bars', radius: 100, innerRadius: 50 },
  autoPlay: true,
  bpm: 130
})

viz.mount()
```

## Quick Start (React)

```tsx
import { SpeakerViz, useSpeakerWizPhysics } from '@speakerwiz/react'

export function MyAudioApp() {
  const { state, trigger } = useSpeakerWizPhysics()

  return (
    <div>
      <button onClick={() => trigger({ s: 1.0, m: 0, h: 0 })}>
        Kick Drum
      </button>
      
      <SpeakerViz state={state} width={400} height={400} theme="vapor" />
    </div>
  )
}
```

## Running the Demo

The repository includes a professional full-screen dashboard showcasing atomic rendering.

**Via Bun:**
```bash
bun install
bun dev
```

**Via Docker:**
```bash
docker build -t speakerwiz-demo .
docker run -p 8080:80 speakerwiz-demo
# Open http://localhost:8080
```

## Architecture

SpeakerWiz is split into two packages:
- `@speakerwiz/core`: Contains the `SpringEngine` (physics), `AudioAnalyser` (DSP), and vanilla renderers (`SpeakerRenderer`, `WaveformRenderer`, etc.).
- `@speakerwiz/react`: Provides React wrappers, including atomic components and `useSpeakerWizPhysics` hooks.

For a deep dive into the internal design, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## License
MIT
