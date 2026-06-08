export interface GameState {
  stage: number
  wave: number
  gold: number
  xp: number
  level: number
  pendingChests: number
  kills: number
}

export function createInitialState(): GameState {
  return {
    stage: 1,
    wave: 0,
    gold: 0,
    xp: 0,
    level: 1,
    pendingChests: 0,
    kills: 0,
  }
}

export function xpToNextLevel(level: number): number {
  return Math.floor(50 * Math.pow(1.35, level - 1))
}

export function addXp(state: GameState, amount: number): void {
  state.xp += amount
  while (state.xp >= xpToNextLevel(state.level)) {
    state.xp -= xpToNextLevel(state.level)
    state.level += 1
  }
}
