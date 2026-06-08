import Phaser from 'phaser'
import { characterSpriteUrl } from '../data/assetPaths'
import { CHARACTERS } from '../data/characters'
import { FRAME_SIZE } from '../config'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    for (const character of Object.values(CHARACTERS)) {
      for (const animKey of Object.keys(character.animations)) {
        const textureKey = `${character.id}-${animKey}`
        this.load.spritesheet(textureKey, characterSpriteUrl(character.id, animKey), {
          frameWidth: FRAME_SIZE,
          frameHeight: FRAME_SIZE,
        })
      }
    }
  }

  create(): void {
    this.createChestTexture()

    for (const character of Object.values(CHARACTERS)) {
      for (const animKey of Object.keys(character.animations)) {
        const textureKey = `${character.id}-${animKey}`
        const animDef = character.animations[animKey]
        const animName = `${character.id}-${animKey}`

        if (!this.anims.exists(animName)) {
          const defaultFrameRate =
            animKey === 'attack' ? 14 : animKey === 'walk' ? 12 : animKey === 'death' ? 8 : 10

          this.anims.create({
            key: animName,
            frames: this.anims.generateFrameNumbers(textureKey, {
              start: 0,
              end: animDef.frames - 1,
            }),
            frameRate: animDef.frameRate ?? defaultFrameRate,
            repeat: animKey === 'idle' || animKey === 'walk' ? -1 : 0,
          })
        }
      }
    }

    this.scene.start('CombatScene')
  }

  /** Baú pixel art procedural (o pack não inclui sprite de baú) */
  private createChestTexture(): void {
    const w = 22
    const h = 18
    const gfx = this.make.graphics({ x: 0, y: 0 }, false)

    gfx.fillStyle(0x78350f, 1)
    gfx.fillRect(1, 7, 20, 10)
    gfx.fillStyle(0x92400e, 1)
    gfx.fillRect(1, 3, 20, 6)
    gfx.fillStyle(0x451a03, 1)
    gfx.fillRect(1, 7, 20, 1)
    gfx.fillStyle(0xfbbf24, 1)
    gfx.fillRect(9, 9, 4, 4)
    gfx.fillStyle(0x451a03, 1)
    gfx.fillRect(0, 2, 1, 15)
    gfx.fillRect(21, 2, 1, 15)
    gfx.fillRect(0, 16, 22, 1)

    gfx.generateTexture('chest', w, h)
    gfx.destroy()
  }
}
