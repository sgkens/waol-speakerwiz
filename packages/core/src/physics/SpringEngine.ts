// ─────────────────────────────────────────────────────────────────
// @speakerwiz/core  —  physics/SpringEngine.ts
// Mass-spring-damper model for speaker speakerwiz excursion simulation
// ─────────────────────────────────────────────────────────────────

import type {
  SpringConfig,
  SpringState,
  SpringDriverState,
  DriverKey,
  DriverGains,
} from '../types'

export const DEFAULT_SPRING_CONFIG: SpringConfig = {
  sub: { k: 280, damp: 0.62, mass: 1.0 },
  mid: { k: 320, damp: 0.58, mass: 1.0 },
  hi:  { k: 400, damp: 0.55, mass: 1.0 },
  subSteps: 4,
}

const DRIVERS: DriverKey[] = ['sub', 'mid', 'hi']

export class SpringEngine {
  private cfg: Required<SpringConfig>
  private state: { [K in DriverKey]: SpringDriverState }
  private energy: DriverGains
  private readonly energyDecay = 0.96

  constructor(config: Partial<SpringConfig> = {}) {
    this.cfg = this.mergeConfig(config)
    this.state = {
      sub: { pos: 0, vel: 0 },
      mid: { pos: 0, vel: 0 },
      hi:  { pos: 0, vel: 0 },
    }
    this.energy = { sub: 0, mid: 0, hi: 0 }
  }

  // ── Public API ─────────────────────────────────────────────────

  /** Apply an impulse force to a driver */
  impulse(driver: DriverKey, force: number): void {
    this.state[driver].vel += force
  }

  /** Apply impulses to all drivers at once */
  impulseAll(forces: Partial<DriverGains>): void {
    if (forces.sub != null) this.state.sub.vel += forces.sub
    if (forces.mid != null) this.state.mid.vel += forces.mid
    if (forces.hi  != null) this.state.hi.vel  += forces.hi
  }

  /**
   * Step the simulation forward by dt seconds.
   * Internally sub-stepped for numerical stability.
   */
  step(dt: number): SpringState {
    const steps = this.cfg.subSteps
    const sdt   = Math.min(dt, 0.05) / steps

    for (let i = 0; i < steps; i++) {
      for (const key of DRIVERS) {
        this.stepDriver(key, sdt)
      }
    }

    // Update smoothed energy
    for (const key of DRIVERS) {
      const abs = Math.abs(this.state[key].pos)
      this.energy[key] = Math.max(this.energy[key] * this.energyDecay, abs)
    }

    return this.getState()
  }

  getState(): SpringState {
    return {
      sub: { ...this.state.sub },
      mid: { ...this.state.mid },
      hi:  { ...this.state.hi },
      energy: { ...this.energy },
    }
  }

  reset(): void {
    for (const key of DRIVERS) {
      this.state[key] = { pos: 0, vel: 0 }
      this.energy[key] = 0
    }
  }

  configure(config: Partial<SpringConfig>): void {
    this.cfg = this.mergeConfig(config)
  }

  // ── Private ────────────────────────────────────────────────────

  private stepDriver(key: DriverKey, dt: number): void {
    const s    = this.state[key]
    const cfg  = this.cfg[key]
    const mass = cfg.mass ?? 1.0

    // Spring force: F = -k*x
    // Damping force: F = -damp * sqrt(k*mass) * vel  (critical damping formula)
    const springF = -cfg.k * s.pos
    const dampF   = -cfg.damp * Math.sqrt(cfg.k * mass) * s.vel
    const acc     = (springF + dampF) / mass

    s.vel += acc * dt
    s.pos += s.vel * dt

    // Soft clamp — allows slight overshoot for realism
    s.pos = Math.max(-1.2, Math.min(1.2, s.pos))

    // Velocity micro-damping (air resistance)
    s.vel *= 0.9995
  }

  private mergeConfig(partial: Partial<SpringConfig>): Required<SpringConfig> {
    const base = DEFAULT_SPRING_CONFIG
    return {
      sub:      { ...base.sub, ...partial.sub },
      mid:      { ...base.mid, ...partial.mid },
      hi:       { ...base.hi,  ...partial.hi  },
      subSteps: partial.subSteps ?? base.subSteps!,
    }
  }
}
