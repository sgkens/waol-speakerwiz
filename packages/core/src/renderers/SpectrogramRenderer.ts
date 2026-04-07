// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  renderers/SpectrogramRenderer.ts
// Waterfall / Heatmap display — frequencies over time
// ─────────────────────────────────────────────────────────────────

import type { SpectrogramOptions, SpeakerWizTheme, RenderState } from '../types'

const DEFAULTS: Required<SpectrogramOptions> = {
  mode:       'waterfall',
  height:     160,
  speed:      1,
  colorScale: ['#000000', '#004466', '#00d4ff', '#ffffff'],
}

export class SpectrogramRenderer {
  private canvas: HTMLCanvasElement
  private ctx:    CanvasRenderingContext2D
  private temp:   HTMLCanvasElement
  private tempCtx: CanvasRenderingContext2D
  private opts:   Required<SpectrogramOptions>
  private theme:  SpeakerWizTheme
  private dpr:    number
  private offset = 0

  constructor(
    canvas: HTMLCanvasElement,
    opts:   SpectrogramOptions = {},
    theme:  SpeakerWizTheme,
    dpr = window.devicePixelRatio ?? 1
  ) {
    this.canvas = canvas
    this.ctx    = canvas.getContext('2d', { alpha: false })!
    this.temp   = document.createElement('canvas')
    this.tempCtx = this.temp.getContext('2d', { alpha: false })!
    this.opts   = { ...DEFAULTS, ...opts }
    this.theme  = theme
    this.dpr    = dpr
  }

  update(state: RenderState): void {
    const data = state.frequency
    if (!data || data.length === 0) return

    const W = this.canvas.width
    const H = this.canvas.height
    const ctx = this.ctx
    const speed = Math.max(1, Math.round(this.opts.speed * this.dpr))

    // 1. Shift existing image using a more performant wrap-around if possible, 
    // but for simplicity and 'waterfall' feel, we'll stick to drawImage but optimize it.
    // Actually, drawImage(self) is often fast enough if not for the alpha blend.
    // Let's use the scanline approach but draw to the 'current' top and shift.
    
    this.tempCtx.drawImage(this.canvas, 0, 0)
    ctx.save()
    ctx.drawImage(this.temp, 0, speed)
    ctx.restore()

    // 2. Draw new scanline at top
    const imgData = ctx.createImageData(W, speed)
    const len = data.length
    
    for (let x = 0; x < W; x++) {
      const frac = x / W
      const idx  = Math.floor(frac * len)
      const val  = data[idx]
      
      const [r, g, b] = this.getColor(val / 255)
      
      for (let y = 0; y < speed; y++) {
        const offset = (y * W + x) * 4
        imgData.data[offset]     = r
        imgData.data[offset + 1] = g
        imgData.data[offset + 2] = b
        imgData.data[offset + 3] = 255
      }
    }
    
    ctx.putImageData(imgData, 0, 0)
  }

  resize(w: number, h: number): void {
    const dpr = this.dpr
    this.canvas.width  = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width  = `${w}px`
    this.canvas.style.height = `${h}px`
    this.temp.width  = this.canvas.width
    this.temp.height = this.canvas.height
  }

  setTheme(theme: SpeakerWizTheme): void { this.theme = theme }

  destroy(): void { /* cleanup */ }

  private getColor(t: number): [number, number, number] {
    // Basic multi-stop color interpolation
    const stops = this.opts.colorScale
    const n = stops.length
    const i = Math.min(n - 2, Math.floor(t * (n - 1)))
    const frac = (t * (n - 1)) - i
    
    const c1 = this.hexToRgb(stops[i])
    const c2 = this.hexToRgb(stops[i+1])
    
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * frac),
      Math.round(c1[1] + (c2[1] - c1[1]) * frac),
      Math.round(c1[2] + (c2[2] - c1[2]) * frac),
    ]
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '')
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    return [r, g, b]
  }
}
