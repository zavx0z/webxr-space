import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/vector-field/basic/default", async (document) => {
  const {createCompiledVectorFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Vector", value: [1, 2, 3], axes: ["X", "Y", "Z"]} as const
  return withStoryProps(createCompiledVectorFieldProductionStory(document, props), props)
})
