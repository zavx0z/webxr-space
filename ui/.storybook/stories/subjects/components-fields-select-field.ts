import type {Document} from "@zavx0z/dom"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const options = Object.freeze([
  Object.freeze({key: "input", value: "input", label: "Input", description: "Read from input"}),
  Object.freeze({key: "output", value: "output", label: "Output", description: "Write to output"}),
  Object.freeze({key: "viewport", value: "viewport", label: "Viewport", description: "Show in viewport"}),
])
const story = async (document: Document, route: string, partial: Readonly<Record<string, unknown>>) => {
  const {createCompiledSelectFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Mode", value: "output", options, title: route, ...partial}
  return withStoryProps(createCompiledSelectFieldProductionStory(document, props), props)
}

export const story_basic_default = defineOwnerStory("components/fields/select-field/basic/default", document => story(document, "components/fields/select-field/basic/default", {}))
export const story_value_selected_description = defineOwnerStory("components/fields/select-field/value/selected-description", document => story(document, "components/fields/select-field/value/selected-description", {}))
export const story_value_invalid_legacy = defineOwnerStory("components/fields/select-field/value/invalid-legacy", document => story(document, "components/fields/select-field/value/invalid-legacy", {value: "legacy"}))
export const story_exception_no_items = defineOwnerStory("components/fields/select-field/exception/no-items", document => story(document, "components/fields/select-field/exception/no-items", {value: "", options: []}))
export const story_exception_menu_undefined = defineOwnerStory("components/fields/select-field/exception/menu-undefined", document => story(document, "components/fields/select-field/exception/menu-undefined", {value: "", options: undefined, state: "undefined"}))
export const story_exception_menu_error = defineOwnerStory("components/fields/select-field/exception/menu-error", document => story(document, "components/fields/select-field/exception/menu-error", {state: "error"}))
export const story_state_disabled = defineOwnerStory("components/fields/select-field/state/disabled", document => story(document, "components/fields/select-field/state/disabled", {disabled: true}))
export const story_state_readonly = defineOwnerStory("components/fields/select-field/state/readonly", document => story(document, "components/fields/select-field/state/readonly", {readOnly: true}))
