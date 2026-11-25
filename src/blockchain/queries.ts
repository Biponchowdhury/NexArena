import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { ACTIVE_NETWORK } from '../../config/network'
import { fetchHistoryPage, isContractConfigured, readLeaderboard, readPlayerRecord } from './contract'

const scope = ['nexarena', ACTIVE_NETWORK.key] as const

export const queryKeys = {
  leaderboard: [...scope, 'leaderboard'] as const,
  player: (address: Address) => [...scope, 'player', address] as const,
  history: (address: Address) => [...scope, 'history', address] as const,
  all: scope,
}

/** Public read-only data is cached; there is no background polling. */
const STALE_MS = 30_000

export function useLeaderboard() {
  return useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: readLeaderboard,
    enabled: isContractConfigured(),
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 2,
  })
}

export function usePlayerRecord(address: Address | undefined) {
  return useQuery({
    queryKey: address ? queryKeys.player(address) : [...scope, 'player', 'none'],
    queryFn: () => readPlayerRecord(address as Address),
    enabled: isContractConfigured() && address !== undefined,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 2,
  })
}

export function useScoreHistory(address: Address | undefined) {
  return useInfiniteQuery({
    queryKey: address ? queryKeys.history(address) : [...scope, 'history', 'none'],
    queryFn: ({ pageParam }) => fetchHistoryPage(address as Address, pageParam),
    initialPageParam: null as bigint | null,
    getNextPageParam: (last) => (last.done ? undefined : last.nextToBlock),
    enabled: isContractConfigured() && address !== undefined,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 2,
  })
}
