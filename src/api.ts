import WebSocket from 'ws'
import { randomUUID } from 'node:crypto'
import { InstanceStatus } from '@companion-module/base'
import type { State } from './state.js'

type RepMethod = 'GET' | 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTION'
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const HTTP_VERB: Record<RepMethod, string> = {
  GET: 'GET',
  CREATE: 'PUT',
  UPDATE: 'PATCH',
  DELETE: 'DELETE',
  ACTION: 'POST',
}

interface WsFrame {
  target: string
  method: string
  data: unknown
  req: string | false | null
}

interface WsReply {
  status: number
  data?: unknown
  error?: string
}

export class REPClient {
  private ws: WebSocket | null = null
  private pending: Map<string, { resolve: (d: unknown) => void; reject: (e: Error) => void }> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1_000
  private host = ''
  private port = 5353
  private token = ''
  private destroyed = true

  constructor(
    private state: State,
    private onStatus: (status: InstanceStatus, msg?: string) => void,
    private onReady: () => void,
    private log: (level: LogLevel, msg: string) => void,
  ) {}

  connect(host: string, port: number, token: string) {
    this.host = host
    this.port = port
    this.token = token
    this.destroyed = false
    this.reconnectDelay = 1_000
    this.clearWS()
    this.openWS()
  }

  disconnect() {
    this.destroyed = true
    this.clearWS()
    this.state.connected = false
    for (const { reject } of this.pending.values()) reject(new Error('Disconnected'))
    this.pending.clear()
  }

  async request(target: string, method: RepMethod, data?: unknown): Promise<unknown> {
    const url = `http://${this.host}:${this.port}/api/${target}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    const res = await fetch(url, {
      method: HTTP_VERB[method],
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    })

    const body = await res.json() as { data?: unknown; error?: string }
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
    return body.data
  }

  private clearWS() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    if (this.ws) { this.ws.removeAllListeners(); this.ws.close(); this.ws = null }
  }

  private openWS() {
    this.onStatus(InstanceStatus.Connecting)

    const wsOpts: WebSocket.ClientOptions = {}
    if (this.token) wsOpts.headers = { Authorization: `Bearer ${this.token}` }

    const ws = new WebSocket(`ws://${this.host}:${this.port}`, wsOpts)
    this.ws = ws

    ws.on('open', () => {
      this.reconnectDelay = 1_000
      this.state.connected = true
      this.primeState()
        .then(() => {
          this.onStatus(InstanceStatus.Ok)
          this.onReady()
        })
        .catch(e => {
          this.log('error', `Failed to prime state: ${e}`)
          this.onStatus(InstanceStatus.UnknownError, 'State prime failed')
        })
    })

    ws.on('message', (raw) => {
      try {
        const frame = JSON.parse(raw.toString()) as WsFrame
        if (frame.req && frame.method === 'REPLY') {
          const p = this.pending.get(frame.req as string)
          if (!p) return
          this.pending.delete(frame.req as string)
          const reply = frame.data as WsReply
          if (reply.status >= 400) p.reject(new Error(reply.error ?? `Status ${reply.status}`))
          else p.resolve(reply.data)
        } else if (!frame.req) {
          this.state.handleBroadcast(frame.target, frame.method, frame.data)
        }
      } catch {}
    })

    ws.on('close', () => {
      if (this.destroyed) return
      this.state.connected = false
      this.state.emit()
      this.onStatus(InstanceStatus.ConnectionFailure, 'Disconnected')
      this.scheduleReconnect()
    })

    ws.on('error', (err) => {
      this.log('warn', `WebSocket error: ${err.message}`)
    })
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      if (this.destroyed) return
      this.openWS()
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000)
  }

  private async primeState() {
    const [caspar, routes, rundowns, plugins, actions, types] = await Promise.all([
      this.request('caspar/status', 'GET'),
      this.request('routes', 'GET'),
      this.request('rundown', 'GET'),
      this.request('plugins', 'GET'),
      this.request('rundown/actions', 'GET'),
      this.request('rundown/types', 'GET'),
    ])

    this.state.caspar = caspar as State['caspar']
    this.state.routes = new Map(
      (routes as { id: string }[]).map(r => [r.id, r as never])
    )
    this.state.rundowns = new Map(
      (rundowns as { id: string }[]).map(r => [r.id, r as never])
    )
    this.state.plugins = plugins as State['plugins']
    this.state.actions = actions as State['actions']
    this.state.actionTypes = types as string[]
    this.state.emit()
  }

  wsRequest(target: string, method: string, data?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }
      const req = randomUUID()
      this.pending.set(req, { resolve, reject })
      this.ws.send(JSON.stringify({ target, method, data, req }), err => {
        if (err) { this.pending.delete(req); reject(err) }
      })
    })
  }
}
