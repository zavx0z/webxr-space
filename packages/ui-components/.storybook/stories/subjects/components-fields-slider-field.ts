import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/fields/slider-field/basic/default", async (document) => {
  const {createCompiledSliderFieldProductionStory} = await import("../compiled/compiled-field-production-stories.tsx")
  const props = {label: "Factor", value: 0.5, min: 0, max: 1, step: 0.01} as const
  return withStoryProps(createCompiledSliderFieldProductionStory(document, props), props)
})
