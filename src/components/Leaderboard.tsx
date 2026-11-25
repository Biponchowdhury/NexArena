import clsx from 'clsx'
import { ExternalLink, RefreshCw, Trophy } from 'lucide-react'
import { explorerAddressUrl } from '../../config/network'
import { useLeaderboard } from '../blockchain/queries'
import { isContractConfigured } from '../blockchain/contract'
import { shortenAddress, useWallet } from '../blockchain/wallet'
import { formatScore } from '../lib/format'

/** Top players read straight from the NexArena contract. Self-reported scores, not verified gameplay. */
export function Leaderboard({ className }: { className?: string }) {
  const { address } = useWallet()
  const board = useLeaderboard()

  return (
    <section className={clsx('glass rounded-3xl p-5 sm:p-6', className)} aria-labelledby="lb-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="lb-title" className="flex items-center gap-2 text-xl font-semibold">
            <Trophy size={18} className="text-nex-violet" />
            Leaderboard
          </h2>
          <p className="mt-1 max-w-md text-sm text-nex-mute">
            Top 25 scores submitted by players. Scores are self-reported from the browser, so this is not a cheat-proof ranking.
          </p>
        </div>
        {isContractConfigured() && (
          <button
            type="button"
            onClick={() => void board.refetch()}
            disabled={board.isFetching}
            className="btn btn-ghost !min-h-10 !px-3"
            aria-label="Refresh leaderboard"
          >
            <RefreshCw size={15} className={board.isFetching ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="mt-4">
        {!isContractConfigured() ? (
          <Empty title="Leaderboard not enabled yet" body="The NexArena contract address has not been set for this network." />
        ) : board.isPending ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : board.isError ? (
          <Empty
            title="Could not load the leaderboard"
            body="The network did not answer. Check your connection and try again."
            action={
              <button type="button" className="btn btn-ghost mt-3" onClick={() => void board.refetch()}>
                Try again
              </button>
            }
          />
        ) : board.data.rows.length === 0 ? (
          <Empty title="No scores yet" body="Be the first to submit a score to the contract." />
        ) : (
          <>
            <div className="grid grid-cols-[2.5rem_1fr_auto_auto] gap-x-3 px-3 pb-2 label">
              <span>Rank</span>
              <span>Player</span>
              <span className="text-right">Games</span>
              <span className="min-w-20 text-right">Best</span>
            </div>
            <ol className="space-y-1.5">
              {board.data.rows.map((row) => {
                const mine = address !== undefined && row.player.toLowerCase() === address.toLowerCase()
                return (
                  <li
                    key={row.player}
                    className={clsx(
                      'grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm tabular-nums',
                      mine ? 'border border-nex-blue/40 bg-nex-blue/10' : 'bg-white/[0.03]',
                    )}
                  >
                    <span className={clsx('font-display font-semibold', row.rank <= 3 ? 'text-nex-blue' : 'text-nex-mute')}>
                      {row.rank}
                    </span>
                    <a
                      href={explorerAddressUrl(row.player)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-nex-text hover:text-nex-blue"
                    >
                      {shortenAddress(row.player)}
                      {mine && <span className="rounded bg-nex-blue/20 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-nex-blue">YOU</span>}
                      <ExternalLink size={11} className="opacity-50" />
                    </a>
                    <span className="text-right text-nex-mute">{row.gamesPlayed === null ? '–' : row.gamesPlayed.toString()}</span>
                    <span className="min-w-20 text-right font-display font-semibold">{formatScore(row.score)}</span>
                  </li>
                )
              })}
            </ol>
            <p className="mt-3 text-xs text-nex-mute tabular-nums">{board.data.players.toLocaleString()} players have submitted a score.</p>
          </>
        )}
      </div>
    </section>
  )
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-nex-line px-4 py-8 text-center">
      <p className="font-display font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-nex-mute">{body}</p>
      {action}
    </div>
  )
}
