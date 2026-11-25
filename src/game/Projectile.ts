import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './GameConfig'

/** Pooled bullet used for both the player's bolts and enemy fire. */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage = 1

  fire(texture: string, x: number, y: number, vx: number, vy: number, damage: number, hitW: number, hitH: number) {
    this.setTexture(texture)
    this.enableBody(true, x, y, true, true)
    ;(this.body as Phaser.Physics.Arcade.Body).setSize(hitW, hitH, true)
    this.setVelocity(vx, vy)
    this.setRotation(Math.atan2(vy, vx) + Math.PI / 2)
    this.setBlendMode(Phaser.BlendModes.ADD)
    this.damage = damage
  }

  override preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta)
    if (this.y < -40 || this.y > GAME_HEIGHT + 40 || this.x < -40 || this.x > GAME_WIDTH + 40) {
      this.disableBody(true, true)
    }
  }
}
