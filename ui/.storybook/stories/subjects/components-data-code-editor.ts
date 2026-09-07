import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_state_read_only = defineOwnerStory("components/data/code-editor/state/read-only", async (document) => {
  const {createCompiledCodeEditorProductionStory} = await import("../compiled/compiled-code-editor-production-story.tsx")
  return createCompiledCodeEditorProductionStory(document)
})

export const story_performance_large = defineOwnerStory("components/data/code-editor/performance/large", async document => {
  const {createCompiledCodeEditorScrollStory} = await import("../compiled/compiled-code-editor-scroll-story.tsx")
  return createCompiledCodeEditorScrollStory(document)
})

export const story_performance_compact = defineOwnerStory("components/data/code-editor/performance/compact", async document => {
  const {createCompiledCodeEditorScrollStory} = await import("../compiled/compiled-code-editor-scroll-story.tsx")
  return createCompiledCodeEditorScrollStory(document, true)
})
