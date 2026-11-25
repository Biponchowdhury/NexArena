import Phaser from 'phaser'
import {
  ENEMIES,
  ENEMY_BULLET_DAMAGE,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_ENEMIES_ON_SCREEN,
  PICKUP_HEAL,
  PLAYER,
  levelForScore,
  shotsForLevel,
  spawnDelayMs,
  speedScale,
  type EnemyKind,
  type GameHandle,
  type GameOverStats,
  type TouchInput,
} from './GameConfig'
import type { HudStore } from './bus'
import { Enemy } from './Enemy'
import { Player } from './Player'
import { Projectile } from './Projectile'
import { ensureTextures } from './textures'

export interface GameOptions {
  parent: HTMLElement
  touch: TouchInput
  hud: HudStore
  onGameOver: (stats: GameOverStats) => void
}

type KeyMap = Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SPACE', Phaser.Input.Keyboard.Key>

const SCENE_KEY = 'arena'
const HUD_INTERVAL_MS = 100

class ArenaScene extends Phaser.Scene {
  private readonly opts: GameOptions
  private player!: Player
  private bullets!: Phaser.Physics.Arcade.Group
  private enemyBullets!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private pickups!: Phaser.Physics.Arcade.Group
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter
  private stars1!: Phaser.GameObjects.TileSprite
  private stars2!: Phaser.GameObjects.TileSprite
  private keys: KeyMap | undefined

  private score = 0
  private kills = 0
  private elapsedMs = 0
  private spawnAcc = 0
  private hudAcc = 0
  private nextShot = 0
  private over = false

  constructor(opts: GameOptions) {
    super(SCENE_KEY)
    this.opts = opts
  }

  create() {
    ensureTextures(this)
    this.score = 0
    this.kills = 0
    this.elapsedMs = 0
    this.spawnAcc = 0
    this.hudAcc = 0
    this.nextShot = 0
    this.over = false

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'nebula').setDepth(-3)
    this.stars1 = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'stars1').setDepth(-2)
    this.stars2 = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'stars2').setDepth(-1)

    this.bullets = this.physics.add.group({ classType: Projectile, maxSize: 48 })
    this.enemyBullets = this.physics.add.group({ classType: Projectile, maxSize: 80 })
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: 24 })
    this.pickups = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 6 })

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 130)

    this.sparks = this.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 250, max: 650 },
        speed: { min: 50, max: 280 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0x7dd3fc, 0xc084fc, 0xf0abfc, 0xffffff],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(20)

    const keyboard = this.input.keyboard
    if (keyboard) {
      keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE')
      this.keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE') as KeyMap
    }

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.onBulletHitsEnemy(b as Projectile, e as Enemy))
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.onPlayerRams(e as Enemy))
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => this.onPlayerShot(b as Projectile))
    this.physics.add.overlap(this.player, this.pickups, (_p, item) => this.onPickup(item as Phaser.Physics.Arcade.Sprite))

    this.publishHud()
  }

  override update(time: number, delta: number) {
    const dt = delta / 1000
    this.stars1.tilePositionY -= 28 * dt
    this.stars2.tilePositionY -= 75 * dt
    if (this.over) return

    this.elapsedMs += delta
    const level = levelForScore(this.score)

    this.movePlayer()
    this.player.tick(this.elapsedMs)
    if ((this.keys?.SPACE.isDown ?? false) || this.opts.touch.fire) this.shoot(time, level)

    this.spawnAcc += delta
    if (this.spawnAcc >= spawnDelayMs(level)) {
      this.spawnAcc = 0
      this.spawnEnemy(level)
    }

    this.hudAcc += delta
    if (this.hudAcc >= HUD_INTERVAL_MS) {
      this.hudAcc = 0
      this.publishHud()
    }
  }

  private movePlayer() {
    const k = this.keys
    const touch = this.opts.touch
    let ix = touch.x
    let iy = touch.y
    if (k) {
      if (k.LEFT.isDown || k.A.isDown) ix -= 1
      if (k.RIGHT.isDown || k.D.isDown) ix += 1
      if (k.UP.isDown || k.W.isDown) iy -= 1
      if (k.DOWN.isDown || k.S.isDown) iy += 1
    }
    const mag = Math.hypot(ix, iy)
    if (mag > 1) {
      ix /= mag
      iy /= mag
    }
    this.player.setVelocity(ix * PLAYER.speed, iy * PLAYER.speed)
  }

  private shoot(time: number, level: number) {
    if (time < this.nextShot) return
    this.nextShot = time + PLAYER.fireDelay
    const shots = shotsForLevel(level)
    const spread = shots === 3 ? [-14, 0, 14] : shots === 2 ? [-9, 9] : [0]
    for (const offset of spread) {
      const bolt = this.bullets.get(this.player.x + offset, this.player.y - 30, 'bolt') as Projectile | null
      bolt?.fire('bolt', this.player.x + offset, this.player.y - 30, offset * 6, -640, 1, 6, 26)
    }
  }

  private spawnEnemy(level: number) {
    if (this.enemies.countActive(true) >= MAX_ENEMIES_ON_SCREEN) return
    const kinds = (Object.keys(ENEMIES) as EnemyKind[]).filter((k) => ENEMIES[k].minLevel <= level)
    const total = kinds.reduce((sum, k) => sum + ENEMIES[k].weight, 0)
    let roll = Math.random() * total
    let kind = kinds[0]
    for (const k of kinds) {
      roll -= ENEMIES[k].weight
      if (roll <= 0) {
        kind = k
        break
      }
    }
    const x = Phaser.Math.Between(50, GAME_WIDTH - 50)
    const enemy = this.enemies.get(x, -60, ENEMIES[kind].texture) as Enemy | null
    if (!enemy) return
    enemy.spawnAs(kind, x, -60, speedScale(level))
    enemy.onFire = (shooter) => this.enemyFire(shooter)
  }

  private enemyFire(enemy: Enemy) {
    if (this.over || !this.player.active) return
    const volley = enemy.spec.volley ?? 1
    const aim = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y)
    const base = volley === 1 ? Math.PI / 2 : aim
    const speed = volley === 1 ? 250 : 210
    for (let i = 0; i < volley; i++) {
      const angle = base + (i - (volley - 1) / 2) * 0.28
      const shot = this.enemyBullets.get(enemy.x, enemy.y + 20, 'ebolt') as Projectile | null
      shot?.fire('ebolt', enemy.x, enemy.y + 20, Math.cos(angle) * speed, Math.sin(angle) * speed, ENEMY_BULLET_DAMAGE, 10, 10)
    }
  }

  private onBulletHitsEnemy(bullet: Projectile, enemy: Enemy) {
    if (!bullet.active || !enemy.active) return
    bullet.disableBody(true, true)
    this.sparks.explode(3, bullet.x, bullet.y)
    if (enemy.hit(bullet.damage)) this.destroyEnemy(enemy)
  }

  private destroyEnemy(enemy: Enemy) {
    this.sparks.explode(enemy.spec.burst, enemy.x, enemy.y)
    this.score += enemy.spec.score
    this.kills += enemy.kind === 'asteroid' ? 0 : 1
    if (enemy.kind !== 'asteroid' && Math.random() < (enemy.kind === 'tank' ? 0.45 : 0.07)) this.dropPickup(enemy.x, enemy.y)
    enemy.disableBody(true, true)
    this.publishHud()
  }

  private dropPickup(x: number, y: number) {
    const item = this.pickups.get(x, y, 'pickup') as Phaser.Physics.Arcade.Sprite | null
    if (!item) return
    item.setTexture('pickup')
    item.enableBody(true, x, y, true, true)
    item.setVelocity(0, 90)
    item.setDepth(6)
  }

  private onPickup(item: Phaser.Physics.Arcade.Sprite) {
    if (!item.active) return
    item.disableBody(true, true)
    this.player.heal(PICKUP_HEAL)
    this.sparks.explode(10, this.player.x, this.player.y)
    this.publishHud()
  }

  private onPlayerRams(enemy: Enemy) {
    if (!enemy.active || this.over) return
    if (!this.player.hurt(enemy.spec.contactDamage, this.elapsedMs)) return
    this.sparks.explode(enemy.spec.burst, enemy.x, enemy.y)
    if (enemy.spec.survivesContact) {
      if (enemy.hit(2)) this.destroyEnemy(enemy)
    } else {
      enemy.disableBody(true, true)
    }
    this.afterPlayerHit()
  }

  private onPlayerShot(shot: Projectile) {
    if (!shot.active || this.over) return
    shot.disableBody(true, true)
    if (this.player.hurt(shot.damage, this.elapsedMs)) this.afterPlayerHit()
  }

  private afterPlayerHit() {
    this.cameras.main.shake(130, 0.007)
    this.cameras.main.flash(120, 255, 60, 90, true)
    this.publishHud()
    if (this.player.health <= 0) this.endGame()
  }

  private endGame() {
    this.over = true
    this.sparks.explode(70, this.player.x, this.player.y)
    this.player.explode()
    this.cameras.main.shake(400, 0.014)
    this.publishHud()
    const stats: GameOverStats = { score: this.score, kills: this.kills, seconds: Math.floor(this.elapsedMs / 1000) }
    this.time.delayedCall(850, () => this.opts.onGameOver(stats))
  }

  private publishHud() {
    this.opts.hud.set({
      score: this.score,
      health: Math.max(0, Math.ceil(this.player.health)),
      maxHealth: PLAYER.maxHealth,
      seconds: Math.floor(this.elapsedMs / 1000),
      kills: this.kills,
      level: levelForScore(this.score),
    })
  }
}

/** Boots Phaser inside `parent`. Call `destroy` on unmount. */
export function createGame(opts: GameOptions): GameHandle {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: opts.parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#040818',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60 },
    audio: { noAudio: true },
    disableContextMenu: true,
    scene: [new ArenaScene(opts)],
  })

  const isRunning = () => game.scene.isActive(SCENE_KEY)
  return {
    pause: () => {
      if (isRunning()) game.scene.pause(SCENE_KEY)
    },
    resume: () => {
      if (game.scene.isPaused(SCENE_KEY)) game.scene.resume(SCENE_KEY)
    },
    restart: () => {
      if (game.scene.isPaused(SCENE_KEY)) game.scene.resume(SCENE_KEY)
      game.scene.getScene(SCENE_KEY).scene.restart()
    },
    destroy: () => game.destroy(true),
  }
}
