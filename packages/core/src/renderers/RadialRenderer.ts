// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  renderers/RadialRenderer.ts
// Circular / Radial visualizations — bars, rings, waves
// ─────────────────────────────────────────────────────────────────

import type { RadialOptions, SpeakerWizTheme, RenderState } from '../types'

const DEFAULTS: Required<RadialOptions> = {
  mode:        'bars',
  radius:      120,
  innerRadius: 60,
  lineWidth:   2,
  gap:         2,
}

export class RadialRenderer {
  private canvas: HTMLCanvasElement
  private ctx:    CanvasRenderingContext2D
  private opts:   Required<RadialOptions>
  private theme:  SpeakerWizTheme
  private dpr:    number

  constructor(
    canvas: HTMLCanvasElement,
    opts:   RadialOptions = {},
    theme:  SpeakerWizTheme,
    dpr = window.devicePixelRatio ?? 1
  ) {
    this.canvas = canvas
    this.ctx    = canvas.getContext('2d')!
    this.opts   = { ...DEFAULTS, ...opts }
    this.theme  = theme
    this.dpr    = dpr
  }

  update(state: RenderState): void {
    const data = state.frequency
    if (!data || data.length === 0) return

    const W = this.canvas.width  / this.dpr
    const H = this.canvas.height / this.dpr
    const ctx = this.ctx
    const cx = W / 2
    const cy = H / 2

    ctx.clearRect(0, 0, W, H)

    switch (this.opts.mode) {
      case 'bars':  this.drawRadialBars(data, cx, cy); break
      case 'rings': this.drawRadialRings(state, cx, cy); break
      case 'wave':  this.drawRadialWave(data, cx, cy); break
    }
  }

  private drawRadialBars(data: Uint8Array, cx: number, cy: number): void {
    const { ctx, opts } = this
    const len = data.length / 2 // Only use half for better symmetry or detail
    const angleStep = (Math.PI * 2) / len
    
    ctx.save()
    ctx.lineWidth = opts.lineWidth
    ctx.lineCap = 'round'
    ctx.strokeStyle = this.theme.speakerwizGlow

    for (let i = 0; i < len; i++) {
      const angle = i * angleStep
      const val   = data[i] / 255
      const h     = val * (opts.radius - opts.innerRadius)
      
      const x1 = cx + Math.cos(angle) * opts.innerRadius
      const y1 = cy + Math.sin(angle) * opts.innerRadius
      const x2 = cx + Math.cos(angle) * (opts.innerRadius + h)
      const y2 = cy + Math.sin(angle) * (opts.innerRadius + h)
      
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawRadialRings(state: RenderState, cx: number, cy: number): void {
    const { ctx, opts } = this
    const energy = state.spring.energy.sub * state.gains.sub
    
    ctx.save()
    ctx.lineWidth = opts.lineWidth
    ctx.strokeStyle = this.theme.speakerwizGlow
    
    for (let i = 0; i < 3; i++) {
      const r = opts.innerRadius + (i * 20) + (energy * 15)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.globalAlpha = 0.8 / (i + 1)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawRadialWave(data: Uint8Array, cx: number, cy: number): void {
    const { ctx, opts } = this
    const len = data.length / 2
    const angleStep = (Math.PI * 2) / len
    
    ctx.save()
    ctx.lineWidth = opts.lineWidth
    ctx.strokeStyle = this.theme.speakerwizGlow
    ctx.beginPath()
    
    for (let i = 0; i <= len; i++) {
      const idx = i % len
      const angle = i * angleStep
      const val = data[idx] / 255
      const r = opts.innerRadius + val * (opts.radius - opts.innerRadius)
      
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
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

  destroy(): void { /* cleanup */ }
}
