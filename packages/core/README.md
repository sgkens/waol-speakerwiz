# 🔊 SpeakerWiz (Core)

**High-Performance, Physics-Simulated Audio Visualization for the Web**

This is the vanilla TypeScript core package for SpeakerWiz.

## Installation

```bash
npm i @speakerwiz/core
# or
bun add @speakerwiz/core
```

## Quick Start

```typescript
import { SpeakerWiz } from '@speakerwiz/core'

const root = document.getElementById('viz-container')
const viz = new SpeakerWiz(root, {
  theme: 'neon-dark',
  speaker: { drivers: 3 },
  waveform: { mode: 'mirror', height: 100 },
  autoPlay: true,
  bpm: 128
})

viz.mount()
```

## Features
- **Time-Domain Oscillogram (Waveform)**
- **Frequency Spectrum (EQ Bars/Curves)**
- **Waterfall Spectrograms**
- **Audio-Reactive Particle Systems**
- **3D Wireframe Geometry** (Torus, Sphere, Cube)
- **Radial & Circular Spectrum Rings**

For React bindings, see [`@speakerwiz/react`](https://www.npmjs.com/package/@speakerwiz/react).
