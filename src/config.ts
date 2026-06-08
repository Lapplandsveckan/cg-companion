import type { SomeCompanionConfigField } from '@companion-module/base'

export interface Config {
  host: string
  port: number
  token: string
  useDiscovery: boolean
}

export const configFields: SomeCompanionConfigField[] = [
  {
    type: 'checkbox',
    id: 'useDiscovery',
    label: 'Auto-discover via UDP (port 5354)',
    default: false,
    width: 12,
  },
  {
    type: 'textinput',
    id: 'host',
    label: 'Host',
    default: '127.0.0.1',
    width: 8,
    isVisible: (config) => !(config as unknown as Config).useDiscovery,
  },
  {
    type: 'number',
    id: 'port',
    label: 'Port',
    default: 5353,
    min: 1,
    max: 65535,
    width: 4,
    isVisible: (config) => !(config as unknown as Config).useDiscovery,
  },
  {
    type: 'textinput',
    id: 'token',
    label: 'API Token (optional)',
    default: '',
    width: 12,
  },
]
