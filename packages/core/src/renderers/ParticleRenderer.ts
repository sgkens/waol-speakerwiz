// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  renderers/ParticleRenderer.ts
// Audio-reactive particle system
// ─────────────────────────────────────────────────────────────────

import type { ParticleOptions, SpeakerWizTheme, RenderState } from '../types'

const DEFAULTS: Required<ParticleOptions> = {
  count:       200,
  size:        [2, 6],
  speed:       1,
  colorScale:  ['#00d4ff', '#ffffff'],
  gravity:     0.05,
  interaction: 'volume',
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
}

export class ParticleRenderer {
  private canvas:    HTMLCanvasElement
  private ctx:       CanvasRenderingContext2D
  private opts:      Required<ParticleOptions>
  private theme:     SpeakerWizTheme
  private dpr:       number
  private particles: Particle[] = []

  constructor(
    canvas: HTMLCanvasElement,
    opts:   ParticleOptions = {},
    theme:  SpeakerWizTheme,
    dpr = window.devicePixelRatio ?? 1
  ) {
    this.canvas = canvas
    this.ctx    = canvas.getContext('2d', { alpha: true })!
    this.opts   = { ...DEFAULTS, ...opts }
    this.theme  = theme
    this.dpr    = dpr
    this.init()
  }

  private init(): void {
    const W = this.canvas.width  / this.dpr
    const H = this.canvas.height / this.dpr
    this.particles = Array.from({ length: this.opts.count }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      vx:    (Math.random() - 0.5) * 2,
      vy:    (Math.random() - 0.5) * 2,
      size:  this.opts.size[0] + Math.random() * (this.opts.size[1] - this.opts.size[0]),
      color: this.opts.colorScale[Math.floor(Math.random() * this.opts.colorScale.length)],
    }))
  }

  update(state: RenderState): void {
    const W = this.canvas.width  / this.dpr
    const H = this.canvas.height / this.dpr
    const ctx = this.ctx
    const energy = state.spring.energy.sub * state.gains.sub

    // Trails effect: instead of clearRect, we draw a semi-transparent overlay
    ctx.fillStyle = 'rgba(4, 6, 8, 0.15)' // Matches dashboard bg
    ctx.fillRect(0, 0, W, H)

    for (const p of this.particles) {
      // 1. Audio Interaction
      if (this.opts.interaction === 'volume') {
        p.vx += (Math.random() - 0.5) * energy * 3
        p.vy += (Math.random() - 0.5) * energy * 3
      }

      // 2. Physics
      p.x += p.vx * this.opts.speed
      p.y += p.vy * this.opts.speed
      p.vy += this.opts.gravity
      
      // Air resistance / friction
      p.vx *= 0.98
      p.vy *= 0.98

      // 3. Bounds
      if (p.x < 0) { p.x = W; } else if (p.x > W) { p.x = 0; }
      if (p.y > H) { p.y = 0; p.vy = Math.random() * 2; }

      // 4. Render
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (1 + energy * 1.5), 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = 0.6 + energy * 0.4
      ctx.fill()
    }
    ctx.globalAlpha = 1.0
  }

  resize(w: number, h: number): void {
    const dpr = this.dpr
    this.canvas.width  = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width  = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.scale(dpr, dpr)
    this.init()
  }

  setTheme(theme: SpeakerWizTheme): void { this.theme = theme }

  destroy(): void { /* cleanup */ }
}
