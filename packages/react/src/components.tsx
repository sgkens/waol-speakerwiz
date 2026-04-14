// ─────────────────────────────────────────────────────────────────
// @waol-speakerwiz/react  —  components.tsx
// Standalone React components for waol-speakerwiz
// ─────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react'
import { SpeakerRenderer } from '@waol-speakerwiz/core/renderers/SpeakerRenderer'
import { GlowRenderer }    from '@waol-speakerwiz/core/renderers/GlowRenderer'
import { resolveTheme }    from '@waol-speakerwiz/core/themes'

import type {
  SpeakerOptions,
  WaolSpeakerWizTheme,
  BuiltInTheme,
  RenderState,
  SpringState,
  DriverGains,
} from '@waol-speakerwiz/core'

// ── Shared defaults ───────────────────────────────────────────────

interface BaseProps {
  theme?:     WaolSpeakerWizTheme | BuiltInTheme
  className?: string
  style?:     React.CSSProperties
  dpr?:       number
}

const DEFAULT_GAINS: DriverGains = { sub:0.85, mid:0.7, hi:0.6 }

// ─────────────────────────────────────────────────────────────────
// <WaolSpeakerViz />
// ─────────────────────────────────────────────────────────────────

export interface WaolSpeakerVizProps extends BaseProps {
  state:       SpringState
  gains?:      Partial<DriverGains>
  width?:      number
  height?:     number
  speaker?:    SpeakerOptions
  showGlow?:   boolean
}

export function WaolSpeakerViz({
  state,
  gains   = DEFAULT_GAINS,
  width   = 620,
  height  = 560,
  theme   = 'neon-dark',
  speaker = {},
  showGlow = true,
  className,
  style,
  dpr,
}: WaolSpeakerVizProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const speakerRef    = useRef<SpeakerRenderer | null>(null)
  const glowRef       = useRef<GlowRenderer    | null>(null)
  const stateRef      = useRef(state)
  const gainsRef      = useRef<DriverGains>({ ...DEFAULT_GAINS, ...gains })
  stateRef.current = state
  gainsRef.current = { ...DEFAULT_GAINS, ...gains }

  useEffect(() => {
    if (!containerRef.current) return
    const t = resolveTheme(theme)
    const pixelRatio = dpr ?? window.devicePixelRatio ?? 1

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    svg.setAttribute('viewBox', '0 0 620 560')
    svg.setAttribute('width',  String(width))
    svg.setAttribute('height', String(height))
    svg.style.display = 'block'
    containerRef.current.appendChild(svg)

    speakerRef.current = new SpeakerRenderer(svg, speaker, t)

    if (showGlow) {
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;'
      containerRef.current.appendChild(canvas)
      glowRef.current = new GlowRenderer(canvas, {}, t, pixelRatio)
      glowRef.current.resize(width, height)
    }

    let running = true
    const loop = (now: number) => {
      if (!running) return
      const rs: RenderState = {
        spring:    stateRef.current,
        gains:     gainsRef.current,
        timestamp: now,
        deltaTime: 0.016,
      }
      speakerRef.current?.update(rs)
      glowRef.current?.update(rs)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)

    return () => {
      running = false
      speakerRef.current?.destroy()
      glowRef.current?.destroy()
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [width, height, theme, dpr, speaker, showGlow])

  return <div ref={containerRef} className={className} style={{ position:'relative', display:'inline-block', width, height, ...style }} />
}
