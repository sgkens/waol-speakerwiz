// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  renderers/EQRenderer.ts
// Canvas EQ visualizer — bars, curve, or filled-curve modes
// Peak hold, grid labels, smooth animation
// ─────────────────────────────────────────────────────────────────

import type { EQOptions, SpeakerWizTheme, RenderState } from '../types'

const DEFAULTS: Required<EQOptions> = {
  mode:       'bars',
  bands:      32,
  height:     96,
  showLabels: true,
  showGrid:   true,
  peakHold:   true,
  peakDecay:  0.4,   // px per frame
  barGap:     2,
  barRadius:  2,
}

// Frequency label positions for grid
const FREQ_LABELS = [
  { hz: 63,   label: '63'  },
  { hz: 125,  label: '125' },
  { hz: 250,  label: '250' },
  { hz: 500,  label: '500' },
  { hz: 1000, label: '1k'  },
  { hz: 2000, label: '2k'  },
  { hz: 4000, label: '4k'  },
  { hz: 8000, label: '8k'  },
  { hz: 16000,label: '16k' },
]

export class EQRenderer {
  private canvas:   HTMLCanvasElement
  private ctx:      CanvasRenderingContext2D
  private opts:     Required<EQOptions>
  private theme:    SpeakerWizTheme
  private dpr:      number
  private peaks:    Float32Array
  private gradient: CanvasGradient | null = null
  private sampleRate = 44100

  constructor(
    canvas:     HTMLCanvasElement,
    opts:       EQOptions = {},
    theme:      SpeakerWizTheme,
    dpr = window.devicePixelRatio ?? 1
  ) {
    this.canvas = canvas
    this.ctx    = canvas.getContext('2d')!
    this.opts   = { ...DEFAULTS, ...opts }
    this.theme  = theme
    this.dpr    = dpr
    this.peaks  = new Float32Array(this.opts.bands)
  }

  // ── Public ────────────────────────────────────────────────────────

  update(state: RenderState, sampleRate = 44100): void {
    this.sampleRate = sampleRate
    const data = state.frequency
    if (!data || data.length === 0) {
      this.drawIdle(state)
      return
    }

    const W  = this.canvas.width  / this.dpr
    const H  = this.canvas.height / this.dpr
    const ctx = this.ctx

    ctx.clearRect(0, 0, W, H)

    // Compute band energies from raw FFT data
    const energies = this.computeBands(data)

    if (this.opts.showGrid)   this.drawGrid(W, H, data.length)
    if (this.opts.showLabels) this.drawLabels(W, H, data.length)

    switch (this.opts.mode) {
      case 'bars':         this.drawBars(energies, W, H);        break
      case 'curve':        this.drawCurve(energies, W, H, false); break
      case 'filled-curve': this.drawCurve(energies, W, H, true);  break
    }

    if (this.opts.peakHold) this.drawPeaks(energies, W, H)
  }

  resize(w: number, h: number): void {
    const dpr = this.dpr
    this.canvas.width  = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width  = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.scale(dpr, dpr)
    this.gradient = null  // invalidate cached gradient
  }

  setTheme(theme: SpeakerWizTheme): void {
    this.theme    = theme
    this.gradient = null
  }

  setOptions(opts: Partial<EQOptions>): void {
    const oldBands = this.opts.bands
    this.opts = { ...this.opts, ...opts }
    if (this.opts.bands !== oldBands) {
      this.peaks = new Float32Array(this.opts.bands)
    }
  }

  reset(): void {
    this.peaks.fill(0)
  }

  destroy(): void { /* handled externally */ }

  // ── Band computation ──────────────────────────────────────────────

  private computeBands(data: Uint8Array): Float32Array {
    const { bands } = this.opts
    const out        = new Float32Array(bands)
    const len        = data.length

    // Map bands logarithmically across FFT bins (20Hz – Nyquist)
    const logMin = Math.log10(20)
    const logMax = Math.log10(this.sampleRate / 2)

    for (let b = 0; b < bands; b++) {
      const freqLo = Math.pow(10, logMin + (b / bands)       * (logMax - logMin))
      const freqHi = Math.pow(10, logMin + ((b+1) / bands)   * (logMax - logMin))
      const binHz  = (this.sampleRate / 2) / len

      const lo = Math.max(0,   Math.floor(freqLo / binHz))
      const hi = Math.min(len, Math.ceil (freqHi / binHz))

      let sum = 0
      const count = Math.max(1, hi - lo)
      for (let i = lo; i < hi; i++) sum += data[i]
      out[b] = (sum / count) / 255
    }

    return out
  }

  // ── Draw methods ──────────────────────────────────────────────────

  private drawBars(energies: Float32Array, W: number, H: number): void {
    const { ctx, opts } = this
    const n    = energies.length
    const totalGap = opts.barGap * (n - 1)
    const barW = (W - totalGap) / n
    const grad = this.getBarGradient(H)

    for (let i = 0; i < n; i++) {
      const x = i * (barW + opts.barGap)
      const h = energies[i] * (H - (opts.showLabels ? 16 : 4))
      const y = H - h - (opts.showLabels ? 16 : 4)

      // Glow
      ctx.save()
      ctx.shadowColor = this.theme.eqGlow
      ctx.shadowBlur  = 4 + energies[i] * 8
      ctx.fillStyle   = grad
      this.roundRect(ctx, x, y, Math.max(1, barW), h, opts.barRadius)
      ctx.fill()
      ctx.restore()
    }

    // Update peaks
    if (opts.peakHold) {
      for (let i = 0; i < n; i++) {
        const h = energies[i] * (H - (opts.showLabels ? 16 : 4))
        if (h > this.peaks[i]) this.peaks[i] = h
        else this.peaks[i] = Math.max(0, this.peaks[i] - opts.peakDecay)
      }
    }
  }

  private drawCurve(energies: Float32Array, W: number, H: number, filled: boolean): void {
    const { ctx } = this
    const n       = energies.length
    const labH    = this.opts.showLabels ? 16 : 4
    const drawH   = H - labH

    const pts: [number, number][] = []
    for (let i = 0; i < n; i++) {
      pts.push([
        (i / (n - 1)) * W,
        drawH - energies[i] * drawH * 0.95,
      ])
    }

    ctx.save()
    ctx.shadowColor = this.theme.eqGlow
    ctx.shadowBlur  = 8

    if (filled) {
      const grad = ctx.createLinearGradient(0, 0, 0, drawH)
      grad.addColorStop(0,   this.theme.eqGlow + '88')
      grad.addColorStop(0.6, this.theme.eqGlow + '22')
      grad.addColorStop(1,   this.theme.eqGlow + '00')

      ctx.beginPath()
      ctx.moveTo(0, drawH)
      this.splinePath(ctx, pts)
      ctx.lineTo(W, drawH)
      ctx.closePath()
      ctx.fillStyle   = grad
      ctx.globalAlpha = 0.7
      ctx.fill()
    }

    ctx.beginPath()
    this.splinePath(ctx, pts)
    ctx.strokeStyle = this.theme.eqGlow
    ctx.lineWidth   = 2
    ctx.globalAlpha = 1
    ctx.stroke()
    ctx.restore()

    // Update peaks
    if (this.opts.peakHold) {
      const drawHh = drawH
      for (let i = 0; i < n; i++) {
        const h = energies[i] * drawHh * 0.95
        if (h > this.peaks[i]) this.peaks[i] = h
        else this.peaks[i] = Math.max(0, this.peaks[i] - this.opts.peakDecay)
      }
    }
  }

  private drawPeaks(energies: Float32Array, W: number, H: number): void {
    const { ctx, opts } = this
    const n    = energies.length
    const labH = opts.showLabels ? 16 : 4
    const drawH = H - labH

    if (opts.mode === 'bars') {
      const totalGap = opts.barGap * (n - 1)
      const barW = (W - totalGap) / n

      for (let i = 0; i < n; i++) {
        if (this.peaks[i] < 1) continue
        const x = i * (barW + opts.barGap)
        const y = drawH - this.peaks[i]
        ctx.save()
        ctx.strokeStyle = this.theme.eqGlow
        ctx.lineWidth   = 1.5
        ctx.globalAlpha = 0.8
        ctx.shadowColor = this.theme.eqGlow
        ctx.shadowBlur  = 4
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.max(1, barW), y)
        ctx.stroke()
        ctx.restore()
      }
    }
  }

  private drawGrid(W: number, H: number, fftLen: number): void {
    const { ctx } = this
    const labH = this.opts.showLabels ? 16 : 4
    const drawH = H - labH

    ctx.save()
    ctx.strokeStyle = this.theme.waveform
    ctx.lineWidth   = 0.5
    ctx.globalAlpha = 0.08

    // Horizontal dB lines (–12, –24, –36 dB approximate)
    for (const frac of [0.25, 0.5, 0.75]) {
      const y = drawH * (1 - frac)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    ctx.restore()
  }

  private drawLabels(W: number, H: number, fftLen: number): void {
    const { ctx } = this
    const sR = this.sampleRate
    const binHz = (sR / 2) / fftLen
    const logMin = Math.log10(20)
    const logMax = Math.log10(sR / 2)

    ctx.save()
    ctx.fillStyle  = this.theme.waveform
    ctx.globalAlpha = 0.35
    ctx.font        = `9px monospace`
    ctx.textAlign   = 'center'

    for (const { hz, label } of FREQ_LABELS) {
      if (hz > sR / 2) continue
      const frac = (Math.log10(hz) - logMin) / (logMax - logMin)
      const x    = frac * W
      ctx.fillText(label, x, H - 3)
    }
    ctx.restore()
  }

  private drawIdle(state: RenderState): void {
    const { ctx } = this
    const W  = this.canvas.width  / this.dpr
    const H  = this.canvas.height / this.dpr
    const t  = state.timestamp * 0.001

    ctx.clearRect(0, 0, W, H)

    // Flat idle line with faint noise
    ctx.save()
    ctx.strokeStyle = this.theme.eqGlow
    ctx.lineWidth   = 1.5
    ctx.globalAlpha = 0.12
    ctx.beginPath()
    ctx.moveTo(0, H / 2)
    ctx.lineTo(W, H / 2)
    ctx.stroke()
    ctx.restore()
  }

  // ── Utilities ─────────────────────────────────────────────────────

  private getBarGradient(H: number): CanvasGradient {
    if (!this.gradient) {
      const grad = this.ctx.createLinearGradient(0, 0, 0, H)
      const cols = this.theme.eq
      cols.forEach((c, i) => grad.addColorStop(1 - i / (cols.length - 1), c))
      this.gradient = grad
    }
    return this.gradient
  }

  /** Catmull-Rom spline for smooth EQ curve */
  private splinePath(ctx: CanvasRenderingContext2D, pts: [number,number][]): void {
    if (pts.length < 2) return
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i-1)]
      const p1 = pts[i]
      const p2 = pts[i+1]
      const p3 = pts[Math.min(pts.length-1, i+2)]
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1])
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
  ): void {
    if (h < 1) return
    r = Math.min(r, h / 2, w / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
