import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_vertical_default = defineOwnerStory("components/data/scrollbar/vertical/default", async (document) => {
  const {createScrollbarOwnerStory} = await import("../compiled/misc-owner-stories.ts")
  return createScrollbarOwnerStory(document)
})
