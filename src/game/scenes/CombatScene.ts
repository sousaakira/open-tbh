import Phaser from 'phaser'
import {
  CAMERA_HERO_ANCHOR_RATIO,
  CAMERA_SCROLL_LERP,
  CAMERA_ZOOM,
  GROUND_Y,
  HERO_ANCHOR_X,
  HERO_SPAWN_GAP,
  HUD_FONT_SIZE,
  HUD_HINT_FONT_SIZE,
  HUD_TOP_OFFSET,
  TOAST_FONT_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config'
import { CHARACTERS, HERO_PARTY } from '../data/characters'
import { combatLog } from '../debug/combatLog'
import { Fighter } from '../entities/Fighter'
import { WaveManager } from '../systems/WaveManager'
import { addXp, createInitialState, GameState } from '../state/gameState'
import { CombatBackdrop } from './CombatBackdrop'

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
  private backdrop!: CombatBackdrop
  private heroGroup!: Phaser.Physics.Arcade.Group
  private enemyGroup!: Phaser.Physics.Arcade.Group
  private spawningWave = false
  private gameOver = false
  private lastCombatLogAt = new Map<string, number>()

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
    this.backdrop = new CombatBackdrop(this)
    this.spawnHeroes()
    this.snapCameraToHeroes()
    this.createHud()
    this.spawnNextWave()

    this.scale.on('resize', this.handleResize, this)
  }

  shutdown(): void {
    this.scale.off('resize', this.handleResize, this)
    this.backdrop?.destroy()
  }

  private setupCamera(): void {
    const cam = this.cameras.main
    cam.setZoom(CAMERA_ZOOM)
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  }

  private spawnHeroes(): void {
    HERO_PARTY.forEach((heroId, index) => {
      const def = CHARACTERS[heroId]
      const hero = new Fighter(this, HERO_ANCHOR_X - index * HERO_SPAWN_GAP, def)
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
      .setScrollFactor(0)

    const chestHint = this.add
      .text(this.scale.width - 6, HUD_TOP_OFFSET, 'Clique no baú', {
        fontFamily: 'monospace',
        fontSize: `${HUD_HINT_FONT_SIZE}px`,
        color: '#9ca3af',
      })
      .setOrigin(1, 0)
      .setDepth(20)
      .setScrollFactor(0)

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

    const cam = this.cameras.main
    cam.setViewport(0, 0, width, height)
    cam.setZoom(CAMERA_ZOOM)
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
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
    this.updateCameraScroll(heroes, enemies)

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

  private snapCameraToHeroes(): void {
    const heroes = this.heroes.filter((hero) => !hero.isDead)
    if (heroes.length === 0) return

    const cam = this.cameras.main
    const viewW = cam.width / CAMERA_ZOOM
    const maxScroll = Math.max(0, WORLD_WIDTH - viewW)
    const leadHero = heroes.reduce((lead, hero) => (hero.x > lead.x ? hero : lead))
    const scrollX = Phaser.Math.Clamp(
      leadHero.x - viewW * CAMERA_HERO_ANCHOR_RATIO,
      0,
      maxScroll,
    )
    cam.setScroll(scrollX, 0)
  }

  private updateCameraScroll(heroes: Fighter[], enemies: Fighter[]): void {
    if (heroes.length === 0) return

    const cam = this.cameras.main
    const viewW = cam.width / CAMERA_ZOOM
    const maxScroll = Math.max(0, WORLD_WIDTH - viewW)
    const edgePadding = 40

    // Herói mais à direita lidera — câmera o mantém fixo na tela enquanto o cenário rola
    const leadHero = heroes.reduce((lead, hero) => (hero.x > lead.x ? hero : lead))
    let targetScrollX = leadHero.x - viewW * CAMERA_HERO_ANCHOR_RATIO

    const liveEnemies = enemies.filter((enemy) => !enemy.isDead)
    if (liveEnemies.length > 0) {
      const minEnemyX = Math.min(...liveEnemies.map((enemy) => enemy.x))
      // Não deixa inimigos sumirem pela esquerda da tela
      if (minEnemyX - targetScrollX < edgePadding) {
        targetScrollX = minEnemyX - edgePadding
      }
    }

    // Garante herói sempre visível
    const heroScreenX = leadHero.x - targetScrollX
    if (heroScreenX > viewW - edgePadding) {
      targetScrollX = leadHero.x - (viewW - edgePadding)
    } else if (heroScreenX < edgePadding) {
      targetScrollX = leadHero.x - edgePadding
    }

    targetScrollX = Phaser.Math.Clamp(targetScrollX, 0, maxScroll)
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetScrollX, CAMERA_SCROLL_LERP)
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
        if (attacker.def.team === 'hero') {
          this.throttledCombatLog(
            `${attacker.def.id}-${attacker.state}`,
            'ai-skip-state',
            {
              id: attacker.def.id,
              state: attacker.state,
              x: Math.round(attacker.x),
              enemies: liveTargets.map((t) => ({
                id: t.def.id,
                x: Math.round(t.x),
                gap: Math.round(Fighter.getEdgeGap(attacker, t)),
              })),
            },
            500,
          )
        }
        return
      }

      const target = this.findAttackTarget(attacker, liveTargets)
      const wantsRight = target.x > attacker.x
      attacker.setFacing(wantsRight)

      if (attacker.isInAttackRange(target)) {
        body.setVelocityX(0)
        if (attacker.canAttack(time)) {
          body.setImmovable(true)
          const gap = Fighter.getEdgeGap(attacker, target)
          if (attacker.def.team === 'hero') {
            combatLog('ai-attack', {
              attacker: attacker.def.id,
              target: target.def.id,
              attackerX: Math.round(attacker.x),
              targetX: Math.round(target.x),
              gap: Math.round(gap),
              attackRange: attacker.def.stats.attackRange,
              enemiesAlive: liveTargets.map((t) => t.def.id),
            })
          }
          const opponentTeam = target.def.team
          attacker.performAttack(time, () => {
            this.resolveAttackHit(attacker, opponentTeam)
          })
        } else {
          body.setImmovable(false)
          attacker.setCombatState('idle')
          if (attacker.def.team === 'hero') {
            this.throttledCombatLog(
              `${attacker.def.id}-cooldown`,
              'ai-cooldown',
              {
                id: attacker.def.id,
                target: target.def.id,
                waitMs: Math.round(attacker.def.stats.attackCooldown - (time - attacker.lastAttackAt)),
              },
              800,
            )
          }
        }
      } else if (this.isBlockedByAlly(attacker, target, attackers)) {
        body.setVelocityX(0)
        body.setImmovable(true)
        attacker.setCombatState('idle')
        this.throttledCombatLog(
          `${attacker.def.id}-blocked-${target.def.id}`,
          'ai-blocked',
          {
            id: attacker.def.id,
            target: target.def.id,
            attackerX: Math.round(attacker.x),
            targetX: Math.round(target.x),
          },
          600,
        )
      } else {
        const direction = wantsRight ? 1 : -1
        body.setImmovable(false)
        body.setVelocityX(direction * attacker.def.stats.moveSpeed)
        attacker.setCombatState('walk')
      }
    })
  }

  private throttledCombatLog(
    key: string,
    tag: string,
    data: Record<string, unknown>,
    intervalMs: number,
  ): void {
    const now = this.time.now
    const last = this.lastCombatLogAt.get(key) ?? 0
    if (now - last < intervalMs) return
    this.lastCombatLogAt.set(key, now)
    combatLog(tag, data)
  }

  private findNearest(source: Fighter, targets: Fighter[]): Fighter {
    return targets.reduce((closest, current) => {
      const closestDist = Math.abs(closest.x - source.x)
      const currentDist = Math.abs(current.x - source.x)
      return currentDist < closestDist ? current : closest
    })
  }

  /** Aliado vivo na frente e colado — espera vez (fila de combate 1D) */
  private isBlockedByAlly(attacker: Fighter, target: Fighter, allies: Fighter[]): boolean {
    const toTarget = target.x - attacker.x
    if (toTarget === 0) return false

    return allies.some((ally) => {
      if (ally === attacker || ally.isDead) return false
      if (Math.abs(ally.x - attacker.x) >= ALLY_MIN_GAP) return false

      const toAlly = ally.x - attacker.x
      if (Math.sign(toAlly) !== Math.sign(toTarget)) return false

      // Só bloqueia se o aliado está entre o atacante e o alvo
      return Math.abs(ally.x - target.x) < Math.abs(attacker.x - target.x)
    })
  }

  private canHitTarget(attacker: Fighter, target: Fighter): boolean {
    return Fighter.getEdgeGap(attacker, target) <= attacker.def.stats.attackRange + 8
  }

  private resolveAttackHit(attacker: Fighter, opponentTeam: 'hero' | 'enemy'): void {
    const liveOpponents =
      opponentTeam === 'enemy'
        ? this.waveManager.activeEnemies
        : this.heroes.filter((hero) => !hero.isDead)

    const opponentSnapshot = liveOpponents.map((opp) => ({
      id: opp.def.id,
      x: Math.round(opp.x),
      gap: Math.round(Fighter.getEdgeGap(attacker, opp)),
      inRange: attacker.isInAttackRange(opp),
      canHit: this.canHitTarget(attacker, opp),
    }))

    const hitTarget = this.findAttackTarget(attacker, liveOpponents)

    combatLog('resolve-hit', {
      attacker: attacker.def.id,
      attackerX: Math.round(attacker.x),
      attackerState: attacker.state,
      opponents: opponentSnapshot,
      picked: hitTarget?.def.id ?? null,
    })

    if (!hitTarget || hitTarget.isDead || attacker.isDead) {
      combatLog('hit-fail', {
        reason: !hitTarget ? 'no-target' : attacker.isDead ? 'attacker-dead' : 'target-dead',
        attacker: attacker.def.id,
      })
      return
    }

    const gap = Fighter.getEdgeGap(attacker, hitTarget)
    if (!this.canHitTarget(attacker, hitTarget)) {
      combatLog('hit-fail', {
        reason: 'out-of-range',
        attacker: attacker.def.id,
        target: hitTarget.def.id,
        gap: Math.round(gap),
        maxGap: attacker.def.stats.attackRange + 8,
      })
      return
    }

    const damage = attacker.def.stats.attack
    const hpBefore = hitTarget.hp
    hitTarget.takeDamage(damage)

    combatLog('hit-success', {
      attacker: attacker.def.id,
      target: hitTarget.def.id,
      damage,
      hpBefore,
      hpAfter: hitTarget.hp,
      killed: hitTarget.isDead,
    })

    if (hitTarget.isDead) {
      this.onFighterKilled(attacker, hitTarget)
    }
  }

  /** Libera posicionamento após um inimigo morrer */
  private releaseCombatAfterKill(killer: Fighter): void {
    combatLog('release-after-kill', {
      killer: killer.def.id,
      killerX: Math.round(killer.x),
      remainingEnemies: this.waveManager.activeEnemies.map((e) => ({
        id: e.def.id,
        x: Math.round(e.x),
      })),
    })
    killer.readyForNextTarget()

    const living = [
      ...this.heroes.filter((hero) => !hero.isDead),
      ...this.waveManager.activeEnemies,
    ]

    living.forEach((fighter) => {
      if (!fighter.body) return
      const body = fighter.body as Phaser.Physics.Arcade.Body
      body.setImmovable(false)
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

  private onFighterKilled(killer: Fighter, target: Fighter): void {
    combatLog('kill', {
      killer: killer.def.id,
      target: target.def.id,
      killerX: Math.round(killer.x),
      targetX: Math.round(target.x),
    })

    if (target.def.team === 'enemy') {
      this.removeDeadFighter(target)
      this.releaseCombatAfterKill(killer)

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
      .setScrollFactor(0)

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: 10,
      duration: 1400,
      onComplete: () => toast.destroy(),
    })
  }
}
