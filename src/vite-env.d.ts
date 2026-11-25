/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'testnet' (default) or 'mainnet' */
  readonly VITE_NEXARENA_NETWORK?: string
  readonly VITE_NEXARENA_ADDRESS_TESTNET?: string
  readonly VITE_NEXARENA_ADDRESS_MAINNET?: string
  /** Block the contract was deployed at. Bounds the history scan. */
  readonly VITE_NEXARENA_DEPLOY_BLOCK_TESTNET?: string
  readonly VITE_NEXARENA_DEPLOY_BLOCK_MAINNET?: string
  /** Optional dedicated RPC providers. */
  readonly VITE_ARC_TESTNET_RPC_URL?: string
  readonly VITE_ARC_MAINNET_RPC_URL?: string
  /** Optional max block span per eth_getLogs call. */
  readonly VITE_NEXARENA_LOG_RANGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
