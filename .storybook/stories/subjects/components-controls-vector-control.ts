import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/controls/vector-control/basic/default", async (document) => {
  const {createCompiledVectorControlProductionStory} = await import("../compiled/compiled-group-production-stories.tsx")
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
  return withStoryProps(createCompiledVectorControlProductionStory(document, props), props)
})
