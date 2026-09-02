import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/data/inspector/basic/default", async (document) => {
  const {createCompiledInspectorProductionStory} = await import("../compiled/compiled-inspector-production-story.tsx")
  return createCompiledInspectorProductionStory(document)
})
