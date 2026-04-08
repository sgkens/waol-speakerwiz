// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  SpeakerWiz.ts
// Main orchestrator. Wires SpringEngine + BeatSequencer +
// AudioAnalyser + all renderers into one cohesive instance.
// ─────────────────────────────────────────────────────────────────

import { SpringEngine }    from './physics/SpringEngine'
import { BeatSequencer, PATTERNS } from './physics/BeatSequencer'
import { AudioAnalyser }   from './audio/AudioAnalyser'
import { SpeakerRenderer } from './renderers/SpeakerRenderer'
import { GlowRenderer }    from './renderers/GlowRenderer'
import { WaveformRenderer } from './renderers/WaveformRenderer'
import { EQRenderer }      from './renderers/EQRenderer'
import { SpectrogramRenderer } from './renderers/SpectrogramRenderer'
import { ParticleRenderer } from './renderers/ParticleRenderer'
import { Geometric3DRenderer } from './renderers/Geometric3DRenderer'
import { RadialRenderer } from './renderers/RadialRenderer'
import { resolveTheme }    from './themes'

import type {
  SpeakerWizOptions,
  SpeakerWizTheme,
  BuiltInTheme,
  DriverGains,
  BeatHit,
  BeatPattern,
  BuiltInPattern,
  RenderState,
  SpringState,
  SpeakerWizEventMap,
  SpeakerWizEventHandler,
  StepHit,
  SpectrogramOptions,
  ParticleOptions,
  Geometric3DOptions,
  RadialOptions,
} from './types'

// ─────────────────────────────────────────────────────────────────

const DEFAULTS: Required<SpeakerWizOptions> = {
  width:           620,
  height:          560,
  theme:           'neon-dark',
  speaker:         {},
  waveform:        { mode: 'mirror', height: 72 },
  eq:              { mode: 'bars', bands: 32, height: 96, showLabels: true, peakHold: true },
  spectrogram:     false,
  particles:       false,
  geometric3d:     false,
  radial:          false,
  physics:         {},
  gains:           { sub: 0.85, mid: 0.70, hi: 0.60 },
  bpm:             128,
  pattern:         'hiphop',
  autoPlay:        false,
  devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1,
}

type EventHandlers = {
  [K in keyof SpeakerWizEventMap]: Set<SpeakerWizEventHandler<K>>
}

// ─────────────────────────────────────────────────────────────────

export class SpeakerWiz {
  // ── Modules ──
  private engine:   SpringEngine
  private seq:      BeatSequencer
  private analyser: AudioAnalyser | null = null

  // ── Renderers ──
  private speaker:     SpeakerRenderer  | null = null
  private glow:        GlowRenderer     | null = null
  private waveform:    WaveformRenderer | null = null
  private eq:          EQRenderer       | null = null
  private spectrogram: SpectrogramRenderer | null = null
  private particles:   ParticleRenderer | null = null
  private geometric3d: Geometric3DRenderer | null = null
  private radial:      RadialRenderer | null = null

  // ── DOM ──
  private root:           HTMLElement
  private stageEl:        HTMLDivElement | null  = null
  private svgEl:          SVGSVGElement  | null  = null
  private glowCanvas:     HTMLCanvasElement | null = null
  private waveCanvas:     HTMLCanvasElement | null = null
  private eqCanvas:       HTMLCanvasElement | null = null
  private spectroCanvas:  HTMLCanvasElement | null = null
  private particleCanvas: HTMLCanvasElement | null = null
  private geometricCanvas: HTMLCanvasElement | null = null
  private radialCanvas:   HTMLCanvasElement | null = null

  // ── State ──
  private theme:   SpeakerWizTheme
  private opts:    Required<SpeakerWizOptions>
  private gains:   DriverGains
  private rafId:   number  = 0
  private lastT:   number  = 0
  private mounted: boolean = false
  private handlers: Partial<EventHandlers> = {}

  // Idle micro-wobble
  private idleT = 0

  private resizeObserver: ResizeObserver | null = null

  constructor(container: HTMLElement, opts: SpeakerWizOptions = {}) {
    this.root = container
    this.opts = { ...DEFAULTS, ...opts }
    this.theme = resolveTheme(this.opts.theme)
    const g = this.opts.gains || DEFAULTS.gains;
    this.gains = {
      sub: (g.sub ?? DEFAULTS.gains.sub) as number,
      mid: (g.mid ?? DEFAULTS.gains.mid) as number,
      hi:  (g.hi  ?? DEFAULTS.gains.hi) as number,
    }

    // Physics
    this.engine = new SpringEngine(this.opts.physics)

    // Sequencer
    const pat = typeof this.opts.pattern === 'string'
      ? PATTERNS[this.opts.pattern as BuiltInPattern]
      : this.opts.pattern
    this.seq = new BeatSequencer(pat ?? 'hiphop', this.opts.bpm)

    this.seq.on('step', ({ hit }) => {
      this.applyHit(hit)
    })
    this.seq.on('beat', (e) => this.emit('beat', e))
    this.seq.on('step', (e) => this.emit('step', e))

    // Auto-resize
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0 && this.mounted) {
          this.resize(width, height)
        }
      }
    })
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  mount(): this {
    if (this.mounted) return this

    // Clear container to prevent overlaps
    this.root.innerHTML = ''

    // Root styles
    this.root.style.position = 'relative'
    this.root.style.display  = 'inline-block'

    const W   = this.opts.width
    const dpr = this.opts.devicePixelRatio

    // Calculate total height: speaker + waveform + eq + others
    const waveH = this.opts.waveform ? (this.opts.waveform as any).height ?? 72 : 0
    const eqH   = this.opts.eq       ? (this.opts.eq       as any).height ?? 96 : 0
    const spectroH = this.opts.spectrogram ? (this.opts.spectrogram as any).height ?? 160 : 0
    const speakerH = this.opts.height

    // ── Stage (speaker area) ──
    this.stageEl = document.createElement('div')
    this.stageEl.style.cssText = `position:relative;width:${W}px;height:${speakerH}px;pointer-events:none;`

    // SVG speaker
    if (this.opts.speaker !== false) {
      this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
      this.svgEl.setAttribute('viewBox', '0 0 620 560')
      this.svgEl.setAttribute('width',  String(W))
      this.svgEl.setAttribute('height', String(speakerH))
      this.svgEl.style.display = 'block'

      this.speaker = new SpeakerRenderer(this.svgEl, this.opts.speaker as any, this.theme)
      this.stageEl.appendChild(this.svgEl)

      // Glow canvas overlay
      this.glowCanvas = document.createElement('canvas')
      this.glowCanvas.style.cssText = `position:absolute;top:0;left:0;pointer-events:none;`
      this.glow = new GlowRenderer(this.glowCanvas, {}, this.theme, dpr)
      this.glow.resize(W, speakerH)
      this.stageEl.appendChild(this.glowCanvas)
    }

    // ── Particles canvas (under speaker) ──
    if (this.opts.particles !== false) {
      this.particleCanvas = document.createElement('canvas')
      this.particleCanvas.style.cssText = `position:absolute;top:0;left:0;pointer-events:none;`
      this.particles = new ParticleRenderer(this.particleCanvas, this.opts.particles as any, this.theme, dpr)
      this.particles.resize(W, speakerH)
      this.stageEl.insertBefore(this.particleCanvas, this.svgEl)
    }

    // ── Radial canvas (around speaker) ──
    if (this.opts.radial !== false) {
      this.radialCanvas = document.createElement('canvas')
      this.radialCanvas.style.cssText = `position:absolute;top:0;left:0;pointer-events:none;`
      this.radial = new RadialRenderer(this.radialCanvas, this.opts.radial as any, this.theme, dpr)
      this.radial.resize(W, speakerH)
      this.stageEl.appendChild(this.radialCanvas)
    }

    // ── Geometric 3D canvas (around speaker) ──
    if (this.opts.geometric3d !== false) {
      this.geometricCanvas = document.createElement('canvas')
      this.geometricCanvas.style.cssText = `position:absolute;top:0;left:0;pointer-events:none;`
      this.geometric3d = new Geometric3DRenderer(this.geometricCanvas, this.opts.geometric3d as any, this.theme, dpr)
      this.geometric3d.resize(W, speakerH)
      this.stageEl.appendChild(this.geometricCanvas)
    }

    this.root.appendChild(this.stageEl)

    // ── Waveform canvas ──
    if (this.opts.waveform !== false) {
      this.waveCanvas = document.createElement('canvas')
      this.waveCanvas.style.cssText = `display:block;width:${W}px;pointer-events:none;`
      this.waveform = new WaveformRenderer(
        this.waveCanvas,
        this.opts.waveform as any,
        this.theme,
        dpr
      )
      this.waveform.resize(W, waveH)
      this.root.appendChild(this.waveCanvas)
    }

    // ── EQ canvas ──
    if (this.opts.eq !== false) {
      this.eqCanvas = document.createElement('canvas')
      this.eqCanvas.style.cssText = `display:block;width:${W}px;pointer-events:none;`
      this.eq = new EQRenderer(
        this.eqCanvas,
        this.opts.eq as any,
        this.theme,
        dpr
      )
      this.eq.resize(W, eqH)
      this.root.appendChild(this.eqCanvas)
    }

    // ── Spectrogram canvas ──
    if (this.opts.spectrogram !== false) {
      this.spectroCanvas = document.createElement('canvas')
      this.spectroCanvas.style.cssText = `display:block;width:${W}px;pointer-events:none;`
      this.spectrogram = new SpectrogramRenderer(
        this.spectroCanvas,
        this.opts.spectrogram as any,
        this.theme,
        dpr
      )
      this.spectrogram.resize(W, spectroH)
      this.root.appendChild(this.spectroCanvas)
    }

    this.mounted = true

    // Start render loop
    this.loop(performance.now())

    if (this.opts.autoPlay) this.play()

    return this
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    cancelAnimationFrame(this.rafId)
    this.seq.stop()
    this.analyser?.destroy()
    this.speaker?.destroy()
    this.glow?.destroy()
    this.waveform?.destroy()
    this.eq?.destroy()
    this.spectrogram?.destroy()
    this.particles?.destroy?.()
    this.geometric3d?.destroy?.()
    this.radial?.destroy?.()

    // ── Modules ──
    this.speaker     = null
    this.glow        = null
    this.waveform    = null
    this.eq          = null
    this.spectrogram = null
    this.particles   = null
    this.geometric3d = null
    this.radial      = null

    this.stageEl?.remove()
    this.waveCanvas?.remove()
    this.eqCanvas?.remove()
    this.spectroCanvas?.remove()
    this.particleCanvas?.remove()
    this.geometricCanvas?.remove()
    this.radialCanvas?.remove()

    this.mounted  = false
    this.handlers = {}
    this.emit('destroy', undefined as void)
  }

  // ── Audio connection ──────────────────────────────────────────────

  connectMedia(el: HTMLMediaElement): this {
    if (!this.analyser) this.analyser = new AudioAnalyser()
    this.analyser.connectMedia(el)
    return this
  }

  connectAnalyser(node: AudioNode): this {
    if (!this.analyser) this.analyser = new AudioAnalyser()
    this.analyser.connectNode(node)
    return this
  }

  async resumeAudio(): Promise<void> {
    await this.analyser?.resume()
  }

  // ── Playback ──────────────────────────────────────────────────────

  play(): this  { this.seq.play();  this.emit('play',  undefined as void); return this }
  pause(): this { this.seq.pause(); this.emit('pause', undefined as void); return this }
  stop(): this  { this.seq.stop();  this.emit('stop',  undefined as void); return this }

  setBPM(bpm: number): this { this.seq.setBPM(bpm); return this }
  get bpm(): number { return this.seq.bpm }
  get playing(): boolean { return this.seq.playing }

  // ── Manual beat trigger ───────────────────────────────────────────

  trigger(hit: BeatHit): this {
    if (hit.sub) this.engine.impulse('sub', hit.sub * this.gains.sub * 14)
    if (hit.mid) this.engine.impulse('mid', hit.mid * this.gains.mid * 16)
    if (hit.hi)  this.engine.impulse('hi',  hit.hi  * this.gains.hi  * 20)
    return this
  }

  // ── Configuration ─────────────────────────────────────────────────

  setGains(gains: Partial<DriverGains>): this {
    this.gains = { ...this.gains, ...gains }
    return this
  }

  setPattern(pattern: BeatPattern | BuiltInPattern): this {
    this.seq.loadPattern(pattern)
    return this
  }

  setTheme(theme: SpeakerWizTheme | BuiltInTheme): this {
    this.theme = resolveTheme(theme)
    this.speaker?.setTheme(this.theme)
    this.glow?.setTheme(this.theme)
    this.waveform?.setTheme(this.theme)
    this.eq?.setTheme(this.theme)
    this.spectrogram?.setTheme(this.theme)
    this.particles?.setTheme(this.theme)
    this.geometric3d?.setTheme(this.theme)
    this.radial?.setTheme(this.theme)
    return this
  }

  resize(w: number, h: number): this {
    if (!this.mounted) return this

    this.opts.width  = w
    this.opts.height = h
    const waveH = this.opts.waveform ? (this.opts.waveform as any).height ?? 72 : 0
    const eqH   = this.opts.eq       ? (this.opts.eq as any).height ?? 96 : 0
    const spectroH = this.opts.spectrogram ? (this.opts.spectrogram as any).height ?? 160 : 0

    if (this.stageEl)  { this.stageEl.style.width = `${w}px`; this.stageEl.style.height = `${h}px` }
    if (this.svgEl)    { this.svgEl.setAttribute('width', String(w)); this.svgEl.setAttribute('height', String(h)) }
    if (this.glow)     this.glow.resize(w, h)
    if (this.waveform && this.waveCanvas) this.waveform.resize(w, waveH)
    if (this.eq && this.eqCanvas)         this.eq.resize(w, eqH)
    if (this.spectrogram && this.spectroCanvas) this.spectrogram.resize(w, spectroH)
    if (this.particles && this.particleCanvas)   this.particles.resize(w, h)
    if (this.geometric3d && this.geometricCanvas) this.geometric3d.resize(w, h)
    if (this.radial && this.radialCanvas)       this.radial.resize(w, h)

    this.emit('resize', { width: w, height: h })
    return this
  }

  // ── Events ────────────────────────────────────────────────────────

  on<K extends keyof SpeakerWizEventMap>(event: K, handler: SpeakerWizEventHandler<K>): this {
    if (!this.handlers[event]) {
      (this.handlers as any)[event] = new Set()
    }
    ;(this.handlers[event] as Set<any>).add(handler)
    return this
  }

  off<K extends keyof SpeakerWizEventMap>(event: K, handler: SpeakerWizEventHandler<K>): this {
    ;(this.handlers[event] as Set<any>)?.delete(handler)
    return this
  }

  // ── Render loop ───────────────────────────────────────────────────

  private loop = (now: number): void => {
    const dt = this.lastT ? Math.min((now - this.lastT) / 1000, 0.05) : 0.016
    this.lastT = now

    // Beat sequencer tick
    this.seq.tick(now)

    // Audio → physics (if analyser connected)
    if (this.analyser?.isConnected) {
      const bands    = this.analyser.getBands()
      const impulses = this.analyser.toDriverImpulses(bands, 1.0)
      this.engine.impulseAll({
        sub: (impulses.sub ?? 0) * this.gains.sub * 12,
        mid: (impulses.mid ?? 0) * this.gains.mid * 10,
        hi:  (impulses.hi  ?? 0) * this.gains.hi  * 8,
      })
    }

    // Idle micro-wobble (keeps things alive when silent)
    if (!this.seq.playing && !this.analyser?.isConnected) {
      this.idleT += dt
      this.engine.impulse('sub', Math.sin(this.idleT * 1.6) * 0.008)
    }

    const state = this.engine.step(dt)

    const renderState: RenderState = {
      spring:    state,
      gains:     this.gains,
      waveform:  this.analyser?.isConnected ? this.analyser.getWindowedWaveform() : undefined,
      frequency: this.analyser?.isConnected ? this.analyser.getFrequency() : undefined,
      bands:     this.analyser?.isConnected ? this.analyser.getBands()      : undefined,
      timestamp: now,
      deltaTime: dt,
    }

    // Update all renderers
    this.speaker?.update(renderState)
    this.glow?.update(renderState)
    this.waveform?.update(renderState)
    this.spectrogram?.update(renderState)
    this.particles?.update(renderState)
    this.geometric3d?.update(renderState)
    this.radial?.update(renderState)

    if (this.eq && this.analyser?.isConnected) {
      this.eq.update(renderState, this.analyser.sampleRate)
    } else {
      this.eq?.update(renderState)
    }

    this.rafId = requestAnimationFrame(this.loop)
  }

  private applyHit(hit: StepHit): void {
    const stepMs   = this.seq.stepDurationMs
    const forceMul = Math.min(1.2, 80 / stepMs)  // scale with BPM

    if (hit.s) this.engine.impulse('sub', hit.s * this.gains.sub * 14 * forceMul)
    if (hit.m) this.engine.impulse('mid', hit.m * this.gains.mid * 16 * forceMul)
    if (hit.h) this.engine.impulse('hi',  hit.h * this.gains.hi  * 20 * forceMul)
  }

  private emit<K extends keyof SpeakerWizEventMap>(event: K, payload: SpeakerWizEventMap[K]): void {
    ;(this.handlers[event] as Set<any>)?.forEach((h: Function) => h(payload))
  }
}
