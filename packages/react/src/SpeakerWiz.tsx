// ─────────────────────────────────────────────────────────────────
// @speakerwiz/react  —  SpeakerWiz.tsx
// All-in-one React component. Drop-in for any TSX music app.
// Mounts the SpeakerWiz orchestrator, handles lifecycle, exposes ref.
// ─────────────────────────────────────────────────────────────────

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react'

import { SpeakerWiz as SpeakerWizCore } from '@speakerwiz/core/SpeakerWiz'
import type {
  SpeakerWizOptions,
  BeatHit,
  DriverGains,
  BeatPattern,
  BuiltInPattern,
  SpeakerWizTheme,
  BuiltInTheme,
  BeatEvent,
  StepEvent,
} from '@speakerwiz/core'

// ── Props ─────────────────────────────────────────────────────────

export interface SpeakerWizProps
  extends Omit<SpeakerWizOptions, 'width' | 'height'> {
  /** Attach to an <audio> or <video> element for real audio reactivity */
  mediaRef?:     React.RefObject<HTMLMediaElement>
  /** Width in px (default 620) */
  width?:        number
  /** Speaker height in px (default 560) */
  height?:       number
  /** CSS class applied to root div */
  className?:    string
  /** Inline style for root div */
  style?:        React.CSSProperties
  /** Called on each bar beat */
  onBeat?:       (event: BeatEvent) => void
  /** Called on each 16th-note step */
  onStep?:       (event: StepEvent) => void
  /** Called when viz is fully mounted */
  onMount?:      (viz: SpeakerWizCore) => void
}

// ── Imperative handle (ref API) ───────────────────────────────────

export interface SpeakerWizHandle {
  /** The underlying SpeakerWiz instance */
  viz:       SpeakerWizCore | null
  /** Fire a manual beat */
  trigger:   (hit: BeatHit) => void
  play:      () => void
  pause:     () => void
  stop:      () => void
  setBPM:    (bpm: number) => void
  setGains:  (gains: Partial<DriverGains>) => void
  setTheme:  (theme: SpeakerWizTheme | BuiltInTheme) => void
  setPattern:(pattern: BeatPattern | BuiltInPattern) => void
}

// ── Component ─────────────────────────────────────────────────────

export const SpeakerWiz = forwardRef<SpeakerWizHandle, SpeakerWizProps>(
  function SpeakerWiz(props, ref) {
    const {
      mediaRef,
      width     = 620,
      height    = 560,
      className,
      style,
      onBeat,
      onStep,
      onMount,
      // SpeakerWizOptions forwarded below
      theme,
      speaker,
      waveform,
      eq,
      spectrogram,
      particles,
      geometric3d,
      radial,
      physics,
      gains,
      bpm,
      pattern,
      autoPlay,
      devicePixelRatio,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const vizRef       = useRef<SpeakerWizCore | null>(null)

    // ── Mount / destroy ──
    useEffect(() => {
      if (!containerRef.current) return

      const viz = new SpeakerWizCore(containerRef.current, {
        width, height, theme, speaker, waveform, eq,
        spectrogram, particles, geometric3d, radial,
        physics, gains, bpm, pattern, autoPlay, devicePixelRatio,
      })

      viz.mount()

      // Connect media element if provided
      if (mediaRef?.current) {
        viz.connectMedia(mediaRef.current)
      }

      // Event listeners
      if (onBeat) viz.on('beat', onBeat)
      if (onStep) viz.on('step', onStep)

      vizRef.current = viz
      onMount?.(viz)

      // Resume audio context on first user interaction
      const resume = () => viz.resumeAudio()
      document.addEventListener('click', resume, { once: true })
      document.addEventListener('keydown', resume, { once: true })

      return () => {
        document.removeEventListener('click', resume)
        document.removeEventListener('keydown', resume)
        viz.destroy()
        vizRef.current = null
      }
    }, [])  // eslint-disable-line react-hooks/exhaustive-deps

    // ── Media ref changes ──
    useEffect(() => {
      if (!mediaRef?.current || !vizRef.current) return
      vizRef.current.connectMedia(mediaRef.current)
    }, [mediaRef?.current])  // eslint-disable-line react-hooks/exhaustive-deps

    // ── Imperative handle ──
    useImperativeHandle(ref, () => ({
      get viz() { return vizRef.current },
      trigger:    (hit) => vizRef.current?.trigger(hit),
      play:       ()    => vizRef.current?.play(),
      pause:      ()    => vizRef.current?.pause(),
      stop:       ()    => vizRef.current?.stop(),
      setBPM:     (v)   => vizRef.current?.setBPM(v),
      setGains:   (g)   => vizRef.current?.setGains(g),
      setTheme:   (t)   => vizRef.current?.setTheme(t),
      setPattern: (p)   => vizRef.current?.setPattern(p),
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

SpeakerWiz.displayName = 'SpeakerWiz'
