import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/integer-field/basic/default", async (document) => {
  const {createCompiledIntegerFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-integer",
    label: "Iterations",
    value: 8,
    description: "Iteration count"
  } as const
  return withStoryProps(createCompiledIntegerFieldProductionStory(document, props), props)
})
