import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/rotation-field/basic/default", async (document) => {
  const {createCompiledRotationFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-rotation",
    label: "Вращение",
    value: [0, 0, 0],
    axes: ["X", "Y", "Z"]
  } as const
  return withStoryProps(createCompiledRotationFieldProductionStory(document, props), props)
})
