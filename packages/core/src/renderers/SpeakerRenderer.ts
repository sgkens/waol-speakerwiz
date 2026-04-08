// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  renderers/SpeakerRenderer.ts
// Programmatic SVG speaker renderer.
// Builds the full 3-way stack (or single sub) entirely in JS —
// no external SVG files required.
// ─────────────────────────────────────────────────────────────────

import type { SpeakerOptions, SpeakerWizTheme, RenderState } from '../types'

const SVG_NS = 'http://www.w3.org/2000/svg'

const DEFAULTS: Required<SpeakerOptions> = {
  drivers:      3,
  subRadius:    112,
  speakerwizRings:    18,
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
  private theme: SpeakerWizTheme
  private ids:   Record<string, string> = {}

  // Animated group refs
  private subSpeakerWizGroup:  SVGGElement | null = null
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
    theme:     SpeakerWizTheme
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

    // Sub speakerwiz — translate Y (excursion) + scale (speakerwiz flexing)
    if (this.subSpeakerWizGroup && Math.abs(subPos - this.lastSubPos) > 0.0005) {
      const shift = subPos * 3.0
      const scale = 1 + subPos * 0.028
      this.subSpeakerWizGroup.style.transform =
        `translateY(${shift.toFixed(3)}px) scale(${scale.toFixed(4)})`
      this.lastSubPos = subPos
    }

    // Neon ring brightness
    const bright = 0.2 + subE * 0.8
    for (const r of this.neonRings) {
      const base = parseFloat(r.dataset.baseOpacity ?? '0.5')
      r.style.opacity = String(Math.min(1, base + subE * 0.5))
    }

    // Floor glow
    if (this.floorGlowEl) {
      this.floorGlowEl.style.opacity = String(0.15 + subE * 0.65)
    }

    // Mid drivers
    if (Math.abs(midPos - this.lastMidPos) > 0.0005) {
      const shift = midPos * 2.0
      const scale = 1 + midPos * 0.034
      const t = `translateY(${shift.toFixed(3)}px) scale(${scale.toFixed(4)})`
      if (this.midLeftGroup)  this.midLeftGroup.style.transform  = t
      if (this.midRightGroup) this.midRightGroup.style.transform = t
      this.lastMidPos = midPos
    }

    // Tweeters
    if (Math.abs(hiPos - this.lastHiPos) > 0.0005) {
      const shift = hiPos * 1.0
      const scale = 1 + hiPos * 0.05
      const t = `translateY(${shift.toFixed(3)}px) scale(${scale.toFixed(4)})`
      for (const tw of this.tweeterGroups) tw.style.transform = t
      this.lastHiPos = hiPos
    }
  }

  setTheme(theme: SpeakerWizTheme): void {
    this.theme = theme
    // Rebuild defs with new theme colours
    while (this.defs.firstChild) this.defs.removeChild(this.defs.firstChild)
    this.buildDefs()
    // Full rebuild is simplest for theme swap
    // (production: patch individual gradient stops instead)
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
    this.subSpeakerWizGroup  = null
    this.midLeftGroup  = null
    this.midRightGroup = null
  }

  // ── ID management ─────────────────────────────────────────────────

  private buildIds(): void {
    const names = [
      'cab-c','cab-c-face','cab-s','edge-top','edge-l','edge-r',
      'basket','basket-sheen','surround','sub-speakerwiz','sub-sheen',
      'mid-speakerwiz','mid-surround','tweeter-dome','vc','dustcap',
      'screw','screw-hi','floor',
      'f-neon-sm','f-neon-md','f-neon-lg','f-shadow',
    ]
    for (const n of names) this.ids[n] = uid(n)
  }

  private id(name: string) { return this.ids[name] ?? name }
  private url(name: string) { return `url(#${this.id(name)})` }

  // ── Defs (gradients + filters) ────────────────────────────────────

  private buildDefs(): void {
    const d = this.defs
    const t = this.theme

    // ── Filters ──
    d.appendChild(this.makeFilter(this.id('f-neon-sm'), [2.5], true))
    d.appendChild(this.makeFilter(this.id('f-neon-md'), [5, 10], true))
    d.appendChild(this.makeFilter(this.id('f-neon-lg'), [8, 18, 30], true))

    const fShadow = el('filter', { id: this.id('f-shadow'), x:'-20%', y:'-20%', width:'140%', height:'140%' })
    const ds = el('feDropShadow', { dx:'0', dy:'6', stdDeviation:'10', 'flood-color':'#000', 'flood-opacity':'0.65' })
    fShadow.appendChild(ds)
    d.appendChild(fShadow)

    // ── Cabinet gradients ──
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

    // ── Speaker gradients ──
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

    // Sub speakerwiz — uses theme speakerwiz colour
    d.appendChild(this.makeRadialGrad(this.id('sub-speakerwiz'), [
      { o:'0%',   c: this.mixDark(t.speakerwiz, 0.9) },
      { o:'30%',  c: this.mixDark(t.speakerwiz, 0.6) },
      { o:'60%',  c: this.mixDark(t.speakerwiz, 0.3) },
      { o:'80%',  c: t.speakerwiz },
      { o:'95%',  c: t.speakerwizRings },
      { o:'100%', c: this.mixDark(t.speakerwiz, 0.6) },
    ]))
    d.appendChild(this.makeLinearGrad(this.id('sub-sheen'), '0%','0%','100%','100%', [
      { o:'0%',   c: t.speakerwizGlow, a:0.12 },
      { o:'50%',  c: t.speakerwizGlow, a:0.03 },
      { o:'100%', c: t.speakerwizGlow, a:0 },
    ]))

    d.appendChild(this.makeRadialGrad(this.id('mid-speakerwiz'), [
      { o:'0%',   c: this.mixDark(t.speakerwiz, 0.95) },
      { o:'40%',  c: this.mixDark(t.speakerwiz, 0.8) },
      { o:'80%',  c: this.mixDark(t.speakerwiz, 0.6) },
      { o:'100%', c: this.mixDark(t.speakerwiz, 0.9) },
    ]))
    d.appendChild(this.makeRadialGrad(this.id('mid-surround'), [
      { o:'0%',   c: this.mixDark(t.surround, 0.2) },
      { o:'100%', c: this.mixDark(t.surround, 0.8) },
    ]))
    d.appendChild(this.makeRadialGrad(this.id('tweeter-dome'), [
      { o:'0%',   c: this.mixDark(t.speakerwiz, 0.85) },
      { o:'50%',  c: this.mixDark(t.speakerwiz, 0.95) },
      { o:'100%', c: this.mixDark(t.speakerwiz, 0.98) },
    ], '40%','35%','60%'))
    d.appendChild(this.makeRadialGrad(this.id('vc'), [
      { o:'0%',   c:'#001218' },
      { o:'60%',  c:'#000e14' },
      { o:'100%', c:'#000a10' },
    ]))
    d.appendChild(this.makeRadialGrad(this.id('dustcap'), [
      { o:'0%',   c: this.mixDark(t.speakerwiz, 0.95) },
      { o:'40%',  c: this.mixDark(t.speakerwiz, 0.98) },
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

    // Floor glow — uses theme floor colour
    d.appendChild(this.makeLinearGrad(this.id('floor'), '0%','0%','0%','100%', [
      { o:'0%',   c: t.floorGlow, a:0.1 },
      { o:'100%', c: t.floorGlow, a:0 },
    ]))
  }

  // ── Scene builder ─────────────────────────────────────────────────

  private buildScene(): void {
    // Ground + reflection
    this.buildFloor()

    // Cabinets (back to front order)
    if (this.opts.drivers === 3) {
      this.buildSatellite('left',  30,  145, 148, 292)
      this.buildSatellite('right', 442, 145, 148, 292)
    }
    this.buildCenterCab()

    // Sub woofer (on top of center cab visually)
    this.buildSubWoofer()
  }

  private rebuildScene(): void {
    // Remove everything except defs
    const children = Array.from(this.svg.children)
    for (const c of children) {
      if (c !== this.defs) this.svg.removeChild(c)
    }
    this.neonRings     = []
    this.tweeterGroups = []
    this.subSpeakerWizGroup  = null
    this.midLeftGroup  = null
    this.midRightGroup = null
    this.buildScene()
  }

  // ── Floor ─────────────────────────────────────────────────────────

  private buildFloor(): void {
    const g = el('g')
    g.appendChild(el('ellipse', { cx:310, cy:542, rx:240, ry:14, fill:'#000', opacity:0.6 }))
    g.appendChild(el('ellipse', { cx:310, cy:542, rx:180, ry:8,  fill:'#000', opacity:0.5 }))
    const floorGlow = el('ellipse', {
      cx:310, cy:536, rx:140, ry:6,
      fill: this.url('floor'), opacity:0.4
    }) as SVGEllipseElement
    this.floorGlowEl = floorGlow
    g.appendChild(floorGlow)
    this.svg.appendChild(g)
  }

  // ── Satellite cabinet (left or right) ─────────────────────────────

  private buildSatellite(
    side:  'left' | 'right',
    x: number, y: number,
    w: number, h: number
  ): void {
    const isLeft = side === 'left'
    const cx = x + w / 2
    const cy = y + h / 2

    const g = el('g', { id: `cab-${side}` })

    // Shadow
    g.appendChild(rect({ x: x-6, y, width: w+6, height: h, rx:10, fill:'#050c10' }))
    // Depth strip
    g.appendChild(rect({
      x: isLeft ? x-6 : x+w, y: y+3, width:8, height: h-6, rx:3,
      fill:'#0a1820', opacity:0.7,
    }))
    // Main face
    const face = rect({ x, y, width: w, height: h, rx:9, fill: this.url('cab-s'),
      filter: this.url('f-shadow') })
    g.appendChild(face)
    // Edge highlights
    g.appendChild(rect({ x, y, width: w, height:2.5, rx:1, fill: this.url('edge-top'), opacity:0.6 }))
    g.appendChild(rect({ x, y:y+3, width:2.5, height:h-6, rx:1, fill: this.url('edge-l'), opacity:0.5 }))
    g.appendChild(rect({ x:x+w-2.5, y:y+3, width:2.5, height:h-6, rx:1, fill: this.url('edge-r'), opacity:0.3 }))
    // Inset frame
    g.appendChild(rect({ x:x+8, y:y+8, width:w-16, height:h-16, rx:6, fill:'none',
      stroke:'#0e1e28', 'stroke-width':1.5 }))

    // Corner screws
    if (this.opts.showScrews) {
      for (const [sx, sy] of [
        [x+16, y+16], [x+w-16, y+16],
        [x+16, y+h-16], [x+w-16, y+h-16],
      ]) {
        g.appendChild(this.makeScrew(sx, sy, 5))
      }
    }

    // Port
    if (this.opts.showPort) {
      const px = cx - 36, py = y + h - 28
      g.appendChild(rect({ x:px, y:py, width:72, height:14, rx:7,
        fill:'#030810', stroke:'#0e1a22', 'stroke-width':1 }))
      g.appendChild(rect({ x:px+2, y:py+2, width:68, height:10, rx:5, fill:'#020609' }))
    }

    // Tweeter
    if (this.opts.showTweeters) {
      const tg = el('g')
      tg.style.transformOrigin = `${cx}px ${y+45}px`
      tg.style.willChange = 'transform'
      this.buildTweeter(tg, cx, y+45, 22)
      g.appendChild(tg)
      this.tweeterGroups.push(tg as SVGGElement)
    }

    // Mid woofer
    const mg = el('g')
    mg.style.transformOrigin = `${cx}px ${cy+20}px`
    mg.style.willChange = 'transform'
    this.buildMidDriver(mg, cx, cy+20, 60)
    g.appendChild(mg)
    if (isLeft) this.midLeftGroup  = mg as SVGGElement
    else        this.midRightGroup = mg as SVGGElement

    this.svg.appendChild(g)
  }

  // ── Center sub cabinet ────────────────────────────────────────────

  private buildCenterCab(): void {
    const x=196, y=22, w=234, h=498
    const cx = x + w/2

    const g = el('g', { id:'cab-center' })

    // Rear shadow
    g.appendChild(rect({ x:x-6, y, width:w+6, height:h, rx:14, fill:'#040a0e' }))
    // Side depth strip
    g.appendChild(rect({ x:x-6, y:y+3, width:10, height:h-6, rx:4, fill:'#081218', opacity:0.6 }))
    // Main body
    g.appendChild(rect({ x, y, width:w, height:h, rx:13, fill: this.url('cab-c'),
      filter: this.url('f-shadow') }))
    // Face overlay
    g.appendChild(rect({ x, y, width:w, height:h, rx:13, fill: this.url('cab-c-face'), opacity:0.6 }))
    // Edge highlights
    g.appendChild(rect({ x, y, width:w, height:2.5, rx:1, fill: this.url('edge-top'), opacity:0.8 }))
    g.appendChild(rect({ x, y:y+3, width:3, height:h-6, rx:1.5, fill: this.url('edge-l'), opacity:0.6 }))
    g.appendChild(rect({ x:x+w-3, y:y+3, width:3, height:h-6, rx:1.5, fill: this.url('edge-r'), opacity:0.4 }))
    // Inset panel frames
    g.appendChild(rect({ x:x+12, y:y+12, width:w-24, height:h-24, rx:8, fill:'none',
      stroke:'#0e1e2a', 'stroke-width':2 }))
    g.appendChild(rect({ x:x+16, y:y+16, width:w-32, height:h-32, rx:6, fill:'none',
      stroke:'#0c1820', 'stroke-width':1 }))

    // Corner screws
    if (this.opts.showScrews) {
      for (const [sx, sy] of [
        [x+22, y+22], [x+w-22, y+22],
        [x+22, y+h-22], [x+w-22, y+h-22],
      ]) {
        g.appendChild(this.makeScrew(sx, sy, 7))
      }
    }

    // Center tweeter
    if (this.opts.showTweeters) {
      const tg = el('g')
      tg.style.transformOrigin = `${cx}px ${y+58}px`
      tg.style.willChange = 'transform'
      this.buildTweeter(tg, cx, y+58, 27)
      g.appendChild(tg)
      this.tweeterGroups.push(tg as SVGGElement)
    }

    // Bass reflex port
    if (this.opts.showPort) {
      const py = y+h-34
      g.appendChild(rect({ x:cx-56, y:py, width:112, height:20, rx:10,
        fill:'#020608', stroke:'#0e1a22', 'stroke-width':1.5 }))
      g.appendChild(rect({ x:cx-52, y:py+4, width:104, height:12, rx:6, fill:'#010406' }))
      for (const dy of [4, 7]) {
        const line = el('line', {
          x1:cx-52, y1:py+dy+4, x2:cx+52, y2:py+dy+4,
          stroke:'#0a1218', 'stroke-width':0.5,
        })
        g.appendChild(line)
      }
    }

    this.svg.appendChild(g)
  }

  // ── Sub woofer ────────────────────────────────────────────────────

  private buildSubWoofer(): void {
    const cx = 313, cy = 298
    const R  = this.opts.subRadius    // speakerwiz radius
    const RO = R + 32                 // outer basket radius

    const g = el('g', { id:'sub-assembly' })

    // Outer mounting plate
    g.appendChild(circle({ cx, cy, r:RO+4, fill:'#040a0e', opacity:0.8 }))
    // Basket frame
    g.appendChild(circle({ cx, cy, r:RO, fill: this.url('basket'), filter: this.url('f-shadow') }))
    g.appendChild(circle({ cx, cy, r:RO, fill: this.url('basket-sheen') }))
    // Frame rings
    g.appendChild(circle({ cx, cy, r:RO-3, fill:'none', stroke:'#1e3040', 'stroke-width':1.5 }))
    g.appendChild(circle({ cx, cy, r:RO-6, fill:'none', stroke:'#162838', 'stroke-width':1 }))
    g.appendChild(circle({ cx, cy, r:RO-9, fill:'#081220' }))

    // 8 mounting bolts
    if (this.opts.showScrews) {
      const boltR = RO - 3
      for (let i = 0; i < 8; i++) {
        const a  = (i / 8) * Math.PI * 2 - Math.PI / 2
        const bx = cx + Math.cos(a) * boltR
        const by = cy + Math.sin(a) * boltR
        const bg = el('g')
        bg.appendChild(circle({ cx:bx, cy:by, r:7, fill: this.url('basket') }))
        bg.appendChild(circle({ cx:bx, cy:by, r:7, fill: this.url('screw-hi') }))
        bg.appendChild(circle({ cx:bx, cy:by, r:2.5, fill:'#081828' }))
        // Neon bolt ring
        const nr = circle({ cx:bx, cy:by, r:7, fill:'none',
          stroke: this.theme.speakerwizRings, 'stroke-width':1, opacity:0.55,
          filter: this.url('f-neon-sm'),
        }) as SVGCircleElement
        nr.dataset.baseOpacity = '0.55'
        bg.appendChild(nr)
        this.neonRings.push(nr)
        g.appendChild(bg)
      }
    }

    // ── SpeakerWiz group (animated) ──
    const cg = el('g') as SVGGElement
    cg.style.transformOrigin = `${cx}px ${cy}px`
    cg.style.willChange = 'transform'
    this.subSpeakerWizGroup = cg

    // Surround fill
    cg.appendChild(circle({ cx, cy, r:R+18, fill: this.url('surround') }))

    // Surround roll rings — neon
    const surroundRings = [
      { r:R+17, w:2.5, o:0.75 }, { r:R+14, w:1,   o:0.7 },
      { r:R+11, w:1.5, o:0.55 }, { r:R+8,  w:1,   o:0.7 },
      { r:R+5,  w:1.2, o:0.4  }, { r:R+2,  w:1,   o:0.7 },
      { r:R,    w:2,   o:0.65 }, { r:R-2,  w:1,   o:0.6 },
    ]
    for (const { r, w, o } of surroundRings) {
      const isNeon = o < 0.65
      const c = circle({
        cx, cy, r, fill:'none',
        stroke: isNeon ? this.theme.speakerwizRings : this.theme.surround,
        'stroke-width': w, opacity: o,
      }) as SVGCircleElement
      if (isNeon) {
        c.setAttribute('filter', this.url('f-neon-sm'))
        c.dataset.baseOpacity = String(o)
        this.neonRings.push(c)
      }
      cg.appendChild(c)
    }

    // SpeakerWiz body
    cg.appendChild(circle({ cx, cy, r:R, fill: this.url('sub-speakerwiz') }))
    cg.appendChild(circle({ cx, cy, r:R, fill: this.url('sub-sheen') }))

    // SpeakerWiz texture rings — interleaved neon + dark
    const step = (R - 40) / this.opts.speakerwizRings
    for (let i = 0; i < this.opts.speakerwizRings; i++) {
      const r   = R - 2 - i * step
      const isN = i % 2 === 0
      const oBase = 0.6 - i * 0.018
      const c = circle({
        cx, cy, r,
        fill: 'none',
        stroke:        isN ? this.theme.speakerwizRings : this.theme.speakerwiz,
        'stroke-width': isN ? Math.max(0.8, 1.8 - i*0.05) : 0.7,
        opacity:        Math.max(0.15, oBase),
      }) as SVGCircleElement
      if (isN) {
        if (i < 6) c.setAttribute('filter', this.url('f-neon-sm'))
        c.dataset.baseOpacity = String(Math.max(0.15, oBase))
        this.neonRings.push(c)
      }
      cg.appendChild(c)
    }

    // Voice coil former
    const vcRings = [
      { r:38, stroke: this.theme.speakerwizRings, w:2.5, o:0.85, filter:true },
      { r:36, stroke: '#006080',            w:1.5, o:0.7,  filter:false },
      { r:33, stroke: this.theme.speakerwizRings, w:1.5, o:0.6,  filter:true },
    ]
    for (const v of vcRings) {
      const c = circle({ cx, cy, r:v.r, fill: this.url('vc'),
        stroke:v.stroke, 'stroke-width':v.w, opacity:v.o }) as SVGCircleElement
      if (v.filter) {
        c.setAttribute('filter', this.url('f-neon-sm'))
        c.dataset.baseOpacity = String(v.o)
        this.neonRings.push(c)
      }
      cg.appendChild(c)
    }

    // Dust cap
    cg.appendChild(circle({ cx, cy, r:29, fill: this.url('dustcap') }))
    cg.appendChild(circle({ cx, cy, r:28, fill:'none',
      stroke: this.theme.speakerwizRings, 'stroke-width':1.8, opacity:0.7,
      filter: this.url('f-neon-sm') }))
    cg.appendChild(circle({ cx, cy, r:24, fill:'#000810' }))
    cg.appendChild(circle({ cx, cy, r:20, fill:'#000608' }))
    cg.appendChild(circle({ cx, cy, r:6,  fill:'#000406' }))
    cg.appendChild(circle({ cx, cy, r:3,  fill:'#000304' }))
    // Cap highlight
    const capHi = el('ellipse', { cx:cx-8, cy:cy-8, rx:10, ry:7, fill:'#001e2e', opacity:0.45 })
    cg.appendChild(capHi)
    const capHi2 = el('ellipse', { cx:cx-10, cy:cy-10, rx:4, ry:3, fill:'#003a50', opacity:0.28 })
    cg.appendChild(capHi2)

    // Ambient glow ring
    cg.appendChild(circle({
      cx, cy, r:R, fill:'none',
      stroke: this.theme.speakerwizGlow, 'stroke-width':22, opacity:0.035,
      filter: this.url('f-neon-lg'),
    }))

    g.appendChild(cg)

    // Outer basket neon ring — static, on top
    const outerNeon = circle({
      cx, cy, r:RO-3, fill:'none',
      stroke: this.theme.speakerwizRings, 'stroke-width':2, opacity:0.3,
      filter: this.url('f-neon-md'),
    }) as SVGCircleElement
    outerNeon.dataset.baseOpacity = '0.3'
    this.neonRings.push(outerNeon)
    g.appendChild(outerNeon)

    this.svg.appendChild(g)
  }

  // ── Component builders ────────────────────────────────────────────

  private buildTweeter(g: Element, cx: number, cy: number, r: number): void {
    g.appendChild(circle({ cx, cy, r:r+2, fill: this.url('basket') }))
    g.appendChild(circle({ cx, cy, r:r+2, fill: this.url('basket-sheen') }))
    g.appendChild(circle({ cx, cy, r:r,   fill:'none', stroke:'#243444', 'stroke-width':1.5 }))
    g.appendChild(circle({ cx, cy, r:r-2, fill:'#0c1820' }))
    g.appendChild(circle({ cx, cy, r:r-4, fill:'#0e1e28' }))
    g.appendChild(circle({ cx, cy, r:r-6, fill: this.url('mid-surround') }))
    // Dome
    const dome = el('ellipse', { cx, cy:cy-1, rx:r-9, ry:r-10, fill: this.url('tweeter-dome') })
    g.appendChild(dome)
    // Dome highlight
    g.appendChild(el('ellipse', { cx:cx-4, cy:cy-4, rx:Math.round(r*0.35), ry:Math.round(r*0.28),
      fill:'#3a5060', opacity:0.3 }))
    g.appendChild(el('ellipse', { cx:cx-5, cy:cy-5, rx:Math.round(r*0.15), ry:Math.round(r*0.12),
      fill:'#6a8090', opacity:0.18 }))
    // Center cap
    g.appendChild(circle({ cx, cy, r:4, fill:'#081218' }))
    // Mounting screws (5 point)
    if (this.opts.showScrews) {
      for (let i = 0; i < 5; i++) {
        const a  = (i / 5) * Math.PI * 2 - Math.PI / 2
        const sx = cx + Math.cos(a) * (r+1)
        const sy = cy + Math.sin(a) * (r+1)
        g.appendChild(this.makeScrew(sx, sy, 2.2))
      }
    }
  }

  private buildMidDriver(g: Element, cx: number, cy: number, r: number): void {
    // Outer basket shadow ring
    g.appendChild(circle({ cx, cy, r:r+5, fill:'#060e14' }))
    // Basket frame
    g.appendChild(circle({ cx, cy, r:r+2, fill: this.url('basket'), filter: this.url('f-shadow') }))
    g.appendChild(circle({ cx, cy, r:r+2, fill: this.url('basket-sheen') }))
    // Frame detail rings
    g.appendChild(circle({ cx, cy, r:r, fill:'none', stroke:'#1e3040', 'stroke-width':1 }))
    g.appendChild(circle({ cx, cy, r:r-2, fill:'none', stroke:'#162838', 'stroke-width':0.5 }))
    // Surround ring
    g.appendChild(circle({ cx, cy, r:r-5, fill: this.url('surround') }))
    g.appendChild(circle({ cx, cy, r:r-5, fill:'none', stroke:'#243040', 'stroke-width':2 }))
    g.appendChild(circle({ cx, cy, r:r-9, fill:'none', stroke:'#182830', 'stroke-width':1.5 }))
    // SpeakerWiz
    g.appendChild(circle({ cx, cy, r:r-11, fill: this.url('mid-speakerwiz') }))
    // SpeakerWiz texture rings
    const conR = r - 12
    for (let i = 0; i < 8; i++) {
      const cr = conR - i * (conR - 12) / 8
      g.appendChild(circle({ cx, cy, r:cr, fill:'none',
        stroke:`#${(16+i).toString(16)}${(16+i).toString(16)}${(16+i).toString(16)}`,
        'stroke-width': Math.max(0.4, 0.8 - i*0.05) }))
    }
    // Voice coil former
    g.appendChild(circle({ cx, cy, r:18, fill:'#0c0c0c', stroke:'#1a1a1a', 'stroke-width':1.5 }))
    // Dust cap
    g.appendChild(circle({ cx, cy, r:15, fill: this.url('tweeter-dome') }))
    // Dust cap highlight
    g.appendChild(el('ellipse', { cx:cx-4, cy:cy-4, rx:7, ry:5, fill:'#2a3838', opacity:0.25 }))
    g.appendChild(el('ellipse', { cx:cx-5, cy:cy-5, rx:3, ry:2, fill:'#4a6068', opacity:0.15 }))
    // Center
    g.appendChild(circle({ cx, cy, r:5, fill:'#080e12' }))
    // Mounting screws (6 point)
    if (this.opts.showScrews) {
      for (let i = 0; i < 6; i++) {
        const a  = (i / 6) * Math.PI * 2 - Math.PI / 2
        const sx = cx + Math.cos(a) * (r+1)
        const sy = cy + Math.sin(a) * (r+1)
        g.appendChild(this.makeScrew(sx, sy, 3.5))
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

  // ── Gradient / filter factories ───────────────────────────────────

  private makeFilter(id: string, blurs: number[], merge: boolean): SVGFilterElement {
    const f = el('filter', { id, x:'-60%', y:'-60%', width:'220%', height:'220%' })
    const mergeEl = merge ? el('feMerge') : null

    blurs.forEach((sd, i) => {
      const b = el('feGaussianBlur', { in:'SourceGraphic', stdDeviation:sd, result:`b${i}` })
      f.appendChild(b)
      if (mergeEl) mergeEl.appendChild(el('feMergeNode', { in:`b${i}` }))
    })
    if (mergeEl) {
      mergeEl.appendChild(el('feMergeNode', { in:'SourceGraphic' }))
      f.appendChild(mergeEl)
    }
    return f as SVGFilterElement
  }

  private makeLinearGrad(
    id: string,
    x1: string, y1: string, x2: string, y2: string,
    stops: { o: string; c: string; a?: number }[]
  ): SVGLinearGradientElement {
    const g = el('linearGradient', { id, x1, y1, x2, y2 }) as SVGLinearGradientElement
    for (const s of stops) {
      const stop = el('stop', { offset: s.o, 'stop-color': s.c })
      if (s.a !== undefined) stop.setAttribute('stop-opacity', String(s.a))
      g.appendChild(stop)
    }
    return g
  }

  private makeRadialGrad(
    id: string,
    stops: { o: string; c: string; a?: number }[],
    cx = '50%', cy = '50%', r = '50%'
  ): SVGRadialGradientElement {
    const g = el('radialGradient', { id, cx, cy, r }) as SVGRadialGradientElement
    for (const s of stops) {
      const stop = el('stop', { offset: s.o, 'stop-color': s.c })
      if (s.a !== undefined) stop.setAttribute('stop-opacity', String(s.a))
      g.appendChild(stop)
    }
    return g
  }

  // ── Colour utility ────────────────────────────────────────────────

  /** Blend a hex colour toward black by `t` (0=original, 1=black) */
  private mixDark(hex: string, t: number): string {
    const n = parseInt(hex.replace('#',''), 16)
    const r = Math.round(((n>>16)&255) * (1-t))
    const g = Math.round(((n>>8 )&255) * (1-t))
    const b = Math.round(((n    )&255) * (1-t))
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
  }
}
