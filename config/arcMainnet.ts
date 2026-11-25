import { defineChain, numberToHex } from 'viem'
import { requireChain } from '../src/onchain-facts'

/**
 * Arc Mainnet. Values come from Arc Studio's chain registry (chain ID 5042,
 * https://rpc.mainnet.arc.io, https://explorer.arc.io). Gas is paid in USDC.
 *
 * Set VITE_ARC_MAINNET_RPC_URL to use a dedicated RPC provider.
 */
const facts = requireChain(5042)

export const ARC_MAINNET_RPC_URL: string = import.meta.env.VITE_ARC_MAINNET_RPC_URL || facts.rpcUrls[0]

export const ARC_MAINNET = defineChain({
  id: facts.chainId,
  name: 'Arc Mainnet',
  nativeCurrency: { name: 'USDC', symbol: facts.nativeCurrency.symbol, decimals: facts.nativeCurrency.decimals },
  rpcUrls: { default: { http: [ARC_MAINNET_RPC_URL] } },
  blockExplorers: { default: { name: 'Arc Explorer', url: facts.explorerBase } },
})

export const ARC_MAINNET_CHAIN_ID_HEX = numberToHex(ARC_MAINNET.id)
