// ─────────────────────────────────────────────────────────────────
// @waol-speakerwiz/core  —  renderers/GlowRenderer.ts
// Canvas-based bloom / corona glow overlay.
// Sits over the SVG speaker to add volumetric neon light effects
// that SVG filters alone can't achieve at performance.
// ─────────────────────────────────────────────────────────────────

import type { WaolSpeakerWizTheme, RenderState } from '../types'

export interface GlowOptions {
  /** SVG viewBox width the glow is calibrated against (default 620) */
  viewBoxW?: number
  /** SVG viewBox height (default 560) */
  viewBoxH?: number
  /** Sub woofer center X in viewBox coords (default 313) */
  subCX?: number
  /** Sub woofer center Y in viewBox coords (default 298) */
  subCY?: number
  /** Sub woofer waol-speakerwiz radius in viewBox coords (default 112) */
  subR?: number
  /** Floor reflection Y in viewBox coords (default 536) */
  floorY?: number
}

const DEFAULTS: Required<GlowOptions> = {
  viewBoxW: 620,
  viewBoxH: 560,
  subCX:    313,
  subCY:    298,
  subR:     112,
  floorY:   536,
}

export class GlowRenderer {
  private canvas: HTMLCanvasElement
  private ctx:    CanvasRenderingContext2D
  private opts:   Required<GlowOptions>
  private theme:  WaolSpeakerWizTheme
  private dpr:    number

  // Smoothed values to prevent flicker on rapid beats
  private smoothSub = 0

  constructor(
    canvas:  HTMLCanvasElement,
    opts:    GlowOptions = {},
    theme:   WaolSpeakerWizTheme,
    dpr = window.devicePixelRatio ?? 1
  ) {
    this.canvas = canvas
    this.ctx    = canvas.getContext('2d', { alpha: true })!
    this.opts   = { ...DEFAULTS, ...opts }
    this.theme  = theme
    this.dpr    = dpr

    // Canvas must be pointer-event transparent
    this.canvas.style.pointerEvents = 'none'
    this.canvas.style.position      = 'absolute'
    this.canvas.style.top           = '0'
    this.canvas.style.left          = '0'
  }

  // ── Public API ────────────────────────────────────────────────────

  update(state: RenderState): void {
    const W  = this.canvas.width  / this.dpr
    const H  = this.canvas.height / this.dpr
    const ctx = this.ctx

    // Smooth sub energy for glow (faster attack, slow decay)
    const raw = Math.abs(state.spring.sub.pos) * state.gains.sub
    this.smoothSub = raw > this.smoothSub
      ? this.smoothSub + (raw - this.smoothSub) * 0.6   // fast attack
      : this.smoothSub * 0.88                             // slow decay

    const s = this.smoothSub

    ctx.clearRect(0, 0, W, H)

    if (s < 0.015) return  // nothing to draw at rest

    // Map SVG viewBox coords to canvas pixels
    const sx = W / this.opts.viewBoxW
    const sy = H / this.opts.viewBoxH
    const cx = this.opts.subCX * sx
    const cy = this.opts.subCY * sy
    const r  = this.opts.subR  * Math.min(sx, sy)

    this.drawCoronaGlow(ctx, cx, cy, r, s, W, H)
    this.drawRingGlow(ctx, cx, cy, r, s)
    this.drawFloorReflection(ctx, cx, W, H, sx, sy, s)
    this.drawAirDistortion(ctx, cx, cy, r, s)
  }

  resize(w: number, h: number): void {
    const dpr = this.dpr
    this.canvas.width  = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width  = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.scale(dpr, dpr)
  }

  setTheme(theme: WaolSpeakerWizTheme): void { this.theme = theme }

  destroy(): void { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height) }

  // ── Draw passes ───────────────────────────────────────────────────

  /** Radial bloom emanating from speaker waol-speakerwiz */
  private drawCoronaGlow(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, r: number,
    s: number, W: number, H: number
  ): void {
    const intensity = this.theme.bloomIntensity

    const grad = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r*2.2)
    grad.addColorStop(0,   this.alpha(this.theme.bloom, s * 0.10 * intensity))
    grad.addColorStop(0.3, this.alpha(this.theme.bloom, s * 0.06 * intensity))
    grad.addColorStop(0.6, this.alpha(this.theme.bloom, s * 0.025 * intensity))
    grad.addColorStop(0.85,this.alpha(this.theme.bloom, s * 0.008 * intensity))
    grad.addColorStop(1,   this.alpha(this.theme.bloom, 0))

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  /** Sharp neon ring at surround edge */
  private drawRingGlow(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, r: number, s: number
  ): void {
    const intensity = this.theme.bloomIntensity
    const alpha = s * 0.5 * intensity

    // Outer halo ring
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2)
    ctx.strokeStyle = this.alpha(this.theme.bloom, alpha * 0.4)
    ctx.lineWidth   = r * 0.12
    ctx.filter      = `blur(${4 + s * 6}px)`
    ctx.stroke()
    ctx.filter      = 'none'

    // Sharp inner ring edge
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.99, 0, Math.PI * 2)
    ctx.strokeStyle = this.alpha(this.theme.bloom, alpha)
    ctx.lineWidth   = 2.5
    ctx.shadowColor = this.theme.bloom
    ctx.shadowBlur  = 12 * s
    ctx.stroke()
    ctx.shadowBlur  = 0

    // Second inner ring
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2)
    ctx.strokeStyle = this.alpha(this.theme.bloom, alpha * 0.35)
    ctx.lineWidth   = 1.5
    ctx.stroke()

    ctx.restore()
  }

  /** Elliptical floor reflection pool */
  private drawFloorReflection(
    ctx: CanvasRenderingContext2D,
    cx: number, W: number, H: number,
    sx: number, sy: number, s: number
  ): void {
    const fy      = this.opts.floorY * sy
    const rx      = this.opts.subR   * sx * 1.2
    const ry      = 10 * sy
    const intensity = this.theme.bloomIntensity

    const grad = ctx.createRadialGradient(cx, fy, 0, cx, fy, rx)
    grad.addColorStop(0,   this.alpha(this.theme.floorGlow, s * 0.18 * intensity))
    grad.addColorStop(0.4, this.alpha(this.theme.floorGlow, s * 0.08 * intensity))
    grad.addColorStop(0.7, this.alpha(this.theme.floorGlow, s * 0.025 * intensity))
    grad.addColorStop(1,   this.alpha(this.theme.floorGlow, 0))

    ctx.save()
    ctx.scale(1, ry / rx)  // squash into ellipse
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, fy * (rx / ry), rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  /** Subtle air-pressure distortion rings on hard hits */
  private drawAirDistortion(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, r: number, s: number
  ): void {
    if (s < 0.4) return  // only visible on strong hits

    const rings = 3
    const t     = (Date.now() % 600) / 600  // 0–1 expanding ring phase

    for (let i = 0; i < rings; i++) {
      const phase = (t + i / rings) % 1
      const er    = r * (1 + phase * 0.8)
      const alpha = (1 - phase) * (s - 0.4) * 0.12 * this.theme.bloomIntensity

      if (alpha < 0.005) continue

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, er, 0, Math.PI * 2)
      ctx.strokeStyle = this.alpha(this.theme.bloom, alpha)
      ctx.lineWidth   = 2 * (1 - phase)
      ctx.stroke()
      ctx.restore()
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────

  /** Convert hex color + alpha to rgba string */
  private alpha(hex: string, a: number): string {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.slice(0,2), 16)
    const g = parseInt(clean.slice(2,4), 16)
    const b = parseInt(clean.slice(4,6), 16)
    return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, a)).toFixed(4)})`
  }
}
