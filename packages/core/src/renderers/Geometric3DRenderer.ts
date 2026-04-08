// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  renderers/Geometric3DRenderer.ts
// 3D Geometric Visualizations (Canvas 2D wireframe projection)
// ─────────────────────────────────────────────────────────────────

import type { Geometric3DOptions, SpeakerWizTheme, RenderState } from '../types'

const DEFAULTS: Required<Geometric3DOptions> = {
  type:          'cube',
  wireframe:     true,
  rotationSpeed: 0.01,
  sensitivity:   1.0,
}

interface Point3D { x: number; y: number; z: number }

export class Geometric3DRenderer {
  private canvas: HTMLCanvasElement
  private ctx:    CanvasRenderingContext2D
  private opts:   Required<Geometric3DOptions>
  private theme:  SpeakerWizTheme
  private dpr:    number
  private angleX = 0
  private angleY = 0

  constructor(
    canvas: HTMLCanvasElement,
    opts:   Geometric3DOptions = {},
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
    const W = this.canvas.width  / this.dpr
    const H = this.canvas.height / this.dpr
    const ctx = this.ctx
    const energy = state.spring.energy.sub * state.gains.sub * this.opts.sensitivity

    ctx.clearRect(0, 0, W, H)
    
    this.angleX += this.opts.rotationSpeed * (1 + energy * 2)
    this.angleY += this.opts.rotationSpeed * 0.8 * (1 + energy * 2)

    const size = Math.min(W, H) * 0.25 * (1 + energy * 0.5)
    
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.strokeStyle = this.theme.speakerwizGlow
    ctx.lineWidth = 1.5
    ctx.shadowColor = this.theme.speakerwizGlow
    ctx.shadowBlur = 10 * energy

    if (this.opts.type === 'cube') {
      this.drawCube(size)
    } else if (this.opts.type === 'sphere') {
      this.drawSphere(size)
    } else if (this.opts.type === 'torus') {
      this.drawTorus(size)
    }

    ctx.restore()
  }

  private drawCube(size: number): void {
    const vertices: Point3D[] = [
      {x: -size, y: -size, z: -size}, {x: size, y: -size, z: -size},
      {x: size, y: size, z: -size},   {x: -size, y: size, z: -size},
      {x: -size, y: -size, z: size},  {x: size, y: -size, z: size},
      {x: size, y: size, z: size},    {x: -size, y: size, z: size}
    ]

    const edges = [
      [0,1], [1,2], [2,3], [3,0],
      [4,5], [5,6], [6,7], [7,4],
      [0,4], [1,5], [2,6], [3,7]
    ]

    const rotated = vertices.map(v => this.rotate(v))
    const projected = rotated.map(v => this.project(v))

    for (const [i, j] of edges) {
      this.ctx.beginPath()
      this.ctx.moveTo(projected[i].x, projected[i].y)
      this.ctx.lineTo(projected[j].x, projected[j].y)
      this.ctx.stroke()
    }
  }

  private drawSphere(size: number): void {
    const rings = 8
    const pointsPerRing = 12
    
    for (let i = 0; i < rings; i++) {
      const phi = (Math.PI * i) / (rings - 1)
      this.ctx.beginPath()
      for (let j = 0; j <= pointsPerRing; j++) {
        const theta = (Math.PI * 2 * j) / pointsPerRing
        const v = {
          x: size * Math.sin(phi) * Math.cos(theta),
          y: size * Math.cos(phi),
          z: size * Math.sin(phi) * Math.sin(theta)
        }
        const p = this.project(this.rotate(v))
        if (j === 0) this.ctx.moveTo(p.x, p.y)
        else this.ctx.lineTo(p.x, p.y)
      }
      this.ctx.stroke()
    }
  }

  private drawTorus(size: number): void {
    const mainR = size
    const tubeR = size * 0.4
    const mainSegs = 16
    const tubeSegs = 8

    for (let i = 0; i < mainSegs; i++) {
      const mainA = (i * Math.PI * 2) / mainSegs
      this.ctx.beginPath()
      for (let j = 0; j <= tubeSegs; j++) {
        const tubeA = (j * Math.PI * 2) / tubeSegs
        const r = mainR + tubeR * Math.cos(tubeA)
        const v = {
          x: r * Math.cos(mainA),
          y: r * Math.sin(mainA),
          z: tubeR * Math.sin(tubeA)
        }
        const p = this.project(this.rotate(v))
        if (j === 0) this.ctx.moveTo(p.x, p.y)
        else this.ctx.lineTo(p.x, p.y)
      }
      this.ctx.stroke()
    }
  }

  private rotate(v: Point3D): Point3D {
    // Rotate Y
    let x = v.x * Math.cos(this.angleY) - v.z * Math.sin(this.angleY)
    let z = v.x * Math.sin(this.angleY) + v.z * Math.cos(this.angleY)
    // Rotate X
    let y = v.y * Math.cos(this.angleX) - z * Math.sin(this.angleX)
    z = v.y * Math.sin(this.angleX) + z * Math.cos(this.angleX)
    return {x, y, z}
  }

  private project(v: Point3D): {x: number, y: number} {
    const fov = 400
    const scale = fov / (fov + v.z)
    return { x: v.x * scale, y: v.y * scale }
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
