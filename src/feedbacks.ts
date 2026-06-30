import { combineRgb } from '@companion-module/base'
import type { CompanionFeedbackDefinitions } from '@companion-module/base'
import type { State } from './state.js'
import type { REPClient } from './api.js'
import { toCompanionOptions } from './options.js'

export function buildFeedbacks(api: REPClient, state: State): CompanionFeedbackDefinitions {
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
    ...buildCompanionFeedbacks(api, state),
  }
}

const noOp = () => {}

function buildCompanionFeedbacks(api: REPClient, state: State): CompanionFeedbackDefinitions {
  const out: CompanionFeedbackDefinitions = {}

  for (const def of state.companionFeedbacks.values()) {
    const fbId = `x_${def.plugin}_${def.id}`

    // Subscribe lazily on first callback invocation (Companion v2 feedbacks have `unsubscribe` but not `subscribe`).
    // Re-subscribe when the user changes the feedback's options.
    // On failed subscribe, clear the sentinel so the next callback can retry.
    const maybeSubscribe = (instanceId: string, options: Record<string, unknown>) => {
      const optKey = JSON.stringify(options)
      const alreadySubscribed = state.feedbackValues.has(instanceId)
      const optionsUnchanged = state.feedbackSubscribedOptions.get(instanceId) === optKey
      if (alreadySubscribed && optionsUnchanged) return

      // Set sentinel before the async request to prevent concurrent multi-subscribe.
      state.feedbackValues.set(instanceId, def.type === 'boolean' ? false : {})
      state.feedbackSubscribedOptions.set(instanceId, optKey)
      api.request(
        `companion/feedback/${def.plugin}/${def.id}/subscribe`,
        'ACTION',
        { instanceId, options },
      ).catch(() => {
        // Clear sentinel on failure so the next callback can retry.
        state.feedbackValues.delete(instanceId)
        state.feedbackSubscribedOptions.delete(instanceId)
      })
    }

    if (def.type === 'boolean') {
      out[fbId] = {
        type: 'boolean',
        name: `${def.plugin}: ${def.name}`,
        description: def.description,
        defaultStyle: def.defaultStyle ?? {},
        options: toCompanionOptions(def.options) as never,
        unsubscribe: (fb) => {
          state.feedbackValues.delete(fb.id)
          state.feedbackSubscribedOptions.delete(fb.id)
          api.request(
            `companion/feedback/${def.plugin}/${def.id}/unsubscribe`,
            'ACTION',
            { instanceId: fb.id },
          ).catch(noOp)
        },
        callback: (fb) => {
          maybeSubscribe(fb.id, fb.options as Record<string, unknown>)
          return (state.feedbackValues.get(fb.id) as boolean | undefined) ?? false
        },
      }
    } else {
      out[fbId] = {
        type: 'advanced',
        name: `${def.plugin}: ${def.name}`,
        description: def.description,
        options: toCompanionOptions(def.options) as never,
        unsubscribe: (fb) => {
          state.feedbackValues.delete(fb.id)
          state.feedbackSubscribedOptions.delete(fb.id)
          api.request(
            `companion/feedback/${def.plugin}/${def.id}/unsubscribe`,
            'ACTION',
            { instanceId: fb.id },
          ).catch(noOp)
        },
        callback: (fb) => {
          maybeSubscribe(fb.id, fb.options as Record<string, unknown>)
          const v = state.feedbackValues.get(fb.id)
          if (!v || typeof v === 'boolean') return {}
          const { png64, bgcolor, color, text, size } = v
          return {
            ...(text !== undefined ? { text } : {}),
            ...(size !== undefined ? { size } : {}),
            ...(color !== undefined ? { color } : {}),
            ...(bgcolor !== undefined ? { bgcolor } : {}),
            ...(png64 !== undefined ? { png64 } : {}),
          }
        },
      }
    }
  }
  return out
}
