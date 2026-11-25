import type { Address, Chain } from 'viem'
import { ARC_MAINNET, ARC_MAINNET_CHAIN_ID_HEX } from './arcMainnet'
import { ARC_TESTNET, ARC_TESTNET_CHAIN_ID_HEX } from './arcTestnet'
import { CONTRACT_ADDRESSES, DEPLOY_BLOCKS, type NexArenaNetwork } from './contractAddress'

export interface ActiveNetwork {
  key: NexArenaNetwork
  chain: Chain
  chainIdHex: string
  label: string
  explorerUrl: string
  contractAddress: Address | undefined
  deployBlock: bigint | undefined
  isMainnet: boolean
}

/** VITE_NEXARENA_NETWORK selects the network. Defaults to testnet. */
const key: NexArenaNetwork = import.meta.env.VITE_NEXARENA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
const chain: Chain = key === 'mainnet' ? ARC_MAINNET : ARC_TESTNET

export const ACTIVE_NETWORK: ActiveNetwork = {
  key,
  chain,
  chainIdHex: key === 'mainnet' ? ARC_MAINNET_CHAIN_ID_HEX : ARC_TESTNET_CHAIN_ID_HEX,
  label: chain.name,
  explorerUrl: (chain.blockExplorers?.default.url ?? '').replace(/\/+$/, ''),
  contractAddress: CONTRACT_ADDRESSES[key],
  deployBlock: DEPLOY_BLOCKS[key],
  isMainnet: key === 'mainnet',
}

export const explorerTxUrl = (hash: string) => `${ACTIVE_NETWORK.explorerUrl}/tx/${hash}`
export const explorerAddressUrl = (address: string) => `${ACTIVE_NETWORK.explorerUrl}/address/${address}`
