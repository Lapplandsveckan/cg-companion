import type { ActionDef, FeedbackDef, CompanionStyle } from './companion.js'

export type { ActionDef, FeedbackDef, CompanionStyle }

export interface CasparStatus {
  running: boolean
  supported: boolean
  lastError: string | null
}

export interface VideoRoute {
  id: string
  name: string
  enabled: boolean
  source: unknown
  destination: unknown
}

export interface Rundown {
  id: string
  name: string
  items: RundownItem[]
  type?: 'rundown' | 'quick'
}

export interface RundownItem {
  id: string
  title: string
  type: string
  data: unknown
  metadata: { autoNext: boolean }
}

export interface Plugin {
  name: string
  enabled: boolean
}

export class State {
  caspar: CasparStatus = { running: false, supported: false, lastError: null }
  routes: Map<string, VideoRoute> = new Map()
  rundowns: Map<string, Rundown> = new Map()
  plugins: Plugin[] = []
  runningConfig: unknown = null
  connected = false

  /** key = `${plugin}:${id}` */
  companionActions: Map<string, ActionDef> = new Map()
  /** key = `${plugin}:${id}` */
  companionFeedbacks: Map<string, FeedbackDef> = new Map()
  /** key = instanceId (as assigned by Companion when a feedback is placed) */
  feedbackValues: Map<string, boolean | CompanionStyle> = new Map()
  /** key = instanceId → JSON-stringified options last sent to the server; used to detect option changes */
  feedbackSubscribedOptions: Map<string, string> = new Map()

  private listeners: (() => void)[] = []
  private feedbackListeners: (() => void)[] = []

  onChange(cb: () => void) {
    this.listeners.push(cb)
  }

  /** Register a callback that fires only when feedback values update (no full sync needed). */
  onFeedbackChange(cb: () => void) {
    this.feedbackListeners.push(cb)
  }

  emit(type: 'feedback' | 'change' = 'change') {
    if (type === 'feedback') {
      this.feedbackListeners.forEach(cb => cb())
    } else {
      this.listeners.forEach(cb => cb())
    }
  }

  /** Clear all subscription state (call on disconnect/reconnect so placed feedbacks re-subscribe). */
  resetFeedbackState() {
    this.feedbackValues.clear()
    this.feedbackSubscribedOptions.clear()
  }

  handleBroadcast(target: string, method: string, data: unknown) {
    switch (target) {
      case 'caspar/status':
        this.caspar = data as CasparStatus
        break

      case 'caspar/running-config':
        this.runningConfig = data
        break

      case 'routes':
        if (method === 'DELETE') {
          this.routes.delete(data as string)
        } else {
          const route = data as VideoRoute
          this.routes.set(route.id, route)
        }
        break

      case 'rundown':
        if (method === 'DELETE') {
          this.rundowns.delete(data as string)
        } else if (method === 'CREATE') {
          const r = data as Rundown
          if (r.type === 'quick') this.rundowns.set(r.id, r)
        } else if (method === 'UPDATE') {
          const { id, name } = data as { id: string; name: string }
          const existing = this.rundowns.get(id)
          if (existing) existing.name = name
        }
        break

      case 'rundown/entry': {
        if (method === 'CREATE') {
          const { id, entry, index } = data as { id: string; entry: RundownItem; index?: number }
          const rd = this.rundowns.get(id)
          if (rd) {
            if (index !== undefined) rd.items.splice(index, 0, entry)
            else rd.items.push(entry)
          }
        } else if (method === 'UPDATE') {
          const { id, entry } = data as { id: string; entry: RundownItem }
          const rd = this.rundowns.get(id)
          if (rd) {
            const i = rd.items.findIndex(e => e.id === entry.id)
            if (i >= 0) rd.items[i] = entry
          }
        } else if (method === 'DELETE') {
          const { id, entry } = data as { id: string; entry: string }
          const rd = this.rundowns.get(id)
          if (rd) rd.items = rd.items.filter(e => e.id !== entry)
        }
        break
      }

      case 'rundown/order': {
        const { id, order } = data as { id: string; order: string[] }
        const rd = this.rundowns.get(id)
        if (rd) {
          const byId = new Map(rd.items.map(e => [e.id, e]))
          rd.items = order.map(eid => byId.get(eid)!).filter(Boolean)
        }
        break
      }

      case 'companion/definitions': {
        const { actions, feedbacks } = data as { actions: ActionDef[]; feedbacks: FeedbackDef[] }
        this.companionActions = new Map(actions.map(a => [`${a.plugin}:${a.id}`, a]))
        this.companionFeedbacks = new Map(feedbacks.map(f => [`${f.plugin}:${f.id}`, f]))
        break
      }

      case 'companion/feedback': {
        const { instanceId, value } = data as { instanceId: string; value: boolean | CompanionStyle }
        this.feedbackValues.set(instanceId, value)
        this.emit('feedback')
        return  // emit('feedback') instead of emit() — avoids rebuilding all definitions
      }
    }
    this.emit()
  }
}
