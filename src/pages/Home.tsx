import { ConnectKitButton } from 'connectkit'
import { motion } from 'framer-motion'
import { Play, Trophy, Wallet } from 'lucide-react'
import { ACTIVE_NETWORK } from '../../config/network'
import { usePlayerRecord } from '../blockchain/queries'
import { shortenAddress, useWallet } from '../blockchain/wallet'
import { Leaderboard } from '../components/Leaderboard'
import { ShipMark } from '../components/Logo'
import { NetworkBadge } from '../components/WalletConnect'
import { formatScore } from '../lib/format'
import { useLocalStats } from '../lib/localStats'
import { navigate } from '../lib/router'

export default function Home() {
  const wallet = useWallet()
  const local = useLocalStats()
  const record = usePlayerRecord(wallet.address)

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <section className="relative grid items-center gap-8 py-10 sm:py-16 md:grid-cols-[1.2fr_1fr]">
        <div>
          <NetworkBadge />
          <h1 className="mt-5 text-5xl font-bold leading-[1.02] sm:text-7xl">
            Nex<span className="bg-gradient-to-r from-nex-blue to-nex-violet bg-clip-text text-transparent">Arena</span>
          </h1>
          <p className="mt-4 max-w-md text-pretty text-lg text-nex-mute">
            Pilot your ship through waves of enemy fleets. Survive, climb the levels, and put your best score on Arc.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => navigate('play')} className="btn btn-primary !min-h-12 px-7 text-base">
              <Play size={18} fill="currentColor" /> Play Game
            </button>
            {!wallet.isConnected && (
              <ConnectKitButton.Custom>
                {({ show }) => (
                  <button type="button" onClick={show} className="btn btn-ghost !min-h-12">
                    <Wallet size={17} /> Connect Wallet
                  </button>
                )}
              </ConnectKitButton.Custom>
            )}
          </div>
          <p className="mt-4 text-sm text-nex-mute">No wallet needed to play. Connect one only to submit a score.</p>
        </div>

        <motion.div
          className="relative mx-auto hidden aspect-square w-full max-w-xs items-center justify-center md:flex"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.38),rgba(56,189,248,0.1)_45%,transparent_70%)]" />
          <ShipMark className="relative h-56 w-56 drop-shadow-[0_0_28px_rgba(56,189,248,0.55)]" />
        </motion.div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Player profile">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <p className="label">Player</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {wallet.address ? <span className="font-mono text-lg">{shortenAddress(wallet.address)}</span> : 'Guest pilot'}
          </p>
          <p className="mt-1 text-sm text-nex-mute">
            {wallet.address
              ? wallet.onTargetChain
                ? `Connected to ${ACTIVE_NETWORK.label}`
                : `Switch to ${ACTIVE_NETWORK.label} to submit scores`
              : 'Playing without a wallet'}
          </p>
          <button type="button" onClick={() => navigate('profile')} className="btn btn-ghost mt-4 !min-h-10 text-sm">
            View profile
          </button>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6">
          <p className="label flex items-center gap-1.5">
            <Trophy size={12} /> Highest score
          </p>
          <p className="mt-1 font-display text-5xl font-bold tabular-nums">{formatScore(local.highScore)}</p>
          <p className="mt-1 text-sm text-nex-mute tabular-nums">
            {local.gamesPlayed} {local.gamesPlayed === 1 ? 'game' : 'games'} on this device
            {record.data?.registered ? ` · onchain best ${formatScore(record.data.highScore)}` : ''}
          </p>
        </div>
      </section>

      <Leaderboard className="mt-4" />
    </div>
  )
}
