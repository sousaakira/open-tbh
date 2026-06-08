import Phaser from 'phaser'
import { DEBUG_PHYSICS, GAME_HEIGHT, GAME_WIDTH } from '../../shared/gameLayout'
import { BootScene } from './scenes/BootScene'
import { CombatScene } from './scenes/CombatScene'

export {
  CAMERA_CENTER_X,
  CAMERA_HERO_ANCHOR_RATIO,
  CAMERA_SCROLL_LERP,
  CAMERA_ZOOM,
  CHARACTER_SCALE,
  DRAG_BAR_HEIGHT,
  CAMERA_CENTER_Y,
  ENEMY_ANCHOR_X,
  ENEMY_SPAWN_GAP,
  FRAME_SIZE,
  GAME_HEIGHT,
  GAME_WIDTH,
  getCameraCenterY,
  getVisibleWorldHeight,
  getVisibleWorldWidth,
  GROUND_Y,
  GROUND_ZONE_HEIGHT,
  HERO_ANCHOR_X,
  HERO_SPAWN_GAP,
  SCROLL_GRID_STEP,
  SPRITE_FEET_ANCHOR_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  HUD_FONT_SIZE,
  HUD_HINT_FONT_SIZE,
  HP_BAR_ABOVE_HEAD,
  HP_BAR_HEIGHT,
  HP_BAR_WIDTH,
  HUD_TOP_OFFSET,
  SPRITE_HEAD_RATIO,
  TASKBAR_MARGIN,
  TOAST_FONT_SIZE,
  BODY_HIT_HEIGHT,
  BODY_HIT_WIDTH,
  DEBUG_COMBAT,
  DEBUG_PHYSICS,
  WINDOW_HEIGHT,
  WINDOW_MAX_HEIGHT,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_WIDTH,
} from '../../shared/gameLayout'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0d1117',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: DEBUG_PHYSICS,
    },
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [BootScene, CombatScene],
  render: {
    pixelArt: true,
    antialias: false,
  },
}
