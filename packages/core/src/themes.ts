// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  themes.ts
// Built-in visual themes for speakerwiz
// ─────────────────────────────────────────────────────────────────

import type { SpeakerWizTheme, BuiltInTheme } from './types'

export const THEMES: Record<BuiltInTheme, SpeakerWizTheme> = {
  'neon-dark': {
    background:    '#060a0c',
    cabinet:       '#0f1820',
    cabinetEdge:   '#2a4050',
    cabinetScrews: '#2a3a42',
    basket:        '#1a2a32',
    surround:      '#0e1e28',
    speakerwiz:          '#005a78',
    speakerwizRings:     '#00d4ff',
    speakerwizGlow:      '#00d4ff',
    dustCap:       '#001e2a',
    bloom:         '#00d4ff',
    bloomIntensity: 0.85,
    waveform:      '#00d4ff',
    waveformGlow:  '#00a0cc',
    waveformFill:  'rgba(0,212,255,0.08)',
    eq:            ['#004466','#006688','#0088aa','#00aacc','#00ccee','#00d4ff'],
    eqGlow:        '#00d4ff',
    floorGlow:     '#00d4ff',
  },

  'amber-studio': {
    background:    '#0a0806',
    cabinet:       '#1a1208',
    cabinetEdge:   '#3a2810',
    cabinetScrews: '#2a2018',
    basket:        '#221808',
    surround:      '#1a1008',
    speakerwiz:          '#5a3000',
    speakerwizRings:     '#ff8800',
    speakerwizGlow:      '#ff8800',
    dustCap:       '#2a1400',
    bloom:         '#ff8800',
    bloomIntensity: 0.75,
    waveform:      '#ff8800',
    waveformGlow:  '#cc6600',
    waveformFill:  'rgba(255,136,0,0.07)',
    eq:            ['#3a1800','#5a2800','#7a3800','#aa5500','#cc7700','#ff8800'],
    eqGlow:        '#ff8800',
    floorGlow:     '#ff6600',
  },

  'monochrome': {
    background:    '#080808',
    cabinet:       '#111111',
    cabinetEdge:   '#2a2a2a',
    cabinetScrews: '#1e1e1e',
    basket:        '#181818',
    surround:      '#111111',
    speakerwiz:          '#1a1a1a',
    speakerwizRings:     '#e0e0e0',
    speakerwizGlow:      '#ffffff',
    dustCap:       '#0c0c0c',
    bloom:         '#ffffff',
    bloomIntensity: 0.5,
    waveform:      '#c8c8c8',
    waveformGlow:  '#888888',
    waveformFill:  'rgba(200,200,200,0.06)',
    eq:            ['#222','#333','#444','#666','#888','#aaa'],
    eqGlow:        '#ffffff',
    floorGlow:     '#888888',
  },

  'vapor': {
    background:    '#0a0612',
    cabinet:       '#120820',
    cabinetEdge:   '#3a1050',
    cabinetScrews: '#2a0a3a',
    basket:        '#1a0828',
    surround:      '#120618',
    speakerwiz:          '#3a0050',
    speakerwizRings:     '#ff00ff',
    speakerwizGlow:      '#ff40ff',
    dustCap:       '#1a0020',
    bloom:         '#ff00ff',
    bloomIntensity: 0.9,
    waveform:      '#00ffff',
    waveformGlow:  '#00cccc',
    waveformFill:  'rgba(0,255,255,0.07)',
    eq:            ['#1a0030','#3a0060','#7700aa','#cc00cc','#ff00ff','#ff40ff'],
    eqGlow:        '#ff00ff',
    floorGlow:     '#cc00ff',
  },
}

export function resolveTheme(theme: SpeakerWizTheme | BuiltInTheme): SpeakerWizTheme {
  if (typeof theme === 'string') {
    const t = THEMES[theme]
    if (!t) throw new Error(`[speakerwiz] Unknown theme: "${theme}". Valid: ${Object.keys(THEMES).join(', ')}`)
    return t
  }
  return theme
}
