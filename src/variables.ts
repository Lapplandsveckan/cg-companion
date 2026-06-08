import type { CompanionVariableDefinitions } from '@companion-module/base'
import type { State } from './state.js'

export function buildVariableDefinitions(state?: State): CompanionVariableDefinitions {
  const defs: CompanionVariableDefinitions = {
    caspar_status: { name: 'CasparCG Status' },
    caspar_last_error: { name: 'CasparCG Last Error' },
    rundown_count: { name: 'Rundown Count' },
    connected: { name: 'Connected' },
  }
  if (state) {
    for (const route of state.routes.values()) {
      defs[`route_${route.id}_enabled`] = { name: `Route ${route.name} Enabled` }
    }
  }
  return defs
}

export function buildVariableValues(state: State): Record<string, string | number | boolean> {
  const vals: Record<string, string | number | boolean> = {
    caspar_status: state.caspar.running ? 'running' : 'stopped',
    caspar_last_error: state.caspar.lastError ?? '',
    rundown_count: state.rundowns.size,
    connected: state.connected ? 'true' : 'false',
  }
  for (const route of state.routes.values()) {
    vals[`route_${route.id}_enabled`] = route.enabled ? 'true' : 'false'
  }
  return vals
}
