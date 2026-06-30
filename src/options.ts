import type {
    SomeCompanionActionInputField,
    SomeCompanionFeedbackInputField,
} from '@companion-module/base'
import type { CompanionOption } from './companion.js'

type CompanionInputField =
    | SomeCompanionActionInputField
    | SomeCompanionFeedbackInputField

export function toCompanionOptions(opts: CompanionOption[] | undefined): CompanionInputField[] {
    if (!opts?.length) return []
    return opts.map(o => {
        switch (o.type) {
            case 'dropdown':
                return {
                    type: 'dropdown' as const,
                    id: o.id, label: o.label,
                    choices: o.choices,
                    default: o.default ?? o.choices[0]?.id ?? '',
                }
            case 'textinput':
                return { type: 'textinput' as const, id: o.id, label: o.label, default: o.default ?? '' }
            case 'number':
                return { type: 'number' as const, id: o.id, label: o.label, default: o.default ?? 0, min: o.min ?? 0, max: o.max ?? 100 }
            case 'checkbox':
                return { type: 'checkbox' as const, id: o.id, label: o.label, default: o.default ?? false }
            case 'colorpicker':
                return { type: 'colorpicker' as const, id: o.id, label: o.label, default: o.default ?? 0 }
        }
    })
}
