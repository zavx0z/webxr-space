import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/inputs/vector-input/basic/default", async (document) => {
  const {createCompiledVectorInputProductionStory} = await import("../compiled/compiled-group-production-stories.tsx")
  const props = {
    "value": [
      1,
      2,
      3
    ],
    "axes": [
      "X",
      "Y",
      "Z"
    ],
    "title": "Vector"
  } as const
  return withStoryProps(createCompiledVectorInputProductionStory(document, props), props)
})
