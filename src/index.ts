import { InstanceBase, InstanceStatus } from '@companion-module/base'
import type { SomeCompanionConfigField } from '@companion-module/base'
import { type Config, configFields } from './config.js'
import { State } from './state.js'
import { REPClient } from './api.js'
import { Discovery } from './discovery.js'
import { buildActions } from './actions.js'
import { buildFeedbacks } from './feedbacks.js'
import { buildVariableDefinitions, buildVariableValues } from './variables.js'
import { buildPresets, buildPresetStructure } from './presets.js'

class CGManagerInstance extends InstanceBase {
  private api!: REPClient
  private state!: State
  private discovery!: Discovery

  async init(config: Record<string, unknown>) {
    this.state = new State()
    this.discovery = new Discovery()
    this.api = new REPClient(
      this.state,
      (s, m) => this.updateStatus(s, m),
      () => this.onReady(),
      (l, m) => this.log(l as never, m),
    )

    this.setPresetDefinitions(buildPresetStructure(), buildPresets())
    this.registerDefinitions()

    this.state.onChange(() => this.sync())
    this.state.onFeedbackChange(() => this.checkAllFeedbacks())

    this.startConnection(config as unknown as Config)
  }

  async configUpdated(config: Record<string, unknown>) {
    this.api.disconnect()
    this.discovery.stop()
    this.startConnection(config as unknown as Config)
  }

  async destroy() {
    this.api?.disconnect()
    this.discovery?.stop()
  }

  getConfigFields(): SomeCompanionConfigField[] {
    return configFields
  }

  private registerDefinitions() {
    this.setActionDefinitions(buildActions(this.api, this.state))
    this.setFeedbackDefinitions(buildFeedbacks(this.api, this.state))
    this.setVariableDefinitions(buildVariableDefinitions(this.state))
  }

  private sync() {
    this.registerDefinitions()
    this.checkAllFeedbacks()
    this.setVariableValues(buildVariableValues(this.state))
  }

  private onReady() {
    this.sync()
    this.updateStatus(InstanceStatus.Ok)
  }

  private startConnection(config: Config) {
    if (config.useDiscovery) {
      this.discovery.onUpdate((managers) => {
        if (managers.length === 0) return
        const { host, port } = managers[0]
        this.api.connect(host, port, config.token)
      })
      this.discovery.start()
    } else {
      this.api.connect(config.host, config.port, config.token)
    }
  }
}

export default CGManagerInstance
