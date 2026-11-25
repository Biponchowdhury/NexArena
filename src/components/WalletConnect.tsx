import { ConnectKitButton } from 'connectkit'
import clsx from 'clsx'
import { AlertTriangle, LogOut, Wallet } from 'lucide-react'
import { ACTIVE_NETWORK } from '../../config/network'
import { shortenAddress, useWallet } from '../blockchain/wallet'

/** Shows which Arc network the app targets and whether the wallet is on it. */
export function NetworkBadge({ className }: { className?: string }) {
  const { status } = useWallet()
  const wrong = status === 'wrong-network'
  const live = status === 'ready'
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
        wrong ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-nex-line bg-white/[0.03] text-nex-text',
        className,
      )}
      title={live ? 'Wallet is on this network' : wrong ? 'Wallet is on a different network' : 'Network used for score submissions'}
    >
      <span
        className={clsx(
          'h-2 w-2 rounded-full',
          wrong ? 'bg-amber-300' : live ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-nex-mute',
        )}
      />
      {ACTIVE_NETWORK.label}
    </span>
  )
}

export function WalletConnect({ className }: { className?: string }) {
  const wallet = useWallet()

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show }) => {
        if (!isConnected || !wallet.address) {
          return (
            <button type="button" onClick={show} disabled={isConnecting} className={clsx('btn btn-ghost !min-h-10 text-sm', className)}>
              <Wallet size={16} />
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )
        }
        return (
          <div className={clsx('flex items-center gap-2', className)}>
            {wallet.status === 'wrong-network' && (
              <button
                type="button"
                onClick={() => void wallet.switchToTarget()}
                disabled={wallet.isSwitching}
                className="btn !min-h-10 border border-amber-400/40 bg-amber-400/10 text-sm text-amber-100"
              >
                <AlertTriangle size={15} />
                <span className="max-sm:hidden">Switch to {ACTIVE_NETWORK.label}</span>
                <span className="sm:hidden">Switch</span>
              </button>
            )}
            <button type="button" onClick={show} className="btn btn-ghost !min-h-10 font-mono text-sm tabular-nums" title="Wallet details">
              {shortenAddress(wallet.address)}
            </button>
            <button
              type="button"
              onClick={() => wallet.disconnect()}
              className="btn btn-ghost !min-h-10 !px-3"
              aria-label="Disconnect wallet"
              title="Disconnect"
            >
              <LogOut size={16} />
            </button>
          </div>
        )
      }}
    </ConnectKitButton.Custom>
  )
}
