import Phaser from 'phaser'
import { COMBAT_LEFT, ENEMY_SPAWN_GAP } from '../config'
import { CHARACTERS, ENEMY_WAVES } from '../data/characters'
import { Fighter } from '../entities/Fighter'

export class WaveManager {
  private scene: Phaser.Scene
  private enemies: Fighter[] = []
  private waveIndex = 0
  private stage = 1

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  get activeEnemies(): Fighter[] {
    return this.enemies.filter((enemy) => !enemy.isDead)
  }

  get currentWave(): number {
    return this.waveIndex + 1
  }

  get currentStage(): number {
    return this.stage
  }

  spawnWave(): Fighter[] {
    this.clearDead()

    const waveDefs = ENEMY_WAVES[this.waveIndex % ENEMY_WAVES.length]
    const stageMultiplier = 1 + (this.stage - 1) * 0.15
    const spawned: Fighter[] = []

    waveDefs.forEach((enemyId, index) => {
      const def = CHARACTERS[enemyId]
      if (!def) return

      const x = COMBAT_LEFT + index * ENEMY_SPAWN_GAP
      const enemy = new Fighter(this.scene, x, def)
      enemy.maxHp = Math.round(enemy.maxHp * stageMultiplier)
      enemy.hp = enemy.maxHp
      enemy.updateHpBar()

      this.enemies.push(enemy)
      spawned.push(enemy)
    })

    return spawned
  }

  advanceWave(): boolean {
    this.waveIndex += 1
    if (this.waveIndex >= ENEMY_WAVES.length) {
      this.waveIndex = 0
      this.stage += 1
      return true
    }
    return false
  }

  removeEnemy(enemy: Fighter): void {
    this.enemies = this.enemies.filter((e) => e !== enemy)
  }

  clearDead(): void {
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.isDead) {
        enemy.destroy()
        return false
      }
      return true
    })
  }

  reset(): void {
    this.enemies.forEach((enemy) => enemy.destroy())
    this.enemies = []
    this.waveIndex = 0
    this.stage = 1
  }
}
