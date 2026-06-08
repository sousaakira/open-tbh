import Phaser from 'phaser'
import {
  ENEMY_ANCHOR_X,
  GROUND_Y,
  HERO_ANCHOR_X,
  SCROLL_GRID_STEP,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config'

/** Cenário simples com linhas de referência para visualizar posições no mundo */
export class CombatBackdrop {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly labels: Phaser.GameObjects.Text[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.graphics = scene.add.graphics().setDepth(-10)
    this.draw()
    this.createAxisLabels()
  }

  private draw(): void {
    const g = this.graphics
    g.clear()

    // Céu
    g.fillStyle(0x0f172a, 1)
    g.fillRect(0, 0, WORLD_WIDTH, GROUND_Y)

    // Chão
    g.fillStyle(0x1c1917, 0.92)
    g.fillRect(0, GROUND_Y + 2, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y)

    // Linha do chão
    g.lineStyle(2, 0x4b5563, 1)
    g.beginPath()
    g.moveTo(0, GROUND_Y)
    g.lineTo(WORLD_WIDTH, GROUND_Y)
    g.strokePath()

    // Linhas horizontais de referência
    g.lineStyle(1, 0x475569, 0.35)
    for (const y of [32, 64, 96, GROUND_Y - 18]) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(WORLD_WIDTH, y)
      g.strokePath()
    }

    // Grade vertical
    g.lineStyle(1, 0x334155, 0.45)
    for (let x = 0; x <= WORLD_WIDTH; x += SCROLL_GRID_STEP) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, WORLD_HEIGHT)
      g.strokePath()
    }

    // Marcadores de spawn (herói = verde, inimigo = vermelho)
    g.lineStyle(2, 0x22c55e, 0.55)
    g.beginPath()
    g.moveTo(HERO_ANCHOR_X, 20)
    g.lineTo(HERO_ANCHOR_X, GROUND_Y)
    g.strokePath()

    g.lineStyle(2, 0xef4444, 0.55)
    g.beginPath()
    g.moveTo(ENEMY_ANCHOR_X, 20)
    g.lineTo(ENEMY_ANCHOR_X, GROUND_Y)
    g.strokePath()

    // Bordas do mundo
    g.lineStyle(2, 0x64748b, 0.7)
    g.strokeRect(0.5, 0.5, WORLD_WIDTH - 1, WORLD_HEIGHT - 1)
  }

  private createAxisLabels(): void {
    const labelStep = SCROLL_GRID_STEP * 2

    for (let x = 0; x <= WORLD_WIDTH; x += labelStep) {
      const label = this.scene.add
        .text(x + 2, GROUND_Y - 14, `${x}`, {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: '#64748b',
        })
        .setDepth(-9)

      this.labels.push(label)
    }
  }

  destroy(): void {
    this.graphics.destroy()
    this.labels.forEach((label) => label.destroy())
    this.labels.length = 0
  }
}
