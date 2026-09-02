import type {Document} from "@zavx0z/dom"
import {uiIcons} from "@zavx0z/ui/themes/icons"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

const base = Object.freeze([
  Object.freeze({key: "input", value: "input", label: "Input", iconSrc: uiIcons.log}),
  Object.freeze({key: "output", value: "output", label: "Output", iconSrc: uiIcons.run}),
  Object.freeze({key: "viewport", value: "viewport", label: "Viewport", iconSrc: uiIcons.visibilityOn}),
])
const story = async (document: Document, route: string, options: typeof base) => {
  const {createCompiledCycleFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Mode", value: "output", options, title: route}
  return withStoryProps(createCompiledCycleFieldProductionStory(document, props), props)
}

export const story_value_header_icons = defineOwnerStory("components/fields/cycle-field/value/header-icons", document =>
  story(document, "components/fields/cycle-field/value/header-icons", base)
)
export const story_value_mixed_icons = defineOwnerStory("components/fields/cycle-field/value/mixed-icons", document =>
  story(document, "components/fields/cycle-field/value/mixed-icons", Object.freeze([
    base[0]!,
    Object.freeze({key: "output", value: "output", label: "Output"}),
    base[2]!,
  ]) as typeof base)
)
