import { ConnectKitButton } from 'connectkit'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Send, Wallet } from 'lucide-react'
import { ACTIVE_NETWORK, explorerTxUrl } from '../../config/network'
import { useScoreSubmission } from '../blockchain/useSubmission'
import { shortenAddress } from '../blockchain/wallet'

interface Props {
  sessionId: string
  score: number
}

/** Submit-to-Arc flow for one finished game. Success is only shown after a mined, successful receipt. */
export function SubmitScore({ sessionId, score }: Props) {
  const { phase, notice, record, submit, wallet } = useScoreSubmission(sessionId, score)
  const busy = phase === 'switching' || phase === 'estimating' || phase === 'wallet' || phase === 'pending'
  const hash = record?.hash ?? null

  if (phase === 'confirmed' && hash) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4" role="status">
        <p className="flex items-center gap-2 font-semibold text-emerald-200">
          <CheckCircle2 size={18} /> Score confirmed on {ACTIVE_NETWORK.label}
        </p>
        <a
          href={explorerTxUrl(hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 font-mono text-sm text-emerald-100 hover:underline"
        >
          {shortenAddress(hash)} <ExternalLink size={13} />
          <span className="font-sans">View on Arc Explorer</span>
        </a>
      </div>
    )
  }

  if (phase === 'unavailable') {
    return (
      <div className="rounded-2xl border border-nex-line bg-white/[0.03] p-4 text-sm text-nex-mute">
        <button type="button" disabled className="btn btn-ghost w-full">
          <Send size={16} /> Submit Score to Arc
        </button>
        <p className="mt-2 text-center">Onchain submission is not enabled yet. The NexArena contract address has not been set.</p>
      </div>
    )
  }

  const action = () => {
    if (!wallet.isConnected) return null
    return (
      <button
        type="button"
        onClick={() => void (wallet.onTargetChain ? submit() : wallet.switchToTarget())}
        disabled={busy || wallet.isSwitching}
        className="btn btn-ghost w-full border-nex-violet/50 !text-nex-text hover:!bg-nex-violet/20"
      >
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {phase === 'wallet' ? 'Confirm in your wallet…' : phase === 'pending' ? 'Waiting for confirmation…' : 'Preparing…'}
          </>
        ) : !wallet.onTargetChain ? (
          <>
            <AlertTriangle size={16} /> Switch to {ACTIVE_NETWORK.label}
          </>
        ) : (
          <>
            <Send size={16} /> {phase === 'failed' ? 'Try again' : 'Submit Score to Arc'}
          </>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-2.5">
      {wallet.isConnected ? (
        action()
      ) : (
        <ConnectKitButton.Custom>
          {({ show }) => (
            <button type="button" onClick={show} className="btn btn-ghost w-full border-nex-violet/50">
              <Wallet size={16} /> Connect wallet to submit
            </button>
          )}
        </ConnectKitButton.Custom>
      )}

      {phase === 'pending' && hash && (
        <a
          href={explorerTxUrl(hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-sm text-nex-blue hover:underline"
        >
          Transaction sent: {shortenAddress(hash)} <ExternalLink size={13} />
        </a>
      )}

      {notice && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100" role="alert">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {notice}
        </p>
      )}

      <p className="text-center text-xs text-nex-mute">
        {ACTIVE_NETWORK.isMainnet
          ? 'Arc Mainnet: this sends a real transaction and pays a network fee in USDC. It cannot be undone.'
          : 'Testnet: network fee is paid in free test USDC.'}{' '}
        Your score is self-reported and stored as submitted.
      </p>
    </div>
  )
}
