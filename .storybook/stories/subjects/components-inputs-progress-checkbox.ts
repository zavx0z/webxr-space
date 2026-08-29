import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_progress_default = defineOwnerStory("components/inputs/progress-checkbox/progress/default", async (document) => {
  const {createCompiledProgressCheckboxProductionStory} = await import("../compiled/compiled-progress-checkbox-production-story.tsx")
  const props = {
    "checked": false,
    "indeterminate": true,
    "title": "In progress"
  } as const
  return withStoryProps(createCompiledProgressCheckboxProductionStory(document, props), props)
})
