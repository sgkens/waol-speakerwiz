# 🔊 WaolSpeakerWiz (React)

**High-Performance, Physics-Simulated Audio Visualization for the Web**

This package provides atomic React components and hooks for WaolSpeakerWiz.

## Installation

```bash
npm i @waol-speakerwiz/react @waol-speakerwiz/core
# or
bun add @waol-speakerwiz/react @waol-speakerwiz/core
```

## Quick Start

```tsx
import { WaolSpeakerViz, useWaolSpeakerWizPhysics } from '@waol-speakerwiz/react'

export function MyAudioApp() {
  const { state, trigger } = useWaolSpeakerWizPhysics()

  return (
    <div>
      <button onClick={() => trigger({ s: 1.0, m: 0, h: 0 })}>
        Kick Drum
      </button>
      
      <WaolSpeakerViz state={state} width={400} height={400} theme="vapor" />
    </div>
  )
}
```

## Available Components
- `<WaolSpeakerViz />`
- `<Waveform />`
- `<EQVisualizer />`
- `<Spectrogram />`
- `<Particles />`
- `<Geometric3D />`
- `<Radial />`

Each component renders independently on its own canvas or SVG layer, providing ultra-high performance without overlapping.
