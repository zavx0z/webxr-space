import type {Document} from "@zavx0z/dom"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const story = async (document: Document, route: string, partial: Readonly<Record<string, unknown>>) => {
  const {createCompiledPathFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Path", value: "/project/output.exr", placeholder: "Choose file", title: route, ...partial}
  return withStoryProps(createCompiledPathFieldProductionStory(document, props), props)
}
export const story_value_path = defineOwnerStory("components/fields/path-field/value/path", document => story(document, "components/fields/path-field/value/path", {}))
export const story_value_empty = defineOwnerStory("components/fields/path-field/value/empty", document => story(document, "components/fields/path-field/value/empty", {value: ""}))
export const story_state_disabled = defineOwnerStory("components/fields/path-field/state/disabled", document => story(document, "components/fields/path-field/state/disabled", {disabled: true}))
export const story_state_readonly = defineOwnerStory("components/fields/path-field/state/readonly", document => story(document, "components/fields/path-field/state/readonly", {readOnly: true}))
export const story_density_compact = defineOwnerStory("components/fields/path-field/density/compact", document => story(document, "components/fields/path-field/density/compact", {density: "compact"}))
