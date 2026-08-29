import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_status_unavailable = defineOwnerStory("components/data/noti/status/unavailable", async (document) => {
  const {createUnavailableOwnerStory} = await import("../compiled/misc-owner-stories.ts")
  return createUnavailableOwnerStory(document)
})
