import { DEBUG_COMBAT } from '../../../shared/gameLayout'

export function combatLog(tag: string, data?: Record<string, unknown>): void {
  if (!DEBUG_COMBAT) return
  if (data) {
    console.log(`[combat:${tag}]`, data)
  } else {
    console.log(`[combat:${tag}]`)
  }
}
