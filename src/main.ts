import Phaser from 'phaser'
import {
  CAMERA_ZOOM,
  DRAG_BAR_HEIGHT,
  GAME_HEIGHT,
  GAME_WIDTH,
  gameConfig,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
} from './game/config'
import { setupWindowDrag } from './setupWindowDrag'

const root = document.documentElement
root.style.setProperty('--window-width', `${WINDOW_WIDTH}px`)
root.style.setProperty('--window-height', `${WINDOW_HEIGHT}px`)
root.style.setProperty('--drag-bar-height', `${DRAG_BAR_HEIGHT}px`)

setupWindowDrag()

const game = new Phaser.Game(gameConfig)

function syncCamera(): void {
  const scene = game.scene.getScene('CombatScene')
  if (scene?.cameras?.main) {
    scene.cameras.main.setZoom(CAMERA_ZOOM)
    scene.cameras.main.setScroll(0, 0)
  }
}

window.electronAPI?.onResetUiScale(() => {
  game.scale.resize(GAME_WIDTH, GAME_HEIGHT)
  game.scale.refresh()
  syncCamera()
})

window.electronAPI?.onWindowResize?.(({ width, height }) => {
  root.style.setProperty('--window-width', `${width}px`)
  root.style.setProperty('--window-height', `${height}px`)
  game.scale.resize(width, height)
  syncCamera()
})

export default game
