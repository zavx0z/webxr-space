import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/toggle-button-group/basic/default", async (document) => {
  const {createCompiledToggleButtonGroupProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    label: "Mode",
    value: "output",
    options: [
      {key: "input", value: "input", label: "Input"},
      {key: "output", value: "output", label: "Output"},
      {key: "viewport", value: "viewport", label: "Viewport"},
    ],
  } as const
  return withStoryProps(createCompiledToggleButtonGroupProductionStory(document, props), props)
})
