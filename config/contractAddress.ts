import { getAddress, isAddress, type Address } from 'viem'

export type NexArenaNetwork = 'testnet' | 'mainnet'

/**
 * Deployed NexArena addresses. Nothing is hardcoded: set them in .env after you
 * deploy the contract yourself.
 *
 *   VITE_NEXARENA_ADDRESS_TESTNET / VITE_NEXARENA_ADDRESS_MAINNET
 *   VITE_NEXARENA_DEPLOY_BLOCK_TESTNET / VITE_NEXARENA_DEPLOY_BLOCK_MAINNET
 *
 * An unset or malformed address leaves on-chain features disabled.
 */
function readAddress(raw: string | undefined): Address | undefined {
  const value = raw?.trim()
  if (!value || !isAddress(value, { strict: false })) return undefined
  const checksummed = getAddress(value)
  return /^0x0{40}$/i.test(checksummed) ? undefined : checksummed
}

function readBlock(raw: string | undefined): bigint | undefined {
  const value = raw?.trim()
  if (!value || !/^\d+$/.test(value)) return undefined
  return BigInt(value)
}

export const CONTRACT_ADDRESSES: Record<NexArenaNetwork, Address | undefined> = {
  testnet: readAddress(import.meta.env.VITE_NEXARENA_ADDRESS_TESTNET),
  mainnet: readAddress(import.meta.env.VITE_NEXARENA_ADDRESS_MAINNET),
}

export const DEPLOY_BLOCKS: Record<NexArenaNetwork, bigint | undefined> = {
  testnet: readBlock(import.meta.env.VITE_NEXARENA_DEPLOY_BLOCK_TESTNET),
  mainnet: readBlock(import.meta.env.VITE_NEXARENA_DEPLOY_BLOCK_MAINNET),
}
