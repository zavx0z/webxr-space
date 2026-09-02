import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/foundation/badge/basic/default", async (document) => {
  const {createCompiledBadgeProductionStory} = await import("../compiled/compiled-foundation-production-stories.tsx")
  const props = {
    "label": "Ready",
    "tone": "neutral",
    "title": "Status"
  } as const
  return withStoryProps(createCompiledBadgeProductionStory(document, props), props)
})
