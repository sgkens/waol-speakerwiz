// ─────────────────────────────────────────────────────────────────
// @waol-speakerwiz/core  —  renderers/SpeakerRenderer.ts
// Programmatic SVG speaker renderer.
// Builds the full 3-way stack (or single sub) entirely in JS —
// no external SVG files required.
// ─────────────────────────────────────────────────────────────────

import type { SpeakerOptions, WaolSpeakerWizTheme, RenderState } from '../types'

const SVG_NS = 'http://www.w3.org/2000/svg'

const DEFAULTS: Required<SpeakerOptions> = {
  drivers:      3,
  subRadius:    112,
  waolSpeakerwizRings:    18,
  showScrews:   true,
  showPort:     true,
  showTweeters: true,
}

// ── Utility helpers ───────────────────────────────────────────────

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {}
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  return e
}

function circle(attrs: Record<string, string | number>) {
  return el('circle', attrs)
}

function rect(attrs: Record<string, string | number>) {
  return el('rect', attrs)
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`
}

// ─────────────────────────────────────────────────────────────────

export class SpeakerRenderer {
  private svg:   SVGSVGElement
  private defs:  SVGDefsElement
  private opts:  Required<SpeakerOptions>
  private theme: WaolSpeakerWizTheme
  private ids:   Record<string, string> = {}

  // Animated group refs
  private subWaolSpeakerWizGroup:  SVGGElement | null = null
  private midLeftGroup:  SVGGElement | null = null
  private midRightGroup: SVGGElement | null = null
  private tweeterGroups: SVGGElement[]      = []
  private neonRings:     SVGCircleElement[] = []
  private floorGlowEl:   SVGEllipseElement | null = null

  // Previous state for delta culling
  private lastSubPos  = 0
  private lastMidPos  = 0
  private lastHiPos   = 0

  constructor(
    container: HTMLElement | SVGSVGElement,
    opts:      SpeakerOptions = {},
    theme:     WaolSpeakerWizTheme
  ) {
    this.opts  = { ...DEFAULTS, ...opts }
    this.theme = theme

    if (container instanceof SVGSVGElement) {
      this.svg = container
    } else {
      this.svg = el('svg') as SVGSVGElement
      this.svg.setAttribute('viewBox', '0 0 620 560')
      this.svg.setAttribute('xmlns', SVG_NS)
      container.appendChild(this.svg)
    }

    this.defs = el('defs')
    this.svg.appendChild(this.defs)

    this.buildIds()
    this.buildDefs()
    this.buildScene()
  }

  // ── Public API ────────────────────────────────────────────────────

  update(state: RenderState): void {
    const s = state.spring
    const g = state.gains

    const subPos  = s.sub.pos * g.sub
    const midPos  = s.mid.pos * g.mid
    const hiPos   = s.hi.pos  * g.hi
    const subE    = s.energy.sub * g.sub

    // Sub speakerwiz — translate Y (excursion) + scale (flexing)
    if (this.subWaolSpeakerWizGroup && Math.abs(subPos - this.lastSubPos) > 0.0005) {
      const shift = subPos * 3.0
      const scale = 1 + subPos * 0.028
      this.subWaolSpeakerWizGroup.style.transform =
        `translateY(${shift.toFixed(3)}px) scale(${scale.toFixed(4)})`
      this.lastSubPos = subPos
    }

    // Neon ring brightness
    for (const r of this.neonRings) {
      const base = parseFloat(r.dataset.baseOpacity ?? '0.5')
      r.style.opacity = String(Math.min(1, base + subE * 0.5))
    }

    // Floor glow
    if (this.floorGlowEl) {
      this.floorGlowEl.style.opacity = String(0.15 + subE * 0.65)
    }

    // Mid drivers - animate scale and excursion
    if (Math.abs(midPos - this.lastMidPos) > 0.0005) {
      const shift = midPos * 1.8
      const scale = 1 + midPos * 0.038
      const t = `translateY(${shift.toFixed(3)}px) scale(${scale.toFixed(4)})`
      if (this.midLeftGroup)  this.midLeftGroup.style.transform  = t
      if (this.midRightGroup) this.midRightGroup.style.transform = t
      this.lastMidPos = midPos
    }

    // Tweeters - animate scale and excursion
    if (Math.abs(hiPos - this.lastHiPos) > 0.0005) {
      const shift = hiPos * 0.8
      const scale = 1 + hiPos * 0.055
      const t = `translateY(${shift.toFixed(3)}px) scale(${scale.toFixed(4)})`
      for (const tw of this.tweeterGroups) tw.style.transform = t
      this.lastHiPos = hiPos
    }
  }

  setTheme(theme: WaolSpeakerWizTheme): void {
    this.theme = theme
    while (this.defs.firstChild) this.defs.removeChild(this.defs.firstChild)
    this.buildDefs()
    this.rebuildScene()
  }

  resize(w: number, h: number): void {
    this.svg.setAttribute('width',  String(w))
    this.svg.setAttribute('height', String(h))
  }

  getSVGElement(): SVGSVGElement { return this.svg }

  destroy(): void {
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild)
    this.neonRings     = []
    this.tweeterGroups = []
    this.subWaolSpeakerWizGroup  = null
    this.midLeftGroup  = null
    this.midRightGroup = null
  }

  // ── Private ────────────────────────────────────────────────────────

  private buildIds(): void {
    const names = [
      'cab-c','cab-c-face','cab-s','edge-top','edge-l','edge-r',
      'basket','basket-sheen','surround','sub-waol-speakerwiz','sub-sheen',
      'mid-waol-speakerwiz','mid-surround','tweeter-dome','vc','dustcap',
      'screw','screw-hi','floor',
      'f-neon-sm','f-neon-md','f-neon-lg','f-shadow',
    ]
    for (const n of names) this.ids[n] = uid(n)
  }

  private id(name: string) { return this.ids[name] ?? name }
  private url(name: string) { return `url(#${this.id(name)})` }

  private buildDefs(): void {
    const d = this.defs
    const t = this.theme

    d.appendChild(this.makeFilter(this.id('f-neon-sm'), [2.5], true))
    d.appendChild(this.makeFilter(this.id('f-neon-md'), [5, 10], true))
    d.appendChild(this.makeFilter(this.id('f-neon-lg'), [8, 18, 30], true))

    const fShadow = el('filter', { id: this.id('f-shadow'), x:'-20%', y:'-20%', width:'140%', height:'140%' })
    const ds = el('feDropShadow', { dx:'0', dy:'6', stdDeviation:'10', 'flood-color':'#000', 'flood-opacity':'0.65' })
    fShadow.appendChild(ds)
    d.appendChild(fShadow)

    d.appendChild(this.makeLinearGrad(this.id('cab-c'), '0%','0%','100%','100%', [
      { o:'0%',   c:'#1c2830' },
      { o:'40%',  c:'#141e25' },
      { o:'70%',  c:'#111820' },
      { o:'100%', c:'#0c1318' },
    ]))
    d.appendChild(this.makeLinearGrad(this.id('cab-c-face'), '0%','0%','100%','0%', [
      { o:'0%',   c:'#0e1820', a:0.8 },
      { o:'15%',  c:'#182530' },
      { o:'50%',  c:'#1a2830' },
      { o:'85%',  c:'#182530' },
      { o:'100%', c:'#0e1820', a:0.8 },
    ]))
    d.appendChild(this.makeLinearGrad(this.id('cab-s'), '0%','0%','100%','100%', [
      { o:'0%',   c:'#16222a' },
      { o:'50%',  c:'#0f1a22' },
      { o:'100%', c:'#0a1218' },
    ]))
    d.appendChild(this.makeLinearGrad(this.id('edge-top'), '0%','0%','100%','0%', [
      { o:'0%',   c:'#1e3040', a:0 },
      { o:'20%',  c:'#3a5060' },
      { o:'50%',  c:'#4a6070' },
      { o:'80%',  c:'#3a5060' },
      { o:'100%', c:'#1e3040', a:0 },
    ]))
    d.appendChild(this.makeLinearGrad(this.id('edge-l'), '0%','0%','100%','0%', [
      { o:'0%',   c:'#2a4050' },
      { o:'100%', c:'#0a1218', a:0 },
    ]))
    d.appendChild(this.makeLinearGrad(this.id('edge-r'), '0%','0%','100%','0%', [
      { o:'0%',   c:'#0a1218', a:0 },
      { o:'100%', c:'#2a4050' },
    ]))

    d.appendChild(this.makeRadialGrad(this.id('basket'), [
      { o:'0%',   c:'#2a3a42' },
      { o:'60%',  c:'#1a2a32' },
      { o:'80%',  c:'#243444' },
      { o:'90%',  c:'#1a2a32' },
      { o:'100%', c:'#0e1820' },
    ]))
    d.appendChild(this.makeLinearGrad(this.id('basket-sheen'), '20%','10%','80%','90%', [
      { o:'0%',   c:'#ffffff', a:0.04 },
      { o:'40%',  c:'#ffffff', a:0.01 },
      { o:'60%',  c:'#000000', a:0.05 },
      { o:'100%', c:'#000000', a:0 },
    ]))
    d.appendChild(this.makeRadialGrad(this.id('surround'), [
      { o:'0%',   c:'#1e2e38' },
      { o:'40%',  c:'#141e28' },
      { o:'75%',  c:'#0c1620' },
      { o:'100%', c:'#0a1218' },
    ], '50%','40%','55%'))

    // Sub — uses theme color
    d.appendChild(this.makeRadialGrad(this.id('sub-waol-speakerwiz'), [
      { o:'0%',   c: this.mixDark(t.waolSpeakerwiz, 0.9) },
      { o:'30%',  c: this.mixDark(t.waolSpeakerwiz, 0.6) },
      { o:'60%',  c: this.mixDark(t.waolSpeakerwiz, 0.3) },
      { o:'80%',  c: t.waolSpeakerwiz },
      { o:'95%',  c: t.waolSpeakerwizRings },
      { o:'100%', c: this.mixDark(t.waolSpeakerwiz, 0.6) },
    ]))
    d.appendChild(this.makeLinearGrad(this.id('sub-sheen'), '0%','0%','100%','100%', [
      { o:'0%',   c: t.waolSpeakerwizGlow, a:0.12 },
      { o:'50%',  c: t.waolSpeakerwizGlow, a:0.03 },
      { o:'100%', c: t.waolSpeakerwizGlow, a:0 },
    ]))

    d.appendChild(this.makeRadialGrad(this.id('mid-waol-speakerwiz'), [
      { o:'0%',   c: this.mixDark(t.waolSpeakerwiz, 0.95) },
      { o:'40%',  c: this.mixDark(t.waolSpeakerwiz, 0.8) },
      { o:'80%',  c: this.mixDark(t.waolSpeakerwiz, 0.6) },
      { o:'100%', c: this.mixDark(t.waolSpeakerwiz, 0.9) },
    ]))
    d.appendChild(this.makeRadialGrad(this.id('mid-surround'), [
      { o:'0%',   c: this.mixDark(t.surround, 0.2) },
      { o:'100%', c: this.mixDark(t.surround, 0.8) },
    ]))
    d.appendChild(this.makeRadialGrad(this.id('tweeter-dome'), [
      { o:'0%',   c: this.mixDark(t.waolSpeakerwiz, 0.85) },
      { o:'50%',  c: this.mixDark(t.waolSpeakerwiz, 0.95) },
      { o:'100%', c: this.mixDark(t.waolSpeakerwiz, 0.98) },
    ], '40%','35%','60%'))
    d.appendChild(this.makeRadialGrad(this.id('vc'), [
      { o:'0%',   c:'#001218' },
      { o:'60%',  c:'#000e14' },
      { o:'100%', c:'#000a10' },
    ]))
    d.appendChild(this.makeRadialGrad(this.id('dustcap'), [
      { o:'0%',   c: this.mixDark(t.waolSpeakerwiz, 0.95) },
      { o:'40%',  c: this.mixDark(t.waolSpeakerwiz, 0.98) },
      { o:'100%', c:'#000810' },
    ]))
    d.appendChild(this.makeRadialGrad(this.id('screw'), [
      { o:'0%',   c:'#4a5a62' },
      { o:'40%',  c:'#2a3a42' },
      { o:'70%',  c:'#1a2830' },
      { o:'100%', c:'#0e1820' },
    ], '35%','30%','65%'))
    d.appendChild(this.makeRadialGrad(this.id('screw-hi'), [
      { o:'0%',   c:'#6a8090', a:0.9 },
      { o:'100%', c:'#6a8090', a:0 },
    ], '30%','28%','40%'))

    d.appendChild(this.makeLinearGrad(this.id('floor'), '0%','0%','0%','100%', [
      { o:'0%',   c: t.floorGlow, a:0.1 },
      { o:'100%', c: t.floorGlow, a:0 },
    ]))
  }

  private buildScene(): void {
    this.buildFloor()
    if (this.opts.drivers === 3) {
      this.buildSatellite('left',  30,  145, 148, 292)
      this.buildSatellite('right', 442, 145, 148, 292)
    }
    this.buildCenterCab()
    this.buildSubWoofer()
  }

  private rebuildScene(): void {
    const children = Array.from(this.svg.children)
    for (const c of children) if (c !== this.defs) this.svg.removeChild(c)
    this.neonRings     = []
    this.tweeterGroups = []
    this.subWaolSpeakerWizGroup  = null
    this.midLeftGroup  = null
    this.midRightGroup = null
    this.buildScene()
  }

  private buildFloor(): void {
    const g = el('g')
    g.appendChild(el('ellipse', { cx:310, cy:545, rx:280, ry:18, fill:'#000', opacity:0.7 }))
    g.appendChild(el('ellipse', { cx:310, cy:545, rx:200, ry:10,  fill:'#000', opacity:0.6 }))
    const floorGlow = el('ellipse', {
      cx:310, cy:538, rx:160, ry:8,
      fill: this.url('floor'), opacity:0.5
    }) as SVGEllipseElement
    this.floorGlowEl = floorGlow
    g.appendChild(floorGlow)
    this.svg.appendChild(g)
  }

  private buildSatellite(side: 'left'|'right', x:number, y:number, w:number, h:number): void {
    const isLeft = side === 'left'
    const cx = x + w / 2
    const cy = y + h / 2
    const g = el('g', { id: `cab-${side}` })
    g.appendChild(rect({ x: x-6, y, width: w+6, height: h, rx:10, fill:'#050c10' }))
    g.appendChild(rect({ x: isLeft ? x-6 : x+w, y: y+3, width:8, height: h-6, rx:3, fill:'#0a1820', opacity:0.7 }))
    g.appendChild(rect({ x, y, width: w, height: h, rx:9, fill: this.url('cab-s'), filter: this.url('f-shadow') }))
    g.appendChild(rect({ x, y, width: w, height:2.5, rx:1, fill: this.url('edge-top'), opacity:0.6 }))
    g.appendChild(rect({ x, y:y+3, width:2.5, height:h-6, rx:1, fill: this.url('edge-l'), opacity:0.5 }))
    g.appendChild(rect({ x:x+w-2.5, y:y+3, width:2.5, height:h-6, rx:1, fill: this.url('edge-r'), opacity:0.3 }))
    g.appendChild(rect({ x:x+8, y:y+8, width:w-16, height:h-16, rx:6, fill:'none', stroke:'#0e1e28', 'stroke-width':1.5 }))

    if (this.opts.showScrews) {
      for (const [sx, sy] of [[x+16, y+16], [x+w-16, y+16], [x+16, y+h-16], [x+w-16, y+h-16]]) {
        g.appendChild(this.makeScrew(sx, sy, 5))
      }
    }

    if (this.opts.showPort) {
      const px = cx - 36, py = y + h - 28
      g.appendChild(rect({ x:px, y:py, width:72, height:14, rx:7, fill:'#030810', stroke:'#0e1a22', 'stroke-width':1 }))
      g.appendChild(rect({ x:px+2, y:py+2, width:68, height:10, rx:5, fill:'#020609' }))
    }

    if (this.opts.showTweeters) {
      const tg = el('g')
      tg.style.transformOrigin = `${cx}px ${y+45}px`
      tg.style.willChange = 'transform'
      this.buildTweeter(tg, cx, y+45, 22)
      g.appendChild(tg)
      this.tweeterGroups.push(tg as SVGGElement)
    }

    const mg = el('g')
    mg.style.transformOrigin = `${cx}px ${cy+20}px`
    mg.style.willChange = 'transform'
    this.buildMidDriver(mg, cx, cy+20, 60)
    g.appendChild(mg)
    if (isLeft) this.midLeftGroup  = mg as SVGGElement
    else        this.midRightGroup = mg as SVGGElement

    this.svg.appendChild(g)
  }

  private buildCenterCab(): void {
    const x=196, y=22, w=234, h=512
    const cx = x + w/2
    const g = el('g', { id:'cab-center' })
    g.appendChild(rect({ x:x-6, y, width:w+12, height:h+2, rx:14, fill:'#020406' }))
    g.appendChild(rect({ x:x-6, y:y+3, width:10, height:h-6, rx:4, fill:'#081218', opacity:0.6 }))
    g.appendChild(rect({ x, y, width:w, height:h, rx:13, fill: this.url('cab-c'), filter: this.url('f-shadow') }))
    g.appendChild(rect({ x, y, width:w, height:h, rx:13, fill: this.url('cab-c-face'), opacity:0.6 }))
    g.appendChild(rect({ x, y, width:w, height:2.5, rx:1, fill: this.url('edge-top'), opacity:0.8 }))
    g.appendChild(rect({ x, y:y+3, width:3, height:h-6, rx:1.5, fill: this.url('edge-l'), opacity:0.6 }))
    g.appendChild(rect({ x:x+w-3, y:y+3, width:3, height:h-6, rx:1.5, fill: this.url('edge-r'), opacity:0.4 }))
    g.appendChild(rect({ x:x+12, y:y+12, width:w-24, height:h-24, rx:8, fill:'none', stroke:'#0e1e2a', 'stroke-width':2 }))
    g.appendChild(rect({ x:x+16, y:y+16, width:w-32, height:h-32, rx:6, fill:'none', stroke:'#0c1820', 'stroke-width':1 }))

    if (this.opts.showScrews) {
      for (const [sx, sy] of [[x+22, y+22], [x+w-22, y+22], [x+22, y+h-22], [x+w-22, y+h-22]]) {
        g.appendChild(this.makeScrew(sx, sy, 7))
      }
    }

    if (this.opts.showTweeters) {
      const tg = el('g')
      tg.style.transformOrigin = `${cx}px ${y+58}px`
      tg.style.willChange = 'transform'
      this.buildTweeter(tg, cx, y+58, 27)
      g.appendChild(tg)
      this.tweeterGroups.push(tg as SVGGElement)
    }

    if (this.opts.showPort) {
      const py = y+h-34
      g.appendChild(rect({ x:cx-56, y:py, width:112, height:20, rx:10, fill:'#020608', stroke:'#0e1a22', 'stroke-width':1.5 }))
      g.appendChild(rect({ x:cx-52, y:py+4, width:104, height:12, rx:6, fill:'#010406' }))
      for (const dy of [4, 7]) {
        g.appendChild(el('line', { x1:cx-52, y1:py+dy+4, x2:cx+52, y2:py+dy+4, stroke:'#0a1218', 'stroke-width':0.5 }))
      }
    }
    this.svg.appendChild(g)
  }

  private buildSubWoofer(): void {
    const cx = 313, cy = 298
    const R  = this.opts.subRadius
    const RO = R + 32
    const g = el('g', { id:'sub-assembly' })
    g.appendChild(circle({ cx, cy, r:RO+4, fill:'#040a0e', opacity:0.8 }))
    g.appendChild(circle({ cx, cy, r:RO, fill: this.url('basket'), filter: this.url('f-shadow') }))
    g.appendChild(circle({ cx, cy, r:RO, fill: this.url('basket-sheen') }))
    g.appendChild(circle({ cx, cy, r:RO-3, fill:'none', stroke:'#1e3040', 'stroke-width':1.5 }))
    g.appendChild(circle({ cx, cy, r:RO-6, fill:'none', stroke:'#162838', 'stroke-width':1 }))
    g.appendChild(circle({ cx, cy, r:RO-9, fill:'#081220' }))

    if (this.opts.showScrews) {
      const boltR = RO - 3
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2
        const bx = cx + Math.cos(a) * boltR, by = cy + Math.sin(a) * boltR
        const bg = el('g')
        bg.appendChild(circle({ cx:bx, cy:by, r:7, fill: this.url('basket') }))
        bg.appendChild(circle({ cx:bx, cy:by, r:7, fill: this.url('screw-hi') }))
        bg.appendChild(circle({ cx:bx, cy:by, r:2.5, fill:'#081828' }))
        const nr = circle({ cx:bx, cy:by, r:7, fill:'none', stroke: this.theme.waolSpeakerwizRings, 'stroke-width':1, opacity:0.55, filter: this.url('f-neon-sm') }) as SVGCircleElement
        nr.dataset.baseOpacity = '0.55'
        bg.appendChild(nr)
        this.neonRings.push(nr)
        g.appendChild(bg)
      }
    }

    const cg = el('g') as SVGGElement
    cg.style.transformOrigin = `${cx}px ${cy}px`
    cg.style.willChange = 'transform'
    this.subWaolSpeakerWizGroup = cg
    cg.appendChild(circle({ cx, cy, r:R+18, fill: this.url('surround') }))

    const surroundRings = [{ r:R+17, w:2.5, o:0.75 }, { r:R+14, w:1, o:0.7 }, { r:R+11, w:1.5, o:0.55 }, { r:R+8, w:1, o:0.7 }, { r:R+5, w:1.2, o:0.4 }, { r:R+2, w:1, o:0.7 }, { r:R, w:2, o:0.65 }, { r:R-2, w:1, o:0.6 }]
    for (const { r, w, o } of surroundRings) {
      const isNeon = o < 0.65
      const c = circle({ cx, cy, r, fill:'none', stroke: isNeon ? this.theme.waolSpeakerwizRings : this.theme.surround, 'stroke-width': w, opacity: o }) as SVGCircleElement
      if (isNeon) { c.setAttribute('filter', this.url('f-neon-sm')); c.dataset.baseOpacity = String(o); this.neonRings.push(c) }
      cg.appendChild(c)
    }

    cg.appendChild(circle({ cx, cy, r:R, fill: this.url('sub-waol-speakerwiz') }))
    cg.appendChild(circle({ cx, cy, r:R, fill: this.url('sub-sheen') }))

    const step = (R - 40) / this.opts.waolSpeakerwizRings
    for (let i = 0; i < this.opts.waolSpeakerwizRings; i++) {
      const r = R - 2 - i * step, isN = i % 2 === 0, oBase = 0.6 - i * 0.018
      const c = circle({ cx, cy, r, fill: 'none', stroke: isN ? this.theme.waolSpeakerwizRings : this.theme.waolSpeakerwiz, 'stroke-width': isN ? Math.max(0.8, 1.8 - i*0.05) : 0.7, opacity: Math.max(0.15, oBase) }) as SVGCircleElement
      if (isN) { if (i < 6) c.setAttribute('filter', this.url('f-neon-sm')); c.dataset.baseOpacity = String(Math.max(0.15, oBase)); this.neonRings.push(c) }
      cg.appendChild(c)
    }

    const vcRings = [{ r:38, stroke: this.theme.waolSpeakerwizRings, w:2.5, o:0.85, filter:true }, { r:36, stroke: '#006080', w:1.5, o:0.7, filter:false }, { r:33, stroke: this.theme.waolSpeakerwizRings, w:1.5, o:0.6, filter:true }]
    for (const v of vcRings) {
      const c = circle({ cx, cy, r:v.r, fill: this.url('vc'), stroke:v.stroke, 'stroke-width':v.w, opacity:v.o }) as SVGCircleElement
      if (v.filter) { c.setAttribute('filter', this.url('f-neon-sm')); c.dataset.baseOpacity = String(v.o); this.neonRings.push(c) }
      cg.appendChild(c)
    }

    cg.appendChild(circle({ cx, cy, r:29, fill: this.url('dustcap') }))
    cg.appendChild(circle({ cx, cy, r:28, fill:'none', stroke: this.theme.waolSpeakerwizRings, 'stroke-width':1.8, opacity:0.7, filter: this.url('f-neon-sm') }))
    cg.appendChild(circle({ cx, cy, r:24, fill:'#000810' })); cg.appendChild(circle({ cx, cy, r:20, fill:'#000608' })); cg.appendChild(circle({ cx, cy, r:6, fill:'#000406' })); cg.appendChild(circle({ cx, cy, r:3, fill:'#000304' }))
    cg.appendChild(el('ellipse', { cx:cx-8, cy:cy-8, rx:10, ry:7, fill:'#001e2e', opacity:0.45 }))
    cg.appendChild(el('ellipse', { cx:cx-10, cy:cy-10, rx:4, ry:3, fill:'#003a50', opacity:0.28 }))
    cg.appendChild(circle({ cx, cy, r:R, fill:'none', stroke: this.theme.waolSpeakerwizGlow, 'stroke-width':22, opacity:0.035, filter: this.url('f-neon-lg') }))
    g.appendChild(cg)
    const outerNeon = circle({ cx, cy, r:RO-3, fill:'none', stroke: this.theme.waolSpeakerwizRings, 'stroke-width':2, opacity:0.3, filter: this.url('f-neon-md') }) as SVGCircleElement
    outerNeon.dataset.baseOpacity = '0.3'; this.neonRings.push(outerNeon); g.appendChild(outerNeon)
    this.svg.appendChild(g)
  }

  private buildTweeter(g: Element, cx: number, cy: number, r: number): void {
    g.appendChild(circle({ cx, cy, r:r+2, fill: this.url('basket') }))
    g.appendChild(circle({ cx, cy, r:r+2, fill: this.url('basket-sheen') }))
    g.appendChild(circle({ cx, cy, r:r, fill:'none', stroke:'#243444', 'stroke-width':1.5 }))
    g.appendChild(circle({ cx, cy, r:r-2, fill:'#0c1820' }))
    g.appendChild(circle({ cx, cy, r:r-4, fill:'#0e1e28' }))
    g.appendChild(circle({ cx, cy, r:r-6, fill: this.url('mid-surround') }))
    g.appendChild(el('ellipse', { cx, cy:cy-1, rx:r-9, ry:r-10, fill: this.url('tweeter-dome') }))
    g.appendChild(el('ellipse', { cx:cx-4, cy:cy-4, rx:Math.round(r*0.35), ry:Math.round(r*0.28), fill:'#3a5060', opacity:0.3 }))
    g.appendChild(el('ellipse', { cx:cx-5, cy:cy-5, rx:Math.round(r*0.15), ry:Math.round(r*0.12), fill:'#6a8090', opacity:0.18 }))
    g.appendChild(circle({ cx, cy, r:4, fill:'#081218' }))
    if (this.opts.showScrews) {
      for (let i = 0; i < 5; i++) {
        const a = (i/5)*Math.PI*2 - Math.PI/2; g.appendChild(this.makeScrew(cx+Math.cos(a)*(r+1), cy+Math.sin(a)*(r+1), 2.2))
      }
    }
  }

  private buildMidDriver(g: Element, cx: number, cy: number, r: number): void {
    g.appendChild(circle({ cx, cy, r:r+5, fill:'#060e14' }))
    g.appendChild(circle({ cx, cy, r:r+2, fill: this.url('basket'), filter: this.url('f-shadow') }))
    g.appendChild(circle({ cx, cy, r:r+2, fill: this.url('basket-sheen') }))
    g.appendChild(circle({ cx, cy, r:r, fill:'none', stroke:'#1e3040', 'stroke-width':1 }))
    g.appendChild(circle({ cx, cy, r:r-2, fill:'none', stroke:'#162838', 'stroke-width':0.5 }))
    g.appendChild(circle({ cx, cy, r:r-5, fill: this.url('surround') }))
    g.appendChild(circle({ cx, cy, r:r-5, fill:'none', stroke:'#243040', 'stroke-width':2 }))
    g.appendChild(circle({ cx, cy, r:r-9, fill:'none', stroke:'#182830', 'stroke-width':1.5 }))
    g.appendChild(circle({ cx, cy, r:r-11, fill: this.url('mid-waol-speakerwiz') }))
    const conR = r - 12
    for (let i = 0; i < 8; i++) {
      g.appendChild(circle({ cx, cy, r:conR - i * (conR - 12) / 8, fill:'none', stroke:`#${(16+i).toString(16)}${(16+i).toString(16)}${(16+i).toString(16)}`, 'stroke-width': Math.max(0.4, 0.8 - i*0.05) }))
    }
    g.appendChild(circle({ cx, cy, r:18, fill:'#0c0c0c', stroke:'#1a1a1a', 'stroke-width':1.5 }))
    g.appendChild(circle({ cx, cy, r:15, fill: this.url('tweeter-dome') }))
    g.appendChild(el('ellipse', { cx:cx-4, cy:cy-4, rx:7, ry:5, fill:'#2a3838', opacity:0.25 }))
    g.appendChild(el('ellipse', { cx:cx-5, cy:cy-5, rx:3, ry:2, fill:'#4a6068', opacity:0.15 }))
    g.appendChild(circle({ cx, cy, r:5, fill:'#080e12' }))
    if (this.opts.showScrews) {
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2 - Math.PI/2; g.appendChild(this.makeScrew(cx+Math.cos(a)*(r+1), cy+Math.sin(a)*(r+1), 3.5))
      }
    }
  }

  private makeScrew(cx: number, cy: number, r: number): SVGGElement {
    const g = el('g') as SVGGElement
    g.appendChild(circle({ cx, cy, r, fill: this.url('screw') }))
    g.appendChild(circle({ cx, cy, r, fill: this.url('screw-hi') }))
    g.appendChild(circle({ cx, cy, r: r * 0.45, fill:'#0a1820' }))
    return g
  }

  private makeFilter(id: string, blurs: number[], merge: boolean): SVGFilterElement {
    const f = el('filter', { id, x:'-60%', y:'-60%', width:'220%', height:'220%' })
    const mergeEl = merge ? el('feMerge') : null
    blurs.forEach((sd, i) => {
      f.appendChild(el('feGaussianBlur', { in:'SourceGraphic', stdDeviation:sd, result:`b${i}` }))
      if (mergeEl) mergeEl.appendChild(el('feMergeNode', { in:`b${i}` }))
    })
    if (mergeEl) { mergeEl.appendChild(el('feMergeNode', { in:'SourceGraphic' })); f.appendChild(mergeEl) }
    return f as SVGFilterElement
  }

  private makeLinearGrad(id: string, x1: string, y1: string, x2: string, y2: string, stops: { o: string; c: string; a?: number }[]): SVGLinearGradientElement {
    const g = el('linearGradient', { id, x1, y1, x2, y2 }) as SVGLinearGradientElement
    for (const s of stops) {
      const stop = el('stop', { offset: s.o, 'stop-color': s.c })
      if (s.a !== undefined) stop.setAttribute('stop-opacity', String(s.a))
      g.appendChild(stop)
    }
    return g
  }

  private makeRadialGrad(id: string, stops: { o: string; c: string; a?: number }[], cx = '50%', cy = '50%', r = '50%'): SVGRadialGradientElement {
    const g = el('radialGradient', { id, cx, cy, r }) as SVGRadialGradientElement
    for (const s of stops) {
      const stop = el('stop', { offset: s.o, 'stop-color': s.c })
      if (s.a !== undefined) stop.setAttribute('stop-opacity', String(s.a))
      g.appendChild(stop)
    }
    return g
  }

  private mixDark(hex: string, t: number): string {
    const n = parseInt(hex.replace('#',''), 16)
    const r = Math.round(((n>>16)&255) * (1-t))
    const g = Math.round(((n>>8 )&255) * (1-t))
    const b = Math.round(((n    )&255) * (1-t))
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
  }
}
