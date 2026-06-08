import dgram from 'node:dgram'

export interface DiscoveredManager {
  id: string
  name: string
  host: string
  port: number
  version: string
  lastSeen: number
}

interface Beacon {
  type: string
  id: string
  name: string
  port: number
  version: string
  t: number
}

export class Discovery {
  private socket: dgram.Socket | null = null
  private managers: Map<string, DiscoveredManager> = new Map()
  private listeners: ((managers: DiscoveredManager[]) => void)[] = []

  start() {
    if (this.socket) return
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })
    this.socket = sock

    sock.on('message', (msg, rinfo) => {
      try {
        const payload = JSON.parse(msg.toString()) as Beacon
        if (payload.type !== 'cg-manager') return
        this.managers.set(payload.id, {
          id: payload.id,
          name: payload.name,
          host: rinfo.address,
          port: payload.port,
          version: payload.version,
          lastSeen: Date.now(),
        })
        this.prune()
        this.notify()
      } catch {}
    })

    sock.on('error', () => {})
    sock.bind(5354)
  }

  stop() {
    try { this.socket?.close() } catch {}
    this.socket = null
    this.listeners = []
  }

  onUpdate(cb: (managers: DiscoveredManager[]) => void) {
    this.listeners.push(cb)
  }

  getManagers() {
    return [...this.managers.values()]
  }

  private prune() {
    const cutoff = Date.now() - 10_000
    for (const [id, m] of this.managers) {
      if (m.lastSeen < cutoff) this.managers.delete(id)
    }
  }

  private notify() {
    const list = [...this.managers.values()]
    this.listeners.forEach(cb => cb(list))
  }
}
