import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/option-group-field/basic/default", async (document) => {
  const {createCompiledOptionGroupFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    label: "Mode",
    value: "output",
    options: [
      {key: "input", value: "input", label: "Input"},
      {key: "output", value: "output", label: "Output"},
      {key: "viewport", value: "viewport", label: "Viewport"},
    ],
  } as const
  return withStoryProps(createCompiledOptionGroupFieldProductionStory(document, props), props)
})
