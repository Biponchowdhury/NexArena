import { useCallback } from 'react'
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { toast } from 'sonner'
import { ACTIVE_NETWORK } from '../../config/network'
import { classifyTxError } from './transactions'

export const shortenAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

export type WalletStatus = 'disconnected' | 'connecting' | 'wrong-network' | 'ready'

/**
 * Wallet state for the configured Arc network. wagmi tracks account and network
 * changes from the wallet, so every consumer re-renders when either changes.
 */
export function useWallet() {
  const { address, chainId, isConnected, isConnecting, isReconnecting } = useAccount()
  const { disconnect } = useDisconnect()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()

  const onTargetChain = isConnected && chainId === ACTIVE_NETWORK.chain.id
  const status: WalletStatus = isConnecting || isReconnecting
    ? 'connecting'
    : !isConnected
      ? 'disconnected'
      : onTargetChain
        ? 'ready'
        : 'wrong-network'

  /** Asks the wallet to switch to (or add) the configured Arc network. */
  const switchToTarget = useCallback(async (): Promise<boolean> => {
    try {
      await switchChainAsync({ chainId: ACTIVE_NETWORK.chain.id })
      return true
    } catch (error) {
      const { kind, message } = classifyTxError(error)
      if (kind === 'rejected') toast(`Network switch cancelled. Switch to ${ACTIVE_NETWORK.label} to continue.`)
      else toast.error(message)
      return false
    }
  }, [switchChainAsync])

  return {
    address,
    chainId,
    status,
    isConnected,
    onTargetChain,
    isSwitching,
    disconnect,
    switchToTarget,
  }
}
