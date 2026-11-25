import { getAbiItem, type Address, type Hex } from 'viem'
import { NEXARENA_ABI } from '../../config/contractABI'
import { ACTIVE_NETWORK } from '../../config/network'
import { publicClient } from './client'

export class ContractNotConfiguredError extends Error {
  constructor() {
    super(`NexArena is not deployed on ${ACTIVE_NETWORK.label} yet. Set its address in .env to enable onchain features.`)
    this.name = 'ContractNotConfiguredError'
  }
}

export const isContractConfigured = () => ACTIVE_NETWORK.contractAddress !== undefined

export function requireContractAddress(): Address {
  const address = ACTIVE_NETWORK.contractAddress
  if (!address) throw new ContractNotConfiguredError()
  return address
}

export interface PlayerRecord {
  highScore: bigint
  latestScore: bigint
  gamesPlayed: bigint
  lastSubmittedAt: bigint
  registered: boolean
  /** 1-based rank on the top board, 0 when not on it. */
  rank: number
}

export interface LeaderboardRow {
  rank: number
  player: Address
  score: bigint
  /** Null when the extra stats read failed. */
  gamesPlayed: bigint | null
}

export async function readPlayerRecord(player: Address): Promise<PlayerRecord> {
  const address = requireContractAddress()
  const [stats, rank] = await Promise.all([
    publicClient.readContract({ address, abi: NEXARENA_ABI, functionName: 'getPlayerStats', args: [player] }),
    publicClient.readContract({ address, abi: NEXARENA_ABI, functionName: 'getLeaderboardRank', args: [player] }),
  ])
  return {
    highScore: stats.highScore,
    latestScore: stats.latestScore,
    gamesPlayed: stats.gamesPlayed,
    lastSubmittedAt: stats.lastSubmittedAt,
    registered: stats.registered,
    rank: Number(rank),
  }
}

export async function readLeaderboard(): Promise<{ rows: LeaderboardRow[]; players: number }> {
  const address = requireContractAddress()
  const [board, playerCount] = await Promise.all([
    publicClient.readContract({ address, abi: NEXARENA_ABI, functionName: 'getLeaderboard', args: [0n, 25n] }),
    publicClient.readContract({ address, abi: NEXARENA_ABI, functionName: 'playerCount' }),
  ])
  const [entries] = board
  // The board only stores scores. Games played comes from per-player reads, sent as one batched request.
  const rows = await Promise.all(
    entries.map(async (entry, index): Promise<LeaderboardRow> => {
      let gamesPlayed: bigint | null = null
      try {
        const stats = await publicClient.readContract({ address, abi: NEXARENA_ABI, functionName: 'getPlayerStats', args: [entry.player] })
        gamesPlayed = stats.gamesPlayed
      } catch {
        gamesPlayed = null
      }
      return { rank: index + 1, player: entry.player, score: entry.score, gamesPlayed }
    }),
  )
  return { rows, players: Number(playerCount) }
}

// ---------------------------------------------------------------------------
// Score history from ScoreSubmitted events
// ---------------------------------------------------------------------------

const scoreSubmittedEvent = getAbiItem({ abi: NEXARENA_ABI, name: 'ScoreSubmitted' })

export interface HistoryEntry {
  hash: Hex
  score: bigint
  highScore: bigint
  gamesPlayed: bigint
  newHighScore: boolean
  blockNumber: bigint
  logIndex: number
  /** Unix seconds, null when the block could not be read. */
  timestamp: number | null
}

export interface HistoryPage {
  entries: HistoryEntry[]
  /** Newest block the next page should start from. */
  nextToBlock: bigint
  /** Oldest block this scan will ever look at. */
  floor: bigint
  head: bigint
  /** True when the scan has reached the floor. */
  done: boolean
  /** True when the floor is a bounded lookback because no deploy block is configured. */
  floorIsLookback: boolean
}

/**
 * Public RPCs reject wide eth_getLogs ranges. On Arc's public RPC a 1,000 block
 * range was accepted and a 10,000 block range was rejected, so the default is
 * 1,000. Set VITE_NEXARENA_LOG_RANGE to match a dedicated provider. A "range too
 * large" answer halves the window automatically.
 */
const configuredRange = Number(import.meta.env.VITE_NEXARENA_LOG_RANGE)
const LOG_RANGE = BigInt(Number.isInteger(configuredRange) && configuredRange >= 100 ? configuredRange : 1000)
const MIN_RANGE = 100n
const MAX_WINDOWS_PER_PAGE = 15
const PAGE_TARGET = 10
const LOOKBACK_BLOCKS = 50_000n
const WINDOW_PAUSE_MS = 150

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const isRangeError = (error: unknown) => /range|too large|limit|exceed/i.test(error instanceof Error ? error.message : '')

const blockTimeCache = new Map<bigint, number | null>()

async function blockTimestamp(blockNumber: bigint): Promise<number | null> {
  const cached = blockTimeCache.get(blockNumber)
  if (cached !== undefined) return cached
  try {
    const block = await publicClient.getBlock({ blockNumber })
    const value = Number(block.timestamp)
    blockTimeCache.set(blockNumber, value)
    return value
  } catch {
    return null
  }
}

/**
 * Reads one page of a player's ScoreSubmitted events, newest first, walking
 * backwards in bounded windows from `toBlock` (or the chain head) down to the
 * deployment block. It never scans from block 0.
 */
export async function fetchHistoryPage(player: Address, toBlock: bigint | null): Promise<HistoryPage> {
  const address = requireContractAddress()
  const head = await publicClient.getBlockNumber()
  const deployBlock = ACTIVE_NETWORK.deployBlock
  const floorIsLookback = deployBlock === undefined
  const floor = deployBlock ?? (head > LOOKBACK_BLOCKS ? head - LOOKBACK_BLOCKS : 0n)

  let to = toBlock !== null && toBlock < head ? toBlock : head
  let range = LOG_RANGE
  let windows = 0
  const found: Omit<HistoryEntry, 'timestamp'>[] = []

  while (to >= floor && windows < MAX_WINDOWS_PER_PAGE && found.length < PAGE_TARGET) {
    const from = to - range + 1n > floor ? to - range + 1n : floor
    try {
      const logs = await publicClient.getLogs({
        address,
        event: scoreSubmittedEvent,
        args: { player },
        fromBlock: from,
        toBlock: to,
      })
      for (const log of [...logs].reverse()) {
        if (log.transactionHash === null || log.blockNumber === null || log.logIndex === null) continue
        found.push({
          hash: log.transactionHash,
          score: log.args.score ?? 0n,
          highScore: log.args.highScore ?? 0n,
          gamesPlayed: log.args.gamesPlayed ?? 0n,
          newHighScore: log.args.newHighScore ?? false,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
        })
      }
      to = from - 1n
      windows++
      if (to >= floor) await sleep(WINDOW_PAUSE_MS)
    } catch (error) {
      if (isRangeError(error) && range > MIN_RANGE) {
        range = range / 2n > MIN_RANGE ? range / 2n : MIN_RANGE
        continue
      }
      throw error
    }
  }

  const entries = await Promise.all(
    found.map(async (entry) => ({ ...entry, timestamp: await blockTimestamp(entry.blockNumber) })),
  )
  return { entries, nextToBlock: to, floor, head, done: to < floor, floorIsLookback }
}
