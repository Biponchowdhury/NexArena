import { useCallback, useEffect, useRef, useState } from 'react'
import { Home, Loader2, Play as PlayIcon, RotateCcw } from 'lucide-react'
import { GameHUD } from '../components/GameHUD'
import { GameOverPanel, type GameResult } from '../components/GameOverPanel'
import { TouchControls, createTouchController } from '../components/TouchControls'
import { createHudStore } from '../game/bus'
import type { GameHandle } from '../game/GameConfig'
import { getLocalStats, recordGame } from '../lib/localStats'
import { navigate } from '../lib/router'
import { newSessionId } from '../lib/submissions'

type Phase = 'loading' | 'playing' | 'paused' | 'over'

export default function Play() {
  const container = useRef<HTMLDivElement>(null)
  const handle = useRef<GameHandle | null>(null)
  const sessionId = useRef('')
  const [hud] = useState(createHudStore)
  const [touch] = useState(createTouchController)
  const [phase, setPhase] = useState<Phase>('loading')
  const [result, setResult] = useState<GameResult | null>(null)
  const [loadError, setLoadError] = useState(false)
  const phaseRef = useRef<Phase>('loading')

  const updatePhase = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  // Phaser is loaded on demand so the home screen stays light.
  useEffect(() => {
    const abort = new AbortController()
    sessionId.current = newSessionId()
    import('../game/Game')
      .then(({ createGame }) => {
        if (abort.signal.aborted || !container.current) return
        handle.current = createGame({
          parent: container.current,
          touch: touch.state,
          hud,
          onGameOver: (stats) => {
            const isBest = recordGame(stats)
            setResult({ stats, isBest, highScore: getLocalStats().highScore, sessionId: sessionId.current })
            updatePhase('over')
          },
        })
        updatePhase('playing')
      })
      .catch(() => {
        if (!abort.signal.aborted) setLoadError(true)
      })
    return () => {
      abort.abort()
      handle.current?.destroy()
      handle.current = null
    }
  }, [hud, touch, updatePhase])

  const pause = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    handle.current?.pause()
    touch.setMove(0, 0)
    touch.setFire(false)
    updatePhase('paused')
  }, [touch, updatePhase])

  const resume = useCallback(() => {
    if (phaseRef.current !== 'paused') return
    handle.current?.resume()
    updatePhase('playing')
  }, [updatePhase])

  const restart = useCallback(() => {
    sessionId.current = newSessionId()
    setResult(null)
    touch.setMove(0, 0)
    touch.setFire(false)
    handle.current?.restart()
    updatePhase('playing')
  }, [touch, updatePhase])

  // Escape toggles pause. Switching tabs pauses automatically.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (phaseRef.current === 'playing') pause()
      else if (phaseRef.current === 'paused') resume()
    }
    const onHidden = () => {
      if (document.hidden) pause()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [pause, resume])

  const showHud = phase === 'playing' || phase === 'paused'

  return (
    <div className="starfield fixed inset-0 overflow-hidden bg-nex-bg" style={{ touchAction: 'none' }}>
      <div ref={container} className="absolute inset-0" aria-label="NexArena game canvas" />

      {phase === 'loading' && !loadError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-nex-mute">
          <Loader2 className="animate-spin text-nex-blue" />
          <p className="text-sm">Launching NexArena…</p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-lg font-semibold">The game could not load.</p>
          <p className="text-sm text-nex-mute">Check your connection and reload the page.</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}

      {showHud && <GameHUD hud={hud} onPause={pause} />}
      {showHud && <TouchControls controller={touch} />}

      {phase === 'paused' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-nex-bg/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <div className="glass w-full max-w-xs rounded-3xl p-6 text-center">
            <h2 id="pause-title" className="text-2xl font-bold">
              Paused
            </h2>
            <p className="mt-1 text-sm tabular-nums text-nex-mute">Score {hud.getSnapshot().score.toLocaleString('en-US')}</p>
            <div className="mt-5 space-y-2.5">
              <button type="button" onClick={resume} className="btn btn-primary w-full">
                <PlayIcon size={17} /> Resume
              </button>
              <button type="button" onClick={restart} className="btn btn-ghost w-full">
                <RotateCcw size={16} /> Restart
              </button>
              <button type="button" onClick={() => navigate('home')} className="btn w-full text-nex-mute hover:text-nex-text">
                <Home size={16} /> Quit to home
              </button>
            </div>
            <p className="mt-4 text-xs text-nex-mute">Press Esc to resume</p>
          </div>
        </div>
      )}

      {phase === 'over' && result && <GameOverPanel result={result} onPlayAgain={restart} onHome={() => navigate('home')} />}
    </div>
  )
}

