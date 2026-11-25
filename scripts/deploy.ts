/**
 * Deploys NexArena with Hardhat and verifies the result by reading it back.
 *
 *   npx hardhat run scripts/deploy.ts --network arcTestnet
 *   CONFIRM_MAINNET_DEPLOY=yes npx hardhat run scripts/deploy.ts --network arcMainnet
 *
 * The deployer key is read from DEPLOYER_PRIVATE_KEY (see .env.example).
 * Nothing in this file is a secret and nothing is hardcoded.
 */
import { ethers, network } from 'hardhat'

const EXPECTED: Record<string, { chainId: bigint; explorer: string; envSuffix: string }> = {
  arcMainnet: { chainId: 5042n, explorer: 'https://explorer.arc.io', envSuffix: 'MAINNET' },
  arcTestnet: { chainId: 5042002n, explorer: 'https://explorer.testnet.arc.io', envSuffix: 'TESTNET' },
}

async function main() {
  const target = EXPECTED[network.name]
  if (!target) throw new Error(`Unsupported network "${network.name}". Use --network arcMainnet or --network arcTestnet.`)

  if (network.name === 'arcMainnet' && process.env.CONFIRM_MAINNET_DEPLOY !== 'yes') {
    throw new Error('Mainnet deploys spend real USDC and cannot be undone. Set CONFIRM_MAINNET_DEPLOY=yes to continue.')
  }

  const [deployer] = await ethers.getSigners()
  if (!deployer) throw new Error('No deployer account. Set DEPLOYER_PRIVATE_KEY in .env.')

  // Validate the network ID before sending anything.
  const chain = await ethers.provider.getNetwork()
  if (chain.chainId !== target.chainId) {
    throw new Error(`RPC reports chain ID ${chain.chainId}, expected ${target.chainId}. Check ARC_*_RPC_URL.`)
  }

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`Network:   ${network.name} (chain ID ${chain.chainId})`)
  console.log(`Deployer:  ${deployer.address}`)
  console.log(`Gas USDC:  ${ethers.formatEther(balance)} (native view, 18 decimals)`)
  if (balance === 0n) throw new Error('Deployer has no USDC for gas. Fund it first.')

  const factory = await ethers.getContractFactory('NexArena')
  const contract = await factory.deploy()
  const deployTx = contract.deploymentTransaction()
  if (!deployTx) throw new Error('Deployment transaction missing.')
  console.log(`Deployment tx hash: ${deployTx.hash}`)

  const receipt = await deployTx.wait()
  if (!receipt || receipt.status !== 1) throw new Error('Deployment transaction failed.')
  const address = await contract.getAddress()
  console.log(`Contract address:   ${address}`)
  console.log(`Deployed in block:  ${receipt.blockNumber}`)

  // Verify the deployment by reading the contract on-chain.
  const code = await ethers.provider.getCode(address)
  if (code === '0x') throw new Error('No contract code at the deployed address.')
  const nexArena = await ethers.getContractAt('NexArena', address)
  const [topN, maxScore, players] = await Promise.all([nexArena.TOP_N(), nexArena.MAX_SCORE(), nexArena.playerCount()])
  if (topN !== 25n || maxScore !== 100_000_000n || players !== 0n) {
    throw new Error(`Unexpected on-chain state: TOP_N=${topN}, MAX_SCORE=${maxScore}, playerCount=${players}`)
  }
  console.log('Verified on-chain: TOP_N=25, MAX_SCORE=100000000, playerCount=0')

  console.log('\nAdd these to .env, then restart the web app:')
  console.log(`VITE_NEXARENA_NETWORK=${target.envSuffix.toLowerCase()}`)
  console.log(`VITE_NEXARENA_ADDRESS_${target.envSuffix}=${address}`)
  console.log(`VITE_NEXARENA_DEPLOY_BLOCK_${target.envSuffix}=${receipt.blockNumber}`)
  console.log(`\nExplorer: ${target.explorer}/address/${address}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
