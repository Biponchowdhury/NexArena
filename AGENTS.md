# NexArena

> Built with Arc Studio - money-powered apps in minutes

Project memory for future agents.

## What This App Does

NexArena is a 2D arcade space shooter (Phaser 3) with an onchain score record. Players play without a wallet and can submit a finished score to the NexArena contract. Scores are self-reported browser data, never verified gameplay.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Phaser 3.90 (lazy-loaded chunk)
- Web3: wagmi v2 + viem, ConnectKit (injected wallets)
- Contract: `contracts/NexArena.sol` (Solidity 0.8.28, Foundry tests in `contracts/test/`, Hardhat deploy script in `scripts/deploy.ts`, not installed in the sandbox)
- Chains: Arc Testnet (5042002) active by default, Arc Mainnet (5042) supported via `VITE_NEXARENA_NETWORK=mainnet`

## Deployments

- Arc Testnet: `0xc9914a9033ba171be9090384c946f99ad24b9088`, tx `0x3daf924e4182ac19db19ae22ef3e8cc3eed863976f93f80a98a06e8c5a0a94ea`, block 73976328 (deployed with Arc Studio's platform deployer, no owner or admin exists on the contract)
- Arc Mainnet: NOT deployed. The project owner deploys it with `scripts/deploy.ts` from their own wallet.

## Key Files

- `config/` network, contract address (from `.env`, never hardcoded), ABI generated from the forge artifact
- `src/game/` Phaser scene, entities, generated textures, HUD store
- `src/blockchain/` wallet hook, reads, history scan, score submission state machine
- `src/lib/` localStorage stores (local stats, submissions), query-string router
- `src/pages/` Home, Play (lazy), Profile, History

## Decisions

- History scans events backwards in 1000-block windows (Arc public RPC rejected 10,000-block ranges when measured) down to the deploy block. Never from block 0.
- A submission is only shown as confirmed after a successful receipt. One submission per finished game (session id).
- Routing uses `?p=` so it works on any static host.
- Arc gas is USDC. The app never shows the native balance and the USDC balance as separate amounts.

## Share links

- Starter apps ship `getShareBase`, `buildShareLink` and `installShareSync` in `src/lib/share.ts`; keep the `installShareSync()` call in `src/main.tsx`.
- Never put a secret in a URL path or query.

## To Run

```bash
bun install
bun run dev
```
