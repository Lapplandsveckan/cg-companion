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

  private listeners: (() => void)[] = []

  onChange(cb: () => void) {
    this.listeners.push(cb)
  }

  emit() {
    this.listeners.forEach(cb => cb())
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
    }
    this.emit()
  }
}
