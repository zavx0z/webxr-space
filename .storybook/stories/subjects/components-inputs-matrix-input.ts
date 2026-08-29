import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/inputs/matrix-input/basic/default", async (document) => {
  const {createCompiledMatrixInputProductionStory} = await import("../compiled/compiled-group-production-stories.tsx")
  const props = {
    "value": [
      [
        1,
        0,
        0
      ],
      [
        0,
        1,
        0
      ],
      [
        0,
        0,
        1
      ]
    ],
    "title": "Matrix"
  } as const
  return withStoryProps(createCompiledMatrixInputProductionStory(document, props), props)
})
