// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  renderers/WaveformRenderer.ts
// Canvas-based waveform renderer (oscilloscope / mirror / filled)
// ─────────────────────────────────────────────────────────────────

import type { WaveformOptions, SpeakerWizTheme, RenderState } from '../types'

const DEFAULTS: Required<WaveformOptions> = {
  mode:      'oscilloscope',
  lineWidth: 1.5,
  height:    72,
  mirror:    false,
  filled:    false,
}

export class WaveformRenderer {
  private canvas: HTMLCanvasElement
  private ctx:    CanvasRenderingContext2D
  private opts:   Required<WaveformOptions>
  private theme:  SpeakerWizTheme
  private dpr:    number

  constructor(
    canvas: HTMLCanvasElement,
    opts:   WaveformOptions = {},
    theme:  SpeakerWizTheme,
    dpr = window.devicePixelRatio ?? 1
  ) {
    this.canvas = canvas
    this.ctx    = canvas.getContext('2d')!
    this.opts   = { ...DEFAULTS, ...opts }
    this.theme  = theme
    this.dpr    = dpr
  }

  // ── Public ────────────────────────────────────────────────────────

  update(state: RenderState): void {
    const data = state.waveform
    if (!data || data.length === 0) {
      this.drawIdle(state)
      return
    }

    switch (this.opts.mode) {
      case 'mirror':       return this.drawMirror(data, state)
      case 'filled':       return this.drawFilled(data, state)
      case 'oscilloscope': return this.drawOscilloscope(data, state)
    }
  }

  resize(w: number, h: number): void {
    const dpr = this.dpr
    this.canvas.width  = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width  = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.scale(dpr, dpr)
  }

  setTheme(theme: SpeakerWizTheme): void { this.theme = theme }
  setOptions(opts: Partial<WaveformOptions>): void {
    this.opts = { ...this.opts, ...opts }
  }

  destroy(): void { /* canvas cleanup handled externally */ }

  // ── Draw modes ────────────────────────────────────────────────────

  private drawOscilloscope(data: Float32Array, state: RenderState): void {
    const { ctx } = this
    const W = this.canvas.width  / this.dpr
    const H = this.canvas.height / this.dpr
    const cy = H / 2
    const energy = state.spring.energy.sub * state.gains.sub

    ctx.clearRect(0, 0, W, H)

    // Glow pass
    ctx.save()
    ctx.shadowColor = this.theme.waveformGlow
    ctx.shadowBlur  = 6 + energy * 10
    ctx.strokeStyle = this.theme.waveformGlow
    ctx.lineWidth   = this.opts.lineWidth + 1
    ctx.globalAlpha = 0.3
    this.tracePath(data, W, H, cy)
    ctx.stroke()
    ctx.restore()

    // Main line
    ctx.save()
    ctx.strokeStyle = this.theme.waveform
    ctx.lineWidth   = this.opts.lineWidth
    ctx.globalAlpha = 0.9 + energy * 0.1
    this.tracePath(data, W, H, cy)
    ctx.stroke()
    ctx.restore()

    // Centerline
    ctx.save()
    ctx.strokeStyle = this.theme.waveform
    ctx.lineWidth   = 0.5
    ctx.globalAlpha = 0.15
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke()
    ctx.restore()
  }

  private drawMirror(data: Float32Array, state: RenderState): void {
    const { ctx } = this
    const W  = this.canvas.width  / this.dpr
    const H  = this.canvas.height / this.dpr
    const cy = H / 2
    const energy = state.spring.energy.sub * state.gains.sub

    ctx.clearRect(0, 0, W, H)

    // Filled mirror area
    ctx.save()
    ctx.fillStyle   = this.theme.waveformFill
    ctx.globalAlpha = 0.6 + energy * 0.4

    ctx.beginPath()
    ctx.moveTo(0, cy)
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * W
      const y = cy - data[i] * cy * 0.85
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.lineTo(W, cy)
    // Mirror bottom
    for (let i = data.length - 1; i >= 0; i--) {
      const x = (i / data.length) * W
      const y = cy + data[i] * cy * 0.85
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Top line
    ctx.save()
    ctx.shadowColor = this.theme.waveformGlow
    ctx.shadowBlur  = 4 + energy * 8
    ctx.strokeStyle = this.theme.waveform
    ctx.lineWidth   = this.opts.lineWidth
    this.tracePath(data, W, H, cy, 0.85)
    ctx.stroke()
    // Bottom mirror line
    this.tracePathMirror(data, W, H, cy, 0.85)
    ctx.stroke()
    ctx.restore()
  }

  private drawFilled(data: Float32Array, state: RenderState): void {
    const { ctx } = this
    const W  = this.canvas.width  / this.dpr
    const H  = this.canvas.height / this.dpr
    const cy = H / 2
    const energy = state.spring.energy.sub * state.gains.sub

    ctx.clearRect(0, 0, W, H)

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0,   this.theme.waveform + '33')
    grad.addColorStop(0.5, this.theme.waveform + '11')
    grad.addColorStop(1,   this.theme.waveform + '00')

    ctx.save()
    ctx.fillStyle   = grad
    ctx.globalAlpha = 0.5 + energy * 0.5
    ctx.beginPath()
    ctx.moveTo(0, cy)
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * W
      const y = cy - data[i] * cy * 0.9
      ctx.lineTo(x, y)
    }
    ctx.lineTo(W, cy)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Line on top
    ctx.save()
    ctx.shadowColor = this.theme.waveformGlow
    ctx.shadowBlur  = 5 + energy * 12
    ctx.strokeStyle = this.theme.waveform
    ctx.lineWidth   = this.opts.lineWidth
    this.tracePath(data, W, H, cy, 0.9)
    ctx.stroke()
    ctx.restore()
  }

  private drawIdle(state: RenderState): void {
    const { ctx } = this
    const W  = this.canvas.width  / this.dpr
    const H  = this.canvas.height / this.dpr
    const cy = H / 2
    const t  = state.timestamp * 0.001

    ctx.clearRect(0, 0, W, H)

    // Gentle idle sine
    ctx.save()
    ctx.strokeStyle = this.theme.waveform
    ctx.lineWidth   = this.opts.lineWidth
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    for (let x = 0; x <= W; x += 2) {
      const y = cy + Math.sin((x / W) * Math.PI * 4 + t) * 3
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private tracePath(
    data: Float32Array,
    W: number,
    H: number,
    cy: number,
    scale = 1.0
  ): void {
    const ctx   = this.ctx
    const step  = Math.max(1, Math.floor(data.length / W))
    ctx.beginPath()
    for (let i = 0; i < data.length; i += step) {
      const x = (i / data.length) * W
      const y = cy - data[i] * cy * scale
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
  }

  private tracePathMirror(
    data: Float32Array,
    W: number,
    H: number,
    cy: number,
    scale = 1.0
  ): void {
    const ctx   = this.ctx
    const step  = Math.max(1, Math.floor(data.length / W))
    ctx.beginPath()
    for (let i = 0; i < data.length; i += step) {
      const x = (i / data.length) * W
      const y = cy + data[i] * cy * scale
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
  }
}
