// ─────────────────────────────────────────────────────────────────
// speakerwiz — Usage Examples (TSX / TypeScript)
// Copy-paste patterns for your music app
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
// 1. ALL-IN-ONE: Beat sequencer demo (no audio file needed)
// ══════════════════════════════════════════════════════════════════
import { SpeakerWiz } from '@speakerwiz/react'

export function BeatDemo() {
  return (
    <SpeakerWiz
      pattern="house"
      bpm={128}
      theme="neon-dark"
      showSpeaker
      waveform={{ mode: 'mirror', height: 72 }}
      eq={{ mode: 'bars', bands: 32, height: 96, peakHold: true }}
      autoPlay
    />
  )
}


// ══════════════════════════════════════════════════════════════════
// 2. MEDIA PLAYER: Connect to real audio
// ══════════════════════════════════════════════════════════════════
import { useRef } from 'react'
import { SpeakerWiz } from '@speakerwiz/react'

export function MediaPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)

  return (
    <div>
      <audio ref={audioRef} src={src} controls />
      <SpeakerWiz
        mediaRef={audioRef}
        theme="amber-studio"
        waveform={{ mode: 'filled', height: 80 }}
        eq={{ mode: 'filled-curve', bands: 20, height: 100 }}
      />
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
// 3. BEAT APP: Manual trigger from your own sequencer
// ══════════════════════════════════════════════════════════════════
import { useRef } from 'react'
import { SpeakerWiz, type SpeakerWizHandle } from '@speakerwiz/react'

export function BeatApp() {
  const vizRef = useRef<SpeakerWizHandle>(null)

  // Call this from your own beat engine
  function onKick() {
    vizRef.current?.trigger({ sub: 1.0, mid: 0.3 })
  }
  function onSnare() {
    vizRef.current?.trigger({ mid: 0.9, hi: 0.4 })
  }
  function onHiHat() {
    vizRef.current?.trigger({ hi: 0.8 })
  }

  return (
    <SpeakerWiz
      ref={vizRef}
      theme="neon-dark"
      gains={{ sub: 0.9, mid: 0.7, hi: 0.6 }}
    />
  )
}


// ══════════════════════════════════════════════════════════════════
// 4. COMPOSABLE: Use individual pieces with hooks
// ══════════════════════════════════════════════════════════════════
import { useRef } from 'react'
import {
  SpeakerViz,
  Waveform,
  EQVisualizer,
  useAudioAnalyser,
  useSpeakerWizPhysics,
} from '@speakerwiz/react'

export function ComposablePlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)

  // Real audio data
  const { waveform, frequency, bands } = useAudioAnalyser(audioRef)

  // Physics driven by live audio bands
  const { state, setGains } = useSpeakerWizPhysics({
    bands,
    sensitivity: 1.2,
    gains: { sub: 0.9, mid: 0.7, hi: 0.6 },
  })

  return (
    <div style={{ background: '#060a0c', padding: 24 }}>
      <audio ref={audioRef} src={src} controls />

      {/* Speaker with glow */}
      <SpeakerViz
        state={state}
        theme="neon-dark"
        width={620}
        height={560}
        showGlow
      />

      {/* Waveform below */}
      <Waveform
        data={waveform}
        state={state}
        theme="neon-dark"
        width={620}
        height={72}
        options={{ mode: 'mirror' }}
      />

      {/* EQ below that */}
      <EQVisualizer
        data={frequency}
        theme="neon-dark"
        width={620}
        height={96}
        options={{ mode: 'bars', bands: 32, peakHold: true }}
      />
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════
// 5. VANILLA JS: No framework, direct integration
// ══════════════════════════════════════════════════════════════════
import { SpeakerWiz } from '@speakerwiz/core'

const container = document.getElementById('viz')!

const viz = new SpeakerWiz(container, {
  theme:   'neon-dark',
  pattern: 'hiphop',
  bpm:     128,
  waveform: { mode: 'mirror', height: 72 },
  eq:      { mode: 'bars', bands: 32, height: 96 },
})

viz.mount()
viz.play()

// Connect to an audio element
const audio = document.querySelector('audio')!
viz.connectMedia(audio)

// Listen for beats
viz.on('beat', ({ bar, beat }) => {
  console.log(`Bar ${bar}, Beat ${beat}`)
})

// Manual trigger (e.g. from MIDI input)
viz.trigger({ sub: 1.0 })  // kick
viz.trigger({ hi: 0.9  })  // hi-hat

// Theme switch
viz.setTheme('amber-studio')
viz.setBPM(140)


// ══════════════════════════════════════════════════════════════════
// 6. CUSTOM THEME: Match your app's brand
// ══════════════════════════════════════════════════════════════════
import type { SpeakerWizTheme } from '@speakerwiz/react'

const myTheme: SpeakerWizTheme = {
  background:      '#0a0010',
  cabinet:         '#120820',
  cabinetEdge:     '#3a1060',
  cabinetScrews:   '#2a0850',
  basket:          '#1a0830',
  surround:        '#100620',
  speakerwiz:            '#4a0080',
  speakerwizRings:       '#cc00ff',
  speakerwizGlow:        '#dd22ff',
  dustCap:         '#200030',
  bloom:           '#cc00ff',
  bloomIntensity:  0.9,
  waveform:        '#00ffff',
  waveformGlow:    '#00cccc',
  waveformFill:    'rgba(0,255,255,0.07)',
  eq:              ['#1a0030','#3a0060','#7700aa','#cc00cc','#ff00ff','#ff44ff'],
  eqGlow:          '#cc00ff',
  floorGlow:       '#aa00dd',
}

export function BrandedViz() {
  return <SpeakerWiz theme={myTheme} pattern="vapor" autoPlay />
}


// ══════════════════════════════════════════════════════════════════
// 7. CUSTOM BEAT PATTERN
// ══════════════════════════════════════════════════════════════════
import type { BeatPattern } from '@speakerwiz/react'

const myPattern: BeatPattern = {
  name: 'My Pattern',
  steps: [
    { s:1.0, m:0,   h:0   },  // 1  kick
    { s:0,   m:0,   h:0.8 },  // 2
    { s:0,   m:0,   h:0.6 },  // 3
    { s:0,   m:0,   h:0.8 },  // 4
    { s:0,   m:1.0, h:0   },  // 5  snare
    { s:0,   m:0,   h:0.8 },  // 6
    { s:0.4, m:0,   h:0.6 },  // 7  ghost kick
    { s:0,   m:0,   h:0.8 },  // 8
    { s:0.9, m:0,   h:0   },  // 9  kick
    { s:0,   m:0,   h:0.8 },  // 10
    { s:0,   m:0,   h:0.6 },  // 11
    { s:0,   m:0,   h:0.8 },  // 12
    { s:0,   m:1.0, h:0   },  // 13 snare
    { s:0,   m:0,   h:0.8 },  // 14
    { s:0.5, m:0,   h:0.6 },  // 15
    { s:0,   m:0,   h:1.0 },  // 16 open hat
  ],
}

export function CustomPatternViz() {
  return <SpeakerWiz pattern={myPattern} bpm={95} theme="amber-studio" autoPlay />
}
