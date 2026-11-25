import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './GameConfig'

type Pt = [number, number]
const toPoints = (pts: Pt[]) => pts.map(([x, y]) => new Phaser.Math.Vector2(x, y))

function polygon(g: Phaser.GameObjects.Graphics, pts: Pt[], fill: number, stroke: number, width = 2) {
  const points = toPoints(pts)
  g.fillStyle(fill, 1)
  g.fillPoints(points, true)
  g.lineStyle(width, stroke, 1)
  g.strokePoints(points, true)
}

function hexagon(cx: number, cy: number, r: number): Pt[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt
  })
}

function scatter(g: Phaser.GameObjects.Graphics, count: number, size: number, colors: number[], alpha: number) {
  for (let i = 0; i < count; i++) {
    g.fillStyle(Phaser.Utils.Array.GetRandom(colors), alpha * Phaser.Math.FloatBetween(0.5, 1))
    g.fillCircle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), size * Phaser.Math.FloatBetween(0.6, 1))
  }
}

/** Draws every sprite once at boot, so the game ships with no image assets. */
export function ensureTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('ship')) return
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  const bake = (key: string, w: number, h: number, draw: () => void) => {
    g.clear()
    draw()
    g.generateTexture(key, w, h)
  }

  bake('ship', 56, 64, () => {
    g.fillStyle(0x38bdf8, 0.12)
    g.fillTriangle(28, 0, 56, 64, 0, 64)
    polygon(g, [[28, 0], [36, 22], [56, 50], [56, 60], [38, 52], [34, 62], [22, 62], [18, 52], [0, 60], [0, 50], [20, 22]], 0x14246a, 0x4cc9ff)
    g.fillStyle(0x7df9ff, 0.95)
    g.fillEllipse(28, 26, 9, 18)
    g.lineStyle(1, 0xa78bfa, 1)
    g.lineBetween(28, 36, 28, 56)
    g.fillStyle(0xc084fc, 1)
    g.fillCircle(5, 54, 2.5)
    g.fillCircle(51, 54, 2.5)
  })

  bake('scout', 40, 40, () => {
    polygon(g, [[20, 40], [34, 14], [40, 2], [28, 10], [20, 4], [12, 10], [0, 2], [6, 14]], 0x3b1670, 0xc084fc)
    g.fillStyle(0xf0abfc, 1)
    g.fillCircle(20, 16, 3.5)
  })

  bake('fighter', 52, 52, () => {
    polygon(g, [[26, 52], [44, 30], [52, 8], [38, 16], [26, 6], [14, 16], [0, 8], [8, 30]], 0x5b1346, 0xf472b6)
    g.fillStyle(0xf9a8d4, 1)
    g.fillRect(6, 10, 4, 14)
    g.fillRect(42, 10, 4, 14)
    g.fillStyle(0xfb7185, 1)
    g.fillCircle(26, 24, 4.5)
  })

  bake('tank', 80, 80, () => {
    polygon(g, hexagon(40, 40, 37), 0x1e1b4b, 0x818cf8, 3)
    polygon(g, hexagon(40, 40, 23), 0x312e81, 0x38bdf8, 2)
    g.fillStyle(0xa5b4fc, 1)
    g.fillRect(20, 62, 8, 16)
    g.fillRect(52, 62, 8, 16)
    g.fillStyle(0x22d3ee, 1)
    g.fillCircle(40, 40, 8)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(40, 40, 3)
  })

  bake('asteroid', 64, 64, () => {
    const radii = [28, 24, 30, 26, 22, 29, 25, 30, 23, 27]
    const pts = radii.map((r, i) => {
      const a = (Math.PI * 2 * i) / radii.length
      return [32 + Math.cos(a) * r, 32 + Math.sin(a) * r] as Pt
    })
    polygon(g, pts, 0x23304f, 0x6b7fb0)
    g.fillStyle(0x1a2440, 1)
    g.fillCircle(24, 26, 6)
    g.fillCircle(40, 38, 8)
    g.fillCircle(30, 44, 4)
  })

  bake('bolt', 10, 32, () => {
    g.fillStyle(0x38bdf8, 0.28)
    g.fillRoundedRect(0, 0, 10, 32, 5)
    g.fillStyle(0x7dd3fc, 0.65)
    g.fillRoundedRect(2, 2, 6, 28, 3)
    g.fillStyle(0xffffff, 1)
    g.fillRoundedRect(3.5, 4, 3, 24, 1.5)
  })

  bake('ebolt', 16, 16, () => {
    g.fillStyle(0xf43f5e, 0.3)
    g.fillCircle(8, 8, 8)
    g.fillStyle(0xfb7185, 0.8)
    g.fillCircle(8, 8, 5.5)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(8, 8, 2.5)
  })

  bake('spark', 8, 8, () => {
    g.fillStyle(0xffffff, 1)
    g.fillCircle(4, 4, 4)
  })

  bake('flame', 14, 28, () => {
    g.fillStyle(0x38bdf8, 0.55)
    g.fillTriangle(0, 0, 14, 0, 7, 28)
    g.fillStyle(0xe0f2fe, 1)
    g.fillTriangle(3, 0, 11, 0, 7, 16)
  })

  bake('pickup', 30, 30, () => {
    g.fillStyle(0x052e16, 1)
    g.fillCircle(15, 15, 14)
    g.lineStyle(2, 0x34d399, 1)
    g.strokeCircle(15, 15, 14)
    g.fillStyle(0xffffff, 1)
    g.fillRect(13, 7, 4, 16)
    g.fillRect(7, 13, 16, 4)
  })

  bake('nebula', GAME_WIDTH, GAME_HEIGHT, () => {
    // Vertical navy gradient drawn as thin bands, which renders the same on WebGL and canvas.
    const bands = 64
    const top = Phaser.Display.Color.ValueToColor(0x070d2e)
    const bottom = Phaser.Display.Color.ValueToColor(0x16227a)
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i)
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1)
      g.fillRect(0, Math.floor((i * GAME_HEIGHT) / bands), GAME_WIDTH, Math.ceil(GAME_HEIGHT / bands) + 1)
    }
    const blob = (x: number, y: number, r: number, color: number) => {
      for (let i = 0; i < 16; i++) {
        g.fillStyle(color, 0.014)
        g.fillCircle(x, y, r * (1 - i * 0.055))
      }
    }
    blob(90, 180, 220, 0x7c3aed)
    blob(410, 520, 260, 0x2563eb)
    blob(160, 700, 200, 0x9333ea)
  })

  bake('stars1', GAME_WIDTH, GAME_HEIGHT, () => scatter(g, 130, 1, [0xffffff, 0xbfdbfe], 0.55))
  bake('stars2', GAME_WIDTH, GAME_HEIGHT, () => scatter(g, 45, 2, [0xffffff, 0x7dd3fc, 0xc4b5fd], 0.9))

  g.destroy()
}
