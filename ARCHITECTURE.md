# WAOL-SpeakerWiz — Specialized Library Architecture

## Core Philosophy
WAOL-SpeakerWiz is designed with one goal: **High-Fidelity Speaker Simulation**. 
Unlike generic audio visualizers, it models the mechanical movement of speaker cones using physics, providing a tangible sense of "punch" and "weight" that aligns perfectly with modern music production.

---

## Technical Stack
- **Language:** TypeScript (Strict Mode)
- **Physics:** 2nd-order ODE (Mass-Spring-Damper)
- **Graphics:** Hybrid SVG (Drivers) + HTML5 Canvas (Bloom/Glow)
- **Performance:** 4x Sub-stepping per frame (~240Hz simulation resolution)

---

## Module Structure

### 1. Physics Engine (`@waol-speakerwiz/core/physics`)
- **SpringEngine:** The core solver. It maintains a separate state for Sub, Mid, and Hi drivers. Each driver has configurable `k` (stiffness) and `damp` (friction).
- **Sub-stepping:** To prevent stability issues at high frequencies or high BPM, the engine runs multiple integration steps per visual frame.

### 2. Audio Analysis (`@waol-speakerwiz/core/audio`)
- **AudioAnalyser:** A wrapper around the Web Audio API `AnalyserNode`.
- **Hanning Windowing:** Applied to raw time-domain data to provide cleaner impulses for the physics engine.
- **Band Energy:** Breaks down frequencies into 5 bands (Sub, Low, Mid, High, Air) for targeted driver animation.

### 3. Renderers (`@waol-speakerwiz/core/renderers`)
- **SpeakerRenderer:** Programmatic SVG generation. It constructs complex driver assemblies (basket, surround, cone, voice coil, dustcap) entirely via code.
- **GlowRenderer:** A high-performance canvas layer that renders the volumetric corona glow and floor reflections based on driver energy.

### 4. Orchestrator (`@waol-speakerwiz/core`)
- **WaolSpeakerWiz:** The primary class that wires the Analyser, Engine, and Renderers together. It manages the RequestAnimationFrame loop and state synchronization.

---

## Data Flow
```
Audio Source (Input) ──▶ AudioAnalyser (DSP) ──▶ Band Impulse ──▶ SpringEngine (ODE) ──▶ SpringState (Pos/Vel) ──▶ SpeakerRenderer (DOM)
```

## Atomic Rendering
Each component is designed to be **atomic**. In a React context, you can render just the physics state and pass it to a standalone `<WaolSpeakerViz />` component. This prevents layout thrashing and allows the library to scale in complex dashboards.

## Theming System
The library uses a **Palette-driven approach**. A theme is a plain object containing CSS-compatible color strings. When a theme is changed:
1. The SVG `<defs>` are updated.
2. The `SpeakerRenderer` triggers a partial re-paint.
3. The `GlowRenderer` updates its gradient cache.
