import { combineRgb } from '@companion-module/base'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

export function buildPresetStructure(): CompanionPresetSection[] {
  return [
    { id: 'caspar', name: 'CasparCG', definitions: ['caspar_start', 'caspar_stop', 'caspar_restart'] },
    { id: 'routes', name: 'Routes', definitions: ['route_toggle'] },
  ]
}

export function buildPresets(): CompanionPresetDefinitions {
  const white = combineRgb(255, 255, 255)
  const black = combineRgb(0, 0, 0)
  const green = combineRgb(0, 200, 0)
  const red = combineRgb(200, 0, 0)
  const blue = combineRgb(0, 120, 255)

  return {
    caspar_start: {
      type: 'simple',
      name: 'Start CasparCG',
      style: { text: 'START', size: '18', color: white, bgcolor: black },
      steps: [{ down: [{ actionId: 'caspar_start', options: {} }], up: [] }],
      feedbacks: [{ feedbackId: 'caspar_running', options: {}, style: { bgcolor: green } }],
    },
    caspar_stop: {
      type: 'simple',
      name: 'Stop CasparCG',
      style: { text: 'STOP', size: '18', color: white, bgcolor: black },
      steps: [{ down: [{ actionId: 'caspar_stop', options: {} }], up: [] }],
      feedbacks: [{ feedbackId: 'caspar_running', options: {}, style: { bgcolor: red } }],
    },
    caspar_restart: {
      type: 'simple',
      name: 'Restart CasparCG',
      style: { text: 'RESTART', size: '14', color: white, bgcolor: black },
      steps: [{ down: [{ actionId: 'caspar_restart', options: {} }], up: [] }],
      feedbacks: [],
    },
    route_toggle: {
      type: 'simple',
      name: 'Toggle Route',
      style: { text: 'ROUTE', size: '14', color: white, bgcolor: black },
      steps: [{ down: [{ actionId: 'route_toggle', options: { routeId: '' } }], up: [] }],
      feedbacks: [{ feedbackId: 'route_enabled', options: { routeId: '' }, style: { bgcolor: blue } }],
    },
  }
}
