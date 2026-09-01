import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/matrix-field/basic/default", async (document) => {
  const {createCompiledMatrixFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-matrix",
    label: "Transform",
    value: [[1, 0], [0, 1]]
  } as const
  return withStoryProps(createCompiledMatrixFieldProductionStory(document, props), props)
})
