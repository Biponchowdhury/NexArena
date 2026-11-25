import { BaseError, UserRejectedRequestError, type Address, type Hex, type TransactionReceipt } from 'viem'
import { waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import { NEXARENA_ABI } from '../../config/contractABI'
import { ACTIVE_NETWORK } from '../../config/network'
import { config } from '../config'
import { publicClient } from './client'
import { requireContractAddress } from './contract'

/** Mirrors NexArena.MAX_SCORE. */
export const MAX_SCORE = 100_000_000

export type TxErrorKind = 'rejected' | 'funds' | 'network' | 'reverted' | 'timeout' | 'invalid' | 'config' | 'other'

export interface ClassifiedError {
  kind: TxErrorKind
  message: string
}

export class SubmitScoreError extends Error {
  readonly kind: TxErrorKind
  constructor(kind: TxErrorKind, message: string) {
    super(message)
    this.name = 'SubmitScoreError'
    this.kind = kind
  }
}

const fundsMessage = ACTIVE_NETWORK.isMainnet
  ? 'Your wallet needs USDC on Arc to pay the network fee.'
  : 'Your wallet needs a little testnet USDC for the network fee. Use "Get test USDC" in the Arc Studio sidebar.'

/** Turns wallet, viem and RPC errors into one plain sentence and a kind the UI can act on. */
export function classifyTxError(error: unknown): ClassifiedError {
  if (error instanceof SubmitScoreError) return { kind: error.kind, message: error.message }
  const raw = error instanceof Error ? error.message : ''
  const text = raw.toLowerCase()
  const rejected =
    (error instanceof BaseError && error.walk((e) => e instanceof UserRejectedRequestError) !== null) ||
    text.includes('user rejected') ||
    text.includes('user denied') ||
    text.includes('rejected the request')
  if (rejected) return { kind: 'rejected', message: 'You cancelled the request in your wallet. Nothing was sent.' }
  if (text.includes('insufficient funds') || text.includes('exceeds the balance') || text.includes('exceeds balance')) {
    return { kind: 'funds', message: fundsMessage }
  }
  if (text.includes('timed out while waiting') || (text.includes('timeout') && text.includes('receipt'))) {
    return { kind: 'timeout', message: 'The network is slow to confirm. Your transaction may still go through, check the explorer.' }
  }
  if (text.includes('invalidscore')) return { kind: 'invalid', message: 'The contract rejected this score.' }
  if (text.includes('revert')) return { kind: 'reverted', message: 'The transaction was rejected by the contract.' }
  if (text.includes('network') || text.includes('timeout') || text.includes('fetch') || text.includes('http request failed') || text.includes('429')) {
    return { kind: 'network', message: 'Network issue reaching Arc. Check your connection and try again.' }
  }
  return { kind: 'other', message: 'Something went wrong. Please try again.' }
}

export interface SubmitScoreParams {
  score: number
  account: Address
  /** Called right before the wallet confirmation opens. */
  onWalletPrompt?: () => void
  /** Called as soon as the wallet returns a transaction hash, before confirmation. */
  onHash: (hash: Hex) => void
}

/**
 * Sends submitScore(score) and resolves with the receipt only once the
 * transaction is mined successfully. Gas is estimated against the live network
 * first, so a call that would revert is caught before the wallet ever prompts.
 */
export async function submitScoreTransaction({ score, account, onWalletPrompt, onHash }: SubmitScoreParams): Promise<TransactionReceipt> {
  const address = requireContractAddress()
  if (!Number.isSafeInteger(score) || score < 1 || score > MAX_SCORE) {
    throw new SubmitScoreError('invalid', `Scores must be between 1 and ${MAX_SCORE.toLocaleString()}.`)
  }
  const args = [BigInt(score)] as const

  let gas: bigint
  try {
    gas = await publicClient.estimateContractGas({ address, abi: NEXARENA_ABI, functionName: 'submitScore', args, account })
  } catch (error) {
    const classified = classifyTxError(error)
    throw new SubmitScoreError(classified.kind === 'other' ? 'reverted' : classified.kind, classified.message)
  }

  onWalletPrompt?.()
  const hash = await writeContract(config, {
    address,
    abi: NEXARENA_ABI,
    functionName: 'submitScore',
    args,
    chainId: ACTIVE_NETWORK.chain.id,
    account,
    // 20% headroom over the estimate.
    gas: (gas * 12n) / 10n,
  })
  onHash(hash)

  const receipt = await waitForTransactionReceipt(config, { hash, chainId: ACTIVE_NETWORK.chain.id, timeout: 120_000 })
  if (receipt.status !== 'success') {
    throw new SubmitScoreError('reverted', 'The transaction was mined but failed. Your score was not recorded.')
  }
  return receipt
}

/** Looks a transaction up by hash. Returns null while it is not mined yet. */
export async function lookupReceipt(hash: Hex): Promise<TransactionReceipt | null> {
  try {
    return await publicClient.getTransactionReceipt({ hash })
  } catch (error) {
    if (error instanceof BaseError && error.name.includes('NotFound')) return null
    if (error instanceof Error && error.name === 'TransactionReceiptNotFoundError') return null
    throw error
  }
}
