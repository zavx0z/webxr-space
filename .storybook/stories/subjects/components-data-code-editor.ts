import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_state_read_only = defineOwnerStory("components/data/code-editor/state/read-only", async (document) => {
  const {createCompiledCodeEditorProductionStory} = await import("../compiled/compiled-code-editor-production-story.tsx")
  return createCompiledCodeEditorProductionStory(document)
})
