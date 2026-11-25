import { useRef } from 'react'
import { Crosshair } from 'lucide-react'
import type { TouchInput } from '../game/GameConfig'

export interface TouchController {
  state: TouchInput
  setMove: (x: number, y: number) => void
  setFire: (on: boolean) => void
}

/** Shared object the Phaser scene polls each frame. Writing to it never re-renders React. */
export function createTouchController(): TouchController {
  const state: TouchInput = { x: 0, y: 0, fire: false }
  return {
    state,
    setMove: (x, y) => {
      state.x = x
      state.y = y
    },
    setFire: (on) => {
      state.fire = on
    },
  }
}

const RADIUS = 52

/** Virtual joystick (left) and fire button (right). Shown on touch devices and narrow screens. */
export function TouchControls({ controller }: { controller: TouchController }) {
  const knob = useRef<HTMLDivElement>(null)
  const origin = useRef<{ id: number; x: number; y: number } | null>(null)

  const move = (clientX: number, clientY: number) => {
    const o = origin.current
    if (!o) return
    let dx = clientX - o.x
    let dy = clientY - o.y
    const dist = Math.hypot(dx, dy)
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS
      dy = (dy / dist) * RADIUS
    }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    // Small dead zone so a resting thumb does not drift the ship.
    const nx = Math.abs(dx) < 6 ? 0 : dx / RADIUS
    const ny = Math.abs(dy) < 6 ? 0 : dy / RADIUS
    controller.setMove(nx, ny)
  }

  const release = () => {
    origin.current = null
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)'
    controller.setMove(0, 0)
  }

  return (
    <div className="hidden max-sm:block [@media(pointer:coarse)]:block select-none" style={{ touchAction: 'none' }}>
      <div
        className="absolute bottom-[max(2.5rem,env(safe-area-inset-bottom))] left-6 z-10 flex h-36 w-36 items-center justify-center rounded-full border border-nex-line bg-white/[0.04] backdrop-blur-sm"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const rect = e.currentTarget.getBoundingClientRect()
          origin.current = { id: e.pointerId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          move(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (origin.current?.id === e.pointerId) move(e.clientX, e.clientY)
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        aria-label="Movement joystick"
        role="presentation"
      >
        <div
          ref={knob}
          className="pointer-events-none h-14 w-14 rounded-full border border-nex-blue/60 bg-nex-blue/25 shadow-neon"
        />
      </div>

      <button
        type="button"
        className="absolute bottom-[max(3.5rem,env(safe-area-inset-bottom))] right-6 z-10 flex h-24 w-24 items-center justify-center rounded-full border border-nex-violet/60 bg-nex-violet/20 text-nex-text shadow-violet backdrop-blur-sm active:scale-95 active:bg-nex-violet/40"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          controller.setFire(true)
        }}
        onPointerUp={() => controller.setFire(false)}
        onPointerCancel={() => controller.setFire(false)}
        onLostPointerCapture={() => controller.setFire(false)}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Fire"
      >
        <Crosshair size={34} />
      </button>
    </div>
  )
}
