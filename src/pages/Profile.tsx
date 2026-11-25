import { ConnectKitButton } from 'connectkit'
import { ExternalLink, Wallet } from 'lucide-react'
import { ACTIVE_NETWORK, explorerAddressUrl } from '../../config/network'
import { isContractConfigured } from '../blockchain/contract'
import { usePlayerRecord } from '../blockchain/queries'
import { useWallet } from '../blockchain/wallet'
import { formatDateTime, formatScore } from '../lib/format'
import { useLocalStats } from '../lib/localStats'
import { navigate } from '../lib/router'

export default function Profile() {
  const wallet = useWallet()
  const local = useLocalStats()
  const record = usePlayerRecord(wallet.address)
  const chain = record.data

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 pb-16">
      <h1 className="text-3xl font-bold">Player Profile</h1>

      <section className="glass rounded-3xl p-5 sm:p-6" aria-label="Wallet">
        <p className="label">Wallet</p>
        {wallet.address ? (
          <>
            <p className="mt-1 break-all font-mono text-sm sm:text-base">{wallet.address}</p>
            <a
              href={explorerAddressUrl(wallet.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-nex-blue hover:underline"
            >
              View on Arc Explorer <ExternalLink size={13} />
            </a>
            {!wallet.onTargetChain && <p className="mt-3 text-sm text-amber-200">Your wallet is on another network. Switch to {ACTIVE_NETWORK.label} to submit scores.</p>}
          </>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-nex-mute">No wallet connected. You can keep playing as a guest.</p>
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button type="button" onClick={show} className="btn btn-primary mt-4">
                  <Wallet size={16} /> Connect Wallet
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        )}
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6" aria-label="Onchain record">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">Onchain record</h2>
          <span className="label">{ACTIVE_NETWORK.label}</span>
        </div>
        {!isContractConfigured() ? (
          <p className="mt-3 text-sm text-nex-mute">Onchain records are not enabled yet. The NexArena contract address has not been set for this network.</p>
        ) : !wallet.address ? (
          <p className="mt-3 text-sm text-nex-mute">Connect a wallet to read your record from the contract.</p>
        ) : record.isPending ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : record.isError ? (
          <div className="mt-3">
            <p className="text-sm text-nex-mute">Could not read your record. Check your connection and try again.</p>
            <button type="button" className="btn btn-ghost mt-3" onClick={() => void record.refetch()}>
              Try again
            </button>
          </div>
        ) : chain && chain.registered ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Highest score" value={formatScore(chain.highScore)} accent />
              <Tile label="Latest score" value={formatScore(chain.latestScore)} />
              <Tile label="Games submitted" value={chain.gamesPlayed.toString()} />
              <Tile label="Leaderboard rank" value={chain.rank > 0 ? `#${chain.rank}` : 'Outside top 25'} />
            </div>
            <p className="mt-3 text-xs text-nex-mute">Last submission: {formatDateTime(Number(chain.lastSubmittedAt))}</p>
          </>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-nex-mute">No score submitted from this wallet yet. Play a game and submit it from the Game Over screen.</p>
            <button type="button" className="btn btn-primary mt-4" onClick={() => navigate('play')}>
              Play Game
            </button>
          </div>
        )}
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6" aria-label="This device">
        <h2 className="text-xl font-semibold">On this device</h2>
        <p className="mt-1 text-sm text-nex-mute">Saved in your browser. Includes every game, submitted or not.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Highest score" value={formatScore(local.highScore)} accent />
          <Tile label="Latest score" value={formatScore(local.latestScore)} />
          <Tile label="Games played" value={formatScore(local.gamesPlayed)} />
          <Tile label="Enemies destroyed" value={formatScore(local.enemiesDestroyed)} />
        </div>
      </section>
    </div>
  )
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-4">
      <p className="label">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${accent ? 'text-nex-blue' : ''}`}>{value}</p>
    </div>
  )
}
