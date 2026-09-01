import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/text-field/basic/default", async (document) => {
  const {createCompiledTextFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-text",
    label: "Value",
    value: "Output",
    description: "Text value"
  } as const
  return withStoryProps(createCompiledTextFieldProductionStory(document, props), props)
})
