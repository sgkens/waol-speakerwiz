// ─────────────────────────────────────────────────────────────────
// @speakerwiz/react  —  components.tsx
// Standalone React components for when you want individual pieces:
//   <SpeakerViz />  — just the speaker SVG
//   <Waveform />    — just the waveform canvas
//   <EQVisualizer/> — just the EQ canvas
//   <Spectrogram /> — frequencies over time
//   <Particles />   — audio-reactive particles
//   <Geometric3D /> — wireframe 3D shapes
//   <Radial />      — circular visualizer
// ─────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react'
import { SpeakerRenderer } from '@speakerwiz/core/renderers/SpeakerRenderer'
import { GlowRenderer }    from '@speakerwiz/core/renderers/GlowRenderer'
import { WaveformRenderer } from '@speakerwiz/core/renderers/WaveformRenderer'
import { EQRenderer }      from '@speakerwiz/core/renderers/EQRenderer'
import { SpectrogramRenderer } from '@speakerwiz/core/renderers/SpectrogramRenderer'
import { ParticleRenderer } from '@speakerwiz/core/renderers/ParticleRenderer'
import { Geometric3DRenderer } from '@speakerwiz/core/renderers/Geometric3DRenderer'
import { RadialRenderer } from '@speakerwiz/core/renderers/RadialRenderer'
import { resolveTheme }    from '@speakerwiz/core/themes'

import type {
  SpeakerOptions,
  WaveformOptions,
  EQOptions,
  SpectrogramOptions,
  ParticleOptions,
  Geometric3DOptions,
  RadialOptions,
  SpeakerWizTheme,
  BuiltInTheme,
  RenderState,
  SpringState,
  DriverGains,
} from '@speakerwiz/core'

// ── Shared defaults ───────────────────────────────────────────────

interface BaseProps {
  theme?:     SpeakerWizTheme | BuiltInTheme
  className?: string
  style?:     React.CSSProperties
  dpr?:       number
}

const EMPTY_STATE: SpringState = {
  sub: {pos:0,vel:0}, mid:{pos:0,vel:0}, hi:{pos:0,vel:0},
  energy: {sub:0,mid:0,hi:0},
}
const DEFAULT_GAINS: DriverGains = { sub:0.85, mid:0.7, hi:0.6 }

// ─────────────────────────────────────────────────────────────────
// <SpeakerViz />
// ─────────────────────────────────────────────────────────────────

export interface SpeakerVizProps extends BaseProps {
  state:       SpringState
  gains?:      Partial<DriverGains>
  width?:      number
  height?:     number
  speaker?:    SpeakerOptions
  showGlow?:   boolean
}

export function SpeakerViz({
  state,
  gains   = DEFAULT_GAINS,
  width   = 620,
  height  = 560,
  theme   = 'neon-dark',
  speaker = {},
  showGlow = true,
  className,
  style,
  dpr,
}: SpeakerVizProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const speakerRef    = useRef<SpeakerRenderer | null>(null)
  const glowRef       = useRef<GlowRenderer    | null>(null)
  const stateRef      = useRef(state)
  const gainsRef      = useRef<DriverGains>({ ...DEFAULT_GAINS, ...gains })
  stateRef.current = state
  gainsRef.current = { ...DEFAULT_GAINS, ...gains }

  useEffect(() => {
    if (!containerRef.current) return
    const t = resolveTheme(theme)
    const pixelRatio = dpr ?? window.devicePixelRatio ?? 1

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    svg.setAttribute('viewBox', '0 0 620 560')
    svg.setAttribute('width',  String(width))
    svg.setAttribute('height', String(height))
    svg.style.display = 'block'
    containerRef.current.appendChild(svg)

    speakerRef.current = new SpeakerRenderer(svg, speaker, t)

    if (showGlow) {
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;'
      containerRef.current.appendChild(canvas)
      glowRef.current = new GlowRenderer(canvas, {}, t, pixelRatio)
      glowRef.current.resize(width, height)
    }

    let running = true
    const loop = (now: number) => {
      if (!running) return
      const rs: RenderState = {
        spring:    stateRef.current,
        gains:     gainsRef.current,
        timestamp: now,
        deltaTime: 0.016,
      }
      speakerRef.current?.update(rs)
      glowRef.current?.update(rs)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)

    return () => {
      running = false
      speakerRef.current?.destroy()
      glowRef.current?.destroy()
      containerRef.current?.innerHTML = ''
    }
  }, [width, height, theme, dpr])

  return <div ref={containerRef} className={className} style={{ position:'relative', display:'inline-block', width, height, ...style }} />
}

// ─────────────────────────────────────────────────────────────────
// <Waveform />
// ─────────────────────────────────────────────────────────────────

export interface WaveformProps extends BaseProps {
  data?:   Float32Array
  state?:  SpringState
  gains?:  Partial<DriverGains>
  width?:  number
  height?: number
  options?: WaveformOptions
}

export function Waveform({
  data,
  state,
  gains   = DEFAULT_GAINS,
  width   = 620,
  height  = 72,
  theme   = 'neon-dark',
  options = {},
  className,
  style,
  dpr,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef   = useRef(data)
  const stateRef  = useRef(state)
  dataRef.current  = data
  stateRef.current = state

  useEffect(() => {
    if (!canvasRef.current) return
    const t = resolveTheme(theme)
    const pixelRatio = dpr ?? window.devicePixelRatio ?? 1
    const renderer = new WaveformRenderer(canvasRef.current, options, t, pixelRatio)
    renderer.resize(width, height)

    let running = true
    const loop = (now: number) => {
      if (!running) return
      renderer.update({
        spring:    stateRef.current ?? EMPTY_STATE,
        gains:     { ...DEFAULT_GAINS, ...gains },
        waveform:  dataRef.current,
        timestamp: now,
        deltaTime: 0.016,
      })
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false; renderer.destroy() }
  }, [width, height, theme, dpr])

  return <canvas ref={canvasRef} className={className} style={{ display:'block', ...style }} />
}

// ─────────────────────────────────────────────────────────────────
// <EQVisualizer />
// ─────────────────────────────────────────────────────────────────

export interface EQVisualizerProps extends BaseProps {
  data?:       Uint8Array
  state?:      SpringState
  gains?:      Partial<DriverGains>
  width?:      number
  height?:     number
  sampleRate?: number
  options?:    EQOptions
}

export function EQVisualizer({
  data,
  state,
  gains      = DEFAULT_GAINS,
  width      = 620,
  height     = 96,
  sampleRate = 44100,
  theme      = 'neon-dark',
  options    = {},
  className,
  style,
  dpr,
}: EQVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef   = useRef(data)
  const stateRef  = useRef(state)
  dataRef.current  = data
  stateRef.current = state

  useEffect(() => {
    if (!canvasRef.current) return
    const t = resolveTheme(theme)
    const pixelRatio = dpr ?? window.devicePixelRatio ?? 1
    const renderer = new EQRenderer(canvasRef.current, options, t, pixelRatio)
    renderer.resize(width, height)

    let running = true
    const loop = (now: number) => {
      if (!running) return
      renderer.update({
        spring:    stateRef.current ?? EMPTY_STATE,
        gains:     { ...DEFAULT_GAINS, ...gains },
        frequency: dataRef.current,
        timestamp: now,
        deltaTime: 0.016,
      }, sampleRate)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false; renderer.destroy() }
  }, [width, height, theme, dpr])

  return <canvas ref={canvasRef} className={className} style={{ display:'block', ...style }} />
}

// ─────────────────────────────────────────────────────────────────
// <Spectrogram />
// ─────────────────────────────────────────────────────────────────

export interface SpectrogramProps extends BaseProps {
  data?:    Uint8Array
  width?:   number
  height?:  number
  options?: SpectrogramOptions
}

export function Spectrogram({
  data,
  width   = 620,
  height  = 160,
  theme   = 'neon-dark',
  options = {},
  className,
  style,
  dpr,
}: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef   = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (!canvasRef.current) return
    const t = resolveTheme(theme)
    const pixelR = dpr ?? window.devicePixelRatio ?? 1
    const renderer = new SpectrogramRenderer(canvasRef.current, options, t, pixelR)
    renderer.resize(width, height)

    let running = true
    const loop = (now: number) => {
      if (!running) return
      renderer.update({
        spring:    EMPTY_STATE,
        gains:     DEFAULT_GAINS,
        frequency: dataRef.current,
        timestamp: now,
        deltaTime: 0.016,
      })
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false; renderer.destroy() }
  }, [width, height, theme, dpr])

  return <canvas ref={canvasRef} className={className} style={{ display:'block', ...style }} />
}

// ─────────────────────────────────────────────────────────────────
// <Particles />
// ─────────────────────────────────────────────────────────────────

export interface ParticlesProps extends BaseProps {
  state?:   SpringState
  gains?:   Partial<DriverGains>
  width?:   number
  height?:  number
  options?: ParticleOptions
}

export function Particles({
  state,
  gains   = DEFAULT_GAINS,
  width   = 620,
  height  = 560,
  theme   = 'neon-dark',
  options = {},
  className,
  style,
  dpr,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!canvasRef.current) return
    const t = resolveTheme(theme)
    const pixelR = dpr ?? window.devicePixelRatio ?? 1
    const renderer = new ParticleRenderer(canvasRef.current, options, t, pixelR)
    renderer.resize(width, height)

    let running = true
    const loop = (now: number) => {
      if (!running) return
      renderer.update({
        spring:    stateRef.current ?? EMPTY_STATE,
        gains:     { ...DEFAULT_GAINS, ...gains },
        timestamp: now,
        deltaTime: 0.016,
      })
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false; renderer.destroy() }
  }, [width, height, theme, dpr])

  return <canvas ref={canvasRef} className={className} style={{ display:'block', ...style }} />
}

// ─────────────────────────────────────────────────────────────────
// <Geometric3D />
// ─────────────────────────────────────────────────────────────────

export interface Geometric3DProps extends BaseProps {
  state?:   SpringState
  gains?:   Partial<DriverGains>
  width?:   number
  height?:  number
  options?: Geometric3DOptions
}

export function Geometric3D({
  state,
  gains   = DEFAULT_GAINS,
  width   = 620,
  height  = 560,
  theme   = 'neon-dark',
  options = {},
  className,
  style,
  dpr,
}: Geometric3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!canvasRef.current) return
    const t = resolveTheme(theme)
    const pixelR = dpr ?? window.devicePixelRatio ?? 1
    const renderer = new Geometric3DRenderer(canvasRef.current, options, t, pixelR)
    renderer.resize(width, height)

    let running = true
    const loop = (now: number) => {
      if (!running) return
      renderer.update({
        spring:    stateRef.current ?? EMPTY_STATE,
        gains:     { ...DEFAULT_GAINS, ...gains },
        timestamp: now,
        deltaTime: 0.016,
      })
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false; renderer.destroy() }
  }, [width, height, theme, dpr])

  return <canvas ref={canvasRef} className={className} style={{ display:'block', ...style }} />
}

// ─────────────────────────────────────────────────────────────────
// <Radial />
// ─────────────────────────────────────────────────────────────────

export interface RadialProps extends BaseProps {
  data?:    Uint8Array
  state?:   SpringState
  gains?:   Partial<DriverGains>
  width?:   number
  height?:  number
  options?: RadialOptions
}

export function Radial({
  data,
  state,
  gains   = DEFAULT_GAINS,
  width   = 620,
  height  = 560,
  theme   = 'neon-dark',
  options = {},
  className,
  style,
  dpr,
}: RadialProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef   = useRef(data)
  const stateRef  = useRef(state)
  dataRef.current  = data
  stateRef.current = state

  useEffect(() => {
    if (!canvasRef.current) return
    const t = resolveTheme(theme)
    const pixelR = dpr ?? window.devicePixelRatio ?? 1
    const renderer = new RadialRenderer(canvasRef.current, options, t, pixelR)
    renderer.resize(width, height)

    let running = true
    const loop = (now: number) => {
      if (!running) return
      renderer.update({
        spring:    stateRef.current ?? EMPTY_STATE,
        gains:     { ...DEFAULT_GAINS, ...gains },
        frequency: dataRef.current,
        timestamp: now,
        deltaTime: 0.016,
      })
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false; renderer.destroy() }
  }, [width, height, theme, dpr])

  return <canvas ref={canvasRef} className={className} style={{ display:'block', ...style }} />
}
