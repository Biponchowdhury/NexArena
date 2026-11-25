import { defineChain, numberToHex } from 'viem'
import { requireChain } from '../src/onchain-facts'

/**
 * Arc Testnet (chain ID 5042002). Gas is paid in USDC.
 * Set VITE_ARC_TESTNET_RPC_URL to use a dedicated RPC provider.
 */
const facts = requireChain(5042002)

export const ARC_TESTNET_RPC_URL: string = import.meta.env.VITE_ARC_TESTNET_RPC_URL || facts.rpcUrls[0]

export const ARC_TESTNET = defineChain({
  id: facts.chainId,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: facts.nativeCurrency.symbol, decimals: facts.nativeCurrency.decimals },
  rpcUrls: { default: { http: [ARC_TESTNET_RPC_URL] } },
  blockExplorers: { default: { name: 'Arc Testnet Explorer', url: facts.explorerBase } },
  testnet: true,
})

export const ARC_TESTNET_CHAIN_ID_HEX = numberToHex(ARC_TESTNET.id)
