import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/controls/matrix-control/basic/default", async (document) => {
  const {createCompiledMatrixControlProductionStory} = await import("../compiled/compiled-group-production-stories.tsx")
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
  return withStoryProps(createCompiledMatrixControlProductionStory(document, props), props)
})
