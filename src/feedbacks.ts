import { combineRgb } from '@companion-module/base'
import type { CompanionFeedbackDefinitions } from '@companion-module/base'
import type { State } from './state.js'

export function buildFeedbacks(state: State): CompanionFeedbackDefinitions {
  const routeChoices = [...state.routes.values()].map(r => ({ id: r.id, label: r.name }))
  const pluginChoices = state.plugins.map(p => ({ id: p.name, label: p.name }))

  return {
    caspar_running: {
      type: 'boolean',
      name: 'CasparCG: Running',
      description: 'Active when CasparCG is running',
      defaultStyle: { bgcolor: combineRgb(0, 200, 0), color: combineRgb(255, 255, 255) },
      options: [],
      callback: () => state.caspar.running,
    },
    route_enabled: {
      type: 'boolean',
      name: 'Route: Enabled',
      description: 'Active when the selected video route is enabled',
      defaultStyle: { bgcolor: combineRgb(0, 120, 255), color: combineRgb(255, 255, 255) },
      options: [
        {
          type: 'dropdown',
          id: 'routeId',
          label: 'Route',
          choices: routeChoices,
          default: routeChoices[0]?.id ?? '',
        },
      ],
      callback: (feedback) => {
        const route = state.routes.get(feedback.options['routeId'] as string)
        return route?.enabled ?? false
      },
    },
    plugin_enabled: {
      type: 'boolean',
      name: 'Plugin: Enabled',
      description: 'Active when the selected plugin is enabled',
      defaultStyle: { bgcolor: combineRgb(150, 100, 0), color: combineRgb(255, 255, 255) },
      options: [
        {
          type: 'dropdown',
          id: 'pluginName',
          label: 'Plugin',
          choices: pluginChoices,
          default: pluginChoices[0]?.id ?? '',
        },
      ],
      callback: (feedback) => {
        const plugin = state.plugins.find(p => p.name === feedback.options['pluginName'])
        return plugin?.enabled ?? false
      },
    },
  }
}
