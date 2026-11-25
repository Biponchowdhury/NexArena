import { PLAYER, type HudState } from './GameConfig'

export const INITIAL_HUD: HudState = {
  score: 0,
  health: PLAYER.maxHealth,
  maxHealth: PLAYER.maxHealth,
  seconds: 0,
  kills: 0,
  level: 1,
}

/**
 * Tiny external store the Phaser scene writes to and the React HUD reads with
 * useSyncExternalStore. Only the HUD re-renders while playing, never the page.
 */
export interface HudStore {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => HudState
  set: (next: HudState) => void
}

export function createHudStore(): HudStore {
  let state = INITIAL_HUD
  const listeners = new Set<() => void>()
  return {
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => state,
    set: (next) => {
      if (
        next.score === state.score &&
        next.health === state.health &&
        next.seconds === state.seconds &&
        next.kills === state.kills &&
        next.level === state.level
      ) {
        return
      }
      state = next
      listeners.forEach((listener) => listener())
    },
  }
}
