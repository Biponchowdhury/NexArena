import { createPublicClient, http } from 'viem'
import { ACTIVE_NETWORK } from '../../config/network'

/**
 * Read-only client for the configured Arc network. The RPC URL is configurable
 * (see config/arcMainnet.ts and config/arcTestnet.ts), requests are batched into one JSON-RPC call, time out after
 * 15 seconds and failed calls are retried a few times with a short back-off.
 */
export const publicClient = createPublicClient({
  chain: ACTIVE_NETWORK.chain,
  transport: http(undefined, { batch: { batchSize: 25, wait: 20 }, retryCount: 3, retryDelay: 400, timeout: 15_000 }),
})
