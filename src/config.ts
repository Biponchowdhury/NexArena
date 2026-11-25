/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig, fallback } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { ARC_MAINNET } from '../config/arcMainnet'
import { ARC_TESTNET } from '../config/arcTestnet'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(ARC_TESTNET.id, ARC_TESTNET.rpcUrls.default.http[0])
registerChain(ARC_MAINNET.id, ARC_MAINNET.rpcUrls.default.http[0])

// Safe retry: a few quick retries and a request timeout, so a flaky RPC
// never leaves the UI hanging.
const rpc = (url: string) => http(url, { retryCount: 3, retryDelay: 400, timeout: 15_000 })

export const config = createConfig({
  chains: [ARC_TESTNET, ARC_MAINNET],
  connectors: [injected()],
  transports: {
    [ARC_TESTNET.id]: fallback([rpc(ARC_TESTNET.rpcUrls.default.http[0])]),
    [ARC_MAINNET.id]: fallback([rpc(ARC_MAINNET.rpcUrls.default.http[0])]),
  },
})
