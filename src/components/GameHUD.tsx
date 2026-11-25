import { memo, useSyncExternalStore } from 'react'
import clsx from 'clsx'
import { Heart, Pause, Skull } from 'lucide-react'
import type { HudStore } from '../game/bus'
import { formatScore, formatTime } from '../lib/format'

interface Props {
  hud: HudStore
  onPause: () => void
}

/** Reads the live game state from the store, so only this component re-renders while playing. */
export const GameHUD = memo(function GameHUD({ hud, onPause }: Props) {
  const state = useSyncExternalStore(hud.subscribe, hud.getSnapshot)
  const pct = Math.round((state.health / state.maxHealth) * 100)
  const low = pct <= 30

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-[480px] items-start justify-between gap-3">
        <div>
          <p className="label">Score</p>
          <p className="font-display text-3xl font-bold leading-none tabular-nums text-nex-text drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
            {formatScore(state.score)}
          </p>
        </div>
        <div className="text-center">
          <p className="label">Time</p>
          <p className="font-display text-xl font-semibold tabular-nums">{formatTime(state.seconds)}</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="text-right">
            <p className="label">Level</p>
            <p className="font-display text-xl font-semibold tabular-nums">{state.level}</p>
          </div>
          <button type="button" onClick={onPause} className="btn btn-ghost !min-h-11 !w-11 !px-0" aria-label="Pause game">
            <Pause size={18} />
          </button>
        </div>
      </div>

      <div className="mx-auto mt-3 flex max-w-[480px] items-center gap-2.5">
        <Heart size={15} className={low ? 'text-rose-400' : 'text-nex-blue'} aria-hidden="true" />
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Health"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={clsx(
              'h-full rounded-full transition-[width] duration-150',
              low ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gradient-to-r from-nex-blue to-nex-violet',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-9 text-right text-xs font-semibold tabular-nums text-nex-mute">{pct}</span>
        <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-nex-mute">
          <Skull size={13} aria-hidden="true" />
          {state.kills}
        </span>
      </div>
    </div>
  )
})
