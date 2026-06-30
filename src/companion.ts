// Local mirror of serializable companion types (matches cg-manager-plugin src/types/companion.ts).
// cg-companion doesn't depend on @lappis/cg-manager, so we redeclare just what we need.

export type CompanionOption =
    | { type: 'dropdown'; id: string; label: string; choices: { id: string; label: string }[]; default?: string }
    | { type: 'textinput'; id: string; label: string; default?: string }
    | { type: 'number'; id: string; label: string; default?: number; min?: number; max?: number }
    | { type: 'checkbox'; id: string; label: string; default?: boolean }
    | { type: 'colorpicker'; id: string; label: string; default?: number }

export interface CompanionStyle {
    text?: string
    size?: number | 'auto'
    color?: number
    bgcolor?: number
    png64?: string
}

export interface ActionDef {
    plugin: string
    id: string
    name: string
    description?: string
    options?: CompanionOption[]
}

export interface FeedbackDef {
    plugin: string
    id: string
    name: string
    description?: string
    type: 'boolean' | 'advanced'
    options?: CompanionOption[]
    defaultStyle?: CompanionStyle
}
