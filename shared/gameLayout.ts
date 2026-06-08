/** Janela Electron (tamanho total da janela) */
export const WINDOW_WIDTH = 400
export const WINDOW_HEIGHT = 140

/** Viewport (janela visível) */
export const GAME_WIDTH = WINDOW_WIDTH
export const GAME_HEIGHT = WINDOW_HEIGHT

/** Mundo rolável — combate acontece ao longo do eixo X */
export const WORLD_WIDTH = 1600
export const WORLD_HEIGHT = GAME_HEIGHT
export const FRAME_SIZE = 100

/**
 * Escala dos sprites. Referência TBH: personagem ~40–50% da altura da janela.
 * Frames são 100×100px; a arte ocupa ~metade — escala ~1.5–1.75 fica próximo.
 */
export const CHARACTER_SCALE = 1.75

/**
 * Zoom da câmera. Em 400×140 use 1 para enxergar o mundo inteiro.
 * Valores > 1 cortam as bordas e exigem reposicionar os spawns.
 */
export const CAMERA_ZOOM = 1

/**
 * Altura da faixa de chão na parte inferior (como a linha vermelha do mockup).
 * Os pés dos personagens ficam no topo dessa faixa.
 */
export const GROUND_ZONE_HEIGHT = 10

export const GROUND_Y = GAME_HEIGHT - GROUND_ZONE_HEIGHT

/**
 * Posição dos pés dentro do frame 100×100 (0 = topo, 1 = base da textura).
 * Os sprites têm padding — os pés não ficam em y=1.
 */
export const SPRITE_FEET_ANCHOR_Y = 0.66

export const CAMERA_CENTER_X = GAME_WIDTH / 2
export const CAMERA_CENTER_Y = GAME_HEIGHT / 2

/** Suavização do scroll da câmera (0–1, maior = mais rápido) */
export const CAMERA_SCROLL_LERP = 0.18

/**
 * Posição horizontal do herói na tela (0 = esquerda, 1 = direita).
 * 0.62 ≈ herói à direita, avançando para a esquerda (estilo TBH).
 */
export const CAMERA_HERO_ANCHOR_RATIO = 0.62

/** Espaçamento das linhas verticais de referência no cenário */
export const SCROLL_GRID_STEP = 80

export function getCameraCenterY(): number {
  if (CAMERA_ZOOM <= 1) {
    return CAMERA_CENTER_Y
  }
  const halfVisible = GAME_HEIGHT / CAMERA_ZOOM / 2
  return GROUND_Y - halfVisible
}

export function getVisibleWorldWidth(): number {
  return GAME_WIDTH / CAMERA_ZOOM
}

export function getVisibleWorldHeight(): number {
  return GAME_HEIGHT / CAMERA_ZOOM
}

/** Barra de arraste (overlay no topo) */
export const DRAG_BAR_HEIGHT = 22
export const TASKBAR_MARGIN = 8

export const WINDOW_MIN_WIDTH = WINDOW_WIDTH
export const WINDOW_MIN_HEIGHT = WINDOW_HEIGHT
export const WINDOW_MAX_HEIGHT = Math.round(WINDOW_HEIGHT * 2)

/** Pontos de spawn no mundo rolável */
export const ENEMY_ANCHOR_X = 72
export const HERO_ANCHOR_X = WORLD_WIDTH - 72
export const HERO_SPAWN_GAP = 26
export const ENEMY_SPAWN_GAP = 40

export const HUD_TOP_OFFSET = DRAG_BAR_HEIGHT + 1
export const HUD_FONT_SIZE = 9
export const HUD_HINT_FONT_SIZE = 8
export const TOAST_FONT_SIZE = 9

/**
 * Barras de vida acima da cabeça.
 * SPRITE_HEAD_RATIO — altura da cabeça no frame (0 = topo do sprite, 1 = base).
 *   Aumente para descer a barra; diminua para subir.
 * HP_BAR_ABOVE_HEAD — pixels entre a barra e a cabeça (menor = mais colada).
 */
export const SPRITE_HEAD_RATIO = 0.38
export const HP_BAR_ABOVE_HEAD = 3
export const HP_BAR_WIDTH = 28
export const HP_BAR_HEIGHT = 3

/**
 * Hitbox do corpo no frame 100×100 (espaço da textura).
 * O Phaser já multiplica por CHARACTER_SCALE — não escale de novo no setSize.
 */
export const BODY_HIT_WIDTH = 16
export const BODY_HIT_HEIGHT = 25

/** Desenha as caixas de colisão do Arcade Physics (desligue em produção) */
export const DEBUG_PHYSICS = true

/** Console logs de combate (ataques, alvos, hits) — desligue em produção */
export const DEBUG_COMBAT = true
