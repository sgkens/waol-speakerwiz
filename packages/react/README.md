# 🔊 SpeakerWiz (React)

**High-Performance, Physics-Simulated Audio Visualization for the Web**

This package provides atomic React components and hooks for SpeakerWiz.

## Installation

```bash
npm i @speakerwiz/react @speakerwiz/core
# or
bun add @speakerwiz/react @speakerwiz/core
```

## Quick Start

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

## Available Components
- `<SpeakerViz />`
- `<Waveform />`
- `<EQVisualizer />`
- `<Spectrogram />`
- `<Particles />`
- `<Geometric3D />`
- `<Radial />`

Each component renders independently on its own canvas or SVG layer, providing ultra-high performance without overlapping.
