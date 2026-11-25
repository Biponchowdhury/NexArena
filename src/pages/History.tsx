import { ConnectKitButton } from 'connectkit'
import clsx from 'clsx'
import { CheckCircle2, Clock, ExternalLink, Loader2, Wallet, XCircle } from 'lucide-react'
import { ACTIVE_NETWORK, explorerTxUrl } from '../../config/network'
import { isContractConfigured } from '../blockchain/contract'
import { useScoreHistory } from '../blockchain/queries'
import { shortenAddress, useWallet } from '../blockchain/wallet'
import { formatDateTime, formatScore } from '../lib/format'
import { navigate } from '../lib/router'
import { useSubmissions, type SubmissionStatus } from '../lib/submissions'

interface Row {
  key: string
  score: number | bigint
  hash: string
  status: SubmissionStatus
  time: number | null
}

const STATUS: Record<SubmissionStatus, { label: string; className: string; icon: typeof Clock }> = {
  confirmed: { label: 'Confirmed', className: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/30', icon: CheckCircle2 },
  pending: { label: 'Pending', className: 'bg-amber-400/10 text-amber-200 border-amber-400/30', icon: Clock },
  failed: { label: 'Failed', className: 'bg-rose-400/10 text-rose-200 border-rose-400/30', icon: XCircle },
}

export default function History() {
  const wallet = useWallet()
  const history = useScoreHistory(wallet.address)
  const submissions = useSubmissions()

  const pages = history.data?.pages ?? []
  const eventRows: Row[] = pages.flatMap((page) =>
    page.entries.map((entry) => ({
      key: `${entry.hash}-${entry.logIndex}`,
      score: entry.score,
      hash: entry.hash,
      status: 'confirmed' as const,
      time: entry.timestamp,
    })),
  )
  const seen = new Set(eventRows.map((r) => r.hash.toLowerCase()))
  // Submissions made in this browser that the event scan has not returned (pending, failed, or just confirmed).
  const localRows: Row[] = submissions
    .filter(
      (r) =>
        wallet.address !== undefined &&
        r.player.toLowerCase() === wallet.address.toLowerCase() &&
        r.chainId === ACTIVE_NETWORK.chain.id &&
        r.hash !== null &&
        !seen.has(r.hash.toLowerCase()),
    )
    .map((r) => ({ key: `local-${r.id}`, score: r.score, hash: r.hash ?? '', status: r.status, time: Math.floor(r.createdAt / 1000) }))
  const rows = [...localRows, ...eventRows].sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
  const last = pages[pages.length - 1]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-16">
      <h1 className="text-3xl font-bold">Game History</h1>
      <p className="mt-1 text-sm text-nex-mute">Scores you submitted to {ACTIVE_NETWORK.label}, read from the contract's events.</p>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-6">
        {!isContractConfigured() ? (
          <Notice title="History not enabled yet" body="The NexArena contract address has not been set for this network." />
        ) : !wallet.address ? (
          <div className="py-6 text-center">
            <p className="font-display font-semibold">Connect a wallet to see your history</p>
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button type="button" onClick={show} className="btn btn-primary mt-4">
                  <Wallet size={16} /> Connect Wallet
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        ) : history.isPending ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : history.isError ? (
          <div className="py-6 text-center">
            <p className="font-display font-semibold">Could not load your history</p>
            <p className="mt-1 text-sm text-nex-mute">The network did not answer. Check your connection and try again.</p>
            <button type="button" className="btn btn-ghost mt-4" onClick={() => void history.refetch()}>
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center">
            <Notice
              title={last && !last.done ? 'No submissions in the recent blocks' : 'No submissions yet'}
              body={last && !last.done ? 'Older blocks have not been searched yet.' : 'Finish a game and submit your score to see it here.'}
            />
            {!(last && !last.done) && (
              <button type="button" className="btn btn-primary mt-4" onClick={() => navigate('play')}>
                Play Game
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const meta = STATUS[row.status]
              const Icon = meta.icon
              return (
                <li key={row.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="font-display text-2xl font-bold leading-none tabular-nums">{formatScore(row.score)}</p>
                    <p className="mt-1 text-xs text-nex-mute">{formatDateTime(row.time)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={explorerTxUrl(row.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-nex-blue hover:underline"
                    >
                      {shortenAddress(row.hash)} <ExternalLink size={11} />
                    </a>
                    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', meta.className)}>
                      <Icon size={12} /> {meta.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {last && (
          <div className="mt-4 border-t border-nex-line pt-4 text-xs text-nex-mute">
            <p className="tabular-nums">
              {last.done
                ? last.floorIsLookback
                  ? `Searched the most recent ${(last.head - last.floor).toLocaleString()} blocks.`
                  : `Searched every block since the contract was deployed (block ${last.floor.toLocaleString()}).`
                : `Searched back to block ${(last.nextToBlock + 1n).toLocaleString()}. ${(last.nextToBlock - last.floor + 1n).toLocaleString()} blocks left to search.`}
            </p>
            {history.hasNextPage && (
              <button
                type="button"
                className="btn btn-ghost mt-3 !min-h-10 text-sm"
                disabled={history.isFetchingNextPage}
                onClick={() => void history.fetchNextPage()}
              >
                {history.isFetchingNextPage ? <Loader2 size={15} className="animate-spin" /> : null}
                Search older blocks
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center">
      <p className="font-display font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-nex-mute">{body}</p>
    </div>
  )
}
