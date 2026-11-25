import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Hex } from 'viem'
import { ACTIVE_NETWORK } from '../../config/network'
import { getSubmissions, patchSubmission, upsertSubmission, useSubmissions } from '../lib/submissions'
import { isContractConfigured } from './contract'
import { queryKeys } from './queries'
import { classifyTxError, lookupReceipt, submitScoreTransaction } from './transactions'
import { useWallet } from './wallet'

export type SubmitPhase =
  | 'unavailable' // contract address not configured
  | 'idle'
  | 'switching'
  | 'estimating'
  | 'wallet' // waiting for the wallet confirmation
  | 'pending' // broadcast, waiting for the receipt
  | 'confirmed'
  | 'failed'

/** Hashes this tab is already tracking, so the background resolver skips them. */
const inFlight = new Set<string>()

export function useScoreSubmission(sessionId: string, score: number) {
  const wallet = useWallet()
  const queryClient = useQueryClient()
  const submissions = useSubmissions()
  const record = submissions.find((r) => r.id === sessionId)
  const [working, setWorking] = useState<'switching' | 'estimating' | 'wallet' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const locked = useRef(false)

  const refreshChainData = useCallback(
    (player: string) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.all })
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'player', player] })
    },
    [queryClient],
  )

  const submit = useCallback(async () => {
    // One completed game, one submission: never while another is in flight or already confirmed.
    if (locked.current || record?.status === 'confirmed' || record?.status === 'pending') return
    if (!isContractConfigured()) return
    locked.current = true
    setNotice(null)
    const tracked: { hash: Hex | null } = { hash: null }
    try {
      if (!wallet.address) throw new Error('Connect your wallet first.')
      if (!wallet.onTargetChain) {
        setWorking('switching')
        const switched = await wallet.switchToTarget()
        if (!switched) return
      }
      setWorking('estimating')
      const player = wallet.address
      const receipt = await submitScoreTransaction({
        score,
        account: player,
        onWalletPrompt: () => setWorking('wallet'),
        onHash: (txHash) => {
          tracked.hash = txHash
          inFlight.add(txHash)
          setWorking(null)
          upsertSubmission({
            id: sessionId,
            player,
            score,
            hash: txHash,
            status: 'pending',
            createdAt: Date.now(),
            chainId: ACTIVE_NETWORK.chain.id,
          })
        },
      })
      patchSubmission(sessionId, { status: 'confirmed', hash: receipt.transactionHash })
      refreshChainData(player)
    } catch (error) {
      const { kind, message } = classifyTxError(error)
      if (tracked.hash === null) {
        // Nothing was broadcast: the player can simply try again.
        setNotice(message)
      } else if (kind === 'timeout' || kind === 'network') {
        // Broadcast but unconfirmed: it stays pending and is re-checked in the background.
        setNotice(message)
      } else {
        patchSubmission(sessionId, { status: 'failed' })
        setNotice(message)
      }
    } finally {
      if (tracked.hash) inFlight.delete(tracked.hash)
      setWorking(null)
      locked.current = false
    }
  }, [record?.status, wallet, score, sessionId, refreshChainData])

  const phase: SubmitPhase = !isContractConfigured()
    ? 'unavailable'
    : record?.status === 'confirmed'
      ? 'confirmed'
      : record?.status === 'pending'
        ? 'pending'
        : working ?? (record?.status === 'failed' ? 'failed' : 'idle')

  return { phase, notice, record, submit, wallet }
}

/**
 * Re-checks submissions left "pending" (page reload, slow confirmation) against
 * the chain. Only a mined receipt can move a record to confirmed or failed.
 */
export function useResolvePendingSubmissions() {
  const submissions = useSubmissions()
  const queryClient = useQueryClient()
  const pendingKey = submissions
    .filter((r) => r.status === 'pending' && r.hash !== null)
    .map((r) => `${r.id}:${r.hash}`)
    .join(',')

  useEffect(() => {
    if (!pendingKey) return
    const abort = new AbortController()
    const check = async () => {
      for (const item of getSubmissions()) {
        if (item.status !== 'pending' || item.hash === null || inFlight.has(item.hash)) continue
        try {
          const receipt = await lookupReceipt(item.hash as Hex)
          if (abort.signal.aborted || !receipt) continue
          patchSubmission(item.id, { status: receipt.status === 'success' ? 'confirmed' : 'failed' })
          void queryClient.invalidateQueries({ queryKey: queryKeys.all })
        } catch {
          // Temporary RPC trouble: the next check retries.
        }
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), 15_000)
    return () => {
      abort.abort()
      window.clearInterval(timer)
    }
  }, [pendingKey, queryClient])
}
