# NexArena

A 2D arcade space shooter with an onchain score record on Arc. Fly a ship, destroy enemy fleets, survive rising difficulty, then submit your score to the NexArena contract from your own wallet.

Built with [Arc Studio](https://studio.arc.io)

## Features

- Playable without a wallet. A wallet is only needed to submit a score.
- Keyboard (arrows or WASD, Space to shoot, Esc to pause) and touch controls (virtual joystick and fire button).
- Four enemy types, a health system, pickups, weapon upgrades and rising difficulty.
- Pause and resume, game over screen, personal best saved in your browser.
- Onchain player record, top 25 leaderboard and personal submission history, all read from the contract.

Scores are sent from the browser and are not verified gameplay. Treat the leaderboard as player-submitted scores, not a cheat-proof ranking.

## Tech stack

React, TypeScript, Vite, Tailwind CSS, Phaser 3, wagmi and viem, Solidity 0.8.28 (Foundry tests, Hardhat deploy script).

## Project layout

```
contracts/NexArena.sol      the contract
scripts/deploy.ts           Hardhat deploy and verify script
hardhat.config.ts           Hardhat networks (Arc Mainnet, Arc Testnet)
config/                     network, contract address and ABI config
src/game/                   Phaser game
src/blockchain/             wallet, contract reads, score submission
src/pages, src/components   screens and UI
.env.example                every environment variable
```

## Development

Prerequisites: [Bun](https://bun.sh) and, to run contract tests, [Foundry](https://book.getfoundry.sh).

```bash
bun install
bun run dev          # start the app
bun run build        # production build (vite build)
bun run check        # lint and typecheck
bun run contracts:build
bun run contracts:test
```

### Environment variables

Copy `.env.example` to `.env`. Values prefixed `VITE_` are public and shipped to the browser, never put a secret there.

| Variable | Purpose |
| --- | --- |
| `VITE_NEXARENA_NETWORK` | `testnet` (default) or `mainnet`. |
| `VITE_NEXARENA_ADDRESS_TESTNET` / `_MAINNET` | Deployed contract address. Leave empty and onchain features stay off. |
| `VITE_NEXARENA_DEPLOY_BLOCK_TESTNET` / `_MAINNET` | Block the contract was deployed in. Limits how far history searches. |
| `VITE_ARC_TESTNET_RPC_URL` / `VITE_ARC_MAINNET_RPC_URL` | Optional dedicated RPC provider for the app. |
| `VITE_NEXARENA_LOG_RANGE` | Optional max blocks per history query (default 1000). |
| `DEPLOYER_PRIVATE_KEY` | Deployer wallet key, used only by the deploy script. |
| `ARC_MAINNET_RPC_URL` / `ARC_TESTNET_RPC_URL` | RPC used by the deploy script. |
| `CONFIRM_MAINNET_DEPLOY` | Must be `yes` to allow a mainnet deploy. |

## Deploying the contract

Network details (from Arc's registry):

| | Arc Mainnet | Arc Testnet |
| --- | --- | --- |
| Chain ID | 5042 (0x13B2) | 5042002 |
| RPC | https://rpc.mainnet.arc.io | https://rpc.testnet.arc.io |
| Explorer | https://explorer.arc.io | https://explorer.testnet.arc.io |
| Gas | USDC | USDC |

1. Install the deploy tooling (not part of the app bundle):

   ```bash
   npm install --save-dev hardhat@2 @nomicfoundation/hardhat-ethers ethers dotenv ts-node
   ```

2. Create a dedicated deployer wallet, fund it with only the USDC it needs for gas, and set `DEPLOYER_PRIVATE_KEY` in `.env`. Never commit `.env` and never reuse a personal wallet.

3. Compile and deploy to testnet first:

   ```bash
   bun run hh:compile
   bun run hh:deploy:testnet
   ```

   The script prints the deployment transaction hash, the contract address and the deployment block, then reads the contract back on-chain to confirm it is live.

4. Copy the printed `VITE_NEXARENA_*` lines into `.env` and restart the app. Score submission, the leaderboard and history switch on once an address is set.

5. Mainnet: Arc Mainnet transactions use real USDC and cannot be undone. Test on testnet, have the contract independently audited, and double-check every address and setting first. Then set `CONFIRM_MAINNET_DEPLOY=yes` and run:

   ```bash
   bun run hh:deploy:mainnet
   ```

   Set `VITE_NEXARENA_NETWORK=mainnet` and the mainnet address and deploy block in `.env`.

If you change the contract, rebuild it with `bun run contracts:build` and regenerate the ABI used by the app:

```bash
bun -e 'const a=JSON.parse(await Bun.file("contracts/out/NexArena.sol/NexArena.json").text()).abi;await Bun.write("config/contractABI.ts","export const NEXARENA_ABI = "+JSON.stringify(a,null,2)+" as const;\n")'
```
