import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/enum-field/basic/default", async (document) => {
  const {createCompiledEnumFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-enum",
    label: "Mode",
    value: "output",
    options: [
      {value: "input", label: "Input"},
      {value: "output", label: "Output"},
      {value: "viewport", label: "Viewport"}
    ]
  } as const
  return withStoryProps(createCompiledEnumFieldProductionStory(document, props), props)
})
