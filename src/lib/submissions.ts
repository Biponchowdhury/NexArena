import { useSyncExternalStore } from 'react'
import { createPersistedStore, isRecord } from './persistedStore'

export type SubmissionStatus = 'pending' | 'confirmed' | 'failed'

/** One score the player sent to the contract from this browser. */
export interface SubmissionRecord {
  /** Game session id: one finished run can only be submitted once. */
  id: string
  player: string
  score: number
  hash: string | null
  status: SubmissionStatus
  createdAt: number
  chainId: number
}

const MAX_RECORDS = 60

const parseRecord = (value: unknown): SubmissionRecord | null => {
  if (!isRecord(value)) return null
  const { id, player, score, hash, status, createdAt, chainId } = value
  if (typeof id !== 'string' || typeof player !== 'string' || typeof score !== 'number') return null
  if (status !== 'pending' && status !== 'confirmed' && status !== 'failed') return null
  if (typeof createdAt !== 'number' || typeof chainId !== 'number') return null
  return { id, player, score, hash: typeof hash === 'string' ? hash : null, status, createdAt, chainId }
}

const EMPTY: SubmissionRecord[] = []

const store = createPersistedStore<SubmissionRecord[]>('nexarena:submissions:v1', EMPTY, (value) => {
  if (!Array.isArray(value)) return EMPTY
  return (value as unknown[]).map(parseRecord).filter((r): r is SubmissionRecord => r !== null)
})

export const getSubmissions = () => store.getSnapshot()

export function upsertSubmission(record: SubmissionRecord) {
  const rest = store.getSnapshot().filter((r) => r.id !== record.id)
  store.set([record, ...rest].slice(0, MAX_RECORDS))
}

export function patchSubmission(id: string, patch: Partial<SubmissionRecord>) {
  const current = store.getSnapshot().find((r) => r.id === id)
  if (current) upsertSubmission({ ...current, ...patch })
}

export const useSubmissions = () => useSyncExternalStore(store.subscribe, store.getSnapshot)

export const newSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
