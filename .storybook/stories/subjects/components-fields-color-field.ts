import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/color-field/basic/default", async (document) => {
  const {createCompiledColorFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {
    id: "field-color",
    label: "Color",
    value: {r: 0.2, g: 0.55, b: 0.8, a: 1}
  } as const
  return withStoryProps(createCompiledColorFieldProductionStory(document, props), props)
})
