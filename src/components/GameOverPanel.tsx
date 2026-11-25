import { Home, RotateCcw, Trophy } from 'lucide-react'
import type { GameOverStats } from '../game/GameConfig'
import { formatScore, formatTime } from '../lib/format'
import { SubmitScore } from './SubmitScore'

export interface GameResult {
  stats: GameOverStats
  isBest: boolean
  highScore: number
  sessionId: string
}

interface Props {
  result: GameResult
  onPlayAgain: () => void
  onHome: () => void
}

export function GameOverPanel({ result, onPlayAgain, onHome }: Props) {
  const { stats, isBest, highScore, sessionId } = result
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-nex-bg/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="go-title">
      <div className="glass my-auto w-full max-w-sm rounded-3xl p-6 shadow-neon">
        <p className="label text-center">Mission over</p>
        <h2 id="go-title" className="mt-1 text-center text-2xl font-bold">
          Game Over
        </h2>

        <div className="mt-4 text-center">
          <p className="label">Final score</p>
          <p className="font-display text-6xl font-bold leading-none tabular-nums text-nex-text drop-shadow-[0_0_18px_rgba(56,189,248,0.55)]">
            {formatScore(stats.score)}
          </p>
          {isBest && stats.score > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-nex-violet/20 px-3 py-1 text-xs font-semibold text-violet-200">
              <Trophy size={13} /> New personal best
            </p>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="Best" value={formatScore(highScore)} />
          <Stat label="Destroyed" value={formatScore(stats.kills)} />
          <Stat label="Survived" value={formatTime(stats.seconds)} />
        </dl>

        <div className="mt-5 space-y-3">
          {stats.score > 0 ? (
            <SubmitScore sessionId={sessionId} score={stats.score} />
          ) : (
            <p className="text-center text-sm text-nex-mute">Score a point to unlock onchain submission.</p>
          )}
          <button type="button" onClick={onPlayAgain} className="btn btn-primary w-full">
            <RotateCcw size={17} /> Play Again
          </button>
          <button type="button" onClick={onHome} className="btn w-full text-nex-mute hover:text-nex-text">
            <Home size={16} /> Back to home
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-2 py-2.5">
      <dt className="label">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
