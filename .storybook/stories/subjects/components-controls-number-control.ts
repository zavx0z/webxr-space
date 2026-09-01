import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/controls/number-control/basic/default", async (document) => {
  const {createCompiledNumberControlProductionStory} = await import("../compiled/compiled-number-control-production-story.tsx")
  const props = {
    "value": 42,
    "min": 0,
    "max": 100,
    "step": 0.1,
    "title": "Number control"
  } as const
  return withStoryProps(createCompiledNumberControlProductionStory(document, props), props)
})
