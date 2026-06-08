import type { CompanionActionDefinitions } from '@companion-module/base'
import type { REPClient } from './api.js'
import type { State } from './state.js'

export function buildActions(api: REPClient, state: State): CompanionActionDefinitions {
  const routeChoices = [...state.routes.values()].map(r => ({ id: r.id, label: r.name }))

  const rundownItemChoices = [...state.rundowns.values()]
    .filter(r => r.type === 'quick')
    .flatMap(r => r.items.map(i => ({ id: `${r.id}:${i.id}`, label: `${r.name}: ${i.title}` })))

  const pluginChoices = state.plugins.map(p => ({ id: p.name, label: p.name }))

  const actionTypeChoices = state.actionTypes.map(t => ({ id: t, label: t }))

  const noOp = () => {}

  return {
    caspar_start: {
      name: 'CasparCG: Start',
      options: [],
      callback: () => { api.request('caspar/start', 'ACTION').catch(noOp) },
    },
    caspar_stop: {
      name: 'CasparCG: Stop',
      options: [],
      callback: () => { api.request('caspar/stop', 'ACTION').catch(noOp) },
    },
    caspar_restart: {
      name: 'CasparCG: Restart',
      options: [],
      callback: () => { api.request('caspar/restart', 'ACTION').catch(noOp) },
    },
    route_enable: {
      name: 'Route: Enable',
      options: [
        { type: 'dropdown', id: 'routeId', label: 'Route', choices: routeChoices, default: routeChoices[0]?.id ?? '' },
      ],
      callback: (action) => {
        const id = action.options['routeId'] as string
        api.request(`routes/${id}/enable`, 'ACTION').catch(noOp)
      },
    },
    route_disable: {
      name: 'Route: Disable',
      options: [
        { type: 'dropdown', id: 'routeId', label: 'Route', choices: routeChoices, default: routeChoices[0]?.id ?? '' },
      ],
      callback: (action) => {
        const id = action.options['routeId'] as string
        api.request(`routes/${id}/disable`, 'ACTION').catch(noOp)
      },
    },
    route_toggle: {
      name: 'Route: Toggle',
      options: [
        { type: 'dropdown', id: 'routeId', label: 'Route', choices: routeChoices, default: routeChoices[0]?.id ?? '' },
      ],
      callback: (action) => {
        const id = action.options['routeId'] as string
        const route = state.routes.get(id)
        if (!route) return
        const endpoint = route.enabled ? `routes/${id}/disable` : `routes/${id}/enable`
        api.request(endpoint, 'ACTION').catch(noOp)
      },
    },
    rundown_execute: {
      name: 'Quick Action: Execute',
      options: [
        {
          type: 'dropdown',
          id: 'item',
          label: 'Item',
          choices: rundownItemChoices,
          default: rundownItemChoices[0]?.id ?? '',
        },
      ],
      callback: (action) => {
        const [rundownId, entryId] = (action.options['item'] as string).split(':')
        const rd = state.rundowns.get(rundownId)
        const entry = rd?.items.find(i => i.id === entryId)
        if (!entry) return
        api.request('rundown/execute', 'ACTION', { entry }).catch(noOp)
      },
    },
    plugin_action: {
      name: 'Plugin: Run Action Type',
      options: [
        {
          type: 'dropdown',
          id: 'actionType',
          label: 'Action Type',
          choices: actionTypeChoices,
          default: actionTypeChoices[0]?.id ?? '',
        },
      ],
      callback: (action) => {
        const type = action.options['actionType'] as string
        const entry = { id: '', title: type, type, data: {}, metadata: { autoNext: false } }
        api.request('rundown/execute', 'ACTION', { entry }).catch(noOp)
      },
    },
    plugin_toggle: {
      name: 'Plugin: Toggle Enabled',
      options: [
        { type: 'dropdown', id: 'pluginName', label: 'Plugin', choices: pluginChoices, default: pluginChoices[0]?.id ?? '' },
      ],
      callback: (action) => {
        const name = action.options['pluginName'] as string
        const plugin = state.plugins.find(p => p.name === name)
        if (!plugin) return
        api.request(`plugins/${name}/status`, 'ACTION', { enabled: !plugin.enabled }).catch(noOp)
      },
    },
  }
}
