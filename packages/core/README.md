# 🔊 WaolSpeakerWiz (Core)

**High-Performance, Physics-Simulated Audio Visualization for the Web**

This is the vanilla TypeScript core package for WaolSpeakerWiz.

## Installation

```bash
npm i @waol-speakerwiz/core
# or
bun add @waol-speakerwiz/core
```

## Quick Start

```typescript
import { WaolSpeakerWiz } from '@waol-speakerwiz/core'

const root = document.getElementById('viz-container')
const viz = new WaolSpeakerWiz(root, {
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

For React bindings, see [`@waol-speakerwiz/react`](https://www.npmjs.com/package/@waol-speakerwiz/react).
