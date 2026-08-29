import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/inputs/number-input/basic/default", async (document) => {
  const {createCompiledNumberInputProductionStory} = await import("../compiled/compiled-number-input-production-story.tsx")
  const props = {
    "value": 42,
    "min": 0,
    "max": 100,
    "step": 0.1,
    "title": "Number input"
  } as const
  return withStoryProps(createCompiledNumberInputProductionStory(document, props), props)
})
