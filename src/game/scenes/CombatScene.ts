import Phaser from 'phaser'
import {
  CAMERA_ZOOM,
  COMBAT_RIGHT,
  GROUND_Y,
  HERO_SPAWN_GAP,
  HUD_FONT_SIZE,
  HUD_HINT_FONT_SIZE,
  HUD_TOP_OFFSET,
  TOAST_FONT_SIZE,
} from '../config'
import { CHARACTERS, HERO_PARTY } from '../data/characters'
import { Fighter } from '../entities/Fighter'
import { WaveManager } from '../systems/WaveManager'
import { addXp, createInitialState, GameState } from '../state/gameState'

/** Distância mínima entre aliados no eixo X (evita empilhar no mesmo pixel) */
const ALLY_MIN_GAP = 30
/** Tempo da animação de morte (4 frames @ 8fps) antes de remover o sprite */
const DEATH_REMOVE_DELAY = 550

export class CombatScene extends Phaser.Scene {
  private heroes: Fighter[] = []
  private waveManager!: WaveManager
  private state!: GameState
  private hudText!: Phaser.GameObjects.Text
  private chestGroup!: Phaser.GameObjects.Group
  private groundLine!: Phaser.GameObjects.Rectangle
  private groundFill!: Phaser.GameObjects.Rectangle
  private bgFill!: Phaser.GameObjects.Rectangle
  private heroGroup!: Phaser.Physics.Arcade.Group
  private enemyGroup!: Phaser.Physics.Arcade.Group
  private spawningWave = false
  private gameOver = false

  constructor() {
    super('CombatScene')
  }

  create(): void {
    this.heroes = []
    this.gameOver = false
    this.spawningWave = false
    this.state = createInitialState()
    this.waveManager = new WaveManager(this)
    this.chestGroup = this.add.group()
    this.heroGroup = this.physics.add.group()
    this.enemyGroup = this.physics.add.group()
    this.physics.add.collider(this.heroGroup, this.enemyGroup)

    this.setupCamera()
    this.createBackground()
    this.spawnHeroes()
    this.createHud()
    this.spawnNextWave()

    this.scale.on('resize', this.handleResize, this)
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this)
  }

  private setupCamera(): void {
    const cam = this.cameras.main
    cam.setZoom(CAMERA_ZOOM)
    cam.setScroll(0, 0)
  }

  private createBackground(): void {
    const w = this.scale.width
    const h = this.scale.height

    this.bgFill = this.add.rectangle(0, 0, w, h, 0x0d1117).setOrigin(0)
    this.groundLine = this.add.rectangle(0, GROUND_Y, w, 2, 0x374151).setOrigin(0)
    this.groundFill = this.add
      .rectangle(0, GROUND_Y + 2, w, h - GROUND_Y, 0x1c1917, 0.85)
      .setOrigin(0)
  }

  private spawnHeroes(): void {
    HERO_PARTY.forEach((heroId, index) => {
      const def = CHARACTERS[heroId]
      const hero = new Fighter(this, COMBAT_RIGHT - index * HERO_SPAWN_GAP, def)
      this.heroGroup.add(hero)
      this.heroes.push(hero)
    })
  }

  private createHud(): void {
    this.hudText = this.add
      .text(8, HUD_TOP_OFFSET, '', {
        fontFamily: 'monospace',
        fontSize: `${HUD_FONT_SIZE}px`,
        color: '#e5e7eb',
      })
      .setDepth(20)

    const chestHint = this.add
      .text(this.scale.width - 6, HUD_TOP_OFFSET, 'Clique no baú', {
        fontFamily: 'monospace',
        fontSize: `${HUD_HINT_FONT_SIZE}px`,
        color: '#9ca3af',
      })
      .setOrigin(1, 0)
      .setDepth(20)

    this.events.on('update-hud', () => {
      chestHint.setX(this.scale.width - 6)
    })
  }

  private spawnNextWave(): void {
    if (this.spawningWave) return
    this.spawningWave = true

    this.time.delayedCall(800, () => {
      const spawned = this.waveManager.spawnWave()
      spawned.forEach((enemy) => this.enemyGroup.add(enemy))
      this.state.wave = this.waveManager.currentWave
      this.state.stage = this.waveManager.currentStage
      this.spawningWave = false
      this.updateHud()
    })
  }

  private updateHud(): void {
    this.hudText.setText(
      [
        `S${this.state.stage}-${this.state.wave}`,
        `Lv${this.state.level}`,
        `G${this.state.gold}`,
        `C${this.state.pendingChests}`,
        `K${this.state.kills}`,
      ].join(' '),
    )
    this.events.emit('update-hud')
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize

    this.bgFill.setSize(width, height)
    this.groundLine.width = width
    this.groundFill.setSize(width, height - GROUND_Y)

    const cam = this.cameras.main
    cam.setViewport(0, 0, width, height)
    cam.setZoom(CAMERA_ZOOM)
    cam.setScroll(0, 0)
    this.updateHud()
  }

  update(time: number): void {
    if (this.gameOver) {
      this.heroes.forEach((hero) => hero.updateHpBar())
      return
    }

    const heroes = this.heroes.filter((hero) => !hero.isDead)
    const enemies = this.waveManager.activeEnemies

    this.runCombatAi(heroes, enemies, time)
    this.runCombatAi(enemies, heroes, time)

    heroes.forEach((hero) => hero.updateHpBar())
    enemies.forEach((enemy) => enemy.updateHpBar())

    if (heroes.length === 0) {
      this.triggerGameOver()
      return
    }

    if (!this.spawningWave && enemies.length === 0) {
      const advancedStage = this.waveManager.advanceWave()
      if (advancedStage) {
        this.showToast(`Stage ${this.waveManager.currentStage}!`)
      }
      this.spawnNextWave()
    }
  }

  private runCombatAi(attackers: Fighter[], targets: Fighter[], time: number): void {
    const liveTargets = targets.filter((target) => !target.isDead)
    if (liveTargets.length === 0) {
      attackers.forEach((attacker) => {
        if (!attacker.isDead) attacker.setCombatState('idle')
      })
      return
    }

    attackers.forEach((attacker) => {
      if (attacker.isDead || !attacker.body) return

      const body = attacker.body as Phaser.Physics.Arcade.Body

      if (attacker.state === 'attack' || attacker.state === 'hurt') {
        body.setVelocityX(0)
        body.setImmovable(true)
        return
      }

      const target = this.findAttackTarget(attacker, liveTargets)
      const wantsRight = target.x > attacker.x
      attacker.setFacing(wantsRight)

      if (attacker.isInAttackRange(target)) {
        body.setVelocityX(0)
        body.setImmovable(true)
        if (attacker.canAttack(time)) {
          const opponentTeam = target.def.team
          attacker.performAttack(time, () => {
            const liveOpponents =
              opponentTeam === 'enemy'
                ? this.waveManager.activeEnemies
                : this.heroes.filter((hero) => !hero.isDead)
            const hitTarget = this.findAttackTarget(attacker, liveOpponents)
            if (!hitTarget || hitTarget.isDead || attacker.isDead) return
            if (!attacker.isInAttackRange(hitTarget)) return

            hitTarget.takeDamage(attacker.def.stats.attack)
            if (hitTarget.isDead) {
              this.onFighterKilled(attacker, hitTarget)
            }
          })
        } else {
          attacker.setCombatState('idle')
        }
      } else if (this.isBlockedByAlly(attacker, target, attackers)) {
        body.setVelocityX(0)
        body.setImmovable(true)
        attacker.setCombatState('idle')
      } else {
        const direction = wantsRight ? 1 : -1
        body.setImmovable(false)
        body.setVelocityX(direction * attacker.def.stats.moveSpeed)
        attacker.setCombatState('walk')
      }
    })
  }

  private findNearest(source: Fighter, targets: Fighter[]): Fighter {
    return targets.reduce((closest, current) => {
      const closestDist = Math.abs(closest.x - source.x)
      const currentDist = Math.abs(current.x - source.x)
      return currentDist < closestDist ? current : closest
    })
  }

  /** Aliado na frente, muito perto — espera vez (fila de combate 1D) */
  private isBlockedByAlly(attacker: Fighter, target: Fighter, allies: Fighter[]): boolean {
    const toTarget = target.x - attacker.x
    if (toTarget === 0) return false

    return allies.some((ally) => {
      if (ally === attacker || ally.isDead) return false
      if (Math.abs(ally.x - attacker.x) >= ALLY_MIN_GAP) return false
      const toAlly = ally.x - attacker.x
      return Math.sign(toAlly) === Math.sign(toTarget)
    })
  }

  /** Prioriza alvo já em alcance; senão o mais próximo */
  private findAttackTarget(attacker: Fighter, targets: Fighter[]): Fighter {
    const inRange = targets.filter((target) => attacker.isInAttackRange(target))
    if (inRange.length > 0) {
      return this.findNearest(attacker, inRange)
    }
    return this.findNearest(attacker, targets)
  }

  private onFighterKilled(_killer: Fighter, target: Fighter): void {
    if (target.def.team === 'enemy') {
      this.removeDeadFighter(target)

      this.state.kills += 1
      const xpReward = 8 + this.state.stage * 3

      addXp(this.state, xpReward)
      this.dropChest(target.x, target.y - 20)
      this.updateHud()
      return
    }

    if (target.def.team === 'hero') {
      this.removeDeadFighter(target)
      if (this.heroes.every((hero) => hero.isDead)) {
        this.triggerGameOver()
      }
    }
  }

  /** Tira o morto dos grupos de física e remove o sprite após a animação de death */
  private removeDeadFighter(fighter: Fighter): void {
    if (fighter.def.team === 'enemy') {
      this.enemyGroup.remove(fighter, false, false)
      this.waveManager.removeEnemy(fighter)
    } else {
      this.heroGroup.remove(fighter, false, false)
    }

    const deathAnimKey = `${fighter.def.id}-death`
    let destroyed = false
    const destroyFighter = () => {
      if (destroyed || !fighter.active) return
      destroyed = true
      fighter.destroy()
    }

    fighter.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (animation: Phaser.Animations.Animation) => {
        if (animation.key === deathAnimKey) {
          destroyFighter()
        }
      },
    )

    this.time.delayedCall(DEATH_REMOVE_DELAY, destroyFighter)
  }

  private triggerGameOver(): void {
    if (this.gameOver) return
    this.gameOver = true

    this.waveManager.activeEnemies.forEach((enemy) => {
      const body = enemy.body as Phaser.Physics.Arcade.Body
      body.setVelocityX(0)
      enemy.setCombatState('idle')
    })

    this.showToast('Herói derrotado! Reiniciando...')

    this.time.delayedCall(1800, () => {
      this.waveManager.reset()
      this.scene.restart()
    })
  }

  private dropChest(x: number, y: number): void {
    const chest = this.add
      .image(x, y, 'chest')
      .setScale(1.4)
      .setDepth(5)
      .setInteractive({ useHandCursor: true })

    this.tweens.add({
      targets: chest,
      y: GROUND_Y - 12,
      duration: 350,
      ease: 'Bounce.easeOut',
    })

    chest.on('pointerdown', () => this.openChest(chest))
    this.chestGroup.add(chest)
    this.state.pendingChests += 1
    this.updateHud()
  }

  private openChest(chest: Phaser.GameObjects.Image): void {
    if (!chest.active) return

    const roll = Math.random()
    let reward = 10 + this.state.stage * 3

    if (roll > 0.85) {
      reward *= 3
      this.showToast('Baú raro! +3x gold')
    } else if (roll > 0.6) {
      reward *= 1.5
      this.showToast('Bom loot!')
    }

    this.state.gold += Math.round(reward)
    this.state.pendingChests = Math.max(0, this.state.pendingChests - 1)

    this.tweens.add({
      targets: chest,
      scale: 0,
      alpha: 0,
      duration: 200,
      onComplete: () => chest.destroy(),
    })

    this.updateHud()
  }

  private showToast(message: string): void {
    const toast = this.add
      .text(this.scale.width / 2, HUD_TOP_OFFSET + 10, message, {
        fontFamily: 'monospace',
        fontSize: `${TOAST_FONT_SIZE}px`,
        color: '#fbbf24',
        backgroundColor: '#1f2937',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(30)

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: 10,
      duration: 1400,
      onComplete: () => toast.destroy(),
    })
  }
}
