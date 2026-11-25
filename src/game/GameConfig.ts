export const GAME_WIDTH = 480
export const GAME_HEIGHT = 800

export const PLAYER = {
  speed: 340,
  maxHealth: 100,
  fireDelay: 170,
  invulnerableMs: 900,
} as const

export const ENEMY_BULLET_DAMAGE = 10
export const PICKUP_HEAL = 18
export const MAX_ENEMIES_ON_SCREEN = 14

export type EnemyKind = 'scout' | 'fighter' | 'tank' | 'asteroid'

export interface EnemySpec {
  texture: string
  hp: number
  speed: readonly [number, number]
  score: number
  contactDamage: number
  /** Milliseconds between shots, absent for enemies that never shoot. */
  fireDelay?: number
  /** Bullets per volley. */
  volley?: number
  minLevel: number
  weight: number
  /** Hit box as a fraction of the texture. */
  hitScale: number
  /** Particles on destruction. */
  burst: number
  /** A tank survives ramming; the rest are destroyed. */
  survivesContact?: boolean
}

export const ENEMIES: Record<EnemyKind, EnemySpec> = {
  scout: { texture: 'scout', hp: 1, speed: [140, 210], score: 10, contactDamage: 15, minLevel: 1, weight: 6, hitScale: 0.7, burst: 14 },
  fighter: { texture: 'fighter', hp: 2, speed: [90, 140], score: 25, contactDamage: 20, fireDelay: 1700, volley: 1, minLevel: 2, weight: 3, hitScale: 0.7, burst: 20 },
  asteroid: { texture: 'asteroid', hp: 3, speed: [90, 170], score: 5, contactDamage: 20, minLevel: 2, weight: 2, hitScale: 0.8, burst: 18 },
  tank: { texture: 'tank', hp: 6, speed: [55, 80], score: 60, contactDamage: 30, fireDelay: 2100, volley: 3, minLevel: 4, weight: 1.2, hitScale: 0.75, burst: 36, survivesContact: true },
}

/** Level rises every 200 points. */
export const levelForScore = (score: number) => Math.min(20, 1 + Math.floor(score / 200))
export const spawnDelayMs = (level: number) => Math.max(300, 800 - (level - 1) * 50)
export const speedScale = (level: number) => Math.min(2.2, 1 + (level - 1) * 0.07)
/** Weapon upgrades with level: single, double, then triple shot. */
export const shotsForLevel = (level: number) => (level >= 6 ? 3 : level >= 3 ? 2 : 1)

export interface HudState {
  score: number
  health: number
  maxHealth: number
  /** Whole seconds survived. */
  seconds: number
  kills: number
  level: number
}

export interface GameOverStats {
  score: number
  kills: number
  seconds: number
}

/** Touch / virtual-joystick input written by the React overlay, read by the scene. */
export interface TouchInput {
  x: number
  y: number
  fire: boolean
}

export interface GameHandle {
  pause: () => void
  resume: () => void
  restart: () => void
  destroy: () => void
}
