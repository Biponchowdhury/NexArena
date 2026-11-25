import Phaser from 'phaser'
import { ENEMIES, GAME_HEIGHT, type EnemyKind, type EnemySpec } from './GameConfig'

/** Pooled enemy ship or asteroid. Movement and firing cadence live here. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  kind: EnemyKind = 'scout'
  spec: EnemySpec = ENEMIES.scout
  hp = 1
  /** Set by the scene so the enemy can request a volley. */
  onFire: ((enemy: Enemy) => void) | undefined
  private age = 0
  private fireTimer = 0
  private baseVx = 0
  private swayAmp = 0
  private swayFreq = 0
  private spin = 0

  spawnAs(kind: EnemyKind, x: number, y: number, speedMult: number) {
    const spec = ENEMIES[kind]
    this.kind = kind
    this.spec = spec
    this.hp = spec.hp
    this.age = 0
    this.fireTimer = spec.fireDelay ? Phaser.Math.Between(400, spec.fireDelay) : 0
    this.setTexture(spec.texture)
    this.enableBody(true, x, y, true, true)
    this.clearTint()
    this.setAngle(0)
    this.setDepth(5)
    ;(this.body as Phaser.Physics.Arcade.Body).setSize(this.width * spec.hitScale, this.height * spec.hitScale, true)

    const vy = Phaser.Math.FloatBetween(spec.speed[0], spec.speed[1]) * speedMult
    this.baseVx = kind === 'asteroid' ? Phaser.Math.FloatBetween(-40, 40) : 0
    this.swayAmp = kind === 'scout' ? Phaser.Math.FloatBetween(30, 90) : 0
    this.swayFreq = Phaser.Math.FloatBetween(1.4, 2.6)
    this.spin = kind === 'asteroid' ? Phaser.Math.FloatBetween(-90, 90) : 0
    this.setVelocity(this.baseVx, vy)
  }

  /** Applies damage and flashes the ship. Returns true when destroyed. */
  hit(damage: number) {
    this.hp -= damage
    if (this.hp <= 0) return true
    this.setTintFill(0xffffff)
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.clearTint()
    })
    return false
  }

  override preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta)
    const dt = delta / 1000
    this.age += dt

    if (this.swayAmp > 0) {
      // Derivative of amp * sin(freq * t): a smooth side-to-side weave.
      this.setVelocityX(this.baseVx + this.swayAmp * this.swayFreq * Math.cos(this.swayFreq * this.age))
    }
    if (this.spin !== 0) this.angle += this.spin * dt

    if (this.spec.fireDelay && this.y > 0 && this.y < GAME_HEIGHT * 0.75) {
      this.fireTimer -= delta
      if (this.fireTimer <= 0) {
        this.fireTimer = this.spec.fireDelay
        this.onFire?.(this)
      }
    }

    if (this.y > GAME_HEIGHT + 80) this.disableBody(true, true)
  }
}
