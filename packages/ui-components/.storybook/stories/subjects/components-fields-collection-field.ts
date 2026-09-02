import type {Document} from "@zavx0z/dom"
import {uiIcons} from "@ui/components/icons"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const items = Object.freeze([
  Object.freeze({id: "input", label: "Input", iconSrc: uiIcons.log}),
  Object.freeze({id: "output", label: "Output", iconSrc: uiIcons.run}),
  Object.freeze({id: "viewport", label: "Viewport", iconSrc: uiIcons.visibilityOn}),
])
const story = async (document: Document, route: string, partial: Readonly<Record<string, unknown>>) => {
  const {createCompiledCollectionFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Items", items, selectedId: "output", title: route, ...partial}
  return withStoryProps(createCompiledCollectionFieldProductionStory(document, props), props)
}
export const story_value_selected = defineOwnerStory("components/fields/collection-field/value/selected", document => story(document, "components/fields/collection-field/value/selected", {}))
export const story_value_empty = defineOwnerStory("components/fields/collection-field/value/empty", document => story(document, "components/fields/collection-field/value/empty", {items: [], selectedId: null}))
export const story_state_disabled = defineOwnerStory("components/fields/collection-field/state/disabled", document => story(document, "components/fields/collection-field/state/disabled", {disabled: true}))
export const story_state_readonly = defineOwnerStory("components/fields/collection-field/state/readonly", document => story(document, "components/fields/collection-field/state/readonly", {readOnly: true}))
export const story_density_compact = defineOwnerStory("components/fields/collection-field/density/compact", document => story(document, "components/fields/collection-field/density/compact", {density: "compact"}))
