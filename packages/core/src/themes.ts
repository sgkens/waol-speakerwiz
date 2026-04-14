// ─────────────────────────────────────────────────────────────────
// @waol-speakerwiz/core  —  themes.ts
// Built-in visual themes for waol-speakerwiz
// ─────────────────────────────────────────────────────────────────

import type { WaolSpeakerWizTheme, BuiltInTheme } from './types'

export const THEMES: Record<BuiltInTheme, WaolSpeakerWizTheme> = {
  'neon-dark': {
    background:    '#060a0c',
    cabinet:       '#0f1820',
    cabinetEdge:   '#2a4050',
    cabinetScrews: '#2a3a42',
    basket:        '#1a2a32',
    surround:      '#0e1e28',
    waolSpeakerwiz:      '#005a78',
    waolSpeakerwizRings: '#00d4ff',
    waolSpeakerwizGlow:  '#00d4ff',
    dustCap:       '#001e2a',
    bloom:         '#00d4ff',
    bloomIntensity: 0.85,
    floorGlow:     '#00d4ff',
  },

  'amber-studio': {
    background:    '#0a0806',
    cabinet:       '#1a1208',
    cabinetEdge:   '#3a2810',
    cabinetScrews: '#2a2018',
    basket:        '#221808',
    surround:      '#1a1008',
    waolSpeakerwiz:      '#5a3000',
    waolSpeakerwizRings: '#ff8800',
    waolSpeakerwizGlow:  '#ff8800',
    dustCap:       '#2a1400',
    bloom:         '#ff8800',
    bloomIntensity: 0.75,
    floorGlow:     '#ff6600',
  },

  'monochrome': {
    background:    '#080808',
    cabinet:       '#111111',
    cabinetEdge:   '#2a2a2a',
    cabinetScrews: '#1e1e1e',
    basket:        '#181818',
    surround:      '#111111',
    waolSpeakerwiz:      '#1a1a1a',
    waolSpeakerwizRings: '#e0e0e0',
    waolSpeakerwizGlow:  '#ffffff',
    dustCap:       '#0c0c0c',
    bloom:         '#ffffff',
    bloomIntensity: 0.5,
    floorGlow:     '#888888',
  },

  'vapor': {
    background:    '#0a0612',
    cabinet:       '#120820',
    cabinetEdge:   '#3a1050',
    cabinetScrews: '#2a0a3a',
    basket:        '#1a0828',
    surround:      '#120618',
    waolSpeakerwiz:      '#3a0050',
    waolSpeakerwizRings: '#ff00ff',
    waolSpeakerwizGlow:  '#ff40ff',
    dustCap:       '#1a0020',
    bloom:         '#ff00ff',
    bloomIntensity: 0.9,
    floorGlow:     '#cc00ff',
  },
}

export function resolveTheme(theme: WaolSpeakerWizTheme | BuiltInTheme): WaolSpeakerWizTheme {
  if (typeof theme === 'string') {
    const t = THEMES[theme]
    if (!t) throw new Error(`[waol-speakerwiz] Unknown theme: "${theme}". Valid: ${Object.keys(THEMES).join(', ')}`)
    return t
  }
  return theme
}
