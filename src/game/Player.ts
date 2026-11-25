import Phaser from 'phaser'
import { PLAYER } from './GameConfig'

export class Player extends Phaser.Physics.Arcade.Sprite {
  health: number = PLAYER.maxHealth
  private invulnerableUntil = 0
  private readonly flame: Phaser.GameObjects.Image

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ship')
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setCollideWorldBounds(true)
    this.setDepth(10)
    ;(this.body as Phaser.Physics.Arcade.Body).setSize(26, 38, true)
    this.flame = scene.add.image(x, y + 38, 'flame').setDepth(9).setBlendMode(Phaser.BlendModes.ADD)
  }

  /** Per-frame visuals: thruster flicker and the blink after taking a hit. */
  tick(timeMs: number) {
    this.flame.setPosition(this.x, this.y + 40)
    this.flame.setScale(1, 0.85 + Math.sin(timeMs * 0.045) * 0.25)
    this.setAlpha(this.isInvulnerable(timeMs) ? (Math.floor(timeMs / 70) % 2 ? 0.35 : 1) : 1)
  }

  isInvulnerable(timeMs: number) {
    return timeMs < this.invulnerableUntil
  }

  /** Returns true when the damage was applied. */
  hurt(amount: number, timeMs: number) {
    if (this.isInvulnerable(timeMs)) return false
    this.health = Math.max(0, this.health - amount)
    this.invulnerableUntil = timeMs + PLAYER.invulnerableMs
    return true
  }

  heal(amount: number) {
    this.health = Math.min(PLAYER.maxHealth, this.health + amount)
  }

  explode() {
    this.flame.setVisible(false)
    this.disableBody(true, true)
  }

  override destroy(fromScene?: boolean) {
    this.flame.destroy()
    super.destroy(fromScene)
  }
}
