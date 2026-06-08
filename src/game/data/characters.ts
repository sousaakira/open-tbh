export type Team = 'hero' | 'enemy'

export interface AnimationDef {
  frames: number
  /** Frames por segundo (opcional) */
  frameRate?: number
  /** Frame em que o golpe acerta (0 = primeiro frame) */
  hitFrame?: number
}

export interface CharacterDef {
  id: string
  name: string
  animations: Record<string, AnimationDef>
  stats: {
    hp: number
    attack: number
    /** Distância máxima entre as bordas dos sprites para atacar (0 = encostados) */
    attackRange: number
    attackCooldown: number
    moveSpeed: number
  }
  team: Team
}

const baseAnimations = (attackFrames = 6): Record<string, AnimationDef> => ({
  idle: { frames: 6, frameRate: 10 },
  walk: { frames: 8, frameRate: 12 },
  attack: {
    frames: attackFrames,
    frameRate: 14,
    hitFrame: Math.max(2, Math.floor(attackFrames * 0.55)),
  },
  hurt: { frames: 4, frameRate: 12 },
  death: { frames: 4, frameRate: 8 },
})

export const CHARACTERS: Record<string, CharacterDef> = {
  knight: {
    id: 'knight',
    name: 'Knight',
    animations: baseAnimations(7),
    stats: {
      hp: 120,
      attack: 18,
      attackRange: 18,
      attackCooldown: 900,
      moveSpeed: 45,
    },
    team: 'hero',
  },
  priest: {
    id: 'priest',
    name: 'Priest',
    animations: {
      ...baseAnimations(6),
      heal: { frames: 6, frameRate: 12 },
    },
    stats: {
      hp: 80,
      attack: 10,
      attackRange: 22,
      attackCooldown: 1200,
      moveSpeed: 40,
    },
    team: 'hero',
  },
  orc: {
    id: 'orc',
    name: 'Orc',
    animations: baseAnimations(),
    stats: {
      hp: 60,
      attack: 12,
      attackRange: 16,
      attackCooldown: 1100,
      moveSpeed: 35,
    },
    team: 'enemy',
  },
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton',
    animations: baseAnimations(),
    stats: {
      hp: 45,
      attack: 10,
      attackRange: 16,
      attackCooldown: 1000,
      moveSpeed: 38,
    },
    team: 'enemy',
  },
  slime: {
    id: 'slime',
    name: 'Slime',
    animations: baseAnimations(),
    stats: {
      hp: 35,
      attack: 8,
      attackRange: 14,
      attackCooldown: 1300,
      moveSpeed: 28,
    },
    team: 'enemy',
  },
}

export const HERO_PARTY = ['knight'] as const

export const ENEMY_WAVES: string[][] = [
  ['orc'],
  ['orc', 'orc'],
  ['orc', 'skeleton'],
  ['skeleton', 'skeleton', 'slime'],
  ['orc', 'skeleton', 'slime'],
  ['orc', 'orc', 'skeleton', 'slime'],
]
