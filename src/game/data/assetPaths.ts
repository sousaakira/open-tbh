/** Base URL servida pelo Vite em /game-assets → pasta assets/ */
const SPRITES_BASE = 'game-assets/sprites'

/** Caminho normalizado: sprites/characters/{id}/{anim}.png */
export function characterSpriteUrl(characterId: string, animation: string): string {
  return `${SPRITES_BASE}/characters/${characterId}/${animation}.png`
}

/** Caminho normalizado: sprites/tools/{name}.png */
export function toolSpriteUrl(name: string): string {
  return `${SPRITES_BASE}/tools/${name}.png`
}
