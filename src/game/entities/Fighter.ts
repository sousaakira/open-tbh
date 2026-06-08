import Phaser from 'phaser'
import {
  BODY_HIT_HEIGHT,
  BODY_HIT_WIDTH,
  CHARACTER_SCALE,
  DEBUG_PHYSICS,
  FRAME_SIZE,
  GROUND_Y,
  HP_BAR_ABOVE_HEAD,
  HP_BAR_HEIGHT,
  HP_BAR_WIDTH,
  SPRITE_FEET_ANCHOR_Y,
  SPRITE_HEAD_RATIO,
} from '../config'
import { AnimationDef, CharacterDef } from '../data/characters'
import { combatLog } from '../debug/combatLog'

export type FighterState = 'idle' | 'walk' | 'attack' | 'hurt' | 'death'

export class Fighter extends Phaser.Physics.Arcade.Sprite {
  readonly def: CharacterDef
  maxHp: number
  hp: number
  state: FighterState = 'idle'
  facingRight = true
  lastAttackAt = 0
  isDead = false

  private hpBarBg?: Phaser.GameObjects.Rectangle
  private hpBarFill?: Phaser.GameObjects.Rectangle
  private attackHitLanded = false
  private attackTimers: Phaser.Time.TimerEvent[] = []
  private attackVariantIndex = 0

  constructor(scene: Phaser.Scene, x: number, def: CharacterDef) {
    super(scene, x, GROUND_Y, `${def.id}-idle`, 0)
    this.def = def
    this.maxHp = def.stats.hp
    this.hp = def.stats.hp
    this.facingRight = def.team === 'enemy'

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setScale(CHARACTER_SCALE)
    this.setFlipX(def.team === 'hero')
    this.setOrigin(0.5, SPRITE_FEET_ANCHOR_Y)
    this.setCollideWorldBounds(true)
    this.setDepth(def.team === 'hero' ? 2 : 1)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(BODY_HIT_WIDTH, BODY_HIT_HEIGHT)
    body.setOffset(
      (FRAME_SIZE - BODY_HIT_WIDTH) / 2,
      FRAME_SIZE * SPRITE_FEET_ANCHOR_Y - BODY_HIT_HEIGHT,
    )
    body.setAllowGravity(false)

    if (DEBUG_PHYSICS) {
      body.debugShowBody = true
      body.debugShowVelocity = true
      body.debugBodyColor = def.team === 'hero' ? 0x22c55e : 0xef4444
    }

    this.play(`${def.id}-idle`)
    this.createHpBar()
  }

  private getHeadY(): number {
    const top = this.y - this.displayHeight * SPRITE_FEET_ANCHOR_Y
    return top + this.displayHeight * SPRITE_HEAD_RATIO
  }

  private getHpBarY(): number {
    return this.getHeadY() - HP_BAR_ABOVE_HEAD
  }

  private createHpBar(): void {
    const y = this.getHpBarY()

    this.hpBarBg = this.scene.add.rectangle(this.x, y, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x1f2937, 0.9)
    this.hpBarFill = this.scene.add.rectangle(
      this.x - HP_BAR_WIDTH / 2,
      y,
      HP_BAR_WIDTH,
      HP_BAR_HEIGHT,
      0x22c55e,
      1,
    )
    this.hpBarFill.setOrigin(0, 0.5)
    this.hpBarBg.setDepth(10)
    this.hpBarFill.setDepth(11)
  }

  updateHpBar(): void {
    if (!this.hpBarBg || !this.hpBarFill) return

    const y = this.getHpBarY()
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1)

    this.hpBarBg.setPosition(this.x, y)
    this.hpBarFill.setPosition(this.x - HP_BAR_WIDTH / 2, y)
    this.hpBarFill.width = HP_BAR_WIDTH * ratio
    this.hpBarFill.fillColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444
  }

  setFacing(right: boolean): void {
    if (this.facingRight === right) return
    this.facingRight = right
    this.setFlipX(!right)
  }

  /** Animações globais vivem em scene.anims — sprite.anims.exists só vê animações locais */
  private hasAnim(animKey: string): boolean {
    return this.scene.anims.exists(animKey)
  }

  private getAnim(animKey: string): Phaser.Animations.Animation | null {
    return this.scene.anims.get(animKey) ?? null
  }

  setCombatState(next: FighterState, force = false): void {
    if (this.isDead && next !== 'death') return
    if (!force && this.state === next) return

    this.state = next
    const animKey = `${this.def.id}-${next}`
    if (this.hasAnim(animKey)) {
      this.play(animKey, false)
    }
  }

  /** Metade da largura da hitbox (mesma caixa verde/vermelha do debug) */
  getCombatHalfWidth(): number {
    if (!this.body) {
      return (BODY_HIT_WIDTH * CHARACTER_SCALE) / 2
    }
    const body = this.body as Phaser.Physics.Arcade.Body
    return body.halfWidth
  }

  /** Distância entre as bordas dos sprites (0 = encostados) */
  static getEdgeGap(a: Fighter, b: Fighter): number {
    return Math.abs(a.x - b.x) - a.getCombatHalfWidth() - b.getCombatHalfWidth()
  }

  isInAttackRange(target: Fighter): boolean {
    return Fighter.getEdgeGap(this, target) <= this.def.stats.attackRange + 4
  }

  /** Encerra ataque preso e libera para retarget (ex.: alvo morreu no golpe) */
  forceEndAttack(): void {
    combatLog('force-end-attack', {
      id: this.def.id,
      team: this.def.team,
      x: Math.round(this.x),
      wasState: this.state,
    })
    this.clearAttackTimers()
    this.attackHitLanded = true
    if (!this.isDead && this.state === 'attack') {
      this.setCombatState('idle', true)
    }
  }

  canAttack(now: number): boolean {
    return !this.isDead && now - this.lastAttackAt >= this.def.stats.attackCooldown
  }

  private clearAttackTimers(): void {
    for (const timer of this.attackTimers) {
      timer.remove()
    }
    this.attackTimers = []
  }

  private resolveAttackVariant(): { variantKey: string; animDef: AnimationDef } | null {
    const variants =
      this.def.attackVariants ?? (this.def.animations.attack ? ['attack'] : [])
    if (variants.length === 0) return null

    for (let offset = 0; offset < variants.length; offset += 1) {
      const index = (this.attackVariantIndex + offset) % variants.length
      const variantKey = variants[index]
      const animDef = this.def.animations[variantKey]
      const animKey = `${this.def.id}-${variantKey}`
      if (!animDef || !this.hasAnim(animKey)) continue

      this.attackVariantIndex = index + 1
      return { variantKey, animDef }
    }

    combatLog('attack-failed', {
      id: this.def.id,
      variants: this.def.attackVariants ?? ['attack'],
    })
    return null
  }

  performAttack(now: number, onHit?: () => void): void {
    const resolved = this.resolveAttackVariant()
    if (!resolved) return

    const { variantKey, animDef: attackAnim } = resolved

    this.clearAttackTimers()
    this.lastAttackAt = now
    this.attackHitLanded = false
    this.state = 'attack'

    const animKey = `${this.def.id}-${variantKey}`
    const phaserAnim = this.getAnim(animKey)
    const frameCount = phaserAnim?.frames.length ?? attackAnim.frames
    const hitFrame = attackAnim.hitFrame ?? Math.max(2, Math.floor(frameCount * 0.55))
    const frameRate = attackAnim.frameRate ?? 14

    combatLog('attack-start', {
      id: this.def.id,
      team: this.def.team,
      x: Math.round(this.x),
      variant: variantKey,
      hitFrame,
      frames: frameCount,
    })

    const finishAttack = () => {
      this.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate)
      this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, onAnimComplete)
      if (!this.isDead && this.state === 'attack') {
        combatLog('attack-end', { id: this.def.id, team: this.def.team })
        this.setCombatState('idle', true)
      }
    }

    const landHit = () => {
      if (this.attackHitLanded || this.isDead) {
        combatLog('hit-skip', {
          id: this.def.id,
          reason: this.isDead ? 'attacker-dead' : 'already-landed',
        })
        return
      }
      this.attackHitLanded = true
      combatLog('hit-frame', {
        id: this.def.id,
        team: this.def.team,
        x: Math.round(this.x),
        state: this.state,
      })
      onHit?.()
    }

    const onAnimUpdate = (
      animation: Phaser.Animations.Animation,
      frame: Phaser.Animations.AnimationFrame,
    ) => {
      if (animation.key !== animKey) return
      if (frame.index >= hitFrame) {
        landHit()
      }
    }

    const onAnimComplete = (animation: Phaser.Animations.Animation) => {
      if (animation.key !== animKey) return
      landHit()
      finishAttack()
    }

    this.off(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate)
    this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, onAnimComplete)
    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, onAnimUpdate)
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, onAnimComplete)

    const hitDelay = ((hitFrame + 1) / frameRate) * 1000
    const attackDuration = (frameCount / frameRate) * 1000 + 80
    this.attackTimers.push(
      this.scene.time.delayedCall(hitDelay, landHit),
      this.scene.time.delayedCall(attackDuration, finishAttack),
    )

    this.stop()
    this.play({ key: animKey, startFrame: 0, repeat: 0 })
  }

  takeDamage(amount: number): void {
    if (this.isDead) return

    this.hp = Math.max(0, this.hp - amount)
    this.updateHpBar()

    if (this.hp <= 0) {
      this.die()
      return
    }

    // Herói: só aplica dano — hurt travava o combate com 2+ inimigos (logs: ai-skip-state hurt)
    if (this.def.team === 'hero' || this.state === 'attack') return

    this.setCombatState('hurt', true)
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.isDead && this.state === 'hurt') {
        this.setCombatState('idle', true)
      }
    })
  }

  /** Volta ao combate após matar um inimigo */
  readyForNextTarget(): void {
    this.forceEndAttack()
    if (!this.isDead && this.state !== 'death') {
      this.setCombatState('idle', true)
    }
  }

  /** Remove hitbox imediatamente — corpo morto não pode bloquear aliados */
  disablePhysics(): void {
    if (!this.body) return

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    if (DEBUG_PHYSICS) {
      body.debugShowBody = false
    }
    // Não usar setSize(0,0) — o Phaser volta ao tamanho do frame inteiro (caixa gigante)
    this.disableBody(false, true)
  }

  die(): void {
    this.isDead = true
    this.clearAttackTimers()
    this.hpBarBg?.setVisible(false)
    this.hpBarFill?.setVisible(false)
    this.disablePhysics()
    this.setDepth(0)
    this.setCombatState('death', true)
  }

  destroy(fromScene?: boolean): void {
    this.clearAttackTimers()
    this.hpBarBg?.destroy(fromScene)
    this.hpBarFill?.destroy(fromScene)
    super.destroy(fromScene)
  }
}
