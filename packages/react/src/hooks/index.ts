// ─────────────────────────────────────────────────────────────────
// @speakerwiz/react  —  hooks/index.ts
// React hooks: useAudioAnalyser, useSpeakerWizPhysics, useBeatSequencer
// ─────────────────────────────────────────────────────────────────

import { useRef, useState, useEffect, useCallback, useRef as useRafRef } from 'react'
import { AudioAnalyser } from '@speakerwiz/core/audio/AudioAnalyser'
import { SpringEngine   } from '@speakerwiz/core/physics/SpringEngine'
import { BeatSequencer, PATTERNS } from '@speakerwiz/core/physics/BeatSequencer'
import type {
  AnalyserOptions,
  SpringConfig,
  SpringState,
  DriverGains,
  BeatHit,
  BandEnergy,
  BeatPattern,
  BuiltInPattern,
  StepEvent,
  BeatEvent,
} from '@speakerwiz/core/types'

// ─────────────────────────────────────────────────────────────────
// useAudioAnalyser
// Wraps AudioAnalyser, auto-connects to a media element ref,
// returns live waveform / frequency / band data each animation frame
// ─────────────────────────────────────────────────────────────────

export interface AudioAnalyserReturn {
  analyser:  AudioAnalyser | null
  waveform:  Float32Array
  frequency: Uint8Array
  bands:     BandEnergy
  connected: boolean
  resume:    () => Promise<void>
}

export function useAudioAnalyser(
  mediaRef:  React.RefObject<HTMLMediaElement> | null,
  opts:      AnalyserOptions = {}
): AudioAnalyserReturn {
  const analyserRef = useRef<AudioAnalyser | null>(null)
  const rafRef      = useRef<number>(0)

  const [waveform,  setWaveform]  = useState<Float32Array>(new Float32Array(0))
  const [frequency, setFrequency] = useState<Uint8Array>(new Uint8Array(0))
  const [bands,     setBands]     = useState<BandEnergy>({ sub:0, low:0, mid:0, high:0, air:0 })
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const a = new AudioAnalyser(opts)
    analyserRef.current = a

    if (mediaRef?.current) {
      a.connectMedia(mediaRef.current)
      setConnected(true)
    }

    let running = true
    function tick() {
      if (!running) return
      if (a.isConnected) {
        setWaveform(new Float32Array(a.getWaveform()))
        setFrequency(new Uint8Array(a.getFrequency()))
        setBands(a.getBands())
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      a.destroy()
      analyserRef.current = null
      setConnected(false)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const resume = useCallback(async () => {
    await analyserRef.current?.resume()
  }, [])

  return { analyser: analyserRef.current, waveform, frequency, bands, connected, resume }
}

// ─────────────────────────────────────────────────────────────────
// useSpeakerWizPhysics
// Runs SpringEngine in a rAF loop, returns live SpringState.
// Can be driven by AudioAnalyser bands OR manual trigger calls.
// ─────────────────────────────────────────────────────────────────

export interface SpeakerWizPhysicsOptions {
  physics?: Partial<SpringConfig>
  gains?:   Partial<DriverGains>
  /** If provided, physics are driven by these band values each frame */
  bands?:   BandEnergy | null
  sensitivity?: number
}

export interface SpeakerWizPhysicsReturn {
  state:    SpringState
  trigger:  (hit: BeatHit) => void
  setGains: (gains: Partial<DriverGains>) => void
  reset:    () => void
}

export function useSpeakerWizPhysics(opts: SpeakerWizPhysicsOptions = {}): SpeakerWizPhysicsReturn {
  const engineRef  = useRef<SpringEngine | null>(null)
  const gainsRef   = useRef<DriverGains>({ sub: 0.8, mid: 0.7, hi: 0.6, ...opts.gains })
  const lastTRef   = useRef<number>(0)
  const rafRef     = useRef<number>(0)

  const [state, setState] = useState<SpringState>({
    sub:    { pos: 0, vel: 0 },
    mid:    { pos: 0, vel: 0 },
    hi:     { pos: 0, vel: 0 },
    energy: { sub: 0, mid: 0, hi: 0 },
  })

  useEffect(() => {
    const engine = new SpringEngine(opts.physics)
    engineRef.current = engine

    let running = true
    function tick(now: number) {
      if (!running) return
      const dt = lastTRef.current ? (now - lastTRef.current) / 1000 : 0.016
      lastTRef.current = now

      // Drive physics from audio bands if provided
      const bands = opts.bands
      if (bands) {
        const impulses = new AudioAnalyser().toDriverImpulses(bands, opts.sensitivity ?? 1.0)
        engine.impulseAll({
          sub: (impulses.sub ?? 0) * gainsRef.current.sub * 10,
          mid: (impulses.mid ?? 0) * gainsRef.current.mid * 10,
          hi:  (impulses.hi  ?? 0) * gainsRef.current.hi  * 10,
        })
      }

      setState(engine.step(dt))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      engineRef.current = null
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const trigger = useCallback((hit: BeatHit) => {
    const e = engineRef.current
    if (!e) return
    if (hit.sub) e.impulse('sub', hit.sub * gainsRef.current.sub * 14)
    if (hit.mid) e.impulse('mid', hit.mid * gainsRef.current.mid * 16)
    if (hit.hi)  e.impulse('hi',  hit.hi  * gainsRef.current.hi  * 20)
  }, [])

  const setGains = useCallback((gains: Partial<DriverGains>) => {
    gainsRef.current = { ...gainsRef.current, ...gains }
  }, [])

  const reset = useCallback(() => {
    engineRef.current?.reset()
  }, [])

  return { state, trigger, setGains, reset }
}

// ─────────────────────────────────────────────────────────────────
// useBeatSequencer
// React wrapper around BeatSequencer with play/pause/stop controls
// ─────────────────────────────────────────────────────────────────

export interface BeatSequencerOptions {
  pattern?:   BeatPattern | BuiltInPattern
  bpm?:       number
  autoPlay?:  boolean
  onStep?:    (event: StepEvent) => void
  onBeat?:    (event: BeatEvent) => void
}

export interface BeatSequencerReturn {
  play:        () => void
  pause:       () => void
  stop:        () => void
  setBPM:      (bpm: number) => void
  loadPattern: (pattern: BeatPattern | BuiltInPattern) => void
  currentStep: number
  playing:     boolean
  bpm:         number
}

export function useBeatSequencer(opts: BeatSequencerOptions = {}): BeatSequencerReturn {
  const seqRef     = useRef<BeatSequencer | null>(null)
  const rafRef     = useRef<number>(0)
  const [step, setStep]       = useState(0)
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpmState]    = useState(opts.bpm ?? 128)

  useEffect(() => {
    const seq = new BeatSequencer(opts.pattern ?? 'hiphop', opts.bpm ?? 128)
    seqRef.current = seq

    if (opts.onStep) seq.on('step', opts.onStep)
    if (opts.onBeat) seq.on('beat', opts.onBeat)
    seq.on('step', (e) => setStep(e.index))

    if (opts.autoPlay) {
      seq.play()
      setPlaying(true)
    }

    let running = true
    function tick() {
      if (!running) return
      seq.tick(performance.now())
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      seqRef.current = null
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback(() => {
    seqRef.current?.play()
    setPlaying(true)
  }, [])

  const pause = useCallback(() => {
    seqRef.current?.pause()
    setPlaying(false)
  }, [])

  const stop = useCallback(() => {
    seqRef.current?.stop()
    setPlaying(false)
    setStep(0)
  }, [])

  const setBPM = useCallback((v: number) => {
    seqRef.current?.setBPM(v)
    setBpmState(v)
  }, [])

  const loadPattern = useCallback((p: BeatPattern | BuiltInPattern) => {
    seqRef.current?.loadPattern(p)
  }, [])

  return { play, pause, stop, setBPM, loadPattern, currentStep: step, playing, bpm }
}
