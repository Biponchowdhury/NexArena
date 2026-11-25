/**
 * Minimal localStorage-backed store for useSyncExternalStore. The snapshot is
 * cached per raw string so React gets a stable reference between changes.
 */
export interface PersistedStore<T> {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => T
  set: (next: T) => void
}

export function createPersistedStore<T>(key: string, fallback: T, parse: (value: unknown) => T): PersistedStore<T> {
  const listeners = new Set<() => void>()
  let lastRaw: string | null | undefined
  let cached: T = fallback

  const read = (): string | null => {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }

  const notify = () => listeners.forEach((listener) => listener())

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) notify()
      }
      window.addEventListener('storage', onStorage)
      return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', onStorage)
      }
    },
    getSnapshot: () => {
      const raw = read()
      if (raw !== lastRaw) {
        lastRaw = raw
        try {
          cached = raw === null ? fallback : parse(JSON.parse(raw) as unknown)
        } catch {
          cached = fallback
        }
      }
      return cached
    },
    set: (next) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Storage can be unavailable (private mode). The game still works.
      }
      notify()
    },
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
