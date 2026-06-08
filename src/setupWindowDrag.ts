import { DRAG_BAR_HEIGHT } from './game/config'

export function setupWindowDrag(): void {
  const api = window.electronAPI
  if (!api?.windowDragStart) return

  const dragBar = document.getElementById('drag-bar')
  if (!dragBar) return

  let dragging = false

  const onMouseMove = (event: MouseEvent) => {
    if (!dragging) return
    api.windowDragMove(event.screenX, event.screenY)
  }

  const onMouseUp = () => {
    if (!dragging) return
    dragging = false
    api.windowDragEnd()
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  dragBar.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return

    dragging = true
    api.windowDragStart(event.screenX, event.screenY)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    event.preventDefault()
  })

  // Permite arrastar pela faixa superior inteira (HUD), exceto cliques no canvas interativo
  document.addEventListener(
    'mousedown',
    (event) => {
      if (event.button !== 0) return
      if (event.target instanceof HTMLElement && event.target.closest('#drag-bar')) return
      if (event.clientY > DRAG_BAR_HEIGHT) return

      dragging = true
      api.windowDragStart(event.screenX, event.screenY)
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      event.preventDefault()
    },
    true,
  )
}
