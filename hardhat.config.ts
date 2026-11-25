import 'dotenv/config'
import '@nomicfoundation/hardhat-ethers'
import { subtask } from 'hardhat/config'
import type { HardhatUserConfig } from 'hardhat/config'
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from 'hardhat/builtin-tasks/task-names'

// The contracts/ folder also holds Foundry scripts and tests. Hardhat only needs NexArena.sol.
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(async (_args, _hre, runSuper) => {
  const paths: string[] = await runSuper()
  return paths.filter((path) => path.endsWith('NexArena.sol'))
})

const rawKey = process.env.DEPLOYER_PRIVATE_KEY?.trim() ?? ''
if (rawKey && !/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
  throw new Error('DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string.')
}
const accounts = rawKey ? [rawKey] : []

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28',
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun' },
  },
  paths: {
    sources: './contracts',
    artifacts: './hardhat-artifacts',
    cache: './hardhat-cache',
  },
  networks: {
    arcMainnet: {
      url: process.env.ARC_MAINNET_RPC_URL || 'https://rpc.mainnet.arc.io',
      chainId: 5042,
      accounts,
    },
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.io',
      chainId: 5042002,
      accounts,
    },
  },
}

export default config
