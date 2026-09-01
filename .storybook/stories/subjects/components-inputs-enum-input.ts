import type {Document} from "@zavx0z/dom"
import {uiIcons} from "@ui/components/icons"
import type {EnumInputOption, EnumInputProps} from "@ui/components/enum-input"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const baseOptions = Object.freeze([
  Object.freeze({key: "input", value: "input", label: "Input", description: "Read from the input surface"}),
  Object.freeze({key: "output", value: "output", label: "Output", description: "Write to the output surface"}),
  Object.freeze({key: "viewport", value: "viewport", label: "Viewport", description: "Show in the viewport"})
]) satisfies readonly EnumInputOption[]

const iconOptions = Object.freeze([
  Object.freeze({...baseOptions[0]!, iconSrc: uiIcons.log}),
  Object.freeze({...baseOptions[1]!, iconSrc: uiIcons.run}),
  Object.freeze({...baseOptions[2]!, iconSrc: uiIcons.visibilityOn})
]) satisfies readonly EnumInputOption[]

const mixedIconOptions = Object.freeze([
  iconOptions[0]!,
  baseOptions[1]!,
  iconOptions[2]!
]) satisfies readonly EnumInputOption[]

const story = async (
  document: Document,
  route: string,
  partial: Omit<EnumInputProps, "value" | "title"> & Readonly<{value?: string}>
) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props: EnumInputProps = {
    value: partial.value ?? "output",
    title: route,
    ...partial
  }
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
}

export const story_presentation_cycle = defineOwnerStory("components/inputs/enum-input/presentation/cycle", document =>
  story(document, "components/inputs/enum-input/presentation/cycle", {options: baseOptions, presentation: "cycle"})
)

export const story_presentation_expanded = defineOwnerStory("components/inputs/enum-input/presentation/expanded", document =>
  story(document, "components/inputs/enum-input/presentation/expanded", {options: baseOptions, presentation: "expanded"})
)

export const story_value_selected_description = defineOwnerStory("components/inputs/enum-input/value/selected-description", document =>
  story(document, "components/inputs/enum-input/value/selected-description", {options: baseOptions, popupLabel: "Presentation target"})
)

export const story_value_header_icons = defineOwnerStory("components/inputs/enum-input/value/header-icons", document =>
  story(document, "components/inputs/enum-input/value/header-icons", {options: iconOptions, presentation: "cycle", popupLabel: "Icon options"})
)

export const story_value_mixed_icons = defineOwnerStory("components/inputs/enum-input/value/mixed-icons", document =>
  story(document, "components/inputs/enum-input/value/mixed-icons", {options: mixedIconOptions, presentation: "cycle", popupLabel: "Mixed icon options"})
)

export const story_value_invalid_legacy = defineOwnerStory("components/inputs/enum-input/value/invalid-legacy", document =>
  story(document, "components/inputs/enum-input/value/invalid-legacy", {value: "legacy", options: baseOptions})
)

export const story_exception_no_items = defineOwnerStory("components/inputs/enum-input/exception/no-items", document =>
  story(document, "components/inputs/enum-input/exception/no-items", {value: "", options: []})
)

export const story_exception_menu_undefined = defineOwnerStory("components/inputs/enum-input/exception/menu-undefined", document =>
  story(document, "components/inputs/enum-input/exception/menu-undefined", {value: "", state: "undefined"})
)

export const story_exception_menu_error = defineOwnerStory("components/inputs/enum-input/exception/menu-error", document =>
  story(document, "components/inputs/enum-input/exception/menu-error", {value: "output", options: baseOptions, state: "error"})
)

export const story_state_disabled = defineOwnerStory("components/inputs/enum-input/state/disabled", document =>
  story(document, "components/inputs/enum-input/state/disabled", {options: baseOptions, disabled: true})
)

export const story_state_readonly = defineOwnerStory("components/inputs/enum-input/state/readonly", document =>
  story(document, "components/inputs/enum-input/state/readonly", {options: baseOptions, readOnly: true})
)
