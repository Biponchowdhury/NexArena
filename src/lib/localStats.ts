import { useSyncExternalStore } from 'react'
import type { GameOverStats } from '../game/GameConfig'
import { createPersistedStore, isRecord } from './persistedStore'

export interface LocalStats {
  highScore: number
  latestScore: number
  gamesPlayed: number
  enemiesDestroyed: number
}

const EMPTY: LocalStats = { highScore: 0, latestScore: 0, gamesPlayed: 0, enemiesDestroyed: 0 }

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)

const store = createPersistedStore<LocalStats>('nexarena:stats:v1', EMPTY, (value) => {
  if (!isRecord(value)) return EMPTY
  return {
    highScore: num(value.highScore),
    latestScore: num(value.latestScore),
    gamesPlayed: num(value.gamesPlayed),
    enemiesDestroyed: num(value.enemiesDestroyed),
  }
})

/** Saves a finished run. Returns true when it is a new personal best. */
export function recordGame(stats: GameOverStats): boolean {
  const current = store.getSnapshot()
  const isBest = stats.score > current.highScore
  store.set({
    highScore: Math.max(current.highScore, stats.score),
    latestScore: stats.score,
    gamesPlayed: current.gamesPlayed + 1,
    enemiesDestroyed: current.enemiesDestroyed + stats.kills,
  })
  return isBest
}

export const getLocalStats = () => store.getSnapshot()

export const useLocalStats = () => useSyncExternalStore(store.subscribe, store.getSnapshot)
