import type {Document} from "@zavx0z/dom"
import {uiIcons} from "@ui/components/icons"
import type {EnumControlOption, EnumControlProps} from "@ui/components/controls/enum-control"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const baseOptions = Object.freeze([
  Object.freeze({key: "input", value: "input", label: "Input", description: "Read from the input surface"}),
  Object.freeze({key: "output", value: "output", label: "Output", description: "Write to the output surface"}),
  Object.freeze({key: "viewport", value: "viewport", label: "Viewport", description: "Show in the viewport"})
]) satisfies readonly EnumControlOption[]

const iconOptions = Object.freeze([
  Object.freeze({...baseOptions[0]!, iconSrc: uiIcons.log}),
  Object.freeze({...baseOptions[1]!, iconSrc: uiIcons.run}),
  Object.freeze({...baseOptions[2]!, iconSrc: uiIcons.visibilityOn})
]) satisfies readonly EnumControlOption[]

const mixedIconOptions = Object.freeze([
  iconOptions[0]!,
  baseOptions[1]!,
  iconOptions[2]!
]) satisfies readonly EnumControlOption[]

const story = async (
  document: Document,
  route: string,
  partial: Omit<EnumControlProps, "value" | "title"> & Readonly<{value?: string}>
) => {
  const {createCompiledEnumControlProductionStory} = await import("../compiled/compiled-enum-control-production-story.tsx")
  const props: EnumControlProps = {
    value: partial.value ?? "output",
    title: route,
    ...partial
  }
  return withStoryProps(createCompiledEnumControlProductionStory(document, props), props)
}

export const story_presentation_cycle = defineOwnerStory("components/controls/enum-control/presentation/cycle", document =>
  story(document, "components/controls/enum-control/presentation/cycle", {options: baseOptions, presentation: "cycle"})
)

export const story_presentation_expanded = defineOwnerStory("components/controls/enum-control/presentation/expanded", document =>
  story(document, "components/controls/enum-control/presentation/expanded", {options: baseOptions, presentation: "expanded"})
)

export const story_value_selected_description = defineOwnerStory("components/controls/enum-control/value/selected-description", document =>
  story(document, "components/controls/enum-control/value/selected-description", {options: baseOptions, popupLabel: "Presentation target"})
)

export const story_value_header_icons = defineOwnerStory("components/controls/enum-control/value/header-icons", document =>
  story(document, "components/controls/enum-control/value/header-icons", {options: iconOptions, presentation: "cycle", popupLabel: "Icon options"})
)

export const story_value_mixed_icons = defineOwnerStory("components/controls/enum-control/value/mixed-icons", document =>
  story(document, "components/controls/enum-control/value/mixed-icons", {options: mixedIconOptions, presentation: "cycle", popupLabel: "Mixed icon options"})
)

export const story_value_invalid_legacy = defineOwnerStory("components/controls/enum-control/value/invalid-legacy", document =>
  story(document, "components/controls/enum-control/value/invalid-legacy", {value: "legacy", options: baseOptions})
)

export const story_exception_no_items = defineOwnerStory("components/controls/enum-control/exception/no-items", document =>
  story(document, "components/controls/enum-control/exception/no-items", {value: "", options: []})
)

export const story_exception_menu_undefined = defineOwnerStory("components/controls/enum-control/exception/menu-undefined", document =>
  story(document, "components/controls/enum-control/exception/menu-undefined", {value: "", state: "undefined"})
)

export const story_exception_menu_error = defineOwnerStory("components/controls/enum-control/exception/menu-error", document =>
  story(document, "components/controls/enum-control/exception/menu-error", {value: "output", options: baseOptions, state: "error"})
)

export const story_state_disabled = defineOwnerStory("components/controls/enum-control/state/disabled", document =>
  story(document, "components/controls/enum-control/state/disabled", {options: baseOptions, disabled: true})
)

export const story_state_readonly = defineOwnerStory("components/controls/enum-control/state/readonly", document =>
  story(document, "components/controls/enum-control/state/readonly", {options: baseOptions, readOnly: true})
)
