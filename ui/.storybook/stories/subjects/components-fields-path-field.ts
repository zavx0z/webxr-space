import type {Document} from "@zavx0z/dom"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const story = async (document: Document, partial: Readonly<Record<string, unknown>>) => {
  const {createCompiledPathFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Path", value: "/project/output.exr", placeholder: "Choose file", ...partial}
  return withStoryProps(createCompiledPathFieldProductionStory(document, props), props)
}
export const story_value_path = defineOwnerStory("components/fields/path-field/value/path", document => story(document, {}))
export const story_value_empty = defineOwnerStory("components/fields/path-field/value/empty", document => story(document, {value: ""}))
export const story_state_disabled = defineOwnerStory("components/fields/path-field/state/disabled", document => story(document, {disabled: true}))
export const story_state_readonly = defineOwnerStory("components/fields/path-field/state/readonly", document => story(document, {readOnly: true}))
export const story_density_compact = defineOwnerStory("components/fields/path-field/density/compact", document => story(document, {density: "compact"}))
