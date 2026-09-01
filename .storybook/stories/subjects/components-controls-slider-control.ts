import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/controls/slider-control/basic/default", async (document) => {
  const {createCompiledSliderControlProductionStory} = await import("../compiled/compiled-slider-control-production-story.tsx")
  const props = {
    "value": 0.5,
    "min": 0,
    "max": 1,
    "step": 0.01,
    "title": "Factor"
  } as const
  return withStoryProps(createCompiledSliderControlProductionStory(document, props), props)
})
