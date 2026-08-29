import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_state_unchecked = defineOwnerStory("components/inputs/checkbox/state/unchecked", async (document) => {
  const {createCompiledCheckboxProductionStory} = await import("../compiled/compiled-checkbox-production-story.tsx")
  const props = {
    "checked": false,
    "title": "Unchecked checkbox"
  } as const
  return withStoryProps(createCompiledCheckboxProductionStory(document, props), props)
})

export const story_state_checked = defineOwnerStory("components/inputs/checkbox/state/checked", async (document) => {
  const {createCompiledCheckboxProductionStory} = await import("../compiled/compiled-checkbox-production-story.tsx")
  const props = {
    "checked": true,
    "title": "Checkbox"
  } as const
  return withStoryProps(createCompiledCheckboxProductionStory(document, props), props)
})
