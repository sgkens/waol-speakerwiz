# 🔊 WAOL-SpeakerWiz

**Professional Physics-Engine Speaker Visualization for the Web**

WAOL-SpeakerWiz is a specialized, high-performance library for simulating realistic speaker driver excursion. It uses a mass-spring-damper physics model to calculate exactly how a speaker cone should react to audio impulses (kick drums, basslines, transients), creating a "heavy", responsive visual experience.

[![npm](https://img.shields.io/npm/v/@waol-speakerwiz/core?style=for-the-badge&color=00d4ff&labelColor=060a0c)](https://www.npmjs.com/package/@waol-speakerwiz/core)
[![License](https://img.shields.io/badge/license-MIT-00d4ff?style=for-the-badge&labelColor=060a0c)](./LICENSE)

---

## 💎 Features

- 🏎️ **Precision Physics Engine:** Real-time mass-spring-damper simulation with 4 sub-steps per frame for rock-solid stability even at 200+ BPM.
- 🎨 **Dynamic Theming:** Fully customizable look (cabinet, driver, rings, glow) with built-in presets (`neon-dark`, `vapor`, `amber-studio`, `monochrome`).
- ⚛️ **Atomic React Components:** Plug-and-play `<WaolSpeakerViz />` component that handles its own lifecycle.
- 🎛️ **Multi-Driver Support:** Render a single sub or a full 3-way stack (Sub + Mids + Tweeters), all individually animated.
- ⚡ **GPU Accelerated:** Optimized SVG transforms and canvas layers for zero layout thrashing and high frame rates.

## 🚀 Installation

```bash
# Core (Vanilla JS/TS)
npm install @waol-speakerwiz/core

# React Bindings
npm install @waol-speakerwiz/react @waol-speakerwiz/core
```

## 📖 Quick Start (React)

```tsx
import { WaolSpeakerViz, useWaolSpeakerWizPhysics } from '@waol-speakerwiz/react';

export function BeatApp() {
  // 1. Initialize the physics engine
  const { state, trigger } = useWaolSpeakerWizPhysics({
    physics: { sub: { k: 300, damp: 0.6 } }
  });

  return (
    <div style={{ background: '#000', padding: 40 }}>
      {/* 2. Manual trigger (e.g. on MIDI hit or Sequencer step) */}
      <button onClick={() => trigger({ sub: 1.0 })}>PUNCH</button>
      
      {/* 3. Render the specialized visualizer */}
      <WaolSpeakerViz 
        state={state} 
        theme="vapor"
        speaker={{ drivers: 3 }}
        width={600} 
        height={600} 
      />
    </div>
  );
}
```

## 🛠️ Configuration

| Option | Type | Description |
|---|---|---|
| `theme` | `BuiltInTheme \| ThemeObject` | Aesthetic preset or custom theme. |
| `speaker.drivers` | `1 \| 3` | Single sub or full stack. |
| `physics.subSteps`| `number` | Internal simulation precision (default 4). |
| `gains` | `DriverGains` | Multiplier for sub/mid/hi response. |

## 🐳 Docker Demo

Explore the pro dashboard locally:
```bash
docker build -t waol-demo .
docker run -p 8080:80 waol-demo
```

---

## 🟦 Project Standards (GEMINI.md)
- **Convention:** Conventional Commits
- **Architecture:** PDR-driven (CONTEXT-SOURCE/PDR.md)
- **Performance:** .NET inspired high-perf logic in TS.

Developed for professional beat-making and music production apps.
MIT License © 2026
