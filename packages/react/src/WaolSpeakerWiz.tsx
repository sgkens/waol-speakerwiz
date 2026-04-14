// ─────────────────────────────────────────────────────────────────
// @waol-speakerwiz/react  —  WaolSpeakerWiz.tsx
// All-in-one React component for waol-speakerwiz
// ─────────────────────────────────────────────────────────────────

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react'

import { WaolSpeakerWiz as WaolSpeakerWizCore } from '@waol-speakerwiz/core/WaolSpeakerWiz'
import type {
  WaolSpeakerWizOptions,
  BeatHit,
  DriverGains,
  BeatPattern,
  BuiltInPattern,
  WaolSpeakerWizTheme,
  BuiltInTheme,
  BeatEvent,
  StepEvent,
} from '@waol-speakerwiz/core'

// ── Props ─────────────────────────────────────────────────────────

export interface WaolSpeakerWizProps
  extends Omit<WaolSpeakerWizOptions, 'width' | 'height'> {
  width?:     number
  height?:    number
  className?: string
  style?:     React.CSSProperties
  /** Fires when a beat (quarter note) occurs */
  onBeat?:    (e: BeatEvent) => void
  /** Fires on every sequencer step (16th note) */
  onStep?:    (e: StepEvent) => void
  /** Access to the underlying vanilla instance */
  onReady?:   (viz: WaolSpeakerWizCore) => void
}

/** Methods exposed via ref */
export interface WaolSpeakerWizRef {
  play:       () => void
  pause:      () => void
  stop:       () => void
  trigger:    (hit: BeatHit) => void
  setBPM:     (bpm: number) => void
  setGains:   (gains: Partial<DriverGains>) => void
  setTheme:   (theme: WaolSpeakerWizTheme | BuiltInTheme) => void
  setPattern: (pattern: BeatPattern | BuiltInPattern) => void
}

// ─────────────────────────────────────────────────────────────────

export const WaolSpeakerWiz = forwardRef<WaolSpeakerWizRef, WaolSpeakerWizProps>(
  (props, ref) => {
    const {
      width  = 620,
      height = 560,
      className,
      style,
      onBeat,
      onStep,
      onReady,

      // WaolSpeakerWizOptions forwarded below
      theme,
      speaker,
      physics,
      gains,
      bpm,
      pattern,
      autoPlay,
      devicePixelRatio,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const vizRef       = useRef<WaolSpeakerWizCore | null>(null)

    // ── Mount / destroy ──
    useEffect(() => {
      if (!containerRef.current) return

      const viz = new WaolSpeakerWizCore(containerRef.current, {
        width, height, theme, speaker,
        physics, gains, bpm, pattern, autoPlay, devicePixelRatio,
      })

      viz.mount()
      vizRef.current = viz

      if (onReady) onReady(viz)

      return () => {
        viz.destroy()
        vizRef.current = null
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync props ──
    useEffect(() => {
      if (vizRef.current) vizRef.current.resize(width, height)
    }, [width, height])

    useEffect(() => {
      if (theme && vizRef.current) vizRef.current.setTheme(theme)
    }, [theme])

    useEffect(() => {
      if (bpm != null && vizRef.current) vizRef.current.setBPM(bpm)
    }, [bpm])

    useEffect(() => {
      if (pattern && vizRef.current) vizRef.current.setPattern(pattern)
    }, [pattern])

    useEffect(() => {
      if (gains && vizRef.current) vizRef.current.setGains(gains)
    }, [gains])

    // ── Event listeners ──
    useEffect(() => {
      const viz = vizRef.current
      if (!viz) return

      const handleBeat = (e: BeatEvent) => onBeat?.(e)
      const handleStep = (e: StepEvent) => onStep?.(e)

      viz.on('beat', handleBeat)
      viz.on('step', handleStep)

      return () => {
        viz.off('beat', handleBeat)
        viz.off('step', handleStep)
      }
    }, [onBeat, onStep])

    // ── Imperative API ──
    useImperativeHandle(ref, () => ({
      play:       () => vizRef.current?.play(),
      pause:      () => vizRef.current?.pause(),
      stop:       () => vizRef.current?.stop(),
      trigger:    (h) => vizRef.current?.trigger(h),
      setBPM:     (b) => vizRef.current?.setBPM(b),
      setGains:   (g) => vizRef.current?.setGains(g),
      setTheme:   (t) => vizRef.current?.setTheme(t),
      setPattern: (p) => vizRef.current?.setPattern(p),
    }), [])

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ display: 'inline-block', ...style }}
      />
    )
  }
)

WaolSpeakerWiz.displayName = 'WaolSpeakerWiz'
